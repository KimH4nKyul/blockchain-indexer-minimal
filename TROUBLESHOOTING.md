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