# Blockchain Indexer Minimal

**클린 아키텍처** 원칙을 준수하여 개발된 확장 가능한 **이더리움 블록체인 인덱서**입니다.
Prisma(SQLite)와 Viem을 사용하여 온체인 데이터(블록, 트랜잭션, 로그, 영수증)를 수집, 저장 및 서빙합니다.

## 🌟 주요 기능

*   **블록체인 동기화**: 최신 블록 및 과거 데이터 동기화 지원.
*   **완전한 데이터 인덱싱**: 블록 헤더, 트랜잭션, 이벤트 로그(Logs), 트랜잭션 영수증(Receipts) 저장.
*   **고성능 조회 API**: 페이지네이션 및 상세 필터링을 지원하는 RESTful API 제공.
*   **클린 아키텍처**: 도메인 로직과 인프라스트럭처의 완벽한 분리 (DIP 준수).

---

## 📚 API 문서

이 인덱서는 데이터 분석가, 서비스 운영자, 대시보드 클라이언트 등 다양한 사용자를 위한 API를 제공합니다.

### 1. 데이터 분석가 (Data Analyst)용 API

스마트 컨트랙트의 이벤트를 분석하고 특정 트랜잭션 패턴을 파악하는 데 최적화되어 있습니다.

#### 🔍 로그 검색 (`GET /logs`)
특정 컨트랙트의 이벤트나 특정 주제(Topic)를 가진 로그를 필터링하여 조회합니다.

*   **Endpoint:** `GET /logs`
*   **Query Parameters:**
    *   `address` (Optional): 스마트 컨트랙트 주소 (예: `0x123...`)
    *   `topic0` (Optional): 이벤트 시그니처 해시 (예: `Transfer` 이벤트 해시)
    *   `transactionHash` (Optional): 특정 트랜잭션 내의 로그만 조회
    *   `fromBlock` / `toBlock` (Optional): 검색할 블록 범위
    *   `take` / `skip`: 페이지네이션 (Default: take=10)
*   **활용 예시:** "최근 1000 블록 동안 USDT 컨트랙트에서 발생한 모든 `Transfer` 이벤트 조회"

---

### 2. 대시보드 클라이언트 (Frontend/Dashboard)용 API

실시간 블록 생성 현황이나 최신 트랜잭션 리스트를 사용자에게 시각화하여 보여주는 데 사용됩니다.

#### 📦 블록 리스트 조회 (`GET /blocks`)
최신 블록 목록을 페이지네이션하여 제공합니다.

*   **Endpoint:** `GET /blocks`
*   **Query Parameters:** `take`, `skip`
*   **Response:** 블록 번호, 해시, 생성 시간, 포함된 트랜잭션 수 등.

#### 📦 블록 상세 조회 (`GET /blocks/:hashOrNumber`)
특정 블록의 상세 정보를 조회합니다.

*   **Endpoint:** `GET /blocks/{blockHash 또는 blockNumber}`

#### 💸 트랜잭션 리스트 조회 (`GET /transactions`)
전체 네트워크의 최신 트랜잭션 흐름을 보여줍니다.

*   **Endpoint:** `GET /transactions`
*   **Query Parameters:** `take`, `skip`

---

### 3. 상세 탐색기 (Explorer)용 API

특정 트랜잭션의 실행 결과, 가스비 소모량, 실패 여부 등을 상세하게 확인해야 하는 경우 사용됩니다.

#### 🧾 트랜잭션 상세 조회 (`GET /transactions/:hash`)
트랜잭션의 기본 정보(보낸 사람, 받는 사람, 값, 입력 데이터)를 조회합니다.

#### 🧾 트랜잭션 영수증 조회 (`GET /transactions/:hash/receipt`)
트랜잭션의 실행 결과(성공/실패), 실제 가스 사용량, 발생한 로그 등을 포함한 영수증 정보를 조회합니다.

---

### 4. 어드민/운영자 (Admin/Ops)용 API

인덱서의 상태를 모니터링하고, 누락된 데이터 구간을 수동으로 채워넣는 등의 관리 작업을 수행합니다.

#### ⚙️ 동기화 트리거 (`POST /sync`)
특정 블록 구간의 데이터를 강제로 수집(Backfill)합니다.

*   **Endpoint:** `POST /sync`
*   **Query Parameters:**
    *   `from`: 시작 블록 번호
    *   `to`: 종료 블록 번호
*   **활용 예시:** "서버 점검으로 인해 누락된 500000~500100번 블록 데이터 수동 수집"

#### 💓 상태 확인 (`GET /status`, `GET /block/latest`)
*   `GET /status`: 인덱서 서비스가 정상 동작 중인지 확인 (True/False).
*   `GET /block/latest`: 현재 DB에 저장된 가장 최신 블록 번호 조회.

---

## 🚀 설치 및 실행

### 1. 환경 설정
`.env` 파일에 필요한 환경 변수를 설정합니다.

```env
DATABASE_URL="file:./dev.db" # SQLite
RPC_URL="https://ethereum-sepolia-rpc.publicnode.com" # Ethereum RPC URL
WS_URL="wss://ethereum-sepolia-rpc.publicnode.com"    # Ethereum WebSocket URL
```

### 2. 설치

```bash
npm install
npx prisma generate
```

### 3. 데이터베이스 마이그레이션

```bash
npx prisma db push
```

### 4. 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run build
npm run start:prod
```

## 🏗️ 아키텍처 (Clean Architecture)

이 프로젝트는 **Layered Architecture**를 기반으로 설계되었습니다.

*   **Domain Layer (`src/indexer/domain`)**:
    *   비즈니스 로직과 핵심 모델(`Block`, `Transaction`, `Log`)이 위치합니다.
    *   외부 의존성이 전혀 없으며(Pure Typescript), 인터페이스(`Port`)를 통해 외부와 소통합니다.
*   **Application Layer (`src/indexer/application`)**:
    *   사용자의 요청(Use Case)을 처리하는 흐름을 제어합니다.
    *   Domain Service를 조합하여 기능을 수행합니다.
*   **Infrastructure Layer (`src/indexer/infrastructure`)**:
    *   Domain Port의 실제 구현체가 위치합니다.
    *   `Prisma`(DB), `Viem`(Blockchain), `NestJS Logger` 등 외부 라이브러리 의존성이 격리되어 있습니다.
*   **Entry Point (`src/indexer/entry-point`)**:
    *   HTTP Controller 등 외부 요청을 받아 Application Layer로 전달하는 진입점입니다.