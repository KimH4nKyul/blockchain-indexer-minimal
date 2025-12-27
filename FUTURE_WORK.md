# Future Work: Architecture Evolution

본 문서는 프로젝트의 향후 발전 방향과 기술적 논의 사항을 기록합니다.

---

## 1. 영수증(Receipt) 및 로그(Log) 동기화 고도화

### 배경 (Background)
현재 `BlockFetcher`는 표준 JSON-RPC `eth_getBlockByNumber`를 사용하므로 트랜잭션의 기본 정보(From, To, Value 등)만 수집하며, 실행 결과(`status`, `gasUsed`)와 이벤트(`logs`)는 포함되지 않는다.
인덱서의 핵심 가치인 "이벤트 조회"와 "트랜잭션 성공 여부 확인"을 위해서는 별도의 영수증 동기화 프로세스가 필수적이다.

### 요구사항 (Requirements)
1.  **데이터 완결성 (Completeness)**: 시스템이 예기치 않게 종료되거나 장기간 중단된 후 재시작되더라도, 누락 없이 모든 트랜잭션의 영수증을 채울 수 있어야 한다.
2.  **실시간 UX (Real-time UX)**: 프론트엔드 사용자에게 최신 데이터가 즉각 반영될 수 있도록, 블록 수집과 영수증 수집 사이의 지연 시간(Latency)을 최소화해야 한다.

### 설계된 아키텍처: 하이브리드 패턴 (Hybrid Push & Pull)

단순 폴링(Polling)의 지연 시간 문제와, 메시지 큐(Kafka)의 인프라 복잡도/데이터 유실 위험을 동시에 해결하기 위해 **이벤트 트리거(Push)와 폴링(Pull)을 결합한 방식**을 채택한다.

#### A. Fast Path (Event-Driven) - 실시간성 담당
*   **목적**: 사용자 경험을 위한 초저지연 데이터 처리.
*   **동작 시점**: `BlockService`가 블록 내 트랜잭션을 DB에 저장(Commit)한 직후.
*   **메커니즘**:
    1.  `BlockService`가 내부 이벤트(`transaction.saved`)를 발행한다. 이때 `await` 하지 않고 비동기(Fire-and-forget)로 처리하여 블록 동기화 루프를 방해하지 않는다.
    2.  `ReceiptFetcher`가 해당 이벤트를 수신(Listen)하여 즉시 타겟 TX Hash들에 대해 RPC(`eth_getTransactionReceipt`)를 요청한다.
    3.  가져온 영수증 데이터를 DB에 업데이트한다.
*   **장점**: 별도의 폴링 대기 시간 없이, 트랜잭션이 들어오자마자 영수증을 채워넣을 수 있다.

#### B. Reliable Path (Polling Fallback) - 안정성/복구 담당
*   **목적**: 시스템 장애 복구 및 데이터 정합성 보장.
*   **동작 시점**: 백그라운드 스케줄러(Cron)에 의해 주기적으로 실행 (예: 1분 간격).
*   **메커니즘**:
    1.  DB에서 `receipt` 필드가 `null`인 트랜잭션을 조회한다. (`SELECT ... WHERE receipt IS NULL`)
    2.  발견된 "누락 트랜잭션"들에 대해 영수증 동기화를 수행한다.
*   **장점**:
    *   서버가 꺼져 있는 동안 쌓인 데이터나, 이벤트 버스 오류로 놓친 데이터를 확실하게 설거지(Sweep) 할 수 있다.
    *   카프카 등 외부 큐에 의존하지 않고, **DB 자체를 단일 진실 공급원(Source of Truth)**으로 사용하므로 관리 포인트가 줄어든다.

### 구현 로드맵 (Roadmap)
1.  `ReceiptFetcher` 모듈 생성 및 `ReceiptService` 구현.
2.  NestJS `EventEmitter` 모듈 설정.
3.  `BlockService`의 `forwardSync` 마지막 단계에 이벤트 발행 로직 추가.
4.  `ReceiptFetcher`에 `@OnEvent` (Fast Path) 및 `@Cron` (Reliable Path) 구현.

---

## 2. 대량 트랜잭션 저장 시 안정성 확보 (Chunking Strategy)

### 배경 (Background)
블록체인 네트워크(특히 메인넷)의 활성도에 따라 한 블록에 수백 개 이상의 트랜잭션이 포함될 수 있다.
현재 `BlockFetcher`는 여러 블록을 한 번에 가져오는 배치(Batch) 방식을 사용하므로, 순간적으로 수천 개의 트랜잭션 데이터를 DB에 저장해야 하는 상황이 발생한다.

### 문제점 (Potential Issues)
`TransactionRepository`에서 모든 트랜잭션을 한 번의 `createMany` 쿼리로 전송할 경우 다음과 같은 문제가 발생할 수 있다.
1.  **DB 파라미터 제한 초과**: 데이터베이스(특히 SQLite, PostgreSQL)는 한 쿼리에 포함될 수 있는 파라미터 개수(Parameter Limit)에 상한선이 있다. (예: `컬럼 수 * 트랜잭션 수 > 65,535` 일 경우 에러 발생)
2.  **패킷 크기 제한**: 쿼리 문자열 자체가 너무 길어져 DB 설정(`max_allowed_packet`)을 초과할 수 있다.
3.  **타임아웃 및 락**: 거대한 단일 쿼리는 실행 시간이 길어 테이블 락(Lock)을 유발하거나 타임아웃으로 실패할 확률이 높다.

### 해결 방안: Chunking (쪼개서 저장)

애플리케이션 레벨에서 대량의 데이터를 적절한 크기(예: 500개 ~ 1,000개)로 나누어(Chunk) 순차적으로 저장하는 전략을 도입한다.

#### 구현 가이드
`TransactionPrismaRepository`의 `saveBatch` 메서드를 다음과 같이 개선한다.

```typescript
// 유틸리티: 배열을 size 크기로 쪼개는 함수
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// 적용 예시
async saveBatch(transactions: Transaction[]): Promise<void> {
  // ... (매핑 로직) ...

  // 500개 단위로 쪼개서 저장
  const chunks = chunkArray(data, 500);
  
  for (const chunk of chunks) {
    await this.prismaService.transaction.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }
}
```

### 기대 효과
*   DB 드라이버의 파라미터 제한 에러를 원천적으로 방지.
*   단일 쿼리 부하를 낮추어 DB 연결 안정성 확보.
*   대량 동기화(Backfill) 작업 시에도 끊김 없는 처리 가능.
