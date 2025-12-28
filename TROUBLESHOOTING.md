# 트러블슈팅 리포트: 인덱서 안정화 작업

본 문서는 프로젝트 개발 중 발생한 주요 기술적 문제와 그 해결 과정을 논리적 흐름에 따라 정리한 것입니다.

---

## Case 1: RPC 통신 불안정으로 인한 데이터 수집 실패

### 1. 문제 식별 (Issue Identification)
인덱서 가동 중 `BlockFetcher` 서비스에서 반복적인 에러 로그가 관측됨.
- `BlockNotFoundError`: 특정 블록이 존재함에도 찾을 수 없음.
- `TypeError: Cannot convert undefined to a BigInt`: 응답 데이터 파싱 실패.

### 2. 문제 정의 (Problem Definition)
**"공용 RPC 노드의 리소스 제한 vs 인덱서의 대량 배치 요청 간의 충돌"**
사용 중인 공용 RPC(`ethereum-sepolia-rpc.publicnode.com`)는 요청량과 응답 크기에 엄격한 제한이 있으나, 인덱서는 `batchSize: 100`과 `includeTransactions: true` 옵션으로 허용치를 초과하는 과도한 부하를 발생시키고 있었음.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: 배치 사이즈를 축소한다 (100 -> 20).
- **B안**: 배치 기능을 비활성화하고 요청을 순차적으로 처리한다.
- **C안**: 제한이 덜한 유료 RPC(Alchemy, Infura 등)를 도입한다.

### 4. 방안 결정 (Decision)
**B안 (배치 비활성화 및 순차 처리)** 을 채택.

### 5. 결정 근거 (Rationale)
- **안정성 최우선**: A안을 시도했으나 간헐적인 실패가 지속됨. 공용 노드 환경에서는 속도 저하를 감수하더라도 요청을 하나씩 확실하게 처리하는 것이 시스템 신뢰성 확보에 유리함.
- **비용 효율성**: 개발 단계에서 C안(유료 결제) 도입은 시기상조로 판단.

### 6. 구현 방법 (Implementation)
1.  `BlockchainViemClient` 설정에서 `batch` 옵션을 제거.
2.  `getBlocks` 메서드의 로직을 병렬 처리(`Promise.all`)에서 순차 처리(`for loop` + `await`)로 변경하여 순간 트래픽을 분산.

### 7. 최종 결과 (Final Result)
에러가 완전히 사라지고 인덱서가 중단 없이 지속적으로 블록을 동기화할 수 있게 됨.

### 8. 회고 (Retrospective)
현재 방식은 안정적이나 동기화 속도가 느리다는 단점이 있음. 향후 운영 환경에서는 유료 RPC 노드를 도입하고 다시 배치 처리를 활성화하여 성능을 최적화해야 함.

---

## Case 2: 도메인-DB 계층 간 데이터 불일치 (Prisma Validation Error)

### 1. 문제 식별 (Issue Identification)
블록 데이터를 DB에 저장하는 시점에 `PrismaClientValidationError: Unknown argument baseFeePerGas` 에러 발생.

### 2. 문제 정의 (Problem Definition)
**"외부 API의 잉여 데이터가 필터링 없이 영속성 계층까지 침투"**
외부 라이브러리(`viem`)가 반환하는 원본 데이터 객체에는 도메인 모델에 정의되지 않은 필드(`baseFeePerGas`)가 포함되어 있었으나, 이를 그대로 DB에 저장하려다 스키마 불일치로 거부됨.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: Prisma 스키마(`schema.prisma`)에 `baseFeePerGas` 필드를 추가한다.
- **B안**: 인프라 계층(Client)에서 데이터를 받을 때 필요한 필드만 추출한다.
- **C안**: 도메인 계층(Entity)에서 DB로 내보낼 때(`toPrimitives`) 데이터를 정제한다.

