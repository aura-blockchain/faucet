package metrics

import (
	"sync"
	"time"
)

// MetricsTracker tracks faucet usage metrics and analytics
type MetricsTracker struct {
	mu sync.RWMutex

	// Request metrics
	totalRequests       int64
	successfulRequests  int64
	failedRequests      int64
	blockedRequests     int64

	// Token metrics
	totalTokensDistributed int64
	avgTokensPerRequest    float64

	// Time-based metrics
	requestsPerHour map[int]int64  // hour -> count
	requestsPerDay  map[string]int64 // date -> count

	// Address metrics
	uniqueAddresses    map[string]bool
	topRecipients      map[string]int64  // address -> request count

	// IP metrics
	uniqueIPs         map[string]bool
	requestsByCountry map[string]int64

	// Performance metrics
	avgResponseTime   time.Duration
	responseTimes     []time.Duration
	maxResponseTime   time.Duration

	// Error metrics
	errorCounts       map[string]int64  // error type -> count

	// Start time
	startTime time.Time
}

// RequestMetrics contains metrics for a single request
type RequestMetrics struct {
	IP              string
	Address         string
	Amount          int64
	Success         bool
	ErrorType       string
	ResponseTime    time.Duration
	Timestamp       time.Time
	CaptchaSolved   bool
	POWCompleted    bool
}

// Summary contains a summary of all metrics
type Summary struct {
	TotalRequests          int64
	SuccessfulRequests     int64
	FailedRequests         int64
	BlockedRequests        int64
	SuccessRate            float64
	TotalTokensDistributed int64
	UniqueAddresses        int
	UniqueIPs              int
	AvgResponseTime        time.Duration
	MaxResponseTime        time.Duration
	UptimeHours            float64
	RequestsPerHour        float64
	TopRecipients          []RecipientStat
	ErrorBreakdown         map[string]int64
	HourlyDistribution     map[int]int64
}

// RecipientStat contains statistics for a recipient
type RecipientStat struct {
	Address      string
	RequestCount int64
	TotalAmount  int64
}

// NewMetricsTracker creates a new metrics tracker
func NewMetricsTracker() *MetricsTracker {
	return &MetricsTracker{
		requestsPerHour:   make(map[int]int64),
		requestsPerDay:    make(map[string]int64),
		uniqueAddresses:   make(map[string]bool),
		topRecipients:     make(map[string]int64),
		uniqueIPs:         make(map[string]bool),
		requestsByCountry: make(map[string]int64),
		responseTimes:     make([]time.Duration, 0, 1000),
		errorCounts:       make(map[string]int64),
		startTime:         time.Now(),
	}
}

// RecordRequest records a faucet request
func (m *MetricsTracker) RecordRequest(metrics RequestMetrics) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.totalRequests++

	if metrics.Success {
		m.successfulRequests++
		m.totalTokensDistributed += metrics.Amount
		m.uniqueAddresses[metrics.Address] = true
		m.topRecipients[metrics.Address]++
	} else {
		m.failedRequests++
		if metrics.ErrorType != "" {
			m.errorCounts[metrics.ErrorType]++
		}
	}

	// Track IP
	m.uniqueIPs[metrics.IP] = true

	// Track time-based metrics
	hour := metrics.Timestamp.Hour()
	m.requestsPerHour[hour]++

	date := metrics.Timestamp.Format("2006-01-02")
	m.requestsPerDay[date]++

	// Track response time
	m.responseTimes = append(m.responseTimes, metrics.ResponseTime)
	if metrics.ResponseTime > m.maxResponseTime {
		m.maxResponseTime = metrics.ResponseTime
	}

	// Calculate average response time
	if len(m.responseTimes) > 0 {
		var total time.Duration
		for _, rt := range m.responseTimes {
			total += rt
		}
		m.avgResponseTime = total / time.Duration(len(m.responseTimes))
	}

	// Keep response times array manageable
	if len(m.responseTimes) > 10000 {
		m.responseTimes = m.responseTimes[len(m.responseTimes)-1000:]
	}

	// Update average tokens per request
	if m.successfulRequests > 0 {
		m.avgTokensPerRequest = float64(m.totalTokensDistributed) / float64(m.successfulRequests)
	}
}

// RecordBlocked records a blocked request
func (m *MetricsTracker) RecordBlocked(ip string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.blockedRequests++
	m.uniqueIPs[ip] = true
}

