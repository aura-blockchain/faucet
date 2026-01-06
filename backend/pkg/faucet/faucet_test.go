package faucet

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aura-chain/aura/faucet/pkg/config"
)

func TestValidateAddress(t *testing.T) {
	cfg := &config.Config{
		NodeRPC:         "http://localhost:26657",
		ChainID:         "test-chain",
		FaucetAddress:   "auratest1test",
		AmountPerRequest: 100,
	}

	service := &Service{
		cfg: cfg,
	}

	tests := []struct {
		name    string
		address string
		wantErr bool
	}{
		{
			name:    "valid address",
			address: "auratest1qwertyuiopasdfghjklzxcvbnm123456789test",
			wantErr: false,
		},
		{
			name:    "too short",
			address: "auratest1short",
			wantErr: true,
		},
		{
			name:    "wrong prefix",
			address: "cosmos1qwertyuiopasdfghjklzxcvbnm123456789test",
			wantErr: true,
		},
		{
			name:    "empty address",
			address: "",
			wantErr: true,
		},
		{
			name:    "too long",
			address: "auratest1" + string(make([]byte, 100)),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateAddress(tt.address)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNewService(t *testing.T) {
	cfg := &config.Config{
		NodeRPC:         "http://localhost:26657",
		ChainID:         "test-chain",
		FaucetAddress:   "auratest1test",
		AmountPerRequest: 100,
	}

	service, err := NewService(cfg, nil)
	require.NoError(t, err)
	assert.NotNil(t, service)
	assert.Equal(t, cfg, service.cfg)
	assert.NotNil(t, service.client)
}
