# Bank Service

A mock banking service that simulates real payment processing for the CareForAll donation platform.

## Overview

The Bank Service provides realistic payment authorization and capture functionality, mimicking how actual payment processors work. It maintains customer accounts with balances and implements a two-phase payment flow:

1. **Authorization** - Verifies funds and places a hold
2. **Capture** - Converts the hold into an actual charge

## Features

- ✅ Account balance verification
- ✅ Authorization (hold placement)
- ✅ Capture (fund deduction)
- ✅ Hold release (cancellation)
- ✅ Transaction history
- ✅ Multiple account support
- ✅ Insufficient funds handling
- ✅ Hold expiration (24 hours)

## Database Schema

### Tables

#### `bank_accounts`
Stores customer account information
- `id` - Primary key
- `account_number` - Unique account identifier (e.g., ACC001)
- `account_holder_name` - Customer name
- `email` - Customer email
- `balance` - Current account balance
- `currency` - Currency code (default: USD)
- `is_active` - Account status
- `created_at`, `updated_at` - Timestamps

#### `bank_transactions`
Records all financial transactions
- `id` - Primary key
- `transaction_id` - UUID for the transaction
- `account_id` - Foreign key to bank_accounts
- `type` - Transaction type (DEBIT, CREDIT, HOLD, RELEASE)
- `amount` - Transaction amount
- `balance_before`, `balance_after` - Balance snapshots
- `reference` - External reference (e.g., pledge_123)
- `status` - Transaction status (COMPLETED, PENDING, FAILED, REVERSED)
- `description` - Human-readable description
- `created_at` - Timestamp

#### `bank_holds`
Tracks active payment holds
- `id` - Primary key
- `hold_id` - UUID for the hold
- `account_id` - Foreign key to bank_accounts
- `amount` - Hold amount
- `reference` - External reference
- `status` - Hold status (ACTIVE, CAPTURED, RELEASED, EXPIRED)
- `expires_at` - Expiration timestamp (24 hours from creation)
- `created_at`, `completed_at` - Timestamps

## API Endpoints

### POST `/bank/authorize`
Places a hold on funds

**Request:**
```json
{
  "accountNumber": "ACC001",
  "amount": 100.00,
  "reference": "pledge_123",
  "description": "Donation pledge #123"
}
```

**Response:**
```json
{
  "success": true,
  "holdId": "uuid-here",
  "message": "Payment authorized"
}
```

### POST `/bank/capture`
Captures a hold and deducts funds

**Request:**
```json
{
  "holdId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "uuid-here",
  "message": "Payment captured"
}
```

### POST `/bank/release`
Releases a hold without charging

**Request:**
```json
{
  "holdId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hold released"
}
```

### POST `/bank/check-balance`
Checks if account has sufficient funds

**Request:**
```json
{
  "accountNumber": "ACC001",
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "balance": 9500.00
}
```

### GET `/bank/account/:accountNumber`
Gets account details

**Response:**
```json
{
  "accountNumber": "ACC001",
  "accountHolderName": "John Doe",
  "email": "john.doe@example.com",
  "balance": 10000.00,
  "heldAmount": 500.00,
  "availableBalance": 9500.00,
  "currency": "USD",
  "isActive": true
}
```

### GET `/bank/account/:accountNumber/transactions`
Gets transaction history

**Response:**
```json
{
  "transactions": [
    {
      "transactionId": "uuid",
      "type": "DEBIT",
      "amount": 100.00,
      "balanceBefore": 10000.00,
      "balanceAfter": 9900.00,
      "reference": "pledge_123",
      "status": "COMPLETED",
      "description": "Payment capture for pledge_123",
      "createdAt": "2025-11-21T10:00:00Z"
    }
  ]
}
```

## Test Accounts

The service is pre-seeded with 60 test accounts (ACC001-ACC060):

