package ratelimit

import (
	"context"
	"testing"
	"time"

	miniredis "github.com/alicebob/miniredis/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimiterIPAndAddressLimits(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	client, err := NewRedisClient("redis://" + mr.Addr())
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })

	rl := NewRateLimiter(client, map[string]interface{}{
		"per_ip":      2,
		"per_address": 1,
		"window":      time.Minute,
	})

	ctx := context.Background()

	// IP limit
	limited, err := rl.CheckIPLimit(ctx, "192.0.2.1")
	require.NoError(t, err)
	assert.False(t, limited)
	_ = rl.IncrementIPCounter(ctx, "192.0.2.1")
	_ = rl.IncrementIPCounter(ctx, "192.0.2.1")

	limited, err = rl.CheckIPLimit(ctx, "192.0.2.1")
	require.NoError(t, err)
	assert.True(t, limited)

	// Address limit
	limitedAddr, err := rl.CheckAddressLimit(ctx, "aura1addr")
	require.NoError(t, err)
	assert.False(t, limitedAddr)
	_ = rl.IncrementAddressCounter(ctx, "aura1addr")

	limitedAddr, err = rl.CheckAddressLimit(ctx, "aura1addr")
	require.NoError(t, err)
	assert.True(t, limitedAddr)
}

func TestRateLimiterTTL(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	client, err := NewRedisClient("redis://" + mr.Addr())
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })

	rl := NewRateLimiter(client, map[string]interface{}{
		"per_ip":      1,
		"per_address": 1,
		"window":      time.Second,
	})

	ctx := context.Background()
	_ = rl.IncrementIPCounter(ctx, "192.0.2.9")

	ttl, err := rl.GetRemainingTime(ctx, "ratelimit:ip:192.0.2.9")
	require.NoError(t, err)
	assert.True(t, ttl > 0)

	mr.FastForward(2 * time.Second)
	limited, err := rl.CheckIPLimit(ctx, "192.0.2.9")
	require.NoError(t, err)
	assert.False(t, limited)
}