### 4. 방안 결정 (Decision)
**C안 (도메인 계층에서 출력 데이터 정제)** 을 채택.

### 5. 결정 근거 (Rationale)
- **캡슐화 원칙**: 도메인 엔티티는 자신이 어떤 데이터를 외부에 노출할지 명확히 통제해야 함.
- **유지보수성**: A안은 불필요한 데이터를 저장하게 만들고, B안은 인프라 로직을 복잡하게 함. C안이 가장 깔끔하게 계층 간 경계를 지킬 수 있음.

### 6. 구현 방법 (Implementation)
`Block` 도메인 클래스의 `toPrimitives()` 메서드에서 편의상 사용하던 Spread 연산자(`...this.props`)를 제거하고, 인터페이스에 정의된 필드만 명시적으로 나열하여 반환하도록 수정 (Whitelist 방식).

### 7. 최종 결과 (Final Result)
외부 API 응답 형태가 변하더라도 DB 저장 로직은 영향을 받지 않게 되었으며, 데이터 저장이 정상적으로 수행됨.

### 8. 회고 (Retrospective)
외부 데이터를 내부 시스템으로 들여올 때는 Spread 연산자 사용을 지양하고, 항상 경계(Boundary)에서 엄격한 매핑(Mapping)과 정제(Sanitization) 과정을 거쳐야 함을 재확인.

---

## Case 3: 공용 RPC 노드의 전파 지연 및 응답 오류 대응

### 1. 문제 식별 (Issue Identification)
인덱서가 블록을 동기화하는 과정에서 두 가지 에러가 빈번하게 발생하여 중단됨.
- `BlockNotFoundError`: 최신 블록 번호를 조회하고 데이터를 요청했으나, 해당 블록을 찾을 수 없음.
- `TypeError: Cannot convert undefined to a BigInt`: RPC 노드가 `getBlockNumber` 요청에 대해 유효하지 않은 값(undefined)을 반환.

### 2. 문제 분석 (Problem Analysis)
단순한 코드 오류로 치부하기에는 로그 패턴에 특이점이 발견됨.
- **논리적 모순 (`BlockNotFoundError`)**: 직전 호출(`currentBlockNumber`)에서 최신 블록이 '100번'임을 확인했는데, 바로 이어서 '98번' 블록을 요청했을 때 "없다"고 응답함. 단일 노드라면 미래(100)를 아는데 과거(98)를 모를 수 없음. -> **"요청마다 처리하는 노드가 다르다(로드 밸런싱)"**는 결론 도출.
- **비정상 응답 (`TypeError`)**: 신뢰도 높은 라이브러리(`viem`) 내부에서 파싱 에러가 발생함. 이는 RPC 서버가 HTTP 200 OK는 반환했으나 Body가 비어있거나 깨져 있음을 의미함. -> **"공용 노드가 과부하로 인해 빈 응답을 보냈다"**고 판단.

### 3. 문제 정의 (Problem Definition)
**"분산 환경의 최종 일관성(Eventual Consistency)과 단일 노드의 가용성 문제"**
공용 RPC 엔드포인트는 여러 노드가 로드 밸런싱되어 있는데, 각 노드 간 블록 전파 속도 차이(Lag)로 인해 `latest` 블록 번호를 반환한 노드와 데이터를 제공하는 노드가 다를 수 있음. 또한, 일시적인 과부하로 잘못된 응답을 보내기도 함.

### 4. 대응 방안 (Proposed Solutions)
- **A안**: 에러 발생 시 무조건 인덱서를 재시작한다 (PM2 등 활용).
- **B안**: `BlockFetcher` 루프 전체에 긴 대기 시간을 둔다.
- **C안**: 데이터 요청 범위를 보수적으로 잡고(`SAFE_STEP` 증가), 실패 시 재시도(Retry) 로직을 적용한다.

### 5. 방안 결정 (Decision)
**C안 (안전 범위 확장 및 재시도 로직 적용)** 을 채택.

