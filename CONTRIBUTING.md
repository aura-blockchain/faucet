# Contributing to AURA Faucet

Thank you for your interest in contributing to the AURA Faucet!

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+ (for frontend)
- Access to a running AURA testnet node

### Development Setup

```bash
# Clone the repository
git clone https://github.com/aura-blockchain/faucet.git
cd faucet

# Install Go dependencies
go mod download

# Build the faucet
go build -o faucet ./cmd/faucet

# Run locally (requires config)
./faucet --config config.yaml
```

## How to Contribute

### Reporting Issues

1. Search existing issues before creating a new one
2. Use the issue templates provided
3. Include version info and steps to reproduce

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `go test ./...`
5. Commit with clear messages
6. Push and open a PR

### Code Style

- Follow Go conventions and `gofmt`
- Use meaningful variable and function names
- Add comments for exported functions
- Keep functions focused and testable

### Commit Messages

```
type: short description

Longer description if needed.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...
```

## Questions?

- Open a GitHub Discussion
- Join [Discord](https://discord.gg/aurablockchain)
