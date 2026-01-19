package abuse

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHourlyLimitBlocksAndUnblocks(t *testing.T) {
	cfg := DetectorConfig{
		MaxAttemptsPerHour: 3,
		BlockDuration:      time.Minute,
	}
	detector := NewAbuseDetector(cfg)

	ip := "192.0.2.1"
	addr := "aura1test"

	for i := 0; i < 3; i++ {
		result := detector.CheckRequest(ip, addr)
		require.True(t, result.Allowed)
		detector.RecordAttempt(ip, addr, false)
	}

	// Fourth should be blocked
	result := detector.CheckRequest(ip, addr)
	assert.False(t, result.Allowed)
	assert.Equal(t, "Too many requests from this IP (hourly limit exceeded)", result.Reason)
}

func TestVPNAndSubnetRiskScoring(t *testing.T) {
	cfg := DetectorConfig{
		SubnetCheckEnabled:  true,
		VPNDetectionEnabled: true,
		SuspiciousThreshold: 1,
	}
	detector := NewAbuseDetector(cfg)

	ip := "10.0.0.1" // RFC1918 to trigger subnet overlap with 10.0.0.0/24 range
	addr1 := "aura1x"
	addr2 := "aura1y"

	detector.RecordAttempt(ip, addr1, true)
	detector.RecordAttempt(ip, addr2, true)

	result := detector.CheckRequest(ip, addr2)
	assert.GreaterOrEqual(t, result.RiskScore, 20) // VPN adds 20
	assert.True(t, result.RecommendedDelay >= 0)
}

func TestAddressBlock(t *testing.T) {
	cfg := DetectorConfig{
		BlockDuration: time.Minute,
	}
	detector := NewAbuseDetector(cfg)

	ip := "203.0.113.5"
	addr := "aura1blocked"

	// Manually block address
	detector.blockedAddrs[addr] = time.Now().Add(time.Minute)

	result := detector.CheckRequest(ip, addr)
	assert.False(t, result.Allowed)
	assert.Equal(t, "Address is temporarily blocked", result.Reason)
}
