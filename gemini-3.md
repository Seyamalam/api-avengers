# Api Avengers - Project Review

## Critical Issues & Bugs

## Improvements & Refactoring

### 1. Inconsistent Idempotency Implementation
- **Status:** ✅ Fixed
- **Note:** Refactored `apps/payment` to use the shared `idempotency()` middleware. Updated the middleware to support custom key selection (e.g. from request body) to handle webhooks correctly.

### 2. CI/CD Pipeline
- **Status:** ✅ Fixed
- **Note:** Configured GitHub Container Registry (GHCR) authentication and enabled image pushing. Updated image tags to include the registry prefix `ghcr.io/${{ github.repository_owner }}/`.

### 3. Hardcoded Credentials
- **Status:** ✅ Fixed
- **Note:** Created `.env.example` and `.env` files. Updated `docker-compose.yml` to use environment variables (`${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${JWT_SECRET}`, etc.) instead of hardcoded values.

## Unfinished Deliverables

### 1. Bonus Features
- **Status:** The "Real-time chat support" and "Notification service" mentioned as bonus features in the problem statement are **missing**.
- **Action:** If time permits, implement a simple WebSocket service for notifications or chat.

### 2. Frontend
- **Status:** The frontend (`apps/web`) exists but appears minimal.
- **Action:** Ensure it connects to the Gateway properly and implements the "simple admin panel" requirement effectively.

### 3. End-to-End System Test
- **Status:** While there are integration tests, a script to spin up the full Docker Compose environment and run the `loadtest/main.go` against it (as a "smoke test") would be a valuable addition to the CI/CD pipeline or a separate `test-system.sh` script.

## Summary
The core architecture is sound. The previously reported "Critical Issues" regarding missing services were false alarms. The system is configured to run all services via Docker Compose.

## System Verification
- **Status:** ✅ Verified
- **Note:** Successfully ran `docker compose up` and executed `test-all-services.sh`. All services are healthy, and the full donation flow (Campaign -> Pledge -> Payment -> Event Update) works as expected.

## Load Testing
- **Status:** ✅ Implemented & Verified
- **Details:** Modified `loadtest/main.go` to simulate high concurrency (50 workers) with a user pool of 20 users.
- **Coverage:**
  - **Auth:** User registration and login.
  - **Campaigns:** Creation (admin), Viewing, Listing.
  - **Pledges:** Creation with Idempotency keys.
  - **Payments:** Simulated webhook events (Succeeded) to trigger campaign updates.
- **Verification:** Confirmed via metrics that `/pledges` and `/payments/webhook` are receiving high traffic and processing successfully.

## Grafana & Metrics
- **Status:** ✅ Fixed & Verified
- **Issue:** Dashboards showed "No data" because services were not incrementing business metrics, and dashboard queries used incorrect metric names.
- **Fix:**
  - Updated `packages/common/src/metrics.ts` to include payment metrics.
  - Updated `apps/campaign`, `apps/pledge`, and `apps/payment` to explicitly increment counters/gauges in route handlers and consumers.
  - Updated `infra/grafana/provisioning/dashboards/campaign-metrics.json` to use correct metric names (e.g., `campaigns_total`, `pledges_total`).
  - Rebuilt Docker images to apply code changes.
- **Verification:** Confirmed via `curl` that metrics are now non-zero and updating with load.
