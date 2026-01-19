package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

// PORT SENTINEL REQUIRED FOR PRODUCTION
// -----------------------------------------------------------------------------
// Default port values in this file are for LOCAL DEVELOPMENT ONLY.
// For production deployments, ALL ports must be allocated via Port Sentinel
// to prevent conflicts with other services:
//
//   python scripts/port_sentinel.py allocate faucet_backend --project aura
//   python scripts/port_sentinel.py allocate faucet_node_rpc --project aura
//   python scripts/port_sentinel.py allocate faucet_node_rest --project aura
//
// Then set PORT, NODE_RPC, NODE_REST environment variables accordingly.
// Run `python scripts/port_sentinel.py verify` before AND after config changes.
// -----------------------------------------------------------------------------

// Config holds all application configuration
type Config struct {
	// Server configuration
	Port        string
	Environment string
	CORSOrigins []string
	Version     string

	// Blockchain configuration
	NodeRPC          string
	NodeREST         string
	ChainID          string
	FaucetMnemonic   string
	FaucetAddress    string
	FaucetBinary     string
	FaucetHome       string
	FaucetKey        string
	FaucetKeyring    string
	Denom            string
	AmountPerRequest int64

	// Database configuration
	DatabaseURL string

	// Redis configuration
	RedisURL string

	// Rate limiting configuration
	RateLimitPerIP      int
	RateLimitPerAddress int
	RateLimitWindow     time.Duration

	// Access control configuration
	MaxRecipientBalance int64
	AllowedIPs          []string
	AllowedAddresses    []string

	// Captcha configuration
	TurnstileSecret string
	RequireCaptcha  bool

	// Transaction configuration
	GasLimit        uint64
	GasPrice        string
	TransactionMemo string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	environment := getEnv("ENVIRONMENT", "development")
	cfg := &Config{
		// DEV ONLY defaults - use Port Sentinel for production port allocation
		Port:        getEnv("PORT", "8080"),
		Environment: environment,
		CORSOrigins: strings.Split(getEnv("CORS_ORIGINS", "*"), ","),
		Version:     getEnv("FAUCET_VERSION", "1.0.0"),

		// DEV ONLY defaults - production MUST use Port Sentinel allocated ports
		NodeRPC:          getEnv("NODE_RPC", "http://localhost:26657"),
		NodeREST:         getEnv("NODE_REST", getEnv("NODE_API", "http://localhost:1317")),
		ChainID:          getEnv("CHAIN_ID", "aura-mvp-1"),
		FaucetMnemonic:   getEnv("FAUCET_MNEMONIC", ""),
		FaucetAddress:    getEnv("FAUCET_ADDRESS", ""),
		FaucetBinary:     getEnv("FAUCET_BINARY", ""),
		FaucetHome:       getEnv("FAUCET_HOME", ""),
		FaucetKey:        getEnv("FAUCET_KEY", ""),
		FaucetKeyring:    getEnv("FAUCET_KEYRING", "test"),
		Denom:            getEnv("DENOM", getEnv("FAUCET_DENOM", "uaura")),
		AmountPerRequest: getEnvAsInt64("AMOUNT_PER_REQUEST", 100000000), // 100 AURA

		DatabaseURL: getEnv("DATABASE_URL", "postgres://faucet:faucet@localhost:5432/faucet?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),

		RateLimitPerIP:      getEnvAsInt("RATE_LIMIT_PER_IP", 10),
		RateLimitPerAddress: getEnvAsInt("RATE_LIMIT_PER_ADDRESS", 1),
		RateLimitWindow:     time.Duration(getEnvAsInt("RATE_LIMIT_WINDOW_HOURS", 24)) * time.Hour,

		TurnstileSecret: getEnv("TURNSTILE_SECRET", ""),
		RequireCaptcha:  getEnvAsBool("TURNSTILE_REQUIRED", strings.ToLower(environment) == "production"),

		MaxRecipientBalance: getEnvAsInt64("MAX_RECIPIENT_BALANCE", 0),
		AllowedIPs:          splitCSV(getEnv("FAUCET_ALLOWED_IPS", "")),
		AllowedAddresses:    splitCSV(getEnv("FAUCET_ALLOWED_ADDRESSES", "")),

		GasLimit:        uint64(getEnvAsInt("GAS_LIMIT", 200000)),
		GasPrice:        getEnv("GAS_PRICE", "0.025uaura"),
		TransactionMemo: getEnv("TRANSACTION_MEMO", "AURA Testnet Faucet"),
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.NodeRPC == "" {
		return errors.New("NODE_RPC is required")
	}

	if c.ChainID == "" {
		return errors.New("CHAIN_ID is required")
	}

	// Support both modes: direct key management (FAUCET_MNEMONIC/FAUCET_ADDRESS)
	// or binary-based execution (FAUCET_BINARY/FAUCET_KEY)
	hasMnemonicOrAddress := c.FaucetMnemonic != "" || c.FaucetAddress != ""
	hasBinaryKey := c.FaucetBinary != "" && c.FaucetKey != ""
	if !hasMnemonicOrAddress && !hasBinaryKey {
		return errors.New("either FAUCET_MNEMONIC/FAUCET_ADDRESS or FAUCET_BINARY/FAUCET_KEY is required")
	}

	// Database and Redis are optional - if not provided, in-memory tracking is used
	// if c.DatabaseURL == "" {
	// 	return errors.New("DATABASE_URL is required")
	// }
	// if c.RedisURL == "" {
	// 	return errors.New("REDIS_URL is required")
	// }

	if c.AmountPerRequest <= 0 {
		return errors.New("AMOUNT_PER_REQUEST must be positive")
	}

	if c.RequireCaptcha && c.TurnstileSecret == "" {
		return errors.New("TURNSTILE_SECRET is required when captcha is enabled")
	}

	if c.MaxRecipientBalance < 0 {
		return errors.New("MAX_RECIPIENT_BALANCE must be zero or positive")
	}

	return nil
}

// RateLimitConfig returns rate limit configuration
func (c *Config) RateLimitConfig() map[string]interface{} {
	return map[string]interface{}{
		"per_ip":      c.RateLimitPerIP,
		"per_address": c.RateLimitPerAddress,
		"window":      c.RateLimitWindow,
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as an integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

// getEnvAsInt64 gets an environment variable as an int64 or returns a default value
func getEnvAsInt64(key string, defaultValue int64) int64 {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
		return value
	}
	return defaultValue
}

// getEnvAsBool gets an environment variable as a bool or returns a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := strings.ToLower(strings.TrimSpace(getEnv(key, "")))
	if valueStr == "" {
		return defaultValue
	}

	switch valueStr {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return defaultValue
	}
}

func splitCSV(value string) []string {
	if value == "" {
		return []string{}
	}

	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
