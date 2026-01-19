package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
)

// DB wraps the database connection
type DB struct {
	conn *sql.DB
}

// NewWithConn constructs a DB wrapper from an existing sql.DB.
// Intended for testing with sqlmock.
func NewWithConn(conn *sql.DB) *DB {
	return &DB{conn: conn}
}

// NewWithSQL wraps an existing *sql.DB (used primarily for testing/mocking).
func NewWithSQL(conn *sql.DB) *DB {
	return &DB{conn: conn}
}

// FaucetRequest represents a faucet request record
type FaucetRequest struct {
	ID          int64     `json:"id"`
	Recipient   string    `json:"recipient"`
	Amount      int64     `json:"amount"`
	TxHash      string    `json:"tx_hash"`
	IPAddress   string    `json:"ip_address"`
	Status      string    `json:"status"` // pending, success, failed
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Statistics holds faucet statistics
type Statistics struct {
	TotalRequests     int64   `json:"total_requests"`
	SuccessfulRequests int64   `json:"successful_requests"`
	FailedRequests    int64   `json:"failed_requests"`
	TotalDistributed  int64   `json:"total_distributed"`
	UniqueRecipients  int64   `json:"unique_recipients"`
	RequestsLast24h   int64   `json:"requests_last_24h"`
	RequestsLastHour  int64   `json:"requests_last_hour"`
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(connectionString string) (*DB, error) {
	conn, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info("Database connection established")

	return &DB{conn: conn}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// Migrate runs database migrations
func (db *DB) Migrate() error {
	query := `
	CREATE TABLE IF NOT EXISTS faucet_requests (
		id SERIAL PRIMARY KEY,
		recipient VARCHAR(255) NOT NULL,
		amount BIGINT NOT NULL,
		tx_hash VARCHAR(255),
		ip_address VARCHAR(45) NOT NULL,
		status VARCHAR(20) NOT NULL DEFAULT 'pending',
		error TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		completed_at TIMESTAMP WITH TIME ZONE
	);

	CREATE INDEX IF NOT EXISTS idx_recipient ON faucet_requests(recipient);
	CREATE INDEX IF NOT EXISTS idx_ip_address ON faucet_requests(ip_address);
	CREATE INDEX IF NOT EXISTS idx_created_at ON faucet_requests(created_at);
	CREATE INDEX IF NOT EXISTS idx_status ON faucet_requests(status);
	`

	_, err := db.conn.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info("Database migrations completed")
	return nil
}

// CreateRequest creates a new faucet request
func (db *DB) CreateRequest(recipient, ipAddress string, amount int64) (*FaucetRequest, error) {
	query := `
		INSERT INTO faucet_requests (recipient, amount, ip_address, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id, recipient, amount, ip_address, status, created_at
	`

	req := &FaucetRequest{}
	err := db.conn.QueryRow(query, recipient, amount, ipAddress).Scan(
		&req.ID,
		&req.Recipient,
		&req.Amount,
		&req.IPAddress,
		&req.Status,
		&req.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	return req, nil
}

// UpdateRequestSuccess updates a request as successful
func (db *DB) UpdateRequestSuccess(id int64, txHash string) error {
	query := `
		UPDATE faucet_requests
		SET status = 'success', tx_hash = $1, completed_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	_, err := db.conn.Exec(query, txHash, id)
	if err != nil {
		return fmt.Errorf("failed to update request: %w", err)
	}

	return nil
}

// UpdateRequestFailed updates a request as failed
func (db *DB) UpdateRequestFailed(id int64, errorMsg string) error {
	query := `
		UPDATE faucet_requests
		SET status = 'failed', error = $1, completed_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	_, err := db.conn.Exec(query, errorMsg, id)
	if err != nil {
		return fmt.Errorf("failed to update request: %w", err)
	}

	return nil
}

// GetRecentRequests gets recent successful requests
func (db *DB) GetRecentRequests(limit int) ([]*FaucetRequest, error) {
	query := `
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE status = 'success'
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := db.conn.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent requests: %w", err)
	}
	defer rows.Close()

	var requests []*FaucetRequest
	for rows.Next() {
		req := &FaucetRequest{}
		err := rows.Scan(
			&req.ID,
			&req.Recipient,
			&req.Amount,
			&req.TxHash,
			&req.IPAddress,
			&req.Status,
			&req.CreatedAt,
			&req.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan request: %w", err)
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// GetRequestsByAddress gets requests for a specific address within a time window
func (db *DB) GetRequestsByAddress(address string, since time.Time) ([]*FaucetRequest, error) {
	query := `
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE recipient = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`

	rows, err := db.conn.Query(query, address, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get requests by address: %w", err)
	}
	defer rows.Close()

	var requests []*FaucetRequest
	for rows.Next() {
		req := &FaucetRequest{}
		err := rows.Scan(
			&req.ID,
			&req.Recipient,
			&req.Amount,
			&req.TxHash,
			&req.IPAddress,
			&req.Status,
			&req.CreatedAt,
			&req.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan request: %w", err)
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// GetRequestsByIP gets requests from a specific IP within a time window
func (db *DB) GetRequestsByIP(ipAddress string, since time.Time) ([]*FaucetRequest, error) {
	query := `
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE ip_address = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`

	rows, err := db.conn.Query(query, ipAddress, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get requests by IP: %w", err)
	}
	defer rows.Close()

	var requests []*FaucetRequest
	for rows.Next() {
		req := &FaucetRequest{}
		err := rows.Scan(
			&req.ID,
			&req.Recipient,
			&req.Amount,
			&req.TxHash,
			&req.IPAddress,
			&req.Status,
			&req.CreatedAt,
			&req.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan request: %w", err)
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// GetStatistics gets faucet statistics
func (db *DB) GetStatistics() (*Statistics, error) {
	stats := &Statistics{}

	// Get total requests
	err := db.conn.QueryRow("SELECT COUNT(*) FROM faucet_requests").Scan(&stats.TotalRequests)
	if err != nil {
		return nil, fmt.Errorf("failed to get total requests: %w", err)
	}

	// Get successful requests
	err = db.conn.QueryRow("SELECT COUNT(*) FROM faucet_requests WHERE status = 'success'").Scan(&stats.SuccessfulRequests)
	if err != nil {
		return nil, fmt.Errorf("failed to get successful requests: %w", err)
	}

	// Get failed requests
	err = db.conn.QueryRow("SELECT COUNT(*) FROM faucet_requests WHERE status = 'failed'").Scan(&stats.FailedRequests)
	if err != nil {
		return nil, fmt.Errorf("failed to get failed requests: %w", err)
	}

	// Get total distributed
	err = db.conn.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM faucet_requests WHERE status = 'success'").Scan(&stats.TotalDistributed)
	if err != nil {
		return nil, fmt.Errorf("failed to get total distributed: %w", err)
	}

	// Get unique recipients
	err = db.conn.QueryRow("SELECT COUNT(DISTINCT recipient) FROM faucet_requests WHERE status = 'success'").Scan(&stats.UniqueRecipients)
	if err != nil {
		return nil, fmt.Errorf("failed to get unique recipients: %w", err)
	}

	// Get requests in last 24 hours
	err = db.conn.QueryRow("SELECT COUNT(*) FROM faucet_requests WHERE created_at >= NOW() - INTERVAL '24 hours'").Scan(&stats.RequestsLast24h)
	if err != nil {
		return nil, fmt.Errorf("failed to get requests last 24h: %w", err)
	}

	// Get requests in last hour
	err = db.conn.QueryRow("SELECT COUNT(*) FROM faucet_requests WHERE created_at >= NOW() - INTERVAL '1 hour'").Scan(&stats.RequestsLastHour)
	if err != nil {
		return nil, fmt.Errorf("failed to get requests last hour: %w", err)
	}

	return stats, nil
}