### 6. 결정 근거 (Rationale)
- **데이터 정합성**: 노드 간 동기화가 확실히 끝난 '안전한 과거' 블록을 가져오는 것이 가장 확실한 해결책.
- **회복 탄력성(Resilience)**: 일시적인 네트워크/노드 오류는 짧은 대기 후 재시도하면 성공할 확률이 매우 높음. 프로세스를 죽이는 것보다 자체 복구하는 것이 효율적.

### 7. 구현 방법 (Implementation)
1.  **안전 범위 확장**: `BlockService`의 `SAFE_STEP` 기본값을 `2`에서 `10`으로 증가시켜, 최신 블록보다 10개 뒤의 블록을 수집하도록 변경.
2.  **재시도 로직 추가**: `BlockchainViemClient`의 `currentBlockNumber`와 `fetchBlock` 메서드에 에러(`BlockNotFoundError`, `TypeError`) 발생 시 1초 대기 후 최대 3회 재시도하는 로직 구현.

### 8. 최종 결과 (Final Result)
`BlockNotFoundError`와 `TypeError`가 발생해도 인덱서가 멈추지 않고, 잠시 후 정상적으로 블록을 가져와 동기화를 지속함.

### 9. 회고 (Retrospective)
분산 시스템 연동 시에는 '항상 성공한다'는 가정보다 '실패할 수 있다'는 전제 하에 방어적인 코드(Defensive Programming)를 작성해야 함을 확인. 특히 공용 인프라를 사용할 때는 넉넉한 버퍼(Buffer)와 재시도 전략이 필수적임.

---

## Case 4: 과도한 폴링 속도로 인한 RPC 차단 가능성 제어

### 1. 문제 식별 (Issue Identification)
인덱서가 과거 블록을 따라잡는(Sync) 과정에서 에러 발생률이 급격히 높아지는 경향이 있음. 로그를 분석한 결과, 한 배치가 끝나자마자 `0ms` 대기 시간으로 다음 요청을 보내는 패턴(Tight Loop)이 확인됨.

### 2. 문제 분석 (Problem Analysis)
- **setImmediate의 특성**: 현재 처리 중인 I/O 작업 직후에 콜백을 실행하므로, 논리적으로는 Non-blocking이지만 실제로는 쉬는 시간 없는 **'Tight Loop'**를 형성함. 블록 수집 속도는 극대화되나 RPC 노드에는 지속적인 버스트 트래픽 부하를 가함.
- **setTimeout의 특성**: 설정된 밀리초(ms)만큼의 **'최소 휴식 시간'**을 보장함. 비동기 함수이므로 대기 시간 동안 이벤트 루프를 점유하지 않으며, 다른 작업(API 응답, DB 저장 등)이 처리될 여유를 제공함.
- **결론**: 두 방식 모두 Node.js의 메인 스레드를 멈추게 하지는 않지만, 외부 시스템(RPC)과의 조화를 위해서는 의도적인 지연(Throttling)이 필수적임.

### 3. 문제 정의 (Problem Definition)
**"제어되지 않은 클라이언트 요청 속도가 서버의 임계치를 초과함"**
빠른 동기화를 위해 적용한 '즉시 재실행' 방식이 오히려 외부 시스템의 안정을 해치고, 역설적으로 전체 동기화 속도를 떨어뜨리고 있음(에러 및 재시도 비용 발생).

### 4. 대응 방안 (Proposed Solutions)
- **A안**: 요청 속도 제한 라이브러리(Rate Limiter)를 도입한다.
- **B안**: 루프 사이에 고정적인 지연 시간(Sleep)을 추가하기 위해 `setTimeout`을 활용한다.

### 5. 방안 결정 (Decision)
**B안 (Throttling 적용)** 을 채택.

