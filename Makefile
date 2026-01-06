.PHONY: help build test run clean docker-up docker-down migrate lint

help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## Build the backend binary
	cd backend && go build -o ../bin/faucet-server main.go

test: ## Run all tests
	cd backend && go test ./... -v -race

test-coverage: ## Run tests with coverage
	cd backend && go test ./... -coverprofile=../coverage.out
	cd backend && go tool cover -html=../coverage.out -o ../coverage.html

test-unit: ## Run unit tests only
	cd backend && go test ./pkg/... -v

test-integration: ## Run integration tests
	cd backend && go test ./tests/integration/... -v

test-e2e: ## Run E2E tests (requires services running)
	cd backend && go test ./tests/e2e/... -v

run: ## Run the application locally
	cd backend && go run main.go

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## View logs from all services
	docker-compose logs -f

docker-build: ## Build Docker images
	docker-compose build

migrate: ## Run database migrations
	cd backend && go run scripts/migrate.go

lint: ## Run linters
	cd backend && golangci-lint run

fmt: ## Format Go code
	cd backend && go fmt ./...

deps: ## Download dependencies
	cd backend && go mod download
	cd backend && go mod tidy

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html
	cd backend && go clean

setup-dev: ## Setup development environment
	@echo "Installing dependencies..."
	cd backend && go mod download
	@echo "Creating .env file..."
	cp .env.example .env
	@echo "Starting database and redis..."
	docker-compose up -d postgres redis
	@echo "Waiting for services to be ready..."
	sleep 5
	@echo "Running migrations..."
	make migrate
	@echo "Development environment ready!"

setup-prod: ## Setup production environment
	@echo "Building production Docker images..."
	docker-compose build
	@echo "Production environment ready. Don't forget to configure .env!"

check: ## Run all checks (fmt, lint, test)
	make fmt
	make lint
	make test

install-tools: ## Install development tools
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

.DEFAULT_GOAL := help
