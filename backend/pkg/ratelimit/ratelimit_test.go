package ratelimit

import (
	"context"
	"testing"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRedis(t *testing.T) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1, // Use DB 1 for testing
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available for testing")
	}

	// Clean up test database
	client.FlushDB(ctx)

	return client
}

func TestNewRateLimiter(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      10,
		"per_address": 1,
		"window":      24 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	assert.NotNil(t, rl)
	assert.Equal(t, 10, rl.perIP)
	assert.Equal(t, 1, rl.perAddress)
	assert.Equal(t, 24*time.Hour, rl.window)
}

func TestCheckIPLimit(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      2,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	ip := "192.168.1.1"

	// First check - should not be limited
	limited, err := rl.CheckIPLimit(ctx, ip)
	require.NoError(t, err)
	assert.False(t, limited)

	// Increment counter
	err = rl.IncrementIPCounter(ctx, ip)
	require.NoError(t, err)

	// Still under limit
	limited, err = rl.CheckIPLimit(ctx, ip)
	require.NoError(t, err)
	assert.False(t, limited)

	// Increment again
	err = rl.IncrementIPCounter(ctx, ip)
	require.NoError(t, err)

	// Now should be limited
	limited, err = rl.CheckIPLimit(ctx, ip)
	require.NoError(t, err)
	assert.True(t, limited)
}

func TestCheckAddressLimit(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      10,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	address := "aura1test123456789"

	// First check - should not be limited
	limited, err := rl.CheckAddressLimit(ctx, address)
	require.NoError(t, err)
	assert.False(t, limited)

	// Increment counter
	err = rl.IncrementAddressCounter(ctx, address)
	require.NoError(t, err)

	// Now should be limited (limit is 1)
	limited, err = rl.CheckAddressLimit(ctx, address)
	require.NoError(t, err)
	assert.True(t, limited)
}

func TestGetCurrentCount(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      10,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	ip := "192.168.1.2"

	// Initial count should be 0
	count, err := rl.GetCurrentCount(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, 0, count)

	// Increment and check
	err = rl.IncrementIPCounter(ctx, ip)
	require.NoError(t, err)

	count, err = rl.GetCurrentCount(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestReset(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      10,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	ip := "192.168.1.3"

	// Increment counter
	err := rl.IncrementIPCounter(ctx, ip)
	require.NoError(t, err)

	// Verify count
	count, err := rl.GetCurrentCount(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	// Reset
	err = rl.Reset(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)

	// Count should be 0 again
	count, err = rl.GetCurrentCount(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, 0, count)
}

func TestGetRemainingTime(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      10,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	ip := "192.168.1.4"

	// Before incrementing, TTL should be 0
	ttl, err := rl.GetRemainingTime(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, time.Duration(0), ttl)

	// Increment counter (sets TTL)
	err = rl.IncrementIPCounter(ctx, ip)
	require.NoError(t, err)

	// Now TTL should be close to 1 hour
	ttl, err = rl.GetRemainingTime(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Greater(t, ttl, 59*time.Minute)
	assert.LessOrEqual(t, ttl, 1*time.Hour)
}

func TestConcurrentAccess(t *testing.T) {
	client := setupTestRedis(t)
	defer client.Close()

	config := map[string]interface{}{
		"per_ip":      100,
		"per_address": 1,
		"window":      1 * time.Hour,
	}

	rl := NewRateLimiter(client, config)
	ctx := context.Background()

	ip := "192.168.1.5"

	// Run 50 concurrent increments
	done := make(chan bool, 50)
	for i := 0; i < 50; i++ {
		go func() {
			err := rl.IncrementIPCounter(ctx, ip)
			assert.NoError(t, err)
			done <- true
		}()
	}

	// Wait for all goroutines to complete
	for i := 0; i < 50; i++ {
		<-done
	}

	// Count should be exactly 50
	count, err := rl.GetCurrentCount(ctx, "ratelimit:ip:"+ip)
	require.NoError(t, err)
	assert.Equal(t, 50, count)
}
