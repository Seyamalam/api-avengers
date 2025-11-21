# CareForAll - Microservices Hackathon Solution

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
        WORKER[Pledge Worker<br/>Outbox Pattern]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Port 5432)]
        REDIS[(Redis Cache<br/>Port 6379)]
    end
    
    subgraph "Messaging"
        NATS[NATS JetStream<br/>Port 4222]
    end
    
    subgraph "Observability"
        JAEGER[Jaeger<br/>Port 16686]
        PROM[Prometheus<br/>Port 9090]
        GRAFANA[Grafana<br/>Port 3000]
    end
    
    WEB -->|HTTP| GW
    GW -->|Proxy| AUTH
    GW -->|Proxy| CAMPAIGN
    GW -->|Proxy| PLEDGE
    GW -->|Proxy| PAYMENT
    
    AUTH -->|Read/Write| PG
    CAMPAIGN -->|Read/Write| PG
    CAMPAIGN -->|Cache| REDIS
    PLEDGE -->|Read/Write| PG
    PLEDGE -->|Idempotency| REDIS
    PAYMENT -->|Idempotency| REDIS
    
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
    GW -.->|Traces| JAEGER
    
    AUTH -.->|Metrics| PROM
    CAMPAIGN -.->|Metrics| PROM
    PLEDGE -.->|Metrics| PROM
    PAYMENT -.->|Metrics| PROM
    
    PROM -->|Visualize| GRAFANA
```

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
