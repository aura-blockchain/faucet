package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	log "github.com/sirupsen/logrus"
)

// RateLimiter manages rate limiting using Redis
type RateLimiter struct {
	client      *redis.Client
	perIP       int
	perAddress  int
	window      time.Duration
}

// NewRedisClient creates a new Redis client
func NewRedisClient(redisURL string) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("Redis connection established")

	return client, nil
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(client *redis.Client, config map[string]interface{}) *RateLimiter {
	perIP := config["per_ip"].(int)
	perAddress := config["per_address"].(int)
	window := config["window"].(time.Duration)

	return &RateLimiter{
		client:     client,
		perIP:      perIP,
		perAddress: perAddress,
		window:     window,
	}
}

// CheckIPLimit checks if an IP address has exceeded the rate limit
func (rl *RateLimiter) CheckIPLimit(ctx context.Context, ip string) (bool, error) {
	key := fmt.Sprintf("ratelimit:ip:%s", ip)
	return rl.checkLimit(ctx, key, rl.perIP)
}

// CheckAddressLimit checks if an address has exceeded the rate limit
func (rl *RateLimiter) CheckAddressLimit(ctx context.Context, address string) (bool, error) {
	key := fmt.Sprintf("ratelimit:address:%s", address)
	return rl.checkLimit(ctx, key, rl.perAddress)
}

// IncrementIPCounter increments the counter for an IP address
func (rl *RateLimiter) IncrementIPCounter(ctx context.Context, ip string) error {
	key := fmt.Sprintf("ratelimit:ip:%s", ip)
	return rl.incrementCounter(ctx, key)
}

// IncrementAddressCounter increments the counter for an address
func (rl *RateLimiter) IncrementAddressCounter(ctx context.Context, address string) error {
	key := fmt.Sprintf("ratelimit:address:%s", address)
	return rl.incrementCounter(ctx, key)
}

// GetRemainingTime returns the time until the rate limit resets
func (rl *RateLimiter) GetRemainingTime(ctx context.Context, key string) (time.Duration, error) {
	ttl, err := rl.client.TTL(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get TTL: %w", err)
	}

	if ttl < 0 {
		return 0, nil
	}

	return ttl, nil
}

// checkLimit checks if a key has exceeded the limit
func (rl *RateLimiter) checkLimit(ctx context.Context, key string, limit int) (bool, error) {
	count, err := rl.client.Get(ctx, key).Int()
	if err != nil {
		if err == redis.Nil {
			// Key doesn't exist, limit not exceeded
			return false, nil
		}
		return false, fmt.Errorf("failed to get rate limit counter: %w", err)
	}

	return count >= limit, nil
}

// incrementCounter increments the counter for a key
func (rl *RateLimiter) incrementCounter(ctx context.Context, key string) error {
	pipe := rl.client.Pipeline()

	// Increment counter
	pipe.Incr(ctx, key)

	// Set expiration if this is the first increment
	pipe.Expire(ctx, key, rl.window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to increment counter: %w", err)
	}

	return nil
}

// Reset resets the rate limit for a key (useful for testing)
func (rl *RateLimiter) Reset(ctx context.Context, key string) error {
	return rl.client.Del(ctx, key).Err()
}

// GetCurrentCount gets the current count for a key
func (rl *RateLimiter) GetCurrentCount(ctx context.Context, key string) (int, error) {
	count, err := rl.client.Get(ctx, key).Int()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get current count: %w", err)
	}
	return count, nil
}

// Close closes the Redis client connection
func (rl *RateLimiter) Close() error {
	return rl.client.Close()
}
