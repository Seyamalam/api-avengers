# CareForAll - Microservices Hackathon Solution

## 🚀 Project Status: Checkpoints 1 & 2 Completed

We have successfully designed, implemented, and verified the core architecture and functionality of the **CareForAll** platform.

### ✅ Checkpoint 1: Architecture & Design
- **Microservices Architecture**: Decomposed into **Auth, Campaign, Pledge, Payment, Bank, Gateway, Notification, and Chat** services.
- **Fault Tolerance**:
  - **Idempotency**: Implemented in the Payment service using Redis to prevent duplicate charges from webhook retries.
  - **Outbox Pattern**: Implemented in the Pledge service to ensure atomic database writes and event publishing.
- **Scalability Strategy**:
  - **Horizontal Scaling**: Services are stateless and containerized. We demonstrated this by configuring the **Pledge Service** with `replicas: 2` in `docker-compose.yml`.
  - **Database Replication**: Read replicas configured for PostgreSQL to handle high read traffic.
- **Data Models**: robust schemas defined using **Drizzle ORM** in `packages/db`.

### ✅ Checkpoint 2: Core Implementation
- **Full Backend Implementation**: All core services are fully functional with inter-service communication via **NATS** and HTTP.
- **Frontend Application**: A React-based web app featuring:
  - **Admin Dashboard**: Full campaign management (Create, Update, Delete).
  - **User Dashboard**: Transparent donation history and real-time campaign updates.
  - **Real-time Chat**: Bonus feature implemented for user support.
- **Payment Reliability**:
  - **Idempotency**: Verified with unit tests (`apps/payment/test/idempotency.test.ts`).
  - **Transaction Safety**: Bank service uses database transactions for atomic balance updates.
- **Testing**: Unit tests implemented for **Campaign, Pledge, Payment, and Bank** services.
- **Bonus Features**:
  - **Real-time Chat**: Implemented using WebSockets.
  - **Notifications**: Event-driven notification system.

### ✅ Checkpoint 4: CI/CD Pipeline
- **GitHub Actions Workflow**: A comprehensive pipeline defined in `.github/workflows/ci-cd.yml`.
- **Intelligent Change Detection**: Uses `dorny/paths-filter` to run tests and builds **only for modified services**, optimizing CI time.
- **Semantic Versioning**: Automatically reads the version from each service's `package.json` (e.g., `v1.0.2`) to tag Docker images.
- **Docker Registry**: Builds and pushes images to **GitHub Container Registry (GHCR)** with semantic tags and `latest`.
- **Bonus: Automated Deployment**: The pipeline includes a `deploy-bonus` job that spins up the entire system using `docker compose up` to verify end-to-end deployment readiness.

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend"
        WEB[React Web App<br/>Port 5173]
    end
    
    subgraph "API Layer"
        GW[API Gateway<br/>Port 8080]
    end
    
    subgraph "Microservices"
        AUTH[Auth Service<br/>Port 3001]
        CAMPAIGN[Campaign Service<br/>Port 3002]
        PLEDGE[Pledge Service<br/>Port 3003]
        PAYMENT[Payment Service<br/>Port 3004]
        BANK[Bank Service<br/>Port 3005]
        NOTIF[Notification Service<br/>Port 3006]
        CHAT[Chat Service<br/>Port 3007]
        WORKER[Pledge Worker<br/>Outbox Pattern]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL Main<br/>Port 5432)]
        PG_BANK[(PostgreSQL Bank<br/>Port 5433)]
        PG_REP[(PostgreSQL Replica<br/>Port 5434)]
        REDIS[(Redis Cache<br/>Port 6379)]
        REDIS_REP[(Redis Replica<br/>Port 6380)]
    end
    
    subgraph "Messaging"
        NATS[NATS JetStream<br/>Port 4222]
    end
    
    subgraph "Observability"
        JAEGER[Jaeger<br/>Port 16686]
        PROM[Prometheus<br/>Port 9090]
        GRAFANA[Grafana<br/>Port 3000]
        KIBANA[Kibana<br/>Port 5601]
    end
    
    WEB -->|HTTP| GW
    GW -->|Proxy| AUTH
    GW -->|Proxy| CAMPAIGN
    GW -->|Proxy| PLEDGE
    GW -->|Proxy| PAYMENT
    GW -->|Proxy| BANK
    GW -->|Proxy| NOTIF
    GW -->|Proxy| CHAT
    
    AUTH -->|Read/Write| PG
    CAMPAIGN -->|Read/Write| PG
    CAMPAIGN -->|Cache| REDIS
    PLEDGE -->|Read/Write| PG
    PLEDGE -->|Idempotency| REDIS
    PAYMENT -->|Idempotency| REDIS
    BANK -->|Read/Write| PG_BANK
    
    PG -.->|Replication| PG_REP
    REDIS -.->|Replication| REDIS_REP
    
    PLEDGE -->|Outbox Events| PG
    WORKER -->|Poll & Publish| PG
    WORKER -->|Publish| NATS
    CAMPAIGN -->|Publish| NATS
    PAYMENT -->|Publish| NATS
    
    CAMPAIGN -->|Subscribe| NATS
    PLEDGE -->|Subscribe| NATS
    
    AUTH -.->|Traces| JAEGER
    CAMPAIGN -.->|Traces| JAEGER
    PLEDGE -.->|Traces| JAEGER
    PAYMENT -.->|Traces| JAEGER
    BANK -.->|Traces| JAEGER
    GW -.->|Traces| JAEGER
    
    AUTH -.->|Metrics| PROM
    CAMPAIGN -.->|Metrics| PROM
    PLEDGE -.->|Metrics| PROM
    PAYMENT -.->|Metrics| PROM
    BANK -.->|Metrics| PROM
    
    PROM -->|Visualize| GRAFANA
