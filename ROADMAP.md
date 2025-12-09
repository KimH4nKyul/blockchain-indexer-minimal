# 프로덕션 레벨 블록체인 인덱서 로드맵

현재의 "최소 기능(minimal)" 인덱서를 확장성과 안정성을 갖춘 상용 수준의 시스템으로 발전시키기 위한 단계별 계획 및 기술 분석 문서입니다.

## 1. 데이터베이스 및 스토리지 (Database & Storage)

- [ ] **PostgreSQL 마이그레이션 (필수)**
  - 현재의 `sqlite`는 동시 쓰기 작업과 대용량 데이터 처리에 적합하지 않습니다.
  - **Action:** `prisma.schema`의 데이터 소스를 `postgresql`로 변경하고, 로컬 개발 환경을 위해 `docker-compose`에 DB 컨테이너를 추가합니다.
- [ ] **JSONB 타입 활용**
  - 로그의 `topics`나 트랜잭션의 복잡한 데이터를 문자열이 아닌 JSON 타입으로 저장하여 쿼리 효율성을 높여야 합니다.
- [ ] **데이터 무결성 검증**
  - 주소(Address)의 체크섬(Checksum) 검증 및 정규화 과정을 추가합니다.

## 2. 인덱싱 엔진 성능 최적화 (Core Engine Optimization)

- [ ] **N+1 조회 문제 해결 (최우선)**
  - **현재 상태:** 블록 조회 -> 트랜잭션 해시 목록 순회 -> 개별 트랜잭션 조회 (RPC 호출 과다 발생).
  - **Action:** `getBlock` 호출 시 `includeTransactions: true` 옵션을 사용하거나, 가능하다면 배치 요청(Batch Request)을 통해 한 번의 RPC 호출로 데이터를 가져오도록 변경합니다.
- [ ] **병렬 처리 (Concurrency)**
  - **현재 상태:** 순차적 인덱싱 (`await indexBlock(i)`).
  - **Action:** 워커 풀(Worker Pool)이나 큐(Queue, 예: BullMQ)를 도입하여 여러 블록을 동시에 병렬로 수집하고 처리하도록 개선합니다.

## 3. 안정성 및 장애 대응 (Reliability & Resilience)

- [ ] **Reorg(체인 재구성) 처리 (Critical)**
  - 블록체인은 확정되기 전까지 분기(Fork)가 발생할 수 있습니다.
  - **Action:** 블록을 저장하기 전, DB에 저장된 이전 블록의 해시와 현재 가져온 블록의 `parentHash`를 비교합니다. 불일치 시, 공통 조상 블록이 나올 때까지 DB의 최신 블록을 삭제(Rollback)하는 로직을 구현합니다.
- [ ] **재시도 정책 (Retry Policy)**
  - RPC 노드 타임아웃이나 일시적 오류에 대비해 지수 백오프(Exponential Backoff)를 적용한 재시도 로직을 강화합니다.
- [ ] **Circuit Breaker**
  - RPC 장애가 지속될 경우 인덱싱을 일시 중단하여 불필요한 에러 로그와 리소스 낭비를 방지합니다.

## 4. 관측 가능성 (Observability)

- [ ] **메트릭 수집 (Prometheus/Grafana)**
  - **Action:** `@willsoto/nestjs-prometheus` 등을 활용하여 `last_indexed_block`, `indexing_lag`(최신 블록과의 차이), `tps`(초당 트랜잭션 수) 등의 핵심 지표를 노출합니다.
- [ ] **구조화된 로깅 (Structured Logging)**
  - 텍스트 기반 로그 대신 JSON 포맷의 구조화된 로그(예: `nestjs-pino`)를 사용하여 ELK Stack 등에서 검색 및 분석이 용이하도록 변경합니다.

---

## 5. 추가 기술 스택 도입 분석 (Technology Stack Analysis)

실무 수준의 안정성과 확장성을 확보하기 위해 도입이 필요한 기술들과 그 이유를 분석했습니다.

| 기술 (Tech) | 분류 | 도입 필요성 및 분석 (Why needed?) |
| :--- | :--- | :--- |
| **PostgreSQL** | Database | **동시성 및 확장성:** SQLite는 파일 락(Lock)으로 인해 높은 쓰기 부하를 견딜 수 없음. 수백만 건의 블록/트랜잭션 데이터를 효율적으로 인덱싱(B-tree, Hash index)하고 JSON 데이터를 쿼리하기 위해 필수. |
| **Redis** | In-Memory | **고속 캐싱 & 큐 관리:** 블록 데이터를 임시 저장하거나, 작업 대기열(Message Queue)의 백엔드로 사용하여 DB 부하를 줄이고 처리 속도를 극대화함. |
| **BullMQ** | Queue | **비동기 작업 관리:** 블록 수집(Fetching)과 DB 저장(Processing)을 분리(Decoupling)하기 위해 필요. 작업 실패 시 자동 재시도(Retry) 및 지연 처리(Delay) 기능을 제공하여 시스템 안정성 확보. |
| **Docker** | DevOps | **환경 일관성:** 개발자 로컬 환경과 배포 환경(Production)을 일치시켜 "내 컴퓨터에선 되는데..." 문제를 방지. DB, Redis, App을 하나의 스택으로 관리. |
| **Pino** | Logging | **로그 분석 효율:** `console.log`는 텍스트 파일로 저장되어 검색이 어려움. JSON 구조로 로그를 남겨 Datadog, ELK 등에서 쿼리 가능한 필드(예: `blockNumber`, `errorType`)로 관리하기 위함. |
| **Prometheus** | Monitoring | **정량적 상태 파악:** 시스템이 "멈췄는지" 혹은 "느린지"를 판단하기 위한 수치(Metric) 데이터 수집. CPU/메모리 사용량뿐만 아니라 비즈니스 메트릭(Indexing Lag) 추적에 필수. |

---

## 우선 순위 (Next Steps)

1. **DB 마이그레이션:** SQLite -> PostgreSQL (Docker 환경 구성)
2. **성능 최적화:** 트랜잭션 Fetching 로직 개선 (N+1 문제 해결)
3. **안정성:** Reorg 감지 및 롤백 로직 구현