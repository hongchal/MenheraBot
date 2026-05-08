// Package main runs the MenheraBot API HTTP server.
//
// Endpoints:
//
//	GET /healthz   — liveness/readiness probe
//	GET /api/hello — sanity check
//	GET /api/db-ping — verifies postgres connectivity (SELECT 1)
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type pingResp struct {
	OK     bool   `json:"ok"`
	Server string `json:"server"`
	DB     string `json:"db,omitempty"`
	Error  string `json:"error,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func databaseURL() string {
	// Prefer fully-formed DATABASE_URL when provided.
	if u := os.Getenv("DATABASE_URL"); u != "" {
		return u
	}
	host := getenv("POSTGRES_HOST", "localhost")
	port := getenv("POSTGRES_PORT", "5432")
	user := getenv("POSTGRES_USER", "menherabot")
	pwd := getenv("POSTGRES_PASSWORD", "")
	db := getenv("POSTGRES_DB", "menherabot")
	mode := getenv("POSTGRES_SSLMODE", "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pwd, host, port, db, mode)
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	port := getenv("PORT", "8080")

	// Lazy DB pool: connection is attempted on /api/db-ping so the server
	// stays healthy even if postgres is briefly unavailable at boot.
	var pool *pgxpool.Pool
	connectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if p, err := pgxpool.New(connectCtx, databaseURL()); err == nil {
		pool = p
		defer pool.Close()
	} else {
		log.Printf("warning: postgres pool init failed: %v (db-ping will report this)", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})

	mux.HandleFunc("GET /api/hello", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "hello from menherabot api",
			"version": "0.1.0",
		})
	})

	mux.HandleFunc("GET /api/db-ping", func(w http.ResponseWriter, r *http.Request) {
		resp := pingResp{Server: "ok"}
		if pool == nil {
			resp.OK = false
			resp.DB = "unreachable"
			resp.Error = "pool not initialized"
			writeJSON(w, http.StatusServiceUnavailable, resp)
			return
		}
		ctx, ctxCancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer ctxCancel()
		var n int
		if err := pool.QueryRow(ctx, "SELECT 1").Scan(&n); err != nil {
			resp.OK = false
			resp.DB = "unreachable"
			resp.Error = err.Error()
			writeJSON(w, http.StatusServiceUnavailable, resp)
			return
		}
		resp.OK = n == 1
		resp.DB = "reachable"
		writeJSON(w, http.StatusOK, resp)
	})

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("menherabot api listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