```

## Service Registry

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | `5173` | React Web Application |
| **API Gateway** | `8080` | Unified entry point for all APIs |
| **Auth Service** | `3001` | Authentication & Authorization |
| **Campaign Service** | `3002` | Campaign management & public listing |
| **Pledge Service** | `3003` | Donation processing & state machine |
| **Payment Service** | `3004` | Payment gateway integration |
| **Bank Service** | `3005` | Simulated banking system (Isolated DB) |
| **Notification Service** | `3006` | Real-time WebSocket notifications |
| **Chat Service** | `3007` | Real-time WebSocket chat rooms |

## Infrastructure Components

| Component | Port | Description |
|-----------|------|-------------|
| **PostgreSQL (Main)** | `5432` | Primary database for core services |
| **PostgreSQL (Bank)** | `5433` | Dedicated database for Bank Service |
| **PostgreSQL (Replica)** | `5434` | Read replica for Main DB |
| **Redis (Primary)** | `6379` | Cache & Pub/Sub |
| **Redis (Replica)** | `6380` | Read replica for Redis |
| **NATS** | `4222` | Message Broker (JetStream enabled) |
| **Jaeger** | `16686` | Distributed Tracing UI |
| **Prometheus** | `9090` | Metrics Collection |
| **Grafana** | `3000` | Metrics Visualization |
| **Kibana** | `5601` | Log Analysis |

## Key Design Patterns

### 🔄 Transactional Outbox Pattern
- Pledge Service writes events to outbox table in same transaction as pledge
- Separate worker polls outbox and publishes to NATS
- Guarantees at-least-once delivery without distributed transactions

### 🎯 State Machine
- Pledge status transitions: `PENDING → AUTHORIZED → CAPTURED` or `FAILED`
- Prevents invalid state transitions (e.g., CAPTURED → AUTHORIZED)
- Handles out-of-order webhook delivery

### 🔑 Idempotency
- Payment webhooks use Redis to detect duplicate events
- Pledge creation supports `x-idempotency-key` header
- Prevents double-charging users

### 📊 CQRS (Command Query Responsibility Segregation)
- Campaign Service uses Redis for read-optimized queries
- Write operations invalidate cache and publish events
- Separates read and write concerns for scalability

## Architecture
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL + Drizzle ORM
- **Messaging**: NATS
- **Caching**: Redis
- **Frontend**: React + Vite
- **Observability**: OpenTelemetry + Jaeger + Prometheus + Grafana

## Prerequisites
- Docker & Docker Compose
- Bun (optional, for local dev)

## Running the System

1. **Start Infrastructure & Services**:
   ```bash
   docker-compose up --build
   ```

2. **Initialize Database** (first time only):
   ```bash
   # Generate migration files
   bun run db:generate
   
   # Apply migrations to database
   bun run db:push
   ```

3. **Access Points**:
   - **Frontend**: http://localhost:5173 (Run locally with `cd apps/web && bun dev` for now, or add to docker)
   - **API Gateway**: http://localhost:8080
   - **Jaeger UI** (Tracing): http://localhost:16686
   - **Grafana** (Metrics): http://localhost:3000 (admin/admin)
   - **Prometheus**: http://localhost:9090
   - **Kibana** (Logs): http://localhost:5601
   - **Elasticsearch**: http://localhost:9200

## Services
- **Auth**: User management & JWT.
- **Campaign**: Campaign CRUD & Read Models.
- **Pledge**: Donation processing with State Machine & Outbox.
- **Payment**: Mock payment provider & Idempotent Webhooks.
- **Gateway**: API Gateway.

## Development
- Run `bun install` to install dependencies.
- Run `bun run dev` in specific app folders.

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Setup and testing instructions for judges
- **[Credentials & Access](./CREDENTIALS.md)** - 🔑 All login credentials, database access, and service URLs
- **[Security Documentation](./SECURITY.md)** - Authentication, authorization, and security best practices
- **[Progress Tracker](./HACKATHON_FIXES.md)** - Implementation status and checklist
- **[Test Results](./TEST_RESULTS.md)** - Latest system test results
- **[Test Script](./test-all-services.sh)** - Comprehensive automated testing
- **[Environment Variables](./.env.example)** - Configuration template

## 🎁 Bonus Features

We have gone above and beyond to implement real-time features using WebSockets:

### 🔔 Notification Service (Port 3006)
- **Real-time Updates**: Broadcasts system events (Campaign Created, Pledge Made, Payment Succeeded) to connected clients.
- **Tech Stack**: Hono, Bun, NATS (Sub), WebSockets.
- **Integration**: Subscribes to NATS subjects and pushes updates to the frontend.

### 💬 Chat Service (Port 3007)
- **Real-time Chat**: Allows users to join rooms and chat in real-time.
- **Tech Stack**: Hono, Bun, WebSockets.
- **Features**: Room management, user presence, message broadcasting.

### 🐳 Dockerized Everything
- All services, including the new Notification and Chat services, are fully containerized and orchestrated via `docker-compose`.

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based authentication** with 24-hour token expiry
- **Role-based access control (RBAC)** for admin operations
- **Password hashing** with bcrypt (10 rounds)
- **Protected endpoints** require valid JWT tokens

### Data Protection
- **Idempotency protection** prevents duplicate charges
- **State machine validation** prevents invalid transitions
- **Input validation** with Zod schemas on all endpoints
- **SQL injection protection** via Drizzle ORM

### Security Monitoring
- **Structured logging** of authentication events
- **Health checks** verify all service dependencies
- **Environment validation** at startup
- **CORS configuration** restricts origins

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation.

## 🧪 Testing

Run the complete test suite:
```bash
bun test
```

Run specific tests:
```bash
bun test packages/common/test/state-machine.test.ts
bun test apps/payment/test/idempotency.test.ts
```

Run system integration test:
```bash
./test-system.sh
```

## 📊 Monitoring & Observability

### Traces (Jaeger)
View end-to-end request traces at http://localhost:16686
- Select service to trace
- View distributed spans across microservices
- Analyze latency bottlenecks

### Metrics (Prometheus + Grafana)
- **Prometheus**: http://localhost:9090 - Query metrics directly
- **Grafana**: http://localhost:3000 - Visualize metrics (admin/admin)
- All services expose `/metrics` endpoints

### Logs (Elasticsearch + Kibana)
- **Kibana**: http://localhost:5601 - Search and analyze logs
- **Elasticsearch**: http://localhost:9200 - Log storage
- Structured JSON logging across all services

## 🏗️ Project Structure

```
api-avengers/
├── apps/
│   ├── auth/          # Authentication service (JWT)
│   ├── campaign/      # Campaign management + CQRS
│   ├── pledge/        # Pledge processing + Outbox pattern
│   ├── payment/       # Payment provider simulation
│   ├── gateway/       # API Gateway + routing
│   └── web/           # React frontend + Admin panel
├── packages/
│   ├── common/        # Shared utilities (logger, middleware, state machine)
│   ├── db/            # Database schema + Drizzle ORM
│   ├── events/        # NATS client wrapper
│   └── telemetry/     # OpenTelemetry configuration
├── infra/
│   └── prometheus/    # Prometheus configuration
├── .github/
│   └── workflows/     # CI/CD pipeline
└── docker-compose.yml # Full stack orchestration
```

## 🚀 CI/CD Pipeline

GitHub Actions workflow provides:
- ✅ Automated testing on PR
- ✅ Type checking and linting
- ✅ Smart service detection (only builds changed services)
- ✅ Docker image building with semantic versioning
- ✅ Integration tests with real services

## 🎯 Key Features Demonstrated

### 1. Transactional Outbox Pattern
Ensures reliable event publishing without distributed transactions.

### 2. State Machine
Prevents invalid pledge state transitions with proper validation.

### 3. Idempotency
Protects against duplicate payments via Redis-backed idempotency keys.

### 4. CQRS
Campaign service separates reads (Redis cache) from writes (PostgreSQL).

### 5. Event-Driven Architecture
Services communicate via NATS for loose coupling.

### 6. Observability
Full tracing, metrics, and logging infrastructure.

## 🔒 Security Considerations

- JWT-based authentication (Auth service)
- Idempotency keys prevent duplicate charges
- State machine prevents backward transitions
- Environment variables for secrets (see .env.example)

## 📈 Scalability

Scale services independently:
```bash
docker-compose up -d --scale pledge=3 --scale campaign=2
```

Features supporting high load:
- Redis caching for read-heavy operations
- Outbox pattern with concurrent workers
- NATS for async communication
- Database connection pooling

## 👥 Team

Built for the API Avengers Microservices Hackathon.

## 📝 License

MIT
