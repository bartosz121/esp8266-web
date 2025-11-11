package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) *pgxpool.Pool {
	host := os.Getenv("APP_DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("APP_DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("APP_DB_USER")
	if user == "" {
		user = "user"
	}
	pass := os.Getenv("APP_DB_PASS")
	if pass == "" {
		pass = "pass"
	}
	adminConnStr := fmt.Sprintf("postgres://%s:%s@%s:%s/postgres?application_name=esp8266-web-test-admin",
		user, pass, host, port)
	adminConfig, err := pgxpool.ParseConfig(adminConnStr)
	require.NoError(t, err)
	adminPool, err := pgxpool.NewWithConfig(context.Background(), adminConfig)
	require.NoError(t, err)
	defer adminPool.Close()

	testDBName := fmt.Sprintf("esp8266_test_%d", time.Now().UnixNano())
	_, err = adminPool.Exec(context.Background(), "CREATE DATABASE "+testDBName)
	require.NoError(t, err)

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?application_name=esp8266-web-test",
		user, pass, host, port, testDBName)
	config, err := pgxpool.ParseConfig(connStr)
	require.NoError(t, err)
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoError(t, err)

	t.Cleanup(func() {
		pool.Close()
		adminPool2, err := pgxpool.NewWithConfig(context.Background(), adminConfig)
		if err == nil {
			defer adminPool2.Close()
			_, _ = adminPool2.Exec(context.Background(), "DROP DATABASE IF EXISTS "+testDBName)
		}
	})
	return pool
}

func TestApplyMigrations(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "dummy"}
	err := app.applyMigrations(context.Background())
	assert.NoError(t, err)
	var exists bool
	err = db.QueryRow(context.Background(), "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readings')").Scan(&exists)
	assert.NoError(t, err)
	assert.True(t, exists)
}

func TestDataHandlerPOST(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "testsecret"}
	require.NoError(t, app.applyMigrations(context.Background()))

	body := `{"tempCo": 25.5, "tempRoom": 22.0, "humidity": 60.0, "timestamp": 1761388101}`
	req := httptest.NewRequest("POST", "/data", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Secret-Key", "testsecret")
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp TemperatureReading
	err := json.NewDecoder(w.Body).Decode(&resp)

	assert.NoError(t, err)
	assert.NotNil(t, resp.Id)
	assert.Equal(t, 25.5, resp.TempCo)
	assert.Equal(t, 22.0, resp.TempRoom)
	assert.Equal(t, 60.0, resp.Humidity)
	assert.Equal(t, int64(1761388101), *resp.Timestamp)
}

func TestDataHandlerPOSTNilTimestamp(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "testsecret"}
	require.NoError(t, app.applyMigrations(context.Background()))

	body := `{"tempCo": 26.0, "tempRoom": 23.0, "humidity": 55.0}`
	req := httptest.NewRequest("POST", "/data", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Secret-Key", "testsecret")
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp TemperatureReading
	err := json.NewDecoder(w.Body).Decode(&resp)

	assert.NoError(t, err)
	assert.NotNil(t, resp.Id)
	assert.Equal(t, 26.0, resp.TempCo)
	assert.Equal(t, 23.0, resp.TempRoom)
	assert.Equal(t, 55.0, resp.Humidity)
	assert.NotNil(t, resp.Timestamp)
}

func TestDataHandlerGET(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "dummy"}
	require.NoError(t, app.applyMigrations(context.Background()))

	now := time.Now().UTC().Unix()
	_, err := db.Exec(context.Background(), "INSERT INTO readings (temp_co, temp_room, humidity, timestamp) VALUES ($1, $2, $3, $4)", 27.0, 24.0, 50.0, now)
	require.NoError(t, err)

	req := httptest.NewRequest("GET", "/data", nil)
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []TemperatureReading
	err = json.NewDecoder(w.Body).Decode(&resp)

	assert.NoError(t, err)
	assert.Greater(t, len(resp), 0)
}

func TestDataHandlerGETEmpty(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "dummy"}
	require.NoError(t, app.applyMigrations(context.Background()))

	_, err := db.Exec(context.Background(), "DELETE FROM readings")
	require.NoError(t, err)

	req := httptest.NewRequest("GET", "/data", nil)
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []TemperatureReading
	err = json.NewDecoder(w.Body).Decode(&resp)

	assert.NoError(t, err)
	assert.Equal(t, 0, len(resp))
}

