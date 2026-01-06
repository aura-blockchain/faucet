package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	// Set test environment variables
	os.Setenv("NODE_RPC", "http://test-node:26657")
	os.Setenv("CHAIN_ID", "test-chain")
	os.Setenv("FAUCET_MNEMONIC", "test mnemonic")
	os.Setenv("DATABASE_URL", "postgres://test")
	os.Setenv("REDIS_URL", "redis://test")
	defer func() {
		os.Unsetenv("NODE_RPC")
		os.Unsetenv("CHAIN_ID")
		os.Unsetenv("FAUCET_MNEMONIC")
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("REDIS_URL")
	}()

	cfg, err := Load()
	require.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "http://test-node:26657", cfg.NodeRPC)
	assert.Equal(t, "test-chain", cfg.ChainID)
	assert.Equal(t, "test mnemonic", cfg.FaucetMnemonic)
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load()
	require.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "development", cfg.Environment)
	assert.Equal(t, int64(100000000), cfg.AmountPerRequest)
	assert.False(t, cfg.RequireCaptcha)
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		config  *Config
		wantErr bool
	}{
		{
			name: "valid config",
			config: &Config{
				NodeRPC:          "http://localhost:26657",
				ChainID:          "test-chain",
				FaucetMnemonic:   "test mnemonic",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 100,
				Environment:      "development",
				RequireCaptcha:   false,
			},
			wantErr: false,
		},
		{
			name: "missing NodeRPC",
			config: &Config{
				ChainID:          "test-chain",
				FaucetMnemonic:   "test mnemonic",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 100,
			},
			wantErr: true,
		},
		{
			name: "missing ChainID",
			config: &Config{
				NodeRPC:          "http://localhost:26657",
				FaucetMnemonic:   "test mnemonic",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 100,
			},
			wantErr: true,
		},
		{
			name: "missing faucet credentials",
			config: &Config{
				NodeRPC:          "http://localhost:26657",
				ChainID:          "test-chain",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 100,
			},
			wantErr: true,
		},
		{
			name: "invalid amount",
			config: &Config{
				NodeRPC:          "http://localhost:26657",
				ChainID:          "test-chain",
				FaucetMnemonic:   "test mnemonic",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 0,
			},
			wantErr: true,
		},
		{
			name: "production without captcha",
			config: &Config{
				NodeRPC:          "http://localhost:26657",
				ChainID:          "test-chain",
				FaucetMnemonic:   "test mnemonic",
				DatabaseURL:      "postgres://test",
				RedisURL:         "redis://test",
				AmountPerRequest: 100,
				Environment:      "production",
				RequireCaptcha:   true,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRateLimitConfig(t *testing.T) {
	cfg := &Config{
		RateLimitPerIP:      10,
		RateLimitPerAddress: 1,
		RateLimitWindow:     24 * time.Hour,
	}

	rateLimitCfg := cfg.RateLimitConfig()
	assert.Equal(t, 10, rateLimitCfg["per_ip"])
	assert.Equal(t, 1, rateLimitCfg["per_address"])
	assert.Equal(t, 24*time.Hour, rateLimitCfg["window"])
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_VAR", "test_value")
	defer os.Unsetenv("TEST_VAR")

	value := getEnv("TEST_VAR", "default")
	assert.Equal(t, "test_value", value)

	value = getEnv("NONEXISTENT_VAR", "default")
	assert.Equal(t, "default", value)
}

func TestGetEnvAsInt(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")

	value := getEnvAsInt("TEST_INT", 0)
	assert.Equal(t, 42, value)

	value = getEnvAsInt("NONEXISTENT_INT", 10)
	assert.Equal(t, 10, value)

	os.Setenv("INVALID_INT", "not_a_number")
	defer os.Unsetenv("INVALID_INT")
	value = getEnvAsInt("INVALID_INT", 10)
	assert.Equal(t, 10, value)
}
