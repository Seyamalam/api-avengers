# 🚀 Quick Start Guide

## Prerequisites
- Docker & Docker Compose
- Bun (optional, for local development)
- Git

## Setup & Run (For Judges)

### 1. Clone and Start
```bash
# Clone the repository
git clone https://github.com/Seyamalam/api-avengers.git
cd api-avengers

# Start entire system
docker-compose up --build -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

### 2. Initialize Database
```bash
# Generate and apply migrations
bun install
bun run db:push
```

### 3. Run System Test
```bash
# Execute end-to-end test
./test-system.sh
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **API Gateway** | http://localhost:8080 | - |
| **Jaeger (Tracing)** | http://localhost:16686 | - |
| **Prometheus (Metrics)** | http://localhost:9090 | - |
| **Grafana (Dashboards)** | http://localhost:3000 | admin/admin |
| **Kibana (Logs)** | http://localhost:5601 | - |
| **Elasticsearch** | http://localhost:9200 | - |

## Manual Testing Flow

### 1. Create a Campaign (Admin)
```bash
curl -X POST http://localhost:8080/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Medical Emergency Fund",
    "description": "Support medical treatments",
    "goalAmount": 50000
  }'
```

### 2. Make a Donation
```bash
curl -X POST http://localhost:8080/pledges \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: pledge-123" \
  -d '{
    "campaignId": 1,
    "amount": 1000
  }'
```

### 3. Simulate Payment Success
```bash
curl -X POST http://localhost:8080/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_123",
    "pledgeId": 1,
    "status": "succeeded"
  }'
```

### 4. Verify Campaign Total Updated
```bash
curl http://localhost:8080/campaigns/1
```

## Testing Key Features

### ✅ Idempotency
Send the same request twice with same `x-idempotency-key`:
```bash
# First request
curl -X POST http://localhost:8080/pledges \
  -H "x-idempotency-key: test-123" \
  -H "Content-Type: application/json" \
  -d '{"campaignId": 1, "amount": 100}'

# Second request (same key) - should return cached response
curl -X POST http://localhost:8080/pledges \
  -H "x-idempotency-key: test-123" \
  -H "Content-Type: application/json" \
  -d '{"campaignId": 1, "amount": 100}'
```

### ✅ State Machine
Try invalid transitions:
```bash
# This should fail - can't go from CAPTURED to AUTHORIZED
curl -X POST http://localhost:8080/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_captured",
    "pledgeId": 1,
    "status": "succeeded"
  }'

# Then try to send authorized (should be ignored)
curl -X POST http://localhost:8080/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_authorized",
    "pledgeId": 1,
    "status": "authorized"
  }'
```

### ✅ Outbox Pattern
Watch the outbox worker process events:
```bash
docker-compose logs -f pledge-worker
```

### ✅ Observability

**Tracing (Jaeger):**
1. Go to http://localhost:16686
2. Select service: `pledge-service`
3. Click "Find Traces"
4. View end-to-end trace of donation flow

**Metrics (Prometheus):**
1. Go to http://localhost:9090
2. Query: `up`
3. See all services up and running

**Logs (Kibana):**
1. Go to http://localhost:5601
2. Create index pattern: `logs-*`
3. View structured logs from all services

## Scalability Demo

Scale services with Docker Compose:
```bash
# Scale pledge service to 3 replicas
docker-compose up -d --scale pledge=3

# Scale campaign service to 2 replicas
docker-compose up -d --scale campaign=2

# Verify scaling
docker-compose ps
```

## Running Tests

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run specific test suite
bun test packages/common/test/state-machine.test.ts
bun test apps/payment/test/idempotency.test.ts
```

## Development Mode

```bash
# Install dependencies
bun install

# Start infrastructure only
docker-compose up postgres redis nats jaeger prometheus grafana -d

# Run services locally
cd apps/auth && bun run dev &
cd apps/campaign && bun run dev &
cd apps/pledge && bun run dev &
cd apps/payment && bun run dev &
cd apps/gateway && bun run dev &
cd apps/web && bun run dev &
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

### Database connection issues
```bash
# Ensure database is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
bun run db:push
```

### Port conflicts
If ports are in use, modify `docker-compose.yml` port mappings.

## Stopping the System

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## CI/CD

GitHub Actions automatically:
- ✅ Runs tests on every PR
- ✅ Type checks code
- ✅ Builds Docker images on main branch
- ✅ Smart service detection (only tests changed services)

View pipeline: `.github/workflows/ci-cd.yml`

## Architecture

See `README.md` for full architecture diagram and design patterns.