func TestDataHandlerPOSTInvalidAuth(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "testsecret"}
	require.NoError(t, app.applyMigrations(context.Background()))

	body := `{"tempCo": 25.5, "tempRoom": 22.0, "humidity": 60.0}`
	req := httptest.NewRequest("POST", "/data", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Secret-Key", "wrongkey")
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestDataHandlerInvalidMethod(t *testing.T) {
	app := &app{}
	req := httptest.NewRequest("PUT", "/data", nil)
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestHealthHandler(t *testing.T) {
	app := &app{}
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	app.healthHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"status": "ok"}`, w.Body.String())
}

func TestHomeHandler(t *testing.T) {
	app := &app{}
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	app.homeHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Temperature Monitor")
}

func TestDataHandlerGETWithTimestampFilter(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "dummy"}
	require.NoError(t, app.applyMigrations(context.Background()))

	// Insert test data with specific timestamps
	baseTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).Unix()
	readings := []struct {
		tempCo    float64
		tempRoom  float64
		humidity  float64
		timestamp int64
	}{
		{20.0, 18.0, 50.0, baseTime - 1000},
		{21.0, 19.0, 55.0, baseTime},
		{22.0, 20.0, 60.0, baseTime + 1000},
		{23.0, 21.0, 65.0, baseTime + 2000},
	}

	for _, r := range readings {
		_, err := db.Exec(context.Background(),
			"INSERT INTO readings (temp_co, temp_room, humidity, timestamp) VALUES ($1, $2, $3, $4)",
			r.tempCo, r.tempRoom, r.humidity, r.timestamp)
		require.NoError(t, err)
	}

	tests := []struct {
		name      string
		queryURL  string
		expectLen int
	}{
		{
			name:      "no filters",
			queryURL:  "/data",
			expectLen: 4,
		},
		{
			name:      "filter with from only",
			queryURL:  fmt.Sprintf("/data?from=%d", baseTime),
			expectLen: 3,
		},
		{
			name:      "filter with to only",
			queryURL:  fmt.Sprintf("/data?to=%d", baseTime+1000),
			expectLen: 3,
		},
		{
			name:      "filter with both from and to",
			queryURL:  fmt.Sprintf("/data?from=%d&to=%d", baseTime, baseTime+1000),
			expectLen: 2,
		},
		{
			name:      "filter with from and to, narrow range",
			queryURL:  fmt.Sprintf("/data?from=%d&to=%d", baseTime+1500, baseTime+1500),
			expectLen: 0,
		},
		{
			name:      "filter with invalid from",
			queryURL:  "/data?from=invalid",
			expectLen: 4,
		},
		{
			name:      "filter with negative from",
			queryURL:  "/data?from=-100",
			expectLen: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.queryURL, nil)
			w := httptest.NewRecorder()

			app.dataHandler(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			var resp []TemperatureReading
			err := json.NewDecoder(w.Body).Decode(&resp)

			assert.NoError(t, err)
			assert.Equal(t, tt.expectLen, len(resp), "unexpected response length for query: %s", tt.queryURL)
		})
	}
}

func TestDataHandlerGETWithTimestampFilterAndPagination(t *testing.T) {
	db := setupTestDB(t)
	app := &app{db: db, secretKey: "dummy"}
	require.NoError(t, app.applyMigrations(context.Background()))

	// Insert test data with specific timestamps
	baseTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).Unix()
	for i := 0; i < 10; i++ {
		ts := baseTime + int64(i*1000)
		_, err := db.Exec(context.Background(),
			"INSERT INTO readings (temp_co, temp_room, humidity, timestamp) VALUES ($1, $2, $3, $4)",
			20.0+float64(i), 18.0, 50.0, ts)
		require.NoError(t, err)
	}

	// Test filter + limit + offset
	req := httptest.NewRequest("GET", fmt.Sprintf("/data?from=%d&limit=3&offset=1", baseTime), nil)
	w := httptest.NewRecorder()

	app.dataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []TemperatureReading
	err := json.NewDecoder(w.Body).Decode(&resp)

	assert.NoError(t, err)
	assert.Equal(t, 3, len(resp))
}
