package database

import (
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupMockDB returns a DB backed by sqlmock plus cleanup.
func setupMockDB(t *testing.T) (*DB, sqlmock.Sqlmock, func()) {
	conn, mock, err := sqlmock.New()
	require.NoError(t, err)
	return &DB{conn: conn}, mock, func() { conn.Close() }
}

func TestMigrateCreatesTablesAndIndexes(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta(`
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
	`)).WillReturnResult(sqlmock.NewResult(0, 0))

	require.NoError(t, db.Migrate())
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateRequestInsertsRow(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	now := time.Now()
	mock.ExpectQuery(regexp.QuoteMeta(`
		INSERT INTO faucet_requests (recipient, amount, ip_address, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id, recipient, amount, ip_address, status, created_at
	`)).
		WithArgs("addr1", int64(10), "1.1.1.1").
		WillReturnRows(sqlmock.NewRows([]string{"id", "recipient", "amount", "ip_address", "status", "created_at"}).
			AddRow(int64(1), "addr1", int64(10), "1.1.1.1", "pending", now))

	req, err := db.CreateRequest("addr1", "1.1.1.1", 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), req.ID)
	assert.Equal(t, "pending", req.Status)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateRequestSuccess(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE faucet_requests
		SET status = 'success', tx_hash = $1, completed_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`)).
		WithArgs("txhash", int64(2)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	require.NoError(t, db.UpdateRequestSuccess(2, "txhash"))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateRequestFailed(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE faucet_requests
		SET status = 'failed', error = $1, completed_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`)).
		WithArgs("boom", int64(3)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	require.NoError(t, db.UpdateRequestFailed(3, "boom"))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetRecentRequests(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "recipient", "amount", "tx_hash", "ip_address", "status", "created_at", "completed_at"})
	rows.AddRow(int64(1), "addr1", int64(10), "tx1", "1.1.1.1", "success", time.Now(), time.Now())

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE status = 'success'
		ORDER BY created_at DESC
		LIMIT $1
	`)).WithArgs(5).WillReturnRows(rows)

	reqs, err := db.GetRecentRequests(5)
	require.NoError(t, err)
	assert.Len(t, reqs, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetRequestsByAddress(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "recipient", "amount", "tx_hash", "ip_address", "status", "created_at", "completed_at"})
	rows.AddRow(int64(1), "addr1", int64(10), "tx1", "1.1.1.1", "success", time.Now(), time.Now())

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE recipient = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`)).WithArgs("addr1", sqlmock.AnyArg()).WillReturnRows(rows)

	reqs, err := db.GetRequestsByAddress("addr1", time.Now().Add(-time.Hour))
	require.NoError(t, err)
	assert.Len(t, reqs, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetRequestsByIP(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "recipient", "amount", "tx_hash", "ip_address", "status", "created_at", "completed_at"})
	rows.AddRow(int64(1), "addr1", int64(10), "tx1", "1.1.1.1", "success", time.Now(), time.Now())

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, recipient, amount, tx_hash, ip_address, status, created_at, completed_at
		FROM faucet_requests
		WHERE ip_address = $1 AND created_at >= $2
		ORDER BY created_at DESC
	`)).WithArgs("1.1.1.1", sqlmock.AnyArg()).WillReturnRows(rows)

	reqs, err := db.GetRequestsByIP("1.1.1.1", time.Now().Add(-time.Hour))
	require.NoError(t, err)
	assert.Len(t, reqs, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetStatistics(t *testing.T) {
	db, mock, cleanup := setupMockDB(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM faucet_requests")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(10)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM faucet_requests WHERE status = 'success'")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(7)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM faucet_requests WHERE status = 'failed'")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(3)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COALESCE(SUM(amount), 0) FROM faucet_requests WHERE status = 'success'")).WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(int64(700)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(DISTINCT recipient) FROM faucet_requests WHERE status = 'success'")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(5)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM faucet_requests WHERE created_at >= NOW() - INTERVAL '24 hours'")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(4)))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM faucet_requests WHERE created_at >= NOW() - INTERVAL '1 hour'")).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(2)))

	stats, err := db.GetStatistics()
	require.NoError(t, err)
	assert.Equal(t, int64(10), stats.TotalRequests)
	assert.Equal(t, int64(7), stats.SuccessfulRequests)
	assert.Equal(t, int64(3), stats.FailedRequests)
	assert.Equal(t, int64(700), stats.TotalDistributed)
	assert.Equal(t, int64(5), stats.UniqueRecipients)
	assert.Equal(t, int64(4), stats.RequestsLast24h)
	assert.Equal(t, int64(2), stats.RequestsLastHour)
	require.NoError(t, mock.ExpectationsWereMet())
}

