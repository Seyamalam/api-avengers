# 🔒 Security Implementation Guide

## Overview
CareForAll implements multiple layers of security to protect user data and prevent common vulnerabilities.

## 1. Authentication & Authorization

### JWT-Based Authentication
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Token Expiry**: 24 hours
- **Secret Management**: Environment variable `JWT_SECRET` (minimum 32 characters)

### Token Structure
```json
{
  "id": 123,
  "role": "user",
  "email": "user@example.com",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Protected Endpoints

#### Public (No Auth Required)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /campaigns` - List campaigns
- `GET /campaigns/:id` - View campaign details

#### Authenticated (JWT Required)
- `POST /pledges` - Create donation
- `GET /pledges/:id` - View pledge details
- `POST /payments/process` - Process payment

#### Admin Only (JWT + Role=admin)
- `POST /campaigns` - Create campaign
- `PUT /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign

### Implementation

**Gateway-Level Protection:**
```typescript
// Public routes (no auth)
app.post('/auth/register', proxy(SERVICES.auth));
app.post('/auth/login', proxy(SERVICES.auth));

// Authenticated routes
app.post('/pledges', jwtAuth(), proxy(SERVICES.pledge));

// Admin-only routes
app.post('/campaigns', jwtAuth(), requireRole('admin'), proxy(SERVICES.campaign));
```

**Middleware Chain:**
1. `jwtAuth()` - Verifies JWT token validity
2. `requireRole('admin')` - Checks user role
3. Token payload stored in context: `c.get('user')`

## 2. Idempotency Protection

### Purpose
Prevent duplicate charges from retried webhooks or network issues.

### Implementation
- **Storage**: Redis with 24-hour expiry
- **Key Format**: `webhook:{eventId}` or `idempotency:{key}`
- **Header**: `x-idempotency-key`

### Example Flow
```bash
# First request
curl -X POST /pledges \
  -H "x-idempotency-key: pledge-abc123" \
  -d '{"campaignId": 1, "amount": 100}'
# → Creates pledge

# Duplicate request (same key)
curl -X POST /pledges \
  -H "x-idempotency-key: pledge-abc123" \
  -d '{"campaignId": 1, "amount": 100}'
# → Returns cached response, no duplicate charge
```

### Protected Endpoints
- `POST /pledges` - Pledge creation
- `POST /payments/webhook` - Payment webhooks

## 3. State Machine Protection

### Purpose
Prevent invalid state transitions (e.g., CAPTURED → AUTHORIZED).

### Valid Transitions
```
PENDING → AUTHORIZED → CAPTURED
PENDING → CAPTURED (direct)
PENDING → FAILED
AUTHORIZED → FAILED

CAPTURED (terminal - no transitions allowed)
FAILED (terminal - no transitions allowed)
```

### Implementation
```typescript
// Validate transition before applying
if (!canTransition(currentStatus, newStatus)) {
  logger.warn(`Invalid transition: ${currentStatus} → ${newStatus}`);
  return; // Reject transition
}
```

### Out-of-Order Webhook Handling
If webhooks arrive out of order:
1. `succeeded` webhook arrives → Status: CAPTURED
2. `authorized` webhook arrives → Rejected (can't go CAPTURED → AUTHORIZED)

## 4. Input Validation

### Request Validation
All endpoints use Zod schemas for type-safe validation:

```typescript
const createPledgeSchema = z.object({
  campaignId: z.number().positive(),
  userId: z.number().positive().optional(),
  amount: z.number().positive().min(1),
});
```

### Validation Errors
Returns `400 Bad Request` with detailed error messages:
```json
{
  "error": "Validation failed",
  "details": [
    "amount must be greater than 0"
  ]
}
```

## 5. Rate Limiting

### Status
⚠️ **Planned but not yet implemented**

### Recommendation
Add Redis-based rate limiting in gateway:
```typescript
app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
}));
```

## 6. CORS Configuration

### Allowed Origins
- `http://localhost:5173` (Development frontend)
- `http://localhost:3000` (Grafana)

### Allowed Headers
- `Content-Type`
- `Authorization`
- `x-idempotency-key`

### Configuration
```typescript
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
  credentials: true,
}));
```

## 7. Secrets Management

### Environment Variables
- **JWT_SECRET**: Minimum 32 characters, never hardcode
- **DATABASE_URL**: Contains credentials, never log
- **REDIS_URL**: Contains connection details

### Validation
System validates secrets at startup:
```typescript
validateEnv({
  required: ['JWT_SECRET', 'DATABASE_URL'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});
validateJWTSecret(); // Warns if using default/weak secret
```

### Best Practices
1. ✅ Use environment variables
2. ✅ Validate at startup
3. ✅ Never commit secrets to git
4. ✅ Use `.env.example` as template
5. ⚠️ Rotate secrets regularly in production

## 8. SQL Injection Protection

### ORM Usage
Using Drizzle ORM with parameterized queries:
```typescript
// SAFE - Parameterized query
await db.query.users.findFirst({
  where: eq(users.email, email),
});

// SAFE - Prepared statement
await db.update(campaigns)
  .set({ currentAmount: sql`${campaigns.currentAmount} + ${amount}` })
  .where(eq(campaigns.id, campaignId));
```

