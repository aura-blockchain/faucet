package abuse

import (
	"fmt"
	"net"
	"sync"
	"time"
)

// AbuseDetector detects and prevents faucet abuse
type AbuseDetector struct {
	ipAttempts      map[string]*AttemptTracker
	addressAttempts map[string]*AttemptTracker
	blockedIPs      map[string]time.Time
	blockedAddrs    map[string]time.Time
	mu              sync.RWMutex
	config          DetectorConfig
}

// DetectorConfig configures the abuse detector
type DetectorConfig struct {
	MaxAttemptsPerHour   int
	MaxAttemptsPerDay    int
	BlockDuration        time.Duration
	SubnetCheckEnabled   bool
	VPNDetectionEnabled  bool
	SuspiciousThreshold  int
}

// AttemptTracker tracks attempts from an IP or address
type AttemptTracker struct {
	Count           int
	FirstAttempt    time.Time
	LastAttempt     time.Time
	SuccessfulCount int
	FailedCount     int
	Addresses       map[string]int // IP -> addresses requested
}

// DetectionResult contains detection results
type DetectionResult struct {
	Allowed          bool
	Reason           string
	RiskScore        int
	BlockedUntil     *time.Time
	RecommendedDelay time.Duration
}

// NewAbuseDetector creates a new abuse detector
func NewAbuseDetector(config DetectorConfig) *AbuseDetector {
	if config.MaxAttemptsPerHour == 0 {
		config.MaxAttemptsPerHour = 10
	}
	if config.MaxAttemptsPerDay == 0 {
		config.MaxAttemptsPerDay = 50
	}
	if config.BlockDuration == 0 {
		config.BlockDuration = 24 * time.Hour
	}
	if config.SuspiciousThreshold == 0 {
		config.SuspiciousThreshold = 5
	}

	detector := &AbuseDetector{
		ipAttempts:      make(map[string]*AttemptTracker),
		addressAttempts: make(map[string]*AttemptTracker),
		blockedIPs:      make(map[string]time.Time),
		blockedAddrs:    make(map[string]time.Time),
		config:          config,
	}

	// Start cleanup goroutine
	go detector.cleanup()

	return detector
}

// CheckRequest checks if a request should be allowed
func (ad *AbuseDetector) CheckRequest(ip, address string) *DetectionResult {
	ad.mu.Lock()
	defer ad.mu.Unlock()

	result := &DetectionResult{
		Allowed:   true,
		RiskScore: 0,
	}

	// Check if IP is blocked
	if blockedUntil, blocked := ad.blockedIPs[ip]; blocked {
		if time.Now().Before(blockedUntil) {
			result.Allowed = false
			result.Reason = "IP address is temporarily blocked"
			result.BlockedUntil = &blockedUntil
			return result
		}
		// Unblock expired
		delete(ad.blockedIPs, ip)
	}

	// Check if address is blocked
	if blockedUntil, blocked := ad.blockedAddrs[address]; blocked {
		if time.Now().Before(blockedUntil) {
			result.Allowed = false
			result.Reason = "Address is temporarily blocked"
			result.BlockedUntil = &blockedUntil
			return result
		}
		delete(ad.blockedAddrs, address)
	}

	// Get or create IP tracker
	ipTracker := ad.getOrCreateTracker(ad.ipAttempts, ip)

	// Calculate risk score
	result.RiskScore = ad.calculateRiskScore(ipTracker, ip, address)

	// Check hourly limit
	now := time.Now()
	if now.Sub(ipTracker.FirstAttempt) < time.Hour {
		if ipTracker.Count >= ad.config.MaxAttemptsPerHour {
			result.Allowed = false
			result.Reason = "Too many requests from this IP (hourly limit exceeded)"
			ad.blockIP(ip)
			return result
		}
	} else {
		// Reset hourly counter
		ipTracker.Count = 0
		ipTracker.FirstAttempt = now
	}

	// Check daily limit
	if ipTracker.SuccessfulCount+ipTracker.FailedCount >= ad.config.MaxAttemptsPerDay {
		result.Allowed = false
		result.Reason = "Daily request limit exceeded"
		ad.blockIP(ip)
		return result
	}

	// Check for subnet abuse
	if ad.config.SubnetCheckEnabled {
		if ad.checkSubnetAbuse(ip) {
			result.Allowed = false
			result.Reason = "Multiple requests detected from your subnet"
			result.RiskScore += 30
			return result
		}
	}

	// Check for VPN/proxy (basic check)
	if ad.config.VPNDetectionEnabled {
		if ad.isLikelyVPN(ip) {
			result.RiskScore += 20
			result.RecommendedDelay = 30 * time.Second
		}
	}

	// Check if requesting too many different addresses
	if len(ipTracker.Addresses) > ad.config.SuspiciousThreshold {
		result.RiskScore += 25
		result.Reason = "Suspicious: Multiple addresses requested from same IP"
	}

	// High risk score requires additional verification
	if result.RiskScore > 50 {
		result.RecommendedDelay = time.Duration(result.RiskScore) * time.Second
	}

	return result
}

