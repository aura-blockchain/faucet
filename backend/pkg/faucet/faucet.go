package faucet

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"regexp"
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

// RPCResponse wraps CometBFT JSON-RPC response
type RPCResponse struct {
	Result NodeStatus `json:"result"`
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
	// Use REST API endpoint for balance queries
	restURL := s.cfg.NodeREST
	if restURL == "" {
		restURL = s.cfg.NodeRPC // Fallback to RPC if REST not configured
	}
	url := fmt.Sprintf("%s/cosmos/bank/v1beta1/balances/%s", restURL, address)

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
	// Use CometBFT RPC endpoint (port 26657) for node status
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

	// CometBFT RPC wraps response in {"jsonrpc":"2.0","result":{...}}
	var rpcResp RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, fmt.Errorf("failed to decode status response: %w", err)
	}

	return &rpcResp.Result, nil
}

// broadcastTransaction broadcasts a transaction to the blockchain
func (s *Service) broadcastTransaction(txData map[string]interface{}) (string, error) {
	// Use CLI binary if configured (preferred method for signing)
	if s.cfg.FaucetBinary != "" && s.cfg.FaucetKey != "" {
		return s.broadcastViaCLI(txData)
	}

	// Fallback to REST API (requires mnemonic-based signing, not implemented)
	return s.broadcastViaREST(txData)
}

// broadcastViaCLI executes a transaction using the chain binary CLI
func (s *Service) broadcastViaCLI(txData map[string]interface{}) (string, error) {
	recipient := txData["to"].(string)
	amount := txData["amount"].([]map[string]string)
	amountStr := fmt.Sprintf("%s%s", amount[0]["amount"], amount[0]["denom"])

	// Build command arguments
	args := []string{
		"tx", "bank", "send",
		s.cfg.FaucetKey,
		recipient,
		amountStr,
		"--chain-id", s.cfg.ChainID,
		"--keyring-backend", s.cfg.FaucetKeyring,
		"--yes",
		"--output", "json",
		"--gas", fmt.Sprintf("%d", s.cfg.GasLimit),
		"--gas-prices", s.cfg.GasPrice,
	}

	// Add home directory if specified
	if s.cfg.FaucetHome != "" {
		args = append(args, "--home", s.cfg.FaucetHome)
	}

	// Add node RPC if specified
	if s.cfg.NodeRPC != "" {
		args = append(args, "--node", s.cfg.NodeRPC)
	}

	// Add memo if specified
	if memo, ok := txData["memo"].(string); ok && memo != "" {
		args = append(args, "--note", memo)
	}

	log.WithFields(log.Fields{
		"binary":    s.cfg.FaucetBinary,
		"args":      strings.Join(args, " "),
		"recipient": recipient,
		"amount":    amountStr,
	}).Debug("Executing CLI transaction")

	// Execute with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, s.cfg.FaucetBinary, args...)

	// Capture both stdout and stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	stdoutStr := stdout.String()
	stderrStr := stderr.String()

	log.WithFields(log.Fields{
		"stdout": stdoutStr,
		"stderr": stderrStr,
		"error":  err,
	}).Debug("CLI execution result")

	if err != nil {
		// Check if the error contains useful information
		errMsg := stderrStr
		if errMsg == "" {
			errMsg = stdoutStr
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		return "", fmt.Errorf("CLI execution failed: %s", errMsg)
	}

	// Parse the JSON output to extract tx hash
	txHash, parseErr := parseTxHashFromOutput(stdoutStr)
	if parseErr != nil {
		// Sometimes the tx hash appears in a different format or in stderr
		txHash, parseErr = parseTxHashFromOutput(stderrStr)
		if parseErr != nil {
			log.WithFields(log.Fields{
				"stdout": stdoutStr,
				"stderr": stderrStr,
			}).Warn("Could not parse tx hash from CLI output")
			return "", fmt.Errorf("transaction submitted but could not parse tx hash: %s", stdoutStr)
		}
	}

	return txHash, nil
}

// parseTxHashFromOutput extracts the transaction hash from CLI output
func parseTxHashFromOutput(output string) (string, error) {
	// Try to parse as JSON first
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(output), &result); err == nil {
		// Check for txhash in top level
		if txHash, ok := result["txhash"].(string); ok && txHash != "" {
			return txHash, nil
		}
		// Check for tx_response.txhash
		if txResponse, ok := result["tx_response"].(map[string]interface{}); ok {
			if txHash, ok := txResponse["txhash"].(string); ok && txHash != "" {
				return txHash, nil
			}
		}
	}

	// Try to find txhash with regex (backup method)
	// Matches patterns like: "txhash": "ABC123..." or txhash: ABC123
	re := regexp.MustCompile(`"?txhash"?\s*[=:]\s*"?([A-Fa-f0-9]{64})"?`)
	matches := re.FindStringSubmatch(output)
	if len(matches) >= 2 {
		return matches[1], nil
	}

	return "", fmt.Errorf("no transaction hash found in output")
}

// broadcastViaREST broadcasts a transaction via REST API (requires proper signing)
func (s *Service) broadcastViaREST(txData map[string]interface{}) (string, error) {
	// This method requires a signed transaction
	// For now, return an error suggesting CLI mode should be used
	log.Warn("REST broadcast requires signed transactions; configure FAUCET_BINARY for CLI mode")

	// Use REST API endpoint (port 1317) for transaction broadcasting via gRPC-gateway
	restURL := s.cfg.NodeREST
	if restURL == "" {
		restURL = s.cfg.NodeRPC // Fallback to RPC if REST not configured
	}
	url := fmt.Sprintf("%s/cosmos/tx/v1beta1/txs", restURL)

	// Build transaction body (note: this will fail without proper auth_info and signatures)
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

	return "", fmt.Errorf("no transaction hash in response: %s", string(body))
}

// ValidateAddress validates a AURA testnet address
func (s *Service) ValidateAddress(address string) error {
	if len(address) < 43 || len(address) > 64 {
		return fmt.Errorf("invalid address length")
	}

	if !strings.HasPrefix(address, "aura1") {
		return fmt.Errorf("address must start with aura1")
	}

	// Additional validation could be added here
	// For example, Bech32 validation

	return nil
}