### Never Use String Concatenation
❌ **AVOID:**
```typescript
db.execute(`SELECT * FROM users WHERE email = '${email}'`);
```

## 9. Password Security

### Implementation
- **Algorithm**: bcrypt
- **Salt Rounds**: 10 (automatic)
- **Storage**: Hashed passwords only

```typescript
// Registration
const hashedPassword = await bcrypt.hash(password, 10);

// Login
const isValid = await bcrypt.compare(password, user.password);
```

### Password Requirements
⚠️ **Current**: Minimum 6 characters  
✅ **Recommended**: Implement stronger requirements:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers
- Special characters

## 10. Logging & Monitoring

### Security Events Logged
- ✅ Failed authentication attempts
- ✅ Invalid JWT tokens
- ✅ Role-based access denials
- ✅ Duplicate webhook attempts
- ✅ Invalid state transitions

### Log Format
Structured JSON logging:
```json
{
  "level": "warn",
  "msg": "Access denied for user 123 with role user. Required: admin",
  "timestamp": "2025-11-21T10:30:00Z"
}
```

### Sensitive Data
Never log:
- Passwords (plain or hashed)
- JWT tokens
- Full credit card numbers
- Database credentials

## 11. Error Handling

### Secure Error Messages
```typescript
// ✅ GOOD - Generic error
return c.json({ error: 'Authentication failed' }, 401);

// ❌ BAD - Leaks info
return c.json({ error: 'User not found in database' }, 401);
```

### Production vs Development
- **Development**: Detailed errors with stack traces
- **Production**: Generic errors, details in logs only

## 12. Dependency Security

### Audit
```bash
bun audit
```

### Update Policy
- Update dependencies regularly
- Review security advisories
- Pin versions in production

## 13. Database Security

### Connection Security
- ✅ Connection pooling configured
- ✅ Prepared statements for queries
- ✅ Row-level locking (`FOR UPDATE SKIP LOCKED`)
- ⚠️ Consider connection encryption (SSL/TLS)

### Access Control
- Dedicated database user per service
- Least privilege principle
- Read-only replicas for reporting

## 14. Webhook Security

### Idempotency
Prevents duplicate processing of webhooks.

### Future Enhancements
1. **Signature Verification**: Verify webhook signatures from payment provider
2. **IP Whitelisting**: Only accept webhooks from known IPs
3. **Timestamp Validation**: Reject old webhooks

```typescript
// Example signature verification
const signature = c.req.header('x-webhook-signature');
const payload = await c.req.text();
const computed = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

if (signature !== computed) {
  return c.json({ error: 'Invalid signature' }, 401);
}
```

## 15. Security Checklist

### ✅ Implemented
- [x] JWT authentication with expiry
- [x] Role-based access control (RBAC)
- [x] Idempotency protection
- [x] State machine validation
- [x] Input validation (Zod schemas)
- [x] CORS configuration
- [x] Password hashing (bcrypt)
- [x] SQL injection protection (ORM)
- [x] Environment variable validation
- [x] Structured security logging
- [x] Secure error messages

### 🔄 Recommended Enhancements
- [ ] Rate limiting
- [ ] Webhook signature verification
- [ ] Request size limits
- [ ] DDoS protection (WAF)
- [ ] Database connection encryption
- [ ] API versioning
- [ ] Security headers (Helmet.js)
- [ ] Content Security Policy
- [ ] Session management improvements
- [ ] Two-factor authentication (2FA)

## Testing Security

### Authentication Tests
```bash
# Test protected endpoint without auth
curl http://localhost:8080/pledges
# → 401 Unauthorized

# Test with invalid token
curl http://localhost:8080/pledges \
  -H "Authorization: Bearer invalid-token"
# → 401 Invalid token

# Test admin endpoint as regular user
curl http://localhost:8080/campaigns \
  -X POST \
  -H "Authorization: Bearer <user-token>" \
  -d '{"title": "Test"}'
# → 403 Insufficient permissions
```

### Idempotency Tests
```bash
# Create pledge twice with same key
curl -X POST http://localhost:8080/pledges \
  -H "x-idempotency-key: test-123" \
  -d '{"campaignId": 1, "amount": 100}'
# → Check that only one pledge created
```

## Incident Response

### If Security Breach Detected
1. Rotate JWT_SECRET immediately
2. Invalidate all active sessions
3. Audit logs for unauthorized access
4. Notify affected users
5. Update security measures
6. Document lessons learned

## Compliance

### GDPR Considerations
- User data stored: email, passwords (hashed)
- Right to deletion: Implement user account deletion
- Data portability: Provide user data export
- Consent: Terms of service acceptance

### PCI DSS (Future)
If handling real payments:
- Never store credit card numbers
- Use certified payment processor
- Implement additional audit logging
- Regular security testing

---

**Security Contact**: Report vulnerabilities via GitHub Issues (private).

**Last Updated**: November 21, 2025