// RecordAttempt records a faucet request attempt
func (ad *AbuseDetector) RecordAttempt(ip, address string, success bool) {
	ad.mu.Lock()
	defer ad.mu.Unlock()

	// Update IP tracker
	ipTracker := ad.getOrCreateTracker(ad.ipAttempts, ip)
	ipTracker.Count++
	ipTracker.LastAttempt = time.Now()

	if ipTracker.Addresses == nil {
		ipTracker.Addresses = make(map[string]int)
	}
	ipTracker.Addresses[address]++

	if success {
		ipTracker.SuccessfulCount++
	} else {
		ipTracker.FailedCount++
	}

	// Update address tracker
	addrTracker := ad.getOrCreateTracker(ad.addressAttempts, address)
	addrTracker.Count++
	addrTracker.LastAttempt = time.Now()

	if success {
		addrTracker.SuccessfulCount++
	} else {
		addrTracker.FailedCount++
	}
}

// BlockIP blocks an IP address
func (ad *AbuseDetector) BlockIP(ip string, duration time.Duration) {
	ad.mu.Lock()
	defer ad.mu.Unlock()

	if duration == 0 {
		duration = ad.config.BlockDuration
	}

	ad.blockedIPs[ip] = time.Now().Add(duration)
}

// BlockAddress blocks an address
func (ad *AbuseDetector) BlockAddress(address string, duration time.Duration) {
	ad.mu.Lock()
	defer ad.mu.Unlock()

	if duration == 0 {
		duration = ad.config.BlockDuration
	}

	ad.blockedAddrs[address] = time.Now().Add(duration)
}

// UnblockIP unblocks an IP address
func (ad *AbuseDetector) UnblockIP(ip string) {
	ad.mu.Lock()
	defer ad.mu.Unlock()
	delete(ad.blockedIPs, ip)
}

// UnblockAddress unblocks an address
func (ad *AbuseDetector) UnblockAddress(address string) {
	ad.mu.Lock()
	defer ad.mu.Unlock()
	delete(ad.blockedAddrs, address)
}

// GetStats returns detector statistics
func (ad *AbuseDetector) GetStats() map[string]interface{} {
	ad.mu.RLock()
	defer ad.mu.RUnlock()

	totalAttempts := 0
	totalSuccess := 0
	totalFailed := 0

	for _, tracker := range ad.ipAttempts {
		totalAttempts += tracker.Count
		totalSuccess += tracker.SuccessfulCount
		totalFailed += tracker.FailedCount
	}

	return map[string]interface{}{
		"tracked_ips":        len(ad.ipAttempts),
		"tracked_addresses":  len(ad.addressAttempts),
		"blocked_ips":        len(ad.blockedIPs),
		"blocked_addresses":  len(ad.blockedAddrs),
		"total_attempts":     totalAttempts,
		"successful_attempts": totalSuccess,
		"failed_attempts":    totalFailed,
		"config":             ad.config,
	}
}

