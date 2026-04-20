#!/usr/bin/env bash
# run-e2e-benchmark.sh — Run a single-mode e2e benchmark
#
# Usage:
#   bash graphql/server/perf/run-e2e-benchmark.sh [--mode new] [--k 30] [--duration 300] [--workers 8]
#
# For comparison (old vs new), use run-comparison.sh instead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
MODE="${MODE:-new}"
K="${K:-30}"
DURATION="${DURATION:-300}"
WORKERS="${WORKERS:-8}"
SERVER_PORT="${SERVER_PORT:-3000}"
BASE_URL="http://localhost:${SERVER_PORT}"

# Parse CLI args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --k) K="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --port) SERVER_PORT="$2"; BASE_URL="http://localhost:${SERVER_PORT}"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Common env
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-password}"
export PGDATABASE="${PGDATABASE:-postgres}"
export NODE_ENV=development
export GRAPHILE_ENV=development
export GRAPHQL_OBSERVABILITY_ENABLED=true
export API_IS_PUBLIC=false

echo "=============================================================="
echo "E2E Multi-Tenancy Benchmark (Single Mode)"
echo "  Mode=$MODE, K=$K tenants, Duration=${DURATION}s, Workers=$WORKERS"
echo "=============================================================="

kill_server() {
  fuser -k ${SERVER_PORT}/tcp 2>/dev/null || true
  sleep 2
}

wait_for_server() {
  local max_wait=120
  local waited=0
  echo -n "  Waiting for server on port $SERVER_PORT..."
  while ! curl -sf "${BASE_URL}/debug/memory" >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ $waited -ge $max_wait ]; then
      echo " TIMEOUT after ${max_wait}s"
      return 1
    fi
    echo -n "."
  done
  echo " ready (${waited}s)"
}

kill_server

if [ "$MODE" = "new" ]; then
  export USE_MULTI_TENANCY_CACHE=true
  unset GRAPHILE_CACHE_MAX 2>/dev/null || true
  echo "  USE_MULTI_TENANCY_CACHE=true (shared templates)"
else
  unset USE_MULTI_TENANCY_CACHE 2>/dev/null || true
  OLD_CACHE_MAX=$(( K * 6 ))
  if [ "$OLD_CACHE_MAX" -lt 100 ]; then
    OLD_CACHE_MAX=100
  fi
  export GRAPHILE_CACHE_MAX="$OLD_CACHE_MAX"
  echo "  GRAPHILE_CACHE_MAX=$OLD_CACHE_MAX (enlarged for fair comparison)"
fi

cd "$SERVER_DIR"
npx ts-node src/run.ts > /tmp/server-${MODE}.log 2>&1 &
SERVER_PID=$!
echo "  Server PID: $SERVER_PID"

wait_for_server

echo ""
echo "=============================================================="
echo "Running ${MODE^^} mode benchmark (k=$K, ${DURATION}s, ${WORKERS} workers)"
echo "=============================================================="

MODE="$MODE" K="$K" DURATION="$DURATION" WORKERS="$WORKERS" \
  SERVER_PORT="$SERVER_PORT" \
  npx ts-node perf/e2e-benchmark.ts

echo ""
echo "Benchmark complete."

# Capture final memory
curl -sf "${BASE_URL}/debug/memory" > /tmp/memory-${MODE}-final.json 2>/dev/null || true

kill_server

echo "Server stopped. Results in perf/results/ and /tmp/"
