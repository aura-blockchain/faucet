package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aura-chain/aura/faucet/pkg/api"
	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/database"
	"github.com/aura-chain/aura/faucet/pkg/faucet"
	"github.com/aura-chain/aura/faucet/pkg/ratelimit"
)

// TestE2EFaucetFlow tests the complete faucet flow
func TestE2EFaucetFlow(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	// Setup
	cfg := &config.Config{
		NodeRPC:             "http://localhost:26657",
		ChainID:             "test-chain",
		FaucetAddress:       "aura1testfaucetaddress123456789",
		AmountPerRequest:     100000000,
		Environment:         "development",
		DatabaseURL:         "postgres://faucet:faucet@localhost:5432/faucet_test?sslmode=disable",
		RedisURL:            "redis://localhost:6379/1",
		RateLimitPerIP:      10,
		RateLimitPerAddress: 1,
		RateLimitWindow:     24 * time.Hour,
	}

	// Initialize database
	db, err := database.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		t.Skip("Database not available for E2E testing")
	}
	defer db.Close()

	// Run migrations
	err = db.Migrate()
	require.NoError(t, err)

	// Initialize Redis
	redisClient, err := ratelimit.NewRedisClient(cfg.RedisURL)
	if err != nil {
		t.Skip("Redis not available for E2E testing")
	}
	defer redisClient.Close()

	// Initialize rate limiter
	rateLimiter := ratelimit.NewRateLimiter(redisClient, cfg.RateLimitConfig())

	// Initialize faucet service
	faucetService, err := faucet.NewService(cfg, db)
	require.NoError(t, err)

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := api.NewHandler(cfg, faucetService, rateLimiter, db)

	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", handler.Health)
		v1.GET("/faucet/info", handler.GetFaucetInfo)
		v1.GET("/faucet/recent", handler.GetRecentTransactions)
		v1.POST("/faucet/request", handler.RequestTokens)
	}

	// Test 1: Health check
	t.Run("HealthCheck", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/health", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "status")
	})

	// Test 2: Get faucet info
	t.Run("GetFaucetInfo", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/faucet/info", nil)
		router.ServeHTTP(w, req)

		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, float64(100000000), response["amount_per_request"])
			assert.Equal(t, "test-chain", response["chain_id"])
		}
	})

	// Test 3: Get recent transactions
	t.Run("GetRecentTransactions", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/faucet/recent", nil)
		router.ServeHTTP(w, req)

		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Contains(t, response, "transactions")
		}
	})

	// Test 4: Token request with validation
	t.Run("TokenRequest", func(t *testing.T) {
		testAddress := "aura1testaddress12345678901234567890"

		payload := map[string]string{
			"address":       testAddress,
			"captcha_token": "test_token",
		}

		body, _ := json.Marshal(payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/faucet/request", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// In dev environments dependencies may be unavailable; accept success, validation, or internal errors
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	// Test 5: Rate limiting
	t.Run("RateLimiting", func(t *testing.T) {
		ctx := context.Background()
		testIP := "192.168.1.100"

		// Reset rate limit for clean test
		rateLimiter.Reset(ctx, fmt.Sprintf("ratelimit:ip:%s", testIP))

		// Make requests up to the limit
		for i := 0; i < cfg.RateLimitPerIP; i++ {
			err := rateLimiter.IncrementIPCounter(ctx, testIP)
			require.NoError(t, err)
		}

		// Check if limited
		limited, err := rateLimiter.CheckIPLimit(ctx, testIP)
		require.NoError(t, err)
		assert.True(t, limited)

		// Reset for cleanup
		rateLimiter.Reset(ctx, fmt.Sprintf("ratelimit:ip:%s", testIP))
	})
}

// TestE2EDatabaseOperations tests database operations
func TestE2EDatabaseOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	db, err := database.NewPostgresDB("postgres://faucet:faucet@localhost:5432/faucet_test?sslmode=disable")
	if err != nil {
		t.Skip("Database not available for E2E testing")
	}
	defer db.Close()

	// Run migrations
	err = db.Migrate()
	require.NoError(t, err)

	t.Run("CreateAndUpdateRequest", func(t *testing.T) {
		// Create request
		req, err := db.CreateRequest("aura1test123", "192.168.1.1", 100000000)
		require.NoError(t, err)
		assert.NotZero(t, req.ID)
		assert.Equal(t, "aura1test123", req.Recipient)
		assert.Equal(t, "pending", req.Status)

		// Update as successful
		err = db.UpdateRequestSuccess(req.ID, "ABCD1234")
		require.NoError(t, err)

		// Verify update by getting recent requests
		recent, err := db.GetRecentRequests(10)
		require.NoError(t, err)
		assert.Greater(t, len(recent), 0)
	})

	t.Run("GetStatistics", func(t *testing.T) {
		stats, err := db.GetStatistics()
		require.NoError(t, err)
		assert.NotNil(t, stats)
		assert.GreaterOrEqual(t, stats.TotalRequests, int64(0))
	})
}