// calculateRiskScore calculates a risk score for a request
func (ad *AbuseDetector) calculateRiskScore(tracker *AttemptTracker, ip, address string) int {
	score := 0

	// High frequency
	if tracker.Count > ad.config.SuspiciousThreshold {
		score += 20
	}

	// High failure rate
	if tracker.FailedCount > tracker.SuccessfulCount*2 {
		score += 15
	}

	// Multiple addresses from same IP
	if len(tracker.Addresses) > 3 {
		score += 10 * (len(tracker.Addresses) - 3)
	}

	// Recent rapid attempts
	if time.Since(tracker.LastAttempt) < 1*time.Minute && tracker.Count > 3 {
		score += 25
	}

	return score
}

// checkSubnetAbuse checks if multiple IPs from same subnet are abusing
func (ad *AbuseDetector) checkSubnetAbuse(ip string) bool {
	// Parse IP
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	// Get /24 subnet for IPv4 or /64 for IPv6
	var subnet *net.IPNet
	if parsedIP.To4() != nil {
		_, subnet, _ = net.ParseCIDR(fmt.Sprintf("%s/24", ip))
	} else {
		_, subnet, _ = net.ParseCIDR(fmt.Sprintf("%s/64", ip))
	}

	if subnet == nil {
		return false
	}

	// Count IPs from same subnet
	count := 0
	for trackedIP := range ad.ipAttempts {
		if parsedTrackedIP := net.ParseIP(trackedIP); parsedTrackedIP != nil {
			if subnet.Contains(parsedTrackedIP) {
				count++
			}
		}
	}

	// Suspicious if more than 5 IPs from same subnet
	return count > 5
}

// isLikelyVPN performs basic VPN/proxy detection
func (ad *AbuseDetector) isLikelyVPN(ip string) bool {
	// This is a very basic check
	// In production, you'd use a proper VPN detection service
	// or maintain a list of known VPN/proxy IP ranges

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	// Check for common VPN/cloud provider ranges
	// This is just an example - you'd need a comprehensive list
	commonVPNRanges := []string{
		"10.0.0.0/8",      // Private
		"172.16.0.0/12",   // Private
		"192.168.0.0/16",  // Private
	}

	for _, cidr := range commonVPNRanges {
		_, subnet, err := net.ParseCIDR(cidr)
		if err == nil && subnet.Contains(parsedIP) {
			return true
		}
	}

	return false
}

// blockIP is internal helper to block an IP
func (ad *AbuseDetector) blockIP(ip string) {
	ad.blockedIPs[ip] = time.Now().Add(ad.config.BlockDuration)
}

// getOrCreateTracker gets or creates an attempt tracker
func (ad *AbuseDetector) getOrCreateTracker(trackers map[string]*AttemptTracker, key string) *AttemptTracker {
	tracker, exists := trackers[key]
	if !exists {
		tracker = &AttemptTracker{
			FirstAttempt: time.Now(),
			Addresses:    make(map[string]int),
		}
		trackers[key] = tracker
	}
	return tracker
}

// cleanup periodically removes old data
func (ad *AbuseDetector) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		ad.mu.Lock()

		now := time.Now()

		// Clean up old IP attempts (older than 24 hours)
		for ip, tracker := range ad.ipAttempts {
			if now.Sub(tracker.LastAttempt) > 24*time.Hour {
				delete(ad.ipAttempts, ip)
			}
		}

		// Clean up old address attempts
		for addr, tracker := range ad.addressAttempts {
			if now.Sub(tracker.LastAttempt) > 24*time.Hour {
				delete(ad.addressAttempts, addr)
			}
		}

		// Clean up expired blocks
		for ip, blockedUntil := range ad.blockedIPs {
			if now.After(blockedUntil) {
				delete(ad.blockedIPs, ip)
			}
		}

		for addr, blockedUntil := range ad.blockedAddrs {
			if now.After(blockedUntil) {
				delete(ad.blockedAddrs, addr)
			}
		}

		ad.mu.Unlock()
	}
}
