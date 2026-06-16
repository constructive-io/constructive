#!/bin/bash
# run-stress-suite.sh — Run all 6 stress tests (OLD vs NEW) sequentially
# Usage: bash perf/run-stress-suite.sh
#
# Requires: server NOT running (this script manages server lifecycle)
# Requires: a deployed Constructive database; defaults to PGDATABASE=constructive

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVER_DIR"

# Common env
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}" PGPASSWORD="${PGPASSWORD:-password}" PGDATABASE="${PGDATABASE:-constructive}"
export NODE_ENV=development GRAPHILE_ENV=development API_IS_PUBLIC=false GRAPHQL_OBSERVABILITY_ENABLED=true
export SERVER_PORT=3000
export PORT="$SERVER_PORT"
export STOP_WAIT_SECONDS="${STOP_WAIT_SECONDS:-10}"
export NO_PROXY="${NO_PROXY:-localhost,127.0.0.1,::1}"
export no_proxy="${no_proxy:-$NO_PROXY}"

RESULTS_FILE="/tmp/stress-suite-results.jsonl"
> "$RESULTS_FILE"

kill_server() {
  local pids
  pids="$(lsof -tiTCP:"${SERVER_PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    for _ in $(seq 1 "$STOP_WAIT_SECONDS"); do
      if ! lsof -tiTCP:"${SERVER_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
        for pid in $pids; do wait "$pid" 2>/dev/null || true; done
        if [ -n "${SERVER_PID:-}" ]; then wait "$SERVER_PID" 2>/dev/null || true; fi
        return 0
      fi
      sleep 1
    done

    pids="$(lsof -tiTCP:"${SERVER_PORT}" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      kill -9 $pids 2>/dev/null || true
      for pid in $pids; do wait "$pid" 2>/dev/null || true; done
      if [ -n "${SERVER_PID:-}" ]; then wait "$SERVER_PID" 2>/dev/null || true; fi
    fi
  fi
}

trap kill_server EXIT

start_server() {
  local mode="$1"
  local cache_max="${2:-}"
  kill_server

  local env_extra=""
  if [ "$mode" = "new" ]; then
    env_extra="USE_MULTI_TENANCY_CACHE=true"
  elif [ -n "$cache_max" ]; then
    env_extra="GRAPHILE_CACHE_MAX=$cache_max"
  fi

  echo ">>> Starting server (mode=$mode, extra=$env_extra)..."
  eval "$env_extra npx ts-node src/run.ts" &
  SERVER_PID=$!

  # Wait for server to be ready
  for i in $(seq 1 30); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo ">>> Server process exited before becoming ready"
      return 1
    fi
    if curl --noproxy '*' -sf http://localhost:$SERVER_PORT/debug/memory > /dev/null 2>&1; then
      echo ">>> Server ready"
      return 0
    fi
    sleep 1
  done
  echo ">>> Server failed to start!"
  return 1
}

capture_memory() {
  curl --noproxy '*' -sf http://localhost:$SERVER_PORT/debug/memory 2>/dev/null || echo '{}'
}

run_test() {
  local test_name="$1"
  local mode="$2"
  local cache_max="$3"
  shift 3
  # remaining args are env vars for the benchmark

  echo ""
  echo "================================================================"
  echo "  TEST: $test_name — MODE: $mode"
  echo "================================================================"

  start_server "$mode" "$cache_max"

  echo ">>> Running benchmark: $*"
  env "$@" MODE=$mode TEST_NAME=$test_name npx ts-node perf/e2e-benchmark.ts || true

  echo ">>> Final memory snapshot:"
  capture_memory | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  m=d.get('memory',d)
  heap=m.get('heapUsedBytes', m.get('heapUsed', 0))
  rss=m.get('rssBytes', m.get('rss', 0))
  if isinstance(heap, str): heap=0
  if isinstance(rss, str): rss=0
  print(f'  Heap: {heap/1024/1024:.1f} MB, RSS: {rss/1024/1024:.1f} MB')
  gb=d.get('graphileBuilds',{})
  gc=d.get('graphileCache',{})
  print(f'  Builds: {gb.get(\"succeeded\",\"?\")}, Cache: {gc.get(\"size\",\"?\")}')
except: print('  (could not parse memory)')
"

  kill_server
}

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           MULTI-TENANCY CACHE STRESS TEST SUITE                ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ─── Test 1: High-K scale (K=100, 4 schema variants, 10 workers, 5min) ──────
run_test "test1-highk" "old" "2000" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=100 DURATION=300 WORKERS=10

run_test "test1-highk" "new" "" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=100 DURATION=300 WORKERS=10

# ─── Test 2: High concurrency (K=30, 4 schema variants, 10 workers, 5min) ───
run_test "test2-highconc" "old" "200" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=300 WORKERS=10

run_test "test2-highconc" "new" "" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=300 WORKERS=10

# ─── Test 3: Flush under load (K=30, 4 variants, 10 workers, flush/30s) ─────
run_test "test3-chaos" "old" "200" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=300 WORKERS=10 CHAOS_FLUSH=true FLUSH_INTERVAL=30

run_test "test3-chaos" "new" "" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=300 WORKERS=10 CHAOS_FLUSH=true FLUSH_INTERVAL=30

# ─── Test 4: Mixed buildKeys max divergence (K=30, 8 variants, 10 workers) ──
run_test "test4-mixed" "old" "800" \
  SCHEMA_VARIANTS=8 K=30 DURATION=300 WORKERS=10

run_test "test4-mixed" "new" "" \
  SCHEMA_VARIANTS=8 K=30 DURATION=300 WORKERS=10

# ─── Test 5: Soak (K=30, 4 variants, 10 workers, 2hr, flush/60s) ────────────
run_test "test5-soak" "old" "200" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=7200 WORKERS=10 CHAOS_FLUSH=true FLUSH_INTERVAL=60

run_test "test5-soak" "new" "" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=7200 WORKERS=10 CHAOS_FLUSH=true FLUSH_INTERVAL=60

# ─── Test 6: Startup burst (K=30, 4 variants, 10 workers, concurrent cold) ──
run_test "test6-burst" "old" "200" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=60 WORKERS=10 BURST_START=true

run_test "test6-burst" "new" "" \
  MULTI_ENDPOINT=true SCHEMA_VARIANTS=4 K=30 DURATION=60 WORKERS=10 BURST_START=true

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ALL TESTS COMPLETE                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Results in /tmp/e2e-benchmark-*.json"
