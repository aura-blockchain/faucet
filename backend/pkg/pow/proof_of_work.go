package pow

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"
)

// ProofOfWork manages proof-of-work challenges
type ProofOfWork struct {
	challenges map[string]*Challenge
	mu         sync.RWMutex
	difficulty int // Number of leading zeros required
}

// Challenge represents a PoW challenge
type Challenge struct {
	ID         string
	Nonce      string
	Difficulty int
	CreatedAt  time.Time
	ExpiresAt  time.Time
	Solution   string // Stored for validation
}

// NewProofOfWork creates a new PoW service
func NewProofOfWork(difficulty int) *ProofOfWork {
	if difficulty == 0 {
		difficulty = 4 // Default: 4 leading zeros
	}

	pow := &ProofOfWork{
		challenges: make(map[string]*Challenge),
		difficulty: difficulty,
	}

	// Start cleanup goroutine
	go pow.cleanup()

	return pow
}

// cleanup removes expired challenges
func (p *ProofOfWork) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		p.mu.Lock()
		now := time.Now()
		for id, challenge := range p.challenges {
			if now.After(challenge.ExpiresAt) {
				delete(p.challenges, id)
			}
		}
		p.mu.Unlock()
	}
}

// GenerateChallenge creates a new PoW challenge
func (p *ProofOfWork) GenerateChallenge() (*Challenge, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Generate random nonce
	nonce := generateNonce()

	challenge := &Challenge{
		ID:         generateChallengeID(),
		Nonce:      nonce,
		Difficulty: p.difficulty,
		CreatedAt:  time.Now(),
		ExpiresAt:  time.Now().Add(10 * time.Minute),
	}

	p.challenges[challenge.ID] = challenge

	return challenge, nil
}

// Verify checks if a solution is valid
func (p *ProofOfWork) Verify(challengeID, solution string) (bool, error) {
	p.mu.RLock()
	challenge, exists := p.challenges[challengeID]
	p.mu.RUnlock()

	if !exists {
		return false, fmt.Errorf("challenge not found")
	}

	// Check expiration
	if time.Now().After(challenge.ExpiresAt) {
		p.mu.Lock()
		delete(p.challenges, challengeID)
		p.mu.Unlock()
		return false, fmt.Errorf("challenge expired")
	}

	// Verify the solution
	hash := computeHash(challenge.Nonce, solution)
	valid := verifyHash(hash, challenge.Difficulty)

	if valid {
		// Remove challenge after successful verification
		p.mu.Lock()
		delete(p.challenges, challengeID)
		p.mu.Unlock()
	}

	return valid, nil
}

// GetChallenge retrieves challenge info (without solution)
func (p *ProofOfWork) GetChallenge(challengeID string) (*Challenge, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	challenge, exists := p.challenges[challengeID]
	if !exists {
		return nil, fmt.Errorf("challenge not found")
	}

	return challenge, nil
}

// SetDifficulty updates the difficulty level
func (p *ProofOfWork) SetDifficulty(difficulty int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.difficulty = difficulty
}

// GetStats returns statistics about active challenges
func (p *ProofOfWork) GetStats() map[string]interface{} {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return map[string]interface{}{
		"active_challenges": len(p.challenges),
		"difficulty":        p.difficulty,
	}
}

// computeHash computes SHA-256 hash of nonce + solution
func computeHash(nonce, solution string) string {
	data := nonce + solution
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// verifyHash checks if hash has required number of leading zeros
func verifyHash(hash string, difficulty int) bool {
	prefix := strings.Repeat("0", difficulty)
	return strings.HasPrefix(hash, prefix)
}

// generateNonce generates a random nonce
func generateNonce() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 32)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// generateChallengeID generates a unique challenge ID
func generateChallengeID() string {
	return fmt.Sprintf("pow_%d_%s", time.Now().UnixNano(), generateNonce()[:8])
}

// SolveChallenge solves a PoW challenge (for testing/client library)
// In production, this would be done client-side
func SolveChallenge(nonce string, difficulty int) (string, error) {
	prefix := strings.Repeat("0", difficulty)
	attempts := 0
	maxAttempts := 10000000 // Prevent infinite loop

	for attempts < maxAttempts {
		solution := fmt.Sprintf("%d", attempts)
		hash := computeHash(nonce, solution)

		if strings.HasPrefix(hash, prefix) {
			return solution, nil
		}

		attempts++
	}

	return "", fmt.Errorf("failed to solve challenge after %d attempts", maxAttempts)
}

// EstimateDifficulty estimates appropriate difficulty based on expected solve time
func EstimateDifficulty(targetSeconds int) int {
	// This is a rough estimate
	// In production, you'd calibrate based on actual measurements
	if targetSeconds < 1 {
		return 3
	} else if targetSeconds < 5 {
		return 4
	} else if targetSeconds < 10 {
		return 5
	} else {
		return 6
	}
}

// AdaptiveDifficulty adjusts difficulty based on server load
type AdaptiveDifficulty struct {
	pow            *ProofOfWork
	baselineLoad   float64
	currentLoad    float64
	baseDifficulty int
	maxDifficulty  int
	minDifficulty  int
	mu             sync.RWMutex
}

// NewAdaptiveDifficulty creates an adaptive difficulty controller
func NewAdaptiveDifficulty(pow *ProofOfWork, baseDifficulty int) *AdaptiveDifficulty {
	return &AdaptiveDifficulty{
		pow:            pow,
		baselineLoad:   50.0,
		currentLoad:    50.0,
		baseDifficulty: baseDifficulty,
		maxDifficulty:  baseDifficulty + 2,
		minDifficulty:  baseDifficulty - 1,
	}
}

// UpdateLoad updates the current server load
func (ad *AdaptiveDifficulty) UpdateLoad(load float64) {
	ad.mu.Lock()
	defer ad.mu.Unlock()

	ad.currentLoad = load

	// Adjust difficulty based on load
	var newDifficulty int
	if load > ad.baselineLoad*1.5 {
		// High load - increase difficulty
		newDifficulty = ad.baseDifficulty + 2
	} else if load > ad.baselineLoad*1.2 {
		// Moderate load - slight increase
		newDifficulty = ad.baseDifficulty + 1
	} else if load < ad.baselineLoad*0.5 {
		// Low load - decrease difficulty
		newDifficulty = ad.baseDifficulty - 1
	} else {
		// Normal load
		newDifficulty = ad.baseDifficulty
	}

	// Clamp to min/max
	if newDifficulty > ad.maxDifficulty {
		newDifficulty = ad.maxDifficulty
	}
	if newDifficulty < ad.minDifficulty {
		newDifficulty = ad.minDifficulty
	}

	ad.pow.SetDifficulty(newDifficulty)
}

// GetCurrentDifficulty returns the current difficulty
func (ad *AdaptiveDifficulty) GetCurrentDifficulty() int {
	ad.mu.RLock()
	defer ad.mu.RUnlock()
	return ad.pow.difficulty
}
