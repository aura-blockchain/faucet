# AURA Testnet Faucet

A production-ready testnet faucet service for the AURA blockchain with rate limiting, captcha protection, and comprehensive monitoring.

## Features

- **Rate Limiting**: Per-address and per-IP limits to prevent abuse
- **Captcha Protection**: Cloudflare Turnstile integration
- **Database Tracking**: PostgreSQL for request history and analytics
- **Real-time Statistics**: Track distribution metrics
- **Health Monitoring**: Comprehensive health check endpoints
- **Docker Support**: Production-ready Docker Compose setup

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone and configure
git clone https://github.com/aura-blockchain/faucet.git
cd faucet
cp .env.example .env
# Edit .env with your settings

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Local Development

```bash
# Install Go 1.21+
# Install PostgreSQL 15+ and Redis 7+

# Configure
cp .env.example .env
# Edit .env with your settings

# Run
go run backend/main.go
```

The faucet runs on `http://localhost:8080` by default.

## Configuration

### Environment Variables

| Variable           | Description                  | Default                  |
| ------------------ | ---------------------------- | ------------------------ |
| `CHAIN_ID`         | Chain identifier             | `aura-mvp-1`             |
| `NODE_RPC`         | RPC endpoint                 | `http://127.0.0.1:10657` |
| `NODE_REST`        | REST API endpoint            | `http://127.0.0.1:10317` |
| `FAUCET_ADDRESS`   | Faucet wallet address        | Required                 |
| `FAUCET_MNEMONIC`  | Faucet wallet mnemonic       | Required (secret)        |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret  | Required for captcha     |
| `DATABASE_URL`     | PostgreSQL connection string | `postgres://...`         |
| `REDIS_URL`        | Redis connection string      | `redis://localhost:6379` |
| `PORT`             | Server port                  | `8080`                   |

### config.yml Reference

The `config.yml` file contains operational parameters:

```yaml
# Network Configuration
chain_id: "aura-mvp-1"
denom: "uaura"
prefix: "aura"

# Token Distribution
amount_per_request: 200000000 # 200 AURA per request
daily_faucet_cap: 40000000000 # 40,000 AURA daily limit
max_recipient_balance: 1000000000 # Max 1,000 AURA to receive

# Rate Limiting - Per Address
address_cooldown_hours: 4 # 4 hours between requests
address_window_seconds: 86400 # 24-hour window
address_max_per_window: 2 # Max 2 requests/day

# Rate Limiting - Per IP
ip_window_seconds: 86400 # 24-hour window
ip_max_per_window: 5 # Max 5 requests/IP/day

# Transaction Settings
gas_limit: 200000
gas_price: "0.001uaura"

# Captcha
require_captcha: true

# CORS
cors_origins:
  - "https://testnet-faucet.aurablockchain.org"
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service health status including database and node connectivity.

### Faucet Info

```bash
GET /info
```

Returns faucet configuration (limits, cooldowns, etc.).

**Response:**

```json
{
  "chain_id": "aura-mvp-1",
  "denom": "uaura",
  "amount_per_request": "200000000",
  "daily_remaining": "39800000000",
  "address_cooldown_hours": 4,
  "captcha_required": true
}
```

### Request Tokens

```bash
POST /faucet
Content-Type: application/json

{
  "address": "aura1abc123...",
  "captcha_token": "turnstile_response_token"
}
```

**Success Response:**

```json
{
  "status": "success",
  "tx_hash": "ABC123...",
  "amount": "200000000",
  "denom": "uaura"
}
```

**Error Responses:**

- `400`: Invalid address format
- `429`: Rate limit exceeded
- `503`: Node unavailable or faucet depleted

### Recent Transactions

```bash
GET /transactions?limit=10
```

Returns recent faucet transactions.

### Statistics

```bash
GET /stats
```

Returns distribution statistics.

**Response:**

```json
{
  "total_distributed": "1500000000000",
  "total_requests": 7500,
  "unique_addresses": 2340,
  "today_distributed": "12000000000",
  "today_requests": 60
}
```

## Frontend Integration

### Turnstile Setup

Add Cloudflare Turnstile to your frontend:

```html
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<div
  class="cf-turnstile"
  data-sitekey="YOUR_SITE_KEY"
  data-callback="onTurnstileSuccess"
></div>

<script>
  function onTurnstileSuccess(token) {
    // Include token in faucet request
    fetch("/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: walletAddress,
        captcha_token: token,
      }),
    });
  }
</script>
```

## Database Schema

```sql
CREATE TABLE faucet_requests (
  id SERIAL PRIMARY KEY,
  address VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  tx_hash VARCHAR(64),
  amount BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_address (address),
  INDEX idx_ip (ip_address),
  INDEX idx_created (created_at)
);
```

## Monitoring

### Health Checks

```bash
# Full health check
curl http://localhost:8080/health

# Response includes:
# - Database connectivity
# - Redis connectivity
# - Node RPC status
# - Faucet wallet balance
```

### Prometheus Metrics

Metrics available at `/metrics`:

- `faucet_requests_total` - Total requests by status
- `faucet_tokens_distributed` - Total tokens distributed
- `faucet_wallet_balance` - Current faucet balance
- `faucet_rate_limit_hits` - Rate limit rejections

## Production Deployment

### Security Checklist

- [ ] Set strong `FAUCET_MNEMONIC` (never commit)
- [ ] Configure `TURNSTILE_SECRET` for captcha
- [ ] Set `ADMIN_API_KEY` for admin endpoints
- [ ] Configure CORS origins for your domain
- [ ] Enable TLS termination (nginx/traefik)
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Regular database backups

### Docker Compose Production

```yaml
version: "3.8"
services:
  faucet:
    image: ghcr.io/aura-blockchain/faucet:latest
    environment:
      - NODE_RPC=http://sentry:26657
      - DATABASE_URL=postgres://user:pass@db:5432/faucet
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    ports:
      - "8080:8080"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    volumes:
      - faucet_db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: faucet
      POSTGRES_USER: faucet
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - faucet_redis:/data

volumes:
  faucet_db:
  faucet_redis:
```

## Maintenance

### Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U faucet faucet > backup.sql

# Restore
docker-compose exec -T db psql -U faucet faucet < backup.sql
```

### View Logs

```bash
# All services
docker-compose logs -f

# Faucet only
docker-compose logs -f faucet
```

### Service Health

```bash
# Check all services
docker-compose ps

# Restart faucet
docker-compose restart faucet
```

## Troubleshooting

### Common Issues

**"Rate limit exceeded"**

- Wait for cooldown period (4 hours default)
- Check if IP is shared (VPN, corporate network)

**"Invalid address"**

- Ensure address starts with `aura1`
- Check address length (typically 43 characters)

**"Faucet depleted"**

- Daily cap reached, resets at midnight (configured timezone)
- Contact team if persistent

**"Node unavailable"**

- Check RPC/REST endpoint connectivity
- Verify node is synced

## Development

### Running Tests

```bash
go test ./...
```

### Building

```bash
go build -o faucet ./backend/main.go
```

## Links

- [AURA Documentation](https://docs.aurablockchain.org)
- [Testnet Explorer](https://testnet-explorer.aurablockchain.org)
- [Discord Support](https://discord.gg/RwQ8pma6)
- [GitHub Issues](https://github.com/aura-blockchain/faucet/issues)

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
