package api

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/database"
	"github.com/aura-chain/aura/faucet/pkg/faucet"
	"github.com/aura-chain/aura/faucet/pkg/ratelimit"
)

// Handler handles HTTP requests
type Handler struct {
	cfg         *config.Config
	faucet      *faucet.Service
	rateLimiter *ratelimit.RateLimiter
	db          *database.DB
}

// TokenRequest represents a faucet token request
type TokenRequest struct {
	Address      string `json:"address" binding:"required"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

// TurnstileResponse represents Turnstile verification response
type TurnstileResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
}

// NewHandler creates a new API handler
func NewHandler(cfg *config.Config, faucetService *faucet.Service, rateLimiter *ratelimit.RateLimiter, db *database.DB) *Handler {
	return &Handler{
		cfg:         cfg,
		faucet:      faucetService,
		rateLimiter: rateLimiter,
		db:          db,
	}
}

// Health returns the health status of the service
func (h *Handler) Health(c *gin.Context) {
	ctx := context.Background()

	// Check node status
	status, err := h.faucet.GetNodeStatus()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "blockchain node unreachable",
		})
		return
	}

	// Check if node is syncing
	if status.SyncInfo.CatchingUp {
		c.JSON(http.StatusOK, gin.H{
			"status":  "syncing",
			"network": status.NodeInfo.Network,
			"height":  status.SyncInfo.LatestBlockHeight,
		})
		return
	}

	// Check Redis
	if _, err := h.rateLimiter.GetCurrentCount(ctx, "health_check"); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "redis unreachable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"network": status.NodeInfo.Network,
		"height":  status.SyncInfo.LatestBlockHeight,
	})
}

// GetFaucetInfo returns faucet information
func (h *Handler) GetFaucetInfo(c *gin.Context) {
	// Get faucet balance
	balance, err := h.faucet.GetBalance()
	if err != nil {
		log.WithError(err).Error("Failed to get faucet balance")
		balance = 0 // Continue with 0 balance
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Database not configured",
		})
		return
	}

	// Get statistics
	stats, err := h.db.GetStatistics()
	if err != nil {
		log.WithError(err).Error("Failed to get statistics")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get faucet information",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"amount_per_request":    h.cfg.AmountPerRequest,
		"denom":                 h.cfg.Denom,
		"balance":               balance,
		"max_recipient_balance": h.cfg.MaxRecipientBalance,
		"total_distributed":     stats.TotalDistributed,
		"unique_recipients":     stats.UniqueRecipients,
		"requests_last_24h":     stats.RequestsLast24h,
		"chain_id":              h.cfg.ChainID,
	})
}

// GetRecentTransactions returns recent faucet transactions
func (h *Handler) GetRecentTransactions(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Database not configured",
		})
		return
	}

	requests, err := h.db.GetRecentRequests(50)
	if err != nil {
		log.WithError(err).Error("Failed to get recent transactions")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get recent transactions",
		})
		return
	}

	// Format transactions for response
	transactions := make([]gin.H, 0, len(requests))
	for _, req := range requests {
		tx := gin.H{
			"recipient": req.Recipient,
			"amount":    req.Amount,
			"tx_hash":   req.TxHash,
			"timestamp": req.CreatedAt,
		}
		transactions = append(transactions, tx)
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
	})
}

// RequestTokens handles token request
func (h *Handler) RequestTokens(c *gin.Context) {
	ctx := context.Background()

	var req TokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Get client IP
	clientIP := c.ClientIP()

	log.WithFields(log.Fields{
		"address": req.Address,
		"ip":      clientIP,
	}).Info("Token request received")

	// Validate address
	if err := h.faucet.ValidateAddress(req.Address); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid address format",
		})
		return
	}

	// Enforce allowlists when configured (devnet access control)
	if !addressAllowed(req.Address, h.cfg.AllowedAddresses) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Address is not allowed to use this faucet",
		})
		return
	}
	if !ipAllowed(clientIP, h.cfg.AllowedIPs) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "IP is not allowed to use this faucet",
		})
		return
	}

	// Verify captcha when required
	if h.cfg.RequireCaptcha {
		if !h.verifyCaptcha(req.CaptchaToken, clientIP) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Captcha verification failed",
			})
			return
		}
	}

	if h.rateLimiter == nil || h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Service dependencies not configured",
		})
		return
	}

	// Check IP rate limit
	ipLimited, err := h.rateLimiter.CheckIPLimit(ctx, clientIP)
	if err != nil {
		log.WithError(err).Error("Failed to check IP rate limit")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	if ipLimited {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "Too many requests from your IP address. Please try again later.",
		})
		return
	}

	// Check address rate limit
	addressLimited, err := h.rateLimiter.CheckAddressLimit(ctx, req.Address)
	if err != nil {
		log.WithError(err).Error("Failed to check address rate limit")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	if addressLimited {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "This address has already received tokens recently. Please wait 24 hours.",
		})
		return
	}

	// Check if address has recent requests in database
	since := time.Now().Add(-24 * time.Hour)
	dbRequests, err := h.db.GetRequestsByAddress(req.Address, since)
	if err != nil {
		log.WithError(err).Error("Failed to check address history")
	} else if len(dbRequests) > 0 {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "This address has already received tokens in the last 24 hours.",
		})
		return
	}

	// Check recipient balance cap
	if h.cfg.MaxRecipientBalance > 0 {
		balance, err := h.faucet.GetAddressBalance(req.Address)
		if err != nil {
			log.WithError(err).Error("Failed to check recipient balance")
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Unable to verify recipient balance at this time",
			})
			return
		}
		if balance >= h.cfg.MaxRecipientBalance {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Address balance is above faucet eligibility threshold",
			})
			return
		}
	}

	// Send tokens
	sendReq := &faucet.SendRequest{
		Recipient: req.Address,
		Amount:    h.cfg.AmountPerRequest,
		IPAddress: clientIP,
	}

	resp, err := h.faucet.SendTokens(sendReq)
	if err != nil {
		log.WithError(err).Error("Failed to send tokens")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to send tokens. Please try again later.",
		})
		return
	}

	// Update rate limiters
	if err := h.rateLimiter.IncrementIPCounter(ctx, clientIP); err != nil {
		log.WithError(err).Error("Failed to increment IP counter")
	}

	if err := h.rateLimiter.IncrementAddressCounter(ctx, req.Address); err != nil {
		log.WithError(err).Error("Failed to increment address counter")
	}

	c.JSON(http.StatusOK, gin.H{
		"tx_hash":   resp.TxHash,
		"recipient": resp.Recipient,
		"amount":    resp.Amount,
		"message":   "Tokens sent successfully",
	})
}

// GetStatistics returns detailed statistics
func (h *Handler) GetStatistics(c *gin.Context) {
	stats, err := h.db.GetStatistics()
	if err != nil {
		log.WithError(err).Error("Failed to get statistics")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get statistics",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// verifyCaptcha verifies Turnstile token
func (h *Handler) verifyCaptcha(token, remoteIP string) bool {
	if h.cfg.TurnstileSecret == "" {
		log.Warn("Turnstile secret not configured, skipping verification")
		return true
	}

	client := &http.Client{Timeout: 10 * time.Second}

	resp, err := client.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", map[string][]string{
		"secret":   {h.cfg.TurnstileSecret},
		"response": {token},
		"remoteip": {remoteIP},
	})

	if err != nil {
		log.WithError(err).Error("Failed to verify captcha")
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.WithError(err).Error("Failed to read captcha response")
		return false
	}

	var captchaResp TurnstileResponse
	if err := json.Unmarshal(body, &captchaResp); err != nil {
		log.WithError(err).Error("Failed to parse captcha response")
		return false
	}

	if !captchaResp.Success {
		log.WithField("errors", captchaResp.ErrorCodes).Warn("Captcha verification failed")
		return false
	}

	return true
}

func addressAllowed(address string, allowlist []string) bool {
	if len(allowlist) == 0 {
		return true
	}

	for _, allowed := range allowlist {
		if address == allowed {
			return true
		}
	}
	return false
}

func ipAllowed(ip string, allowlist []string) bool {
	if len(allowlist) == 0 {
		return true
	}

	parsedIP := net.ParseIP(ip)
	for _, allowed := range allowlist {
		if allowed == ip {
			return true
		}
		if strings.Contains(allowed, "/") {
			_, network, err := net.ParseCIDR(allowed)
			if err != nil || parsedIP == nil {
				continue
			}
			if network.Contains(parsedIP) {
				return true
			}
		}
	}
	return false
}
