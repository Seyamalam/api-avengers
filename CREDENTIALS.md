# 🔐 CareForAll Platform - Credentials & Access

## Default Credentials

### 📊 Grafana Dashboard
- **URL:** http://localhost:3000
- **Username:** `admin`
- **Password:** `admin`
- **Note:** You'll be prompted to change the password on first login (optional)

### 🗄️ PostgreSQL Database
**Database Connection:**
- **Host:** localhost
- **Port:** 5432
- **Database:** careforall
- **User:** `user`
- **Password:** `password`

**Connection String:**
```
postgresql://user:password@localhost:5432/careforall
```

**Pre-created Admin User:**
After running migrations, an admin user is automatically created:
- **Email:** `admin@careforall.com`
- **Password:** `admin123`
- **Role:** `admin`

**Direct Database Access:**
```bash
# Using psql
docker-compose exec postgres psql -U user -d careforall

# Using GUI tools
Host: localhost:5432
Database: careforall
Username: user
Password: password
```

### 🔴 Redis Cache
- **URL:** redis://localhost:6379
- **No password required** (development setup)

**Access:**
```bash
# Redis CLI
docker-compose exec redis redis-cli
```

### 📨 NATS Message Broker
- **URL:** nats://localhost:4222
- **Monitoring:** http://localhost:8222
- **No authentication required** (development setup)

### 🔍 Elasticsearch
- **URL:** http://localhost:9200
- **No authentication required** (security disabled for development)

**Test connection:**
```bash
curl http://localhost:9200
```

### 📊 Kibana (Logs)
- **URL:** http://localhost:5601
- **No authentication required**

### 🔭 Jaeger (Tracing)
- **URL:** http://localhost:16686
- **No authentication required**

### 📈 Prometheus (Metrics)
- **URL:** http://localhost:9090
- **No authentication required**

## API Endpoints

### 🚪 API Gateway
- **URL:** http://localhost:8080

**Test Authentication:**
```bash
# Register a new user
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass","role":"user"}'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass"}'

# Use the pre-created admin
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@careforall.com","password":"admin123"}'
```

### 🔐 JWT Secret
**Environment Variable:** `JWT_SECRET`
**Value:** `hackathon-demo-secret-key-change-in-production-environment`

⚠️ **Important:** Change this in production!

## Microservices Direct Access

| Service | Port | URL |
|---------|------|-----|
| Gateway | 8080 | http://localhost:8080 |
| Auth Service | 3001 | http://localhost:3001 |
| Campaign Service | 3002 | http://localhost:3002 |
| Pledge Service | 3003 | http://localhost:3003 |
| Payment Service | 3004 | http://localhost:3004 |
| Frontend | 5173 | http://localhost:5173 |

## Security Notes

### ⚠️ Development Environment
These credentials are for **DEVELOPMENT ONLY**. In production:

1. **Change all default passwords**
2. **Use strong JWT secrets** (generate with `openssl rand -base64 32`)
3. **Enable authentication** on Redis, NATS, Elasticsearch
4. **Use environment variables** instead of hardcoded values
5. **Enable SSL/TLS** for all services
6. **Use secrets management** (e.g., Vault, AWS Secrets Manager)
7. **Enable PostgreSQL SSL** and create dedicated users per service
8. **Set up proper firewall rules**

### 🔒 Production Checklist
- [ ] Change JWT_SECRET
- [ ] Change database passwords
- [ ] Enable Redis authentication
- [ ] Enable NATS authentication
- [ ] Enable Elasticsearch security (x-pack)
- [ ] Set up Grafana OAuth/LDAP
- [ ] Use HTTPS everywhere
- [ ] Enable audit logging
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

## Quick Access Commands

```bash
# View all service logs
docker-compose logs -f

# Access specific service logs
docker-compose logs -f gateway

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# View database tables
docker-compose exec postgres psql -U user -d careforall -c "\dt"

# Check Redis cache
docker-compose exec redis redis-cli KEYS '*'

# View NATS statistics
curl http://localhost:8222/varz

# Test API health
curl http://localhost:8080/health
```

## Creating Custom Admin Users

### Via API:
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-secure-password",
    "role": "admin"
  }'
```

### Via Database:
```bash
# Generate bcrypt hash for your password
bun run -e 'console.log(require("bcryptjs").hashSync("yourpassword", 10))'

# Insert into database
docker-compose exec postgres psql -U user -d careforall -c \
  "INSERT INTO users (email, password, role) VALUES ('your@email.com', 'HASH_HERE', 'admin');"
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/careforall

# Redis
REDIS_URL=redis://redis:6379

# NATS
NATS_URL=nats://nats:4222

# JWT
JWT_SECRET=hackathon-demo-secret-key-change-in-production-environment

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318

# Node Environment
NODE_ENV=development
```

---

**Need Help?** Check the main README.md or QUICKSTART.md for more information.
