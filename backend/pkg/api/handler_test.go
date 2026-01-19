package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/database"
	"github.com/aura-chain/aura/faucet/pkg/faucet"
)

// --- test doubles ---
type mockFaucet struct {
	validateErr     error
	status         *faucet.NodeStatus
	statusErr      error
	balance        int64
	balanceErr     error
	addressBalance int64
	addressErr     error
	sendResp       *faucet.SendResponse
	sendErr        error
}

func (m *mockFaucet) ValidateAddress(address string) error                     { return m.validateErr }
func (m *mockFaucet) GetNodeStatus() (*faucet.NodeStatus, error)               { return m.status, m.statusErr }
func (m *mockFaucet) GetBalance() (int64, error)                               { return m.balance, m.balanceErr }
func (m *mockFaucet) GetAddressBalance(address string) (int64, error)         { return m.addressBalance, m.addressErr }
func (m *mockFaucet) SendTokens(req *faucet.SendRequest) (*faucet.SendResponse, error) { return m.sendResp, m.sendErr }

type mockRateLimiter struct {
	ipLimited        bool
	ipErr            error
	addressLimited   bool
	addrErr          error
	incrementIPErr   error
	incrementAddrErr error
}

func (m *mockRateLimiter) CheckIPLimit(ctx context.Context, ip string) (bool, error)      { return m.ipLimited, m.ipErr }
func (m *mockRateLimiter) CheckAddressLimit(ctx context.Context, address string) (bool, error) { return m.addressLimited, m.addrErr }
func (m *mockRateLimiter) IncrementIPCounter(ctx context.Context, ip string) error        { return m.incrementIPErr }
func (m *mockRateLimiter) IncrementAddressCounter(ctx context.Context, address string) error { return m.incrementAddrErr }
func (m *mockRateLimiter) GetCurrentCount(ctx context.Context, key string) (int, error)   { return 0, nil }

// --- helpers ---
func newTestHandler(cfg *config.Config, f FaucetService, rl RateLimiter) *Handler {
	return NewHandler(cfg, f, rl, nil)
}
func defaultConfig() *config.Config {
	return &config.Config{
		Denom:              "uaura",
		ChainID:            "aura-test",
		AmountPerRequest:   100,
		FaucetAddress:      "aura1faucet",
		MaxRecipientBalance: 0,
	}
}

func newHandlerWithDB(t *testing.T, f FaucetService, rl RateLimiter) (*Handler, sqlmock.Sqlmock) {
	dbConn, mock, err := sqlmock.New()
	require.NoError(t, err)
	return NewHandler(defaultConfig(), f, rl, database.NewWithSQL(dbConn)), mock
}

// --- tests ---
func TestHealthStatuses(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("unhealthy when node unreachable", func(t *testing.T) {
		f := &mockFaucet{statusErr: errors.New("down")}
		h := newTestHandler(defaultConfig(), f, nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		h.Health(c)

		assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	})

	t.Run("syncing when catching up", func(t *testing.T) {
		f := &mockFaucet{status: &faucet.NodeStatus{SyncInfo: struct {
			LatestBlockHeight string "json:\"latest_block_height\""
			CatchingUp        bool   "json:\"catching_up\""
		}{LatestBlockHeight: "10", CatchingUp: true}, NodeInfo: struct {
			Network string "json:\"network\""
			Version string "json:\"version\""
		}{Network: "aura-test"}}}
		h := newTestHandler(defaultConfig(), f, nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		h.Health(c)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("healthy when node ok and redis ok", func(t *testing.T) {
		r := &mockRateLimiter{}
		f := &mockFaucet{status: &faucet.NodeStatus{SyncInfo: struct {
			LatestBlockHeight string "json:\"latest_block_height\""
			CatchingUp        bool   "json:\"catching_up\""
		}{LatestBlockHeight: "20", CatchingUp: false}, NodeInfo: struct {
			Network string "json:\"network\""
			Version string "json:\"version\""
		}{Network: "aura-test"}}}
		h := newTestHandler(defaultConfig(), f, r)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		h.Health(c)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestGetFaucetInfo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Missing DB should 503
	f := &mockFaucet{balance: 50}
		h := NewHandler(defaultConfig(), f, nil, nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		h.GetFaucetInfo(c)
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestRequestTokensValidationAndDependencies(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("rejects invalid body", func(t *testing.T) {
		h := newTestHandler(defaultConfig(), &mockFaucet{}, nil)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/", bytes.NewBufferString("{}"))
		req.Header.Set("Content-Type", "application/json")
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		h.RequestTokens(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects when address invalid", func(t *testing.T) {
		f := &mockFaucet{validateErr: errors.New("bad")}
		h := newTestHandler(defaultConfig(), f, &mockRateLimiter{})
		payload := map[string]string{"address": "bad", "captcha_token": "tok"}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		h.RequestTokens(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("service dependencies missing", func(t *testing.T) {
		f := &mockFaucet{}
		h := newTestHandler(defaultConfig(), f, nil)
		payload := map[string]string{"address": "aura1ok", "captcha_token": "tok"}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		h.RequestTokens(c)
		assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	})

	t.Run("enforces rate limits and balance cap", func(t *testing.T) {
		cfg := defaultConfig()
		cfg.MaxRecipientBalance = 10
		f := &mockFaucet{addressBalance: 11}
		rl := &mockRateLimiter{}
		dbConn, mock, err := sqlmock.New()
		require.NoError(t, err)
		h := NewHandler(cfg, f, rl, database.NewWithConn(dbConn))

		payload := map[string]string{"address": "aura1ok", "captcha_token": "tok"}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE recipient = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`)).WithArgs("aura1ok", sqlmock.AnyArg()).WillReturnRows(sqlmock.NewRows([]string{"id", "recipient", "amount", "tx_hash", "ip_address", "status", "created_at", "completed_at"}))

		h.RequestTokens(c)
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("happy path returns tx hash", func(t *testing.T) {
		cfg := defaultConfig()
		cfg.RequireCaptcha = false
		rl := &mockRateLimiter{}
		f := &mockFaucet{sendResp: &faucet.SendResponse{TxHash: "tx1", Recipient: "a", Amount: 100}}
		dbConn, mock, err := sqlmock.New()
		require.NoError(t, err)
		h := NewHandler(cfg, f, rl, database.NewWithConn(dbConn))

		payload := map[string]string{"address": "aura1ok", "captcha_token": "tok"}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "127.0.0.1:1234"
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE recipient = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`)).WithArgs("aura1ok", sqlmock.AnyArg()).WillReturnRows(sqlmock.NewRows([]string{"id", "recipient", "amount", "tx_hash", "ip_address", "status", "created_at", "completed_at"}))

		h.RequestTokens(c)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp map[string]interface{}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "tx1", resp["tx_hash"])
		require.NoError(t, mock.ExpectationsWereMet())
	})
}
