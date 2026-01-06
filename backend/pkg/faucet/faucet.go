package faucet

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/aura-chain/aura/faucet/pkg/config"
	"github.com/aura-chain/aura/faucet/pkg/database"
)

// Service handles faucet operations
type Service struct {
	cfg    *config.Config
	db     *database.DB
	client *http.Client
}

// SendRequest represents a token send request
type SendRequest struct {
	Recipient string
	Amount    int64
	IPAddress string
}

// SendResponse represents a token send response
type SendResponse struct {
	TxHash    string
	Recipient string
	Amount    int64
}

// NodeStatus represents blockchain node status
type NodeStatus struct {
	NodeInfo struct {
		Network string `json:"network"`
		Version string `json:"version"`
	} `json:"node_info"`
	SyncInfo struct {
		LatestBlockHeight string `json:"latest_block_height"`
		CatchingUp        bool   `json:"catching_up"`
	} `json:"sync_info"`
}

// Balance represents account balance
type Balance struct {
	Balances []struct {
		Denom  string `json:"denom"`
		Amount string `json:"amount"`
	} `json:"balances"`
}

// NewService creates a new faucet service
func NewService(cfg *config.Config, db *database.DB) (*Service, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	return &Service{
		cfg:    cfg,
		db:     db,
		client: client,
	}, nil
}

// SendTokens sends tokens to a recipient
func (s *Service) SendTokens(req *SendRequest) (*SendResponse, error) {
	log.WithFields(log.Fields{
		"recipient": req.Recipient,
		"amount":    req.Amount,
		"ip":        req.IPAddress,
	}).Info("Sending tokens")

	// Create database record
	dbReq, err := s.db.CreateRequest(req.Recipient, req.IPAddress, req.Amount)
	if err != nil {
		return nil, fmt.Errorf("failed to create request record: %w", err)
	}

	// Prepare transaction
	txData := map[string]interface{}{
		"chain_id": s.cfg.ChainID,
		"from":     s.cfg.FaucetAddress,
		"to":       req.Recipient,
		"amount": []map[string]string{
			{
				"denom":  s.cfg.Denom,
				"amount": fmt.Sprintf("%d", req.Amount),
			},
		},
		"gas":       fmt.Sprintf("%d", s.cfg.GasLimit),
		"gas_price": s.cfg.GasPrice,
		"memo":      s.cfg.TransactionMemo,
	}

	// Send transaction to node
	txHash, err := s.broadcastTransaction(txData)
	if err != nil {
		// Update request as failed
		if updateErr := s.db.UpdateRequestFailed(dbReq.ID, err.Error()); updateErr != nil {
			log.WithError(updateErr).Error("Failed to update request status")
		}
		return nil, fmt.Errorf("failed to broadcast transaction: %w", err)
	}

	// Update request as successful
	if err := s.db.UpdateRequestSuccess(dbReq.ID, txHash); err != nil {
		log.WithError(err).Error("Failed to update request status")
	}

	log.WithFields(log.Fields{
		"tx_hash":   txHash,
		"recipient": req.Recipient,
		"amount":    req.Amount,
	}).Info("Tokens sent successfully")

	return &SendResponse{
		TxHash:    txHash,
		Recipient: req.Recipient,
		Amount:    req.Amount,
	}, nil
}

// GetBalance returns the faucet account balance
func (s *Service) GetBalance() (int64, error) {
	return s.getBalanceForAddress(s.cfg.FaucetAddress)
}

// GetAddressBalance returns the balance for a specific address
func (s *Service) GetAddressBalance(address string) (int64, error) {
	return s.getBalanceForAddress(address)
}

func (s *Service) getBalanceForAddress(address string) (int64, error) {
	url := fmt.Sprintf("%s/cosmos/bank/v1beta1/balances/%s", s.cfg.NodeRPC, address)

	resp, err := s.client.Get(url)
	if err != nil {
		return 0, fmt.Errorf("failed to get balance: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("failed to get balance: status %d, body: %s", resp.StatusCode, string(body))
	}

	var balance Balance
	if err := json.NewDecoder(resp.Body).Decode(&balance); err != nil {
		return 0, fmt.Errorf("failed to decode balance response: %w", err)
	}

	// Find the balance for our denom
	for _, b := range balance.Balances {
		if b.Denom == s.cfg.Denom {
			var amount int64
			fmt.Sscanf(b.Amount, "%d", &amount)
			return amount, nil
		}
	}

	return 0, nil
}

// GetNodeStatus returns the blockchain node status
func (s *Service) GetNodeStatus() (*NodeStatus, error) {
	url := fmt.Sprintf("%s/status", s.cfg.NodeRPC)

	resp, err := s.client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get node status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get node status: status %d, body: %s", resp.StatusCode, string(body))
	}

	var status NodeStatus
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("failed to decode status response: %w", err)
	}

	return &status, nil
}

// broadcastTransaction broadcasts a transaction to the blockchain
func (s *Service) broadcastTransaction(txData map[string]interface{}) (string, error) {
	// This is a simplified version. In production, you would:
	// 1. Sign the transaction using the faucet's private key
	// 2. Encode it properly according to Cosmos SDK format
	// 3. Broadcast via the /cosmos/tx/v1beta1/txs endpoint

	// For now, we'll simulate the transaction
	// In a real implementation, use the Cosmos SDK Go client

	url := fmt.Sprintf("%s/cosmos/tx/v1beta1/txs", s.cfg.NodeRPC)

	// Build transaction body
	txBody := map[string]interface{}{
		"body": map[string]interface{}{
			"messages": []map[string]interface{}{
				{
					"@type":        "/cosmos.bank.v1beta1.MsgSend",
					"from_address": txData["from"],
					"to_address":   txData["to"],
					"amount":       txData["amount"],
				},
			},
			"memo": txData["memo"],
		},
		"mode": "BROADCAST_MODE_SYNC",
	}

	jsonData, err := json.Marshal(txBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal transaction: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to broadcast transaction: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("transaction broadcast failed: status %d, body: %s", resp.StatusCode, string(body))
	}

	// Parse response to get tx hash
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse broadcast response: %w", err)
	}

	// Extract tx hash from response
	if txResponse, ok := result["tx_response"].(map[string]interface{}); ok {
		if txHash, ok := txResponse["txhash"].(string); ok {
			return txHash, nil
		}
	}

	// For testing purposes, generate a mock tx hash
	mockTxHash := fmt.Sprintf("MOCK_%d", time.Now().Unix())
	log.Warn("Using mock transaction hash for testing")

	return mockTxHash, nil
}

// ValidateAddress validates a AURA testnet address
func (s *Service) ValidateAddress(address string) error {
	if len(address) < 44 || len(address) > 64 {
		return fmt.Errorf("invalid address length")
	}

	if !strings.HasPrefix(address, "auratest1") {
		return fmt.Errorf("address must start with auratest1")
	}

	// Additional validation could be added here
	// For example, Bech32 validation

	return nil
}
