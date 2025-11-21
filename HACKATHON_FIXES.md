# CareForAll - Hackathon Priority Fixes

## 🎯 CRITICAL PATH (Must Complete)

- [ ] **1. Fix Frontend TypeScript Error** (2 min) ⚡
  - Location: `apps/web/src/App.tsx:59`
  - Change: `e.target.value` → `e.currentTarget.value`

- [ ] **2. Add Database Migration Setup** (10 min)
  - Add migration scripts to package.json
  - Create initial migration command
  - Document in README

- [ ] **3. Campaign Total Update Consumer** (30 min) 🔥
  - Create `apps/campaign/src/consumers.ts`
  - Subscribe to `pledge.updated` events
  - Update `currentAmount` when pledge = CAPTURED
  - Invalidate Redis cache

- [ ] **4. Add Campaign Listing Endpoint** (10 min)
  - GET `/campaigns` with pagination
  - List active campaigns
  - Use Redis caching

- [ ] **5. Improve State Machine** (20 min)
  - Add AUTHORIZED state to schema
  - Implement proper transition validation
  - Handle out-of-order webhooks correctly

- [ ] **6. Add Unit Tests** (60 min)
  - Payment webhook idempotency test
  - State machine transition tests
  - Outbox pattern test

- [ ] **7. Add Architecture Diagram** (15 min)
  - Create Mermaid diagram in README
  - Show all services and data flows

- [ ] **8. Create Admin Panel** (60 min)
  - Basic campaign CRUD UI
  - Campaign status management
  - Pledge monitoring view

- [ ] **9. Add Observability** (45 min)
  - Expose `/metrics` endpoints (Prometheus)
  - Add Elasticsearch + Kibana to docker-compose
  - Configure log shipping to ES

- [ ] **10. Create CI/CD Pipeline** (45 min)
  - GitHub Actions workflow
  - Run tests on PR
  - Smart service detection
  - Semantic versioning

## 🔧 HIGH PRIORITY (Time Permitting)

- [ ] **11. Gateway Authentication** (20 min)
  - Add JWT verification middleware
  - Protect routes appropriately

- [ ] **12. Implement FOR UPDATE SKIP LOCKED** (15 min)
  - Fix outbox worker concurrency
  - Proper row locking

- [ ] **13. Add Health Checks** (20 min)
  - Check DB/Redis/NATS connectivity
  - Proper Docker healthchecks

- [ ] **14. Environment Variable Validation** (10 min)
  - Create .env.example
  - Validate required vars at startup

- [ ] **15. Add CORS Configuration** (5 min)
  - Configure in gateway

## 📋 NICE TO HAVE

- [ ] Graceful shutdown handlers
- [ ] Rate limiting in gateway
- [ ] API versioning
- [ ] Multi-stage Docker builds
- [ ] Stress testing scenario
- [ ] Request correlation IDs
- [ ] Circuit breakers

---

## Current Status: Starting Fixes...
