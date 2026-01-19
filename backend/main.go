package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"

	"github.com/aura-chain/aura/faucet/pkg/api"
	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/database"
	"github.com/aura-chain/aura/faucet/pkg/faucet"
	metrics "github.com/aura-chain/aura/faucet/pkg/prometheus"
	"github.com/aura-chain/aura/faucet/pkg/ratelimit"
)

func init() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Info("No .env file found, using environment variables")
	}

	// Configure logging
	log.SetFormatter(&log.JSONFormatter{})
	log.SetOutput(os.Stdout)

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	level, err := log.ParseLevel(logLevel)
	if err != nil {
		log.Warn("Invalid log level, defaulting to info")
		level = log.InfoLevel
	}
	log.SetLevel(level)
}

func main() {
	log.Info("Starting AURA Testnet Faucet...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Invalid configuration: %v", err)
	}

	log.WithFields(log.Fields{
		"port":              cfg.Port,
		"chain_id":          cfg.ChainID,
		"amount_per_request": cfg.AmountPerRequest,
	}).Info("Configuration loaded")

	// Initialize database (optional)
	var db *database.DB
	if cfg.DatabaseURL != "" {
		db, err = database.NewPostgresDB(cfg.DatabaseURL)
		if err != nil {
			log.Warnf("Failed to connect to database: %v (continuing without database)", err)
		} else {
			defer db.Close()
			// Run database migrations
			if err := db.Migrate(); err != nil {
				log.Warnf("Failed to run database migrations: %v", err)
			} else {
				log.Info("Database migrations completed")
			}
		}
	} else {
		log.Info("No DATABASE_URL configured, running without database")
	}

	// Initialize Redis for rate limiting (optional)
	var rateLimiter *ratelimit.RateLimiter
	if cfg.RedisURL != "" {
		redisClient, err := ratelimit.NewRedisClient(cfg.RedisURL)
		if err != nil {
			log.Warnf("Failed to connect to Redis: %v (continuing without Redis rate limiting)", err)
		} else {
			defer redisClient.Close()
			rateLimiter = ratelimit.NewRateLimiter(redisClient, cfg.RateLimitConfig())
		}
	} else {
		log.Info("No REDIS_URL configured, running without Redis rate limiting")
	}

	// Initialize faucet service
	faucetService, err := faucet.NewService(cfg, db)
	if err != nil {
		log.Fatalf("Failed to initialize faucet service: %v", err)
	}

	// Check faucet balance
	balance, err := faucetService.GetBalance()
	if err != nil {
		log.Warnf("Failed to get faucet balance: %v", err)
	} else {
		log.WithField("balance", balance).Info("Faucet initialized")
	}

	// Initialize Prometheus metrics
	metrics.SetInfo(cfg.Version, cfg.ChainID, cfg.Denom)

	// Start balance and node status monitor goroutine
	go monitorBalanceAndNode(cfg, faucetService)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(loggingMiddleware())

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Initialize API handlers
	apiHandler := api.NewHandler(cfg, faucetService, rateLimiter, db)

	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Health check endpoints (Kubernetes-compatible)
		v1.GET("/health", apiHandler.Health)
		v1.GET("/ready", apiHandler.Ready)
		v1.GET("/live", apiHandler.Live)

		// Faucet endpoints
		faucetGroup := v1.Group("/faucet")
		{
			faucetGroup.GET("/info", apiHandler.GetFaucetInfo)
			faucetGroup.GET("/recent", apiHandler.GetRecentTransactions)
			faucetGroup.POST("/request", apiHandler.RequestTokens)
			faucetGroup.GET("/stats", apiHandler.GetStatistics)
		}
	}

	// Serve static frontend files
	router.Static("/assets", "./frontend/assets")
	router.StaticFile("/", "./frontend/index.html")
	router.StaticFile("/wallet.html", "./frontend/wallet.html")
	router.StaticFile("/styles.css", "./frontend/styles.css")
	router.StaticFile("/app.js", "./frontend/app.js")
	router.StaticFile("/wallet.js", "./frontend/wallet.js")

	// 404 handler
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Not found",
		})
	})

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.WithField("port", cfg.Port).Info("Server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Info("Server exited")
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		log.WithFields(log.Fields{
			"status":     statusCode,
			"method":     c.Request.Method,
			"path":       path,
			"ip":         c.ClientIP(),
			"latency":    latency.Milliseconds(),
			"user_agent": c.Request.UserAgent(),
		}).Info("HTTP request")
	}
}

// monitorBalanceAndNode periodically updates balance and node status metrics
func monitorBalanceAndNode(cfg *config.Config, svc *faucet.Service) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Initial update
	updateMetrics(cfg, svc)

	for range ticker.C {
		updateMetrics(cfg, svc)
	}
}

func updateMetrics(cfg *config.Config, svc *faucet.Service) {
	// Update balance
	balance, err := svc.GetBalance()
	if err != nil {
		log.WithError(err).Debug("Failed to get faucet balance for metrics")
	} else {
		metrics.UpdateBalance(cfg.Denom, balance)
	}

	// Update node status
	status, err := svc.GetNodeStatus()
	if err != nil {
		log.WithError(err).Debug("Failed to get node status for metrics")
		metrics.UpdateNodeStatus(cfg.ChainID, false, false)
	} else {
		metrics.UpdateNodeStatus(cfg.ChainID, true, !status.SyncInfo.CatchingUp)
	}
}