// GetSummary returns a summary of all metrics
func (m *MetricsTracker) GetSummary() Summary {
	m.mu.RLock()
	defer m.mu.RUnlock()

	uptime := time.Since(m.startTime).Hours()
	requestsPerHour := float64(0)
	if uptime > 0 {
		requestsPerHour = float64(m.totalRequests) / uptime
	}

	successRate := float64(0)
	if m.totalRequests > 0 {
		successRate = (float64(m.successfulRequests) / float64(m.totalRequests)) * 100
	}

	// Get top recipients
	topRecipients := make([]RecipientStat, 0, 10)
	for addr, count := range m.topRecipients {
		topRecipients = append(topRecipients, RecipientStat{
			Address:      addr,
			RequestCount: count,
		})
	}

	// Sort by count (simple bubble sort for small dataset)
	for i := 0; i < len(topRecipients); i++ {
		for j := i + 1; j < len(topRecipients); j++ {
			if topRecipients[j].RequestCount > topRecipients[i].RequestCount {
				topRecipients[i], topRecipients[j] = topRecipients[j], topRecipients[i]
			}
		}
	}

	// Keep top 10
	if len(topRecipients) > 10 {
		topRecipients = topRecipients[:10]
	}

	return Summary{
		TotalRequests:          m.totalRequests,
		SuccessfulRequests:     m.successfulRequests,
		FailedRequests:         m.failedRequests,
		BlockedRequests:        m.blockedRequests,
		SuccessRate:            successRate,
		TotalTokensDistributed: m.totalTokensDistributed,
		UniqueAddresses:        len(m.uniqueAddresses),
		UniqueIPs:              len(m.uniqueIPs),
		AvgResponseTime:        m.avgResponseTime,
		MaxResponseTime:        m.maxResponseTime,
		UptimeHours:            uptime,
		RequestsPerHour:        requestsPerHour,
		TopRecipients:          topRecipients,
		ErrorBreakdown:         m.copyErrorCounts(),
		HourlyDistribution:     m.copyHourlyDistribution(),
	}
}

// GetHourlyStats returns request stats by hour
func (m *MetricsTracker) GetHourlyStats() map[int]int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := make(map[int]int64)
	for hour, count := range m.requestsPerHour {
		stats[hour] = count
	}
	return stats
}

// GetDailyStats returns request stats by day
func (m *MetricsTracker) GetDailyStats() map[string]int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := make(map[string]int64)
	for date, count := range m.requestsPerDay {
		stats[date] = count
	}
	return stats
}

// GetErrorStats returns error statistics
func (m *MetricsTracker) GetErrorStats() map[string]int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.copyErrorCounts()
}

// GetTopRecipients returns the most active recipients
func (m *MetricsTracker) GetTopRecipients(limit int) []RecipientStat {
	m.mu.RLock()
	defer m.mu.RUnlock()

	recipients := make([]RecipientStat, 0, len(m.topRecipients))
	for addr, count := range m.topRecipients {
		recipients = append(recipients, RecipientStat{
			Address:      addr,
			RequestCount: count,
		})
	}

	// Sort by count
	for i := 0; i < len(recipients); i++ {
		for j := i + 1; j < len(recipients); j++ {
			if recipients[j].RequestCount > recipients[i].RequestCount {
				recipients[i], recipients[j] = recipients[j], recipients[i]
			}
		}
	}

	// Apply limit
	if len(recipients) > limit {
		recipients = recipients[:limit]
	}

	return recipients
}

// GetPerformanceStats returns performance statistics
func (m *MetricsTracker) GetPerformanceStats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Calculate percentiles
	p50, p95, p99 := m.calculatePercentiles()

	return map[string]interface{}{
		"avg_response_time": m.avgResponseTime.Milliseconds(),
		"max_response_time": m.maxResponseTime.Milliseconds(),
		"p50_response_time": p50.Milliseconds(),
		"p95_response_time": p95.Milliseconds(),
		"p99_response_time": p99.Milliseconds(),
		"total_samples":     len(m.responseTimes),
	}
}

// Reset resets all metrics
func (m *MetricsTracker) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.totalRequests = 0
	m.successfulRequests = 0
	m.failedRequests = 0
	m.blockedRequests = 0
	m.totalTokensDistributed = 0
	m.avgTokensPerRequest = 0
	m.requestsPerHour = make(map[int]int64)
	m.requestsPerDay = make(map[string]int64)
	m.uniqueAddresses = make(map[string]bool)
	m.topRecipients = make(map[string]int64)
	m.uniqueIPs = make(map[string]bool)
	m.requestsByCountry = make(map[string]int64)
	m.responseTimes = make([]time.Duration, 0, 1000)
	m.avgResponseTime = 0
	m.maxResponseTime = 0
	m.errorCounts = make(map[string]int64)
	m.startTime = time.Now()
}

// Helper methods

func (m *MetricsTracker) copyErrorCounts() map[string]int64 {
	counts := make(map[string]int64)
	for errType, count := range m.errorCounts {
		counts[errType] = count
	}
	return counts
}

func (m *MetricsTracker) copyHourlyDistribution() map[int]int64 {
	dist := make(map[int]int64)
	for hour, count := range m.requestsPerHour {
		dist[hour] = count
	}
	return dist
}

func (m *MetricsTracker) calculatePercentiles() (p50, p95, p99 time.Duration) {
	if len(m.responseTimes) == 0 {
		return 0, 0, 0
	}

	// Create sorted copy
	sorted := make([]time.Duration, len(m.responseTimes))
	copy(sorted, m.responseTimes)

	// Simple bubble sort (ok for small datasets)
	for i := 0; i < len(sorted); i++ {
		for j := i + 1; j < len(sorted); j++ {
			if sorted[j] < sorted[i] {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}

	// Calculate percentile indices
	p50Idx := int(float64(len(sorted)) * 0.50)
	p95Idx := int(float64(len(sorted)) * 0.95)
	p99Idx := int(float64(len(sorted)) * 0.99)

	if p50Idx >= len(sorted) {
		p50Idx = len(sorted) - 1
	}
	if p95Idx >= len(sorted) {
		p95Idx = len(sorted) - 1
	}
	if p99Idx >= len(sorted) {
		p99Idx = len(sorted) - 1
	}

	return sorted[p50Idx], sorted[p95Idx], sorted[p99Idx]
}
