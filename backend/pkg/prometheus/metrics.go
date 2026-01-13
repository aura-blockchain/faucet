package prometheus

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const namespace = "faucet"

var (
	// Request counters
	RequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "requests_total",
			Help:      "Total faucet requests by status and denom",
		},
		[]string{"status", "denom"},
	)

	TokensDistributed = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "tokens_distributed_total",
			Help:      "Total tokens distributed",
		},
		[]string{"denom"},
	)

	UniqueAddresses = promauto.NewCounter(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "unique_addresses_total",
			Help:      "Total unique addresses served (approximate)",
		},
	)

	// Security counters
	RateLimitHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "rate_limit_hits_total",
			Help:      "Rate limit violations by type",
		},
		[]string{"type"},
	)

	CaptchaAttempts = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "captcha_attempts_total",
			Help:      "CAPTCHA verification attempts by result",
		},
		[]string{"result"},
	)

	BlockedRequests = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "blocked_requests_total",
			Help:      "Blocked requests by reason",
		},
		[]string{"reason"},
	)

	// Operational gauges
	WalletBalance = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "wallet_balance",
			Help:      "Current faucet wallet balance",
		},
		[]string{"denom"},
	)

	NodeConnected = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "node_connected",
			Help:      "Node connection status (1=connected, 0=disconnected)",
		},
		[]string{"chain_id"},
	)

	NodeSynced = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "node_synced",
			Help:      "Node sync status (1=synced, 0=syncing)",
		},
		[]string{"chain_id"},
	)

	// Histograms
	RequestDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: namespace,
			Name:      "request_duration_seconds",
			Help:      "Request processing duration in seconds",
			Buckets:   []float64{0.1, 0.5, 1, 2, 5, 10, 30},
		},
	)

	TxConfirmationTime = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: namespace,
			Name:      "tx_confirmation_seconds",
			Help:      "Transaction confirmation time in seconds",
			Buckets:   []float64{1, 5, 10, 30, 60, 120},
		},
	)

	// Info gauge
	Info = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "info",
			Help:      "Faucet build information",
		},
		[]string{"version", "chain_id", "denom"},
	)
)

// RecordRequest records a faucet request with timing
func RecordRequest(status, denom string, amount int64, duration float64) {
	RequestsTotal.WithLabelValues(status, denom).Inc()
	RequestDuration.Observe(duration)
	if status == "success" {
		TokensDistributed.WithLabelValues(denom).Add(float64(amount))
	}
}

// UpdateBalance updates the faucet wallet balance gauge
func UpdateBalance(denom string, balance int64) {
	WalletBalance.WithLabelValues(denom).Set(float64(balance))
}

// UpdateNodeStatus updates node connection and sync status
func UpdateNodeStatus(chainID string, connected, synced bool) {
	connVal := 0.0
	if connected {
		connVal = 1.0
	}
	NodeConnected.WithLabelValues(chainID).Set(connVal)

	syncVal := 0.0
	if synced {
		syncVal = 1.0
	}
	NodeSynced.WithLabelValues(chainID).Set(syncVal)
}

// SetInfo sets the static info gauge
func SetInfo(version, chainID, denom string) {
	Info.WithLabelValues(version, chainID, denom).Set(1)
}
