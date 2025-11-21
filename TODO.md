# CareForAll - Microservices Hackathon Project Plan

## Tech Stack

*   **Runtime**: Bun
*   **Framework**: Hono
*   **Testing**: Bun Test
*   **Database**: PostgreSQL (with Drizzle ORM)
*   **Caching/Locking**: Redis
*   **Messaging**: NATS
*   **Frontend**: React + Vite + TanStack Query + Shadcn UI
*   **Observability**: OpenTelemetry, Jaeger, Prometheus, Grafana
*   **Infrastructure**: Docker Compose (Strictly self-contained, no external SaaS)

---

## Phase 1: Infrastructure & Monorepo Setup

- [ ] **Initialize Monorepo**
    - [ ] Set up Bun workspaces (`bun init`).
    - [ ] Configure `package.json` workspaces for `apps/*` and `packages/*`.
    - [ ] Set up TypeScript configuration (`tsconfig.base.json`).
    - [ ] Configure ESLint and Prettier.

- [ ] **Docker Infrastructure**
    - [ ] Create `docker-compose.yml`.
    - [ ] Service: PostgreSQL (Primary DB).
    - [ ] Service: Redis (Cache & Distributed Locks).
    - [ ] Service: NATS (Message Broker).
    - [ ] Service: Jaeger (Tracing).
    - [ ] Service: Prometheus (Metrics).
    - [ ] Service: Grafana (Visualization).
    - [ ] Ensure all services are networked correctly and persistent volumes are configured.

## Phase 2: Shared Libraries (`packages/`)

- [ ] **Database Package (`packages/db`)**
    - [ ] Setup Drizzle ORM configuration.
    - [ ] Create migration scripts/helpers.
    - [ ] Define base schema types.

- [ ] **Event Bus Package (`packages/events`)**
    - [ ] Implement NATS client wrapper.
    - [ ] Define standard event envelope structure.
    - [ ] Create typed publishers and subscribers.

- [ ] **Common Middleware (`packages/common`)**
    - [ ] **Idempotency Middleware**: Implement using Redis to prevent duplicate request processing (Idempotency Keys).
    - [ ] **Error Handling**: Standardized error responses (RFC 7807).
    - [ ] **Logging**: Structured logging setup (Pino or similar).
    - [ ] **Validation**: Zod schemas for request validation.

- [ ] **Observability Package (`packages/telemetry`)**
    - [ ] Configure OpenTelemetry SDK for Node/Bun.
    - [ ] Setup auto-instrumentation for Hono, HTTP, and PG.

## Phase 3: Core Services (`apps/`)

### Auth Service
- [ ] Setup Hono app structure.
- [ ] Implement User Registration.
- [ ] Implement Login (JWT issuance).
- [ ] Implement Role-Based Access Control (RBAC) middleware.

### Campaign Service (Read-Heavy)
- [ ] **Write Side**:
    - [ ] CRUD APIs for Campaigns (Create, Update, Close).
    - [ ] Publish `CampaignCreated` / `CampaignUpdated` events to NATS.
- [ ] **Read Side**:
    - [ ] Implement CQRS pattern.
    - [ ] Consumer: Listen to Campaign events and update Redis cache.
    - [ ] Public API: Fetch campaigns from Redis (fallback to DB).

### Pledge Service (High Consistency)
- [ ] **State Machine**:
    - [ ] Define states: `PENDING` -> `CONFIRMED` | `FAILED`.
- [ ] **Transactional Outbox**:
    - [ ] Implement Outbox pattern to atomically save pledge and queue event.
    - [ ] Background worker to process Outbox table and publish to NATS.
- [ ] **Concurrency Control**:
    - [ ] Use Redis distributed locks or Optimistic Concurrency Control (OCC) for inventory/limits.

### Payment Service
- [ ] **Mock Provider**:
    - [ ] Simulate external payment gateway latency and success/failure rates.
- [ ] **Webhooks**:
    - [ ] Implement idempotent webhook receiver for payment status updates.
    - [ ] Publish `PaymentSucceeded` / `PaymentFailed` events.

### API Gateway
- [ ] Setup Hono as a Gateway.
- [ ] Implement Proxying to internal services.
- [ ] Centralized Authentication verification (JWT validation).
- [ ] Rate Limiting (Redis-based).

## Phase 4: Frontend (`apps/web`)

- [ ] **Setup**:
    - [ ] Initialize Vite + React + TypeScript.
    - [ ] Install TanStack Query and Shadcn UI.
- [ ] **Public Flow**:
    - [ ] Landing Page: List active campaigns (Cached).
    - [ ] Donation Modal: Multi-step form for pledging.
    - [ ] Success/Failure feedback.
- [ ] **Admin Dashboard**:
    - [ ] Login/Auth protection.
    - [ ] Campaign Management (Create/Edit).
    - [ ] Real-time donation feed (via NATS/WebSocket or Polling).

## Phase 5: Observability & CI/CD

- [ ] **Tracing Verification**:
    - [ ] Ensure trace context propagation works across Gateway -> Service -> NATS -> Worker.
    - [ ] Verify traces appear in Jaeger.
- [ ] **Metrics**:
    - [ ] Expose `/metrics` endpoint in all services.
    - [ ] Create Grafana dashboard for Request Rate, Latency, and Error Rate.
- [ ] **CI/CD**:
    - [ ] GitHub Actions workflow for `bun test`.
    - [ ] Linting and Type checking checks.
    - [ ] Docker build verification.