### 6. 결정 근거 (Rationale)
- **구현 용이성**: 복잡한 라이브러리 추가 없이 `setTimeout`만으로 충분히 목적을 달성할 수 있음.
- **시스템 부하 감소**: 인덱서 자체의 CPU 점유율을 낮추고, 다른 비동기 작업(GC 등)에 여유를 줄 수 있음.

### 7. 구현 방법 (Implementation)
`BlockFetcher`의 재귀 루프 호출 방식을 `setImmediate`에서 `setTimeout(..., 1000)`으로 변경하여, 배치 처리 성공 후에도 강제로 **1초간 대기**하도록 수정.

### 8. 최종 결과 (Final Result)
초당 요청 수가 안정적인 수준으로 유지되면서, 공용 RPC 노드로부터의 'Bad Response' 빈도가 획기적으로 감소함. 속도는 다소 줄었으나, 끊김 없는 안정적인 동기화가 가능해짐.

### 9. 회고 (Retrospective)
"빠른 것이 항상 좋은 것은 아니다." 외부 자원과 상호작용할 때는 상대방의 리소스 한계를 항상 존중해야 하며, 적절한 속도 제어(Pacing)가 장기적인 성능 최적화의 핵심임을 깨달음.

---

## Case 5: 고가용성을 위한 다중 RPC 노드 Failover 구성

### 1. 문제 식별 (Issue Identification)
인덱서가 의존하는 단일 RPC 제공자(예: Infura)가 네트워크 장애나 요금제 한도(Rate Limit) 초과로 인해 서비스를 중단할 경우, 인덱서 전체가 멈추는 **단일 실패 지점(SPOF)** 리스크가 존재함.

### 2. 문제 정의 (Problem Definition)
**"블록체인 노드의 불안정성은 상수(Constant)다."**
어떤 유료 노드도 100% 가동률(Uptime)을 보장할 수 없으므로, 인덱서는 특정 노드가 죽더라도 즉시 다른 대체 노드(Alchemy, QuickNode 등)로 연결을 전환하여 서비스를 지속해야 함.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: 에러 발생 시 개발자가 수동으로 환경변수(`RPC_URL`)를 변경하고 재배포한다.
- **B안**: 코드 레벨에서 `try-catch`로 에러를 잡고, 사전에 정의된 예비 URL 리스트를 순회하며 재시도한다.
- **C안**: 라이브러리(`viem`) 수준에서 제공하는 `fallback` 트랜스포트 기능을 활용한다.

### 4. 방안 결정 (Decision)
**C안 (viem fallback 기능 활용)** 을 채택.

### 5. 결정 근거 (Rationale)
- **구현 완성도**: `viem`의 `fallback`은 단순한 리스트 순회뿐만 아니라, 노드의 응답 속도(Latency)를 주기적으로 측정해 가장 빠른 노드를 우선 선택하는 `Rank` 기능과 자동 복구 로직을 포함하고 있어, 직접 구현(B안)하는 것보다 훨씬 강력하고 안정적임.

### 6. 구현 방법 (Implementation)
1.  환경변수 `RPC_URLS`에 콤마(`,`)로 구분된 여러 RPC 주소를 입력받도록 설정.
2.  `BlockchainViemClient` 초기화 시 `http` 트랜스포트를 배열로 생성하고 `fallback` 함수로 감싸서 클라이언트에 주입.
3.  개별 노드의 `retryCount`를 `1`로 줄여, 장애 발생 시 빠르게 다음 노드로 넘어가도록(Fast Failover) 튜닝.

### 7. 최종 결과 (Final Result)
메인 노드(예: Infura) 연결을 강제로 차단해도, 인덱서가 에러 로그 없이 즉시 서브 노드(예: Alchemy)로 전환되어 블록 수집을 계속함. 무중단 운영이 가능해짐.

### 8. 회고 (Retrospective)
고가용성(HA) 아키텍처는 인프라 레벨뿐만 아니라 애플리케이션 코드 레벨에서도 지원해야 함. 라이브러리가 제공하는 고급 기능(Fallback, Rank)을 적극 활용하여 복잡한 로직을 간결하게 해결함.

---

## Case 6: 이더리움 큰 수(BigInt) 처리에 따른 DB 오버플로우

### 1. 문제 식별 (Issue Identification)
트랜잭션 저장 중 `PrismaClientUnknownRequestError`가 발생하며 프로세스가 중단됨.
로그 상세: `Could not convert argument value Object... String("9999999951943936000")`

### 2. 문제 정의 (Problem Definition)
**"이더리움의 uint256 범위 vs 데이터베이스의 int64 범위 충돌"**
이더리움의 Value(송금액)는 최대 `uint256`까지 지원하지만, Prisma와 PostgreSQL의 `BigInt` 타입은 `int64` (약 922경)까지만 저장할 수 있음. 테스트넷의 Faucet 등으로 인해 이 범위를 초과하는 큰 금액의 트랜잭션이 들어오자 오버플로우가 발생함.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: `BigInt` 대신 `Decimal` 타입을 사용한다. (정밀도 보장, DB 연산 가능)
- **B안**: `String` 타입을 사용한다. (가장 안전, 단순함)

### 4. 방안 결정 (Decision)
**B안 (String 타입으로 스키마 변경)** 을 채택.

### 5. 결정 근거 (Rationale)
- **안전성**: 블록체인의 256비트 정수를 손실 없이 완벽하게 저장하는 가장 확실한 방법은 문자열임.
- **단순성**: 인덱서 내에서 DB 레벨의 복잡한 연산(SUM, AVG 등)이 당장 필요하지 않음.

### 6. 구현 방법 (Implementation)
1.  `schema.prisma`에서 `value` 필드 타입을 `String`으로 변경.
2.  `TransactionPrismaRepository`에서 `BigInt` 값을 `.toString()`으로 변환하여 저장하도록 수정.
3.  `npx prisma db push`로 DB 스키마 마이그레이션 수행 (주의: 기존 데이터 초기화됨).

### 7. 최종 결과 (Final Result)
10 ETH 이상의 큰 금액이나 `uint256` 최대치에 가까운 값도 에러 없이 정상적으로 저장됨.

### 8. 회고 (Retrospective)
블록체인 데이터를 다룰 때는 일반적인 웹 개발의 상식(정수는 int64면 충분하다)이 통하지 않음을 깨달음. 특히 금전적 가치와 관련된 필드는 설계 단계에서부터 `String`이나 `Decimal`을 고려해야 함.

---

## Case 7: 대량의 영수증 조회 시 RPC 속도 제한(Rate Limit) 초과

### 1. 문제 식별 (Issue Identification)
`ReceiptFetcher`가 미처리된 과거 트랜잭션(Backlog)을 동기화하는 과정에서 `RPCRequestError` 및 QuickNode의 `15/second request limit reached` 에러가 발생함.

### 2. 문제 정의 (Problem Definition)
**"제어되지 않은 병렬 요청(Burst)으로 인한 API 차단"**
과거 데이터가 많이 쌓인 상태에서 인덱서가 `Promise.all`을 사용해 수백 개의 트랜잭션 영수증을 동시에 요청함. 이로 인해 순간 RPS(초당 요청 수)가 RPC 제공자의 허용 범위(예: 15 RPS)를 초과하여 차단당함.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: 요청 실패 시 재시도(Retry)만 반복한다. (비효율적, 무한 루프 위험)
- **B안**: 애플리케이션 레벨에서 이중 유량 제어(Double Flow Control)를 적용한다.

### 4. 방안 결정 (Decision)
**B안 (DB Limit + Request Chunking)** 을 채택.

### 5. 결정 근거 (Rationale)
- **근본적 해결**: 재시도는 사후 대처일 뿐, 근본적으로 요청 속도를 조절해야 함.
- **안정성**: DB 부하와 네트워크 부하를 동시에 제어할 수 있음.

