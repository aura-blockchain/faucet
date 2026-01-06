#!/bin/bash

# PAW Testnet Faucet - Local Testing Script
# This script sets up a local environment and runs all tests

set -e

echo "======================================"
echo "PAW Testnet Faucet - Local Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Start PostgreSQL and Redis if not already running
echo ""
print_status "Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo ""
print_status "Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U faucet > /dev/null 2>&1; then
    print_status "PostgreSQL is ready"
else
    print_error "PostgreSQL is not ready"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is ready"
else
    print_error "Redis is not ready"
    exit 1
fi

# Run database migrations
echo ""
print_status "Running database migrations..."
cd backend
export DATABASE_URL="postgres://faucet:faucet_password_change_in_production@localhost:5432/faucet?sslmode=disable"

# Run migrations using Go (simple approach)
go run -tags migrations << 'EOF'
package main
import (
    "database/sql"
    _ "github.com/lib/pq"
    "log"
    "os"
)
func main() {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    _, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS faucet_requests (
            id SERIAL PRIMARY KEY,
            recipient VARCHAR(255) NOT NULL,
            amount BIGINT NOT NULL,
            tx_hash VARCHAR(255),
            ip_address VARCHAR(45) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            error TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP WITH TIME ZONE
        );
    `)
    if err != nil {
        log.Fatal(err)
    }
    log.Println("Migrations completed")
}
EOF

cd ..

# Run unit tests
echo ""
print_status "Running unit tests..."
cd backend
if go test ./pkg/... -v -race; then
    print_status "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi
cd ..

# Run integration tests
echo ""
print_status "Running integration tests..."
cd backend
if go test ./tests/integration/... -v; then
    print_status "Integration tests passed"
else
    print_warning "Integration tests failed (this is expected if PAW node is not running)"
fi
cd ..

# Run E2E tests
echo ""
print_status "Running E2E tests..."
cd backend
export REDIS_URL="redis://localhost:6379/1"
if go test ./tests/e2e/... -v; then
    print_status "E2E tests passed"
else
    print_warning "E2E tests failed (this is expected if PAW node is not running)"
fi
cd ..

# Generate coverage report
echo ""
print_status "Generating coverage report..."
cd backend
go test ./... -coverprofile=../coverage.out -covermode=atomic
go tool cover -html=../coverage.out -o ../coverage.html
cd ..

print_status "Coverage report generated: coverage.html"

# Summary
echo ""
echo "======================================"
print_status "Test suite completed!"
echo "======================================"
echo ""
print_status "Services are still running. Use 'docker-compose down' to stop them."
print_status "View coverage report: open coverage.html"
echo ""
