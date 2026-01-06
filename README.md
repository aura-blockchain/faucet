# Faucet

Testnet faucet service.

## Run with Docker Compose

```bash
cd faucet
cp .env.example .env
# edit .env

docker-compose up -d
```

## Run locally

```bash
cd faucet
cp .env.example .env
# edit .env

go run backend/main.go
```

The service defaults to `http://localhost:8080`.
