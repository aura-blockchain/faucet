package metrics

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRecordRequestAndSummary(t *testing.T) {
	tracker := NewMetricsTracker()

	now := time.Now()
	tracker.RecordRequest(RequestMetrics{
		IP:           "192.0.2.10",
		Address:      "aura1first",
		Amount:       1_000_000,
		Success:      true,
		ResponseTime: 20 * time.Millisecond,
		Timestamp:    now,
	})

	tracker.RecordRequest(RequestMetrics{
		IP:           "192.0.2.11",
		Address:      "aura1first",
		Amount:       500_000,
		Success:      false,
		ErrorType:    "captcha_failed",
		ResponseTime: 40 * time.Millisecond,
		Timestamp:    now.Add(time.Hour),
	})

	tracker.RecordBlocked("198.51.100.3")

	summary := tracker.GetSummary()

	assert.Equal(t, int64(2), summary.TotalRequests)
	assert.Equal(t, int64(1), summary.SuccessfulRequests)
	assert.Equal(t, int64(1), summary.FailedRequests)
	assert.Equal(t, int64(1), summary.BlockedRequests)
	assert.Equal(t, 3, summary.UniqueIPs) // includes blocked IP
	assert.Equal(t, 1, summary.UniqueAddresses)
	assert.Greater(t, summary.SuccessRate, 0.0)
	assert.Len(t, summary.TopRecipients, 1)
	assert.Equal(t, "aura1first", summary.TopRecipients[0].Address)
	assert.Contains(t, summary.ErrorBreakdown, "captcha_failed")
}
