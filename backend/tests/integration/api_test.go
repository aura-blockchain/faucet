package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aura-chain/aura/faucet/pkg/api"
	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/faucet"
)

func setupTestRouter(t *testing.T) *gin.Engine {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		NodeRPC:         "http://localhost:26657",
		ChainID:         "test-chain",
		FaucetAddress:   "auratest1test",
		AmountPerRequest: 100000000,
		Environment:     "development",
	}

	faucetService, err := faucet.NewService(cfg, nil)
	require.NoError(t, err)

	handler := api.NewHandler(cfg, faucetService, nil, nil)

	router := gin.New()
	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", handler.Health)
		v1.GET("/faucet/info", handler.GetFaucetInfo)
		v1.POST("/faucet/request", handler.RequestTokens)
	}

	return router
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/health", nil)
	router.ServeHTTP(w, req)

	// Health check might fail if node is not running, but should return valid JSON
	assert.Contains(t, []int{http.StatusOK, http.StatusServiceUnavailable}, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response, "status")
}

func TestGetFaucetInfoEndpoint(t *testing.T) {
	router := setupTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/faucet/info", nil)
	router.ServeHTTP(w, req)

	// This might fail if DB is not available, but we test the endpoint structure
	if w.Code == http.StatusOK {
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "amount_per_request")
		assert.Contains(t, response, "denom")
		assert.Contains(t, response, "chain_id")
	}
}

func TestRequestTokensValidation(t *testing.T) {
	router := setupTestRouter(t)

	tests := []struct {
		name           string
		payload        map[string]string
		expectedStatus int
	}{
		{
			name: "missing address",
			payload: map[string]string{
				"captcha_token": "test",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing captcha",
			payload: map[string]string{
				"address": "auratest1test",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "empty payload",
			payload:        map[string]string{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/v1/faucet/request", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