### Regular Accounts
- `ACC001` - John Doe - $10,000
- `ACC002` - Jane Smith - $5,000
- `ACC003` - Bob Johnson - $25,000
- ... (many more)

### Special Test Cases
- `ACC051` - Poor Pete - $10 (insufficient funds testing)
- `ACC052` - Broke Betty - $25 (insufficient funds testing)
- `ACC053` - Empty Emma - $5 (insufficient funds testing)
- `ACC054` - Inactive Ivan - $5,000 (inactive account testing)

### Wealthy Accounts (for large donations)
- `ACC055` - Rich Richard - $500,000
- `ACC056` - Wealthy Wendy - $750,000
- `ACC057` - Millionaire Mike - $1,500,000
- `ACC058` - Billionaire Bill - $10,000,000

### Standard Test Accounts
- `ACC030` - Bruce Wayne - $1,000,000
- `ACC048` - Tony Stark - $999,999

## Payment Flow

### Normal Flow
1. Client calls `/bank/authorize` with account and amount
2. Bank service verifies balance and creates hold
3. Returns `holdId`
4. Later, client calls `/bank/capture` with `holdId`
5. Bank service deducts funds and records transaction

### Failed Scenarios

**Insufficient Funds:**
```json
{
  "success": false,
  "error": "Insufficient funds",
  "balance": 25.00
}
```

**Account Not Found:**
```json
{
  "success": false,
  "error": "Account not found"
}
```

**Inactive Account:**
```json
{
  "success": false,
  "error": "Account is not active"
}
```

**Hold Expired:**
```json
{
  "success": false,
  "error": "Hold has expired"
}
```

## Integration with Payment Service

The Payment Service acts as the intermediary between pledges and the bank:

1. **Authorization Phase:**
   - Payment service receives pledge with account number
   - Calls bank `/authorize` endpoint
   - Bank verifies and holds funds
   - Returns holdId to payment service
   - Payment service sends "authorized" webhook

2. **Capture Phase:**
   - Payment service calls bank `/capture` with holdId
   - Bank deducts funds and records transaction
   - Returns transactionId
   - Payment service sends "captured" webhook

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@postgres:5432/careforall
PORT=3005
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

## Running Locally

```bash
# Install dependencies
bun install

# Run the service
bun run apps/bank/src/index.ts

# With watch mode
bun run --watch apps/bank/src/index.ts
```

## Docker

The service runs on port 3005 in the docker-compose setup:

```yaml
bank:
  build: .
  command: ["bun", "run", "apps/bank/src/index.ts"]
  ports:
    - "3005:3005"
  environment:
    - DATABASE_URL=postgresql://user:password@postgres:5432/careforall
    - PORT=3005
```

## Monitoring

- Health check: `GET /health`
- Metrics: `GET /metrics`
- Logs: Structured JSON logging via Winston
- Tracing: OpenTelemetry integration

## Testing

Example test scenario:

```bash
# 1. Check balance
curl -X POST http://localhost:3005/bank/check-balance \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "ACC001", "amount": 100}'

# 2. Authorize payment
curl -X POST http://localhost:3005/bank/authorize \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "ACC001", "amount": 100, "reference": "test_123"}'

# 3. Capture payment
curl -X POST http://localhost:3005/bank/capture \
  -H "Content-Type: application/json" \
  -d '{"holdId": "hold-id-from-step-2"}'

# 4. Check transaction history
curl http://localhost:3005/bank/account/ACC001/transactions
```

## Error Handling

The service implements proper error handling for:
- Invalid account numbers
- Insufficient funds
- Expired holds
- Duplicate authorizations (returns existing hold)
- Database errors
- Network timeouts

## Security Considerations

**Note:** This is a mock service for hackathon demonstration purposes. In production:

- Add authentication/authorization
- Implement rate limiting
- Add fraud detection
- Encrypt sensitive data
- Use HTTPS
- Implement audit logging
- Add PCI compliance measures
