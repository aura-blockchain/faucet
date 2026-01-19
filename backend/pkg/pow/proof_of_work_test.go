package pow

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndVerifyChallenge(t *testing.T) {
	p := NewProofOfWork(3)

	challenge, err := p.GenerateChallenge()
	require.NoError(t, err)
	require.NotNil(t, challenge)

	solution, err := SolveChallenge(challenge.Nonce, challenge.Difficulty)
	require.NoError(t, err)

	valid, err := p.Verify(challenge.ID, solution)
	require.NoError(t, err)
	assert.True(t, valid)

	// Challenge should be removed after successful verification
	_, err = p.GetChallenge(challenge.ID)
	assert.Error(t, err)
}

func TestVerifyRejectsExpiredChallenge(t *testing.T) {
	p := NewProofOfWork(2)
	ch, err := p.GenerateChallenge()
	require.NoError(t, err)

	// Force expiration
	p.mu.Lock()
	ch.ExpiresAt = time.Now().Add(-time.Minute)
	p.mu.Unlock()

	valid, err := p.Verify(ch.ID, "0")
	assert.False(t, valid)
	assert.Error(t, err)
}

func TestAdaptiveDifficultyAdjusts(t *testing.T) {
	p := NewProofOfWork(3)
	ad := NewAdaptiveDifficulty(p, 3)

	ad.UpdateLoad(100) // high load
	assert.GreaterOrEqual(t, ad.GetCurrentDifficulty(), 4)

	ad.UpdateLoad(10) // low load
	assert.LessOrEqual(t, ad.GetCurrentDifficulty(), 3)
}