### 6. 구현 방법 (Implementation)
1.  **Service Layer**: DB에서 영수증 없는 트랜잭션을 조회할 때 `LIMIT 50`을 적용하여 한 번에 가져오는 작업량 자체를 제한함.
2.  **Infrastructure Layer**: `fetchReceiptsInParallel` 내부에서 `chunkSize: 10`으로 요청을 쪼개어, 10개씩 순차적으로 병렬 처리(Sequential Batch)하도록 수정.

### 7. 최종 결과 (Final Result)
백로그(Backlog)가 아무리 많이 쌓여 있어도, 인덱서는 설정된 속도(Chunk Size)에 맞춰 꾸준하고 안정적으로 영수증을 처리함. RPC 에러가 완전히 사라짐.

### 8. 회고 (Retrospective)
외부 API를 사용할 때는 상대방의 제한 정책(Rate Limit)을 항상 염두에 두고, 클라이언트 측에서 능동적으로 속도를 제어(Throttling)하는 것이 시스템의 전체적인 처리량을 높이는 길임.

---

## Case 8: 영수증 및 로그 저장 시 발생하는 Prisma 제약 사항 및 타입 불일치

### 1. 문제 식별 (Issue Identification)
`TransactionReceipt`와 `Log`를 저장하는 `saveReceipts` 메서드 실행 중 세 가지 에러가 연달아 발생함.
1.  `Unknown argument logs` (Prisma 관계 저장 에러)
2.  `Type 'bigint' is not assignable to type 'number'` (Log ID 타입 불일치)
3.  `Type 'string[]' is not assignable to type 'string'` (Log Topics 타입 불일치)

### 2. 문제 정의 (Problem Definition)
**"ORM의 대량 삽입(Bulk Insert) 제약과 도메인-DB 간의 타입 미스매치"**
- **제약 사항**: Prisma의 `createMany`는 연관된 데이터(여기서는 `logs`)를 한 번에 저장하는 Nested Write를 지원하지 않음.
- **타입 차이**: 도메인 엔티티는 `BigInt`와 `Array`를 사용하지만, DB 스키마는 `Int`(Auto Increment)와 `String`(JSON)을 요구함.

### 3. 대응 방안 (Proposed Solutions)
- **A안**: `createMany` 대신 `create`를 루프로 돌린다. (성능 저하 심각)
- **B안**: 데이터를 분리(Split)하고 변환(Transform)하여 각각 저장한다.

### 4. 방안 결정 (Decision)
**B안 (분리 및 변환 저장)** 을 채택.

### 5. 결정 근거 (Rationale)
- **성능**: 대량 데이터를 다룰 때 `createMany`의 성능 이점은 절대적임.
- **유연성**: 리포지토리 계층에서 도메인 모델을 DB 모델로 매핑(Mapping)하는 것이 올바른 책임 할당임.

### 6. 구현 방법 (Implementation)
1.  **데이터 분리**: `Receipt`에서 `logs` 필드를 `Omit`하여 추출.
2.  **타입 변환**:
    - `id`: DB가 자동 생성하므로 저장 시 제외.
    - `topics`: `string[]`을 `JSON.stringify()`를 통해 `string`으로 변환.
3.  **트랜잭션 저장**: `prisma.$transaction`을 사용하여 영수증 저장과 로그 저장을 원자적으로 실행.

### 7. 최종 결과 (Final Result)
영수증과 로그가 데이터 유실이나 에러 없이 DB에 정확하게 저장됨.

### 8. 회고 (Retrospective)
ORM을 사용할 때는 '편리함' 뒤에 숨겨진 '제약 사항'을 정확히 파악해야 함. 특히 `createMany` 같은 고성능 API는 엄격한 규칙(Flat Object only)을 요구하므로, 저장 전 데이터 가공(Preprocessing) 과정이 필수적임.