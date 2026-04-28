#!/usr/bin/env bash
# run-comparison.sh — Old vs New multi-tenancy comparison using the perf framework
#
# Usage:
#   bash graphql/server/perf/run-comparison.sh [--k 20] [--duration 300] [--workers 8]
#
# This script runs the full e2e comparison:
#   1. Starts server in OLD mode (dedicated instances) with enlarged GRAPHILE_CACHE_MAX
#   2. Runs phase2 load test
#   3. Stops server
#   4. Starts server in NEW mode (multi-tenancy cache)
#   5. Runs phase2 load test
#   6. Compares results
#
# IMPORTANT: For the old approach, GRAPHILE_CACHE_MAX is enlarged to prevent
# cache eviction churn that would artificially penalize the dedicated-instance mode.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_DIR/../.." && pwd)"

# Defaults
K="${K:-20}"
DURATION="${DURATION:-300}"
WORKERS="${WORKERS:-8}"
IDLE_SECONDS="${IDLE_SECONDS:-30}"
SERVER_PORT="${SERVER_PORT:-3000}"
BASE_URL="http://localhost:${SERVER_PORT}"
RUN_DIR="${RUN_DIR:-/tmp/constructive-perf/comparison-$(date +%Y%m%dT%H%M%S)}"

# Parse CLI args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --k) K="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --idle) IDLE_SECONDS="$2"; shift 2 ;;
    --port) SERVER_PORT="$2"; BASE_URL="http://localhost:${SERVER_PORT}"; shift 2 ;;
    --run-dir) RUN_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Enlarge GRAPHILE_CACHE_MAX for old approach to prevent unfair eviction churn.
# With k=20 tenants × 3 endpoints, the old cache needs at least 60 slots.
# We use 2x headroom: max(100, k*6).
OLD_CACHE_MAX=$(( K * 6 ))
if [ "$OLD_CACHE_MAX" -lt 100 ]; then
  OLD_CACHE_MAX=100
fi

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
echo "E2E Multi-Tenancy Comparison (Perf Framework)"
echo "  K=$K tenants, Duration=${DURATION}s, Workers=$WORKERS"
echo "  Old approach GRAPHILE_CACHE_MAX=$OLD_CACHE_MAX"
echo "  Run dir: $RUN_DIR"
echo "=============================================================="

mkdir -p "$RUN_DIR"

kill_server() {
  fuser -k ${SERVER_PORT}/tcp 2>/dev/null || true
  sleep 2
}

wait_for_server() {
  local max_wait=90
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

start_server() {
  local mode="$1"
  echo ""
  echo "--------------------------------------------------------------"
  echo "Starting server in ${mode} mode..."
  echo "--------------------------------------------------------------"

  kill_server

  if [ "$mode" = "new" ]; then
    export USE_MULTI_TENANCY_CACHE=true
    unset GRAPHILE_CACHE_MAX 2>/dev/null || true
    echo "  USE_MULTI_TENANCY_CACHE=true (shared templates)"
  else
    unset USE_MULTI_TENANCY_CACHE 2>/dev/null || true
    export GRAPHILE_CACHE_MAX="$OLD_CACHE_MAX"
    echo "  GRAPHILE_CACHE_MAX=$OLD_CACHE_MAX (enlarged for fair comparison)"
  fi

  cd "$SERVER_DIR"
  npx ts-node src/run.ts > "$RUN_DIR/server-${mode}.log" 2>&1 &
  SERVER_PID=$!
  echo "  Server PID: $SERVER_PID"

  wait_for_server
}

run_e2e_benchmark() {
  local mode="$1"
  local tier="e2e-${mode}-k${K}"

  echo ""
  echo "=============================================================="
  echo "Running ${mode^^} mode benchmark (k=$K, ${DURATION}s, ${WORKERS} workers)"
  echo "=============================================================="

  cd "$SERVER_DIR"

  # Use the e2e-benchmark.ts from perf/ directory
  MODE="$mode" K="$K" DURATION="$DURATION" WORKERS="$WORKERS" \
    SERVER_PORT="$SERVER_PORT" \
    npx ts-node perf/e2e-benchmark.ts 2>&1 | tee "$RUN_DIR/benchmark-${mode}-output.txt"

  echo "  ${mode^^} mode complete."
}

# Capture server memory snapshot
capture_memory() {
  local label="$1"
  local outfile="$RUN_DIR/memory-${label}.json"
  curl -sf "${BASE_URL}/debug/memory" > "$outfile" 2>/dev/null || echo '{"error":"failed"}' > "$outfile"
  echo "  Memory snapshot: $outfile"
}

compare_results() {
  echo ""
  echo "=============================================================="
  echo "COMPARISON: OLD (Dedicated) vs NEW (Multi-tenancy Cache)"
  echo "=============================================================="

  local old_file="/tmp/e2e-benchmark-old-k${K}.json"
  local new_file="/tmp/e2e-benchmark-new-k${K}.json"

  if [ ! -f "$old_file" ] || [ ! -f "$new_file" ]; then
    echo "  ERROR: Missing result files"
    echo "  Expected: $old_file and $new_file"
    return 1
  fi

  # Copy results to run dir
  cp "$old_file" "$RUN_DIR/" 2>/dev/null || true
  cp "$new_file" "$RUN_DIR/" 2>/dev/null || true

  python3 << 'PYEOF'
import json, sys, os

k = int(os.environ.get('K', '20'))

with open(f"/tmp/e2e-benchmark-old-k{k}.json") as f:
    old = json.load(f)
with open(f"/tmp/e2e-benchmark-new-k{k}.json") as f:
    new = json.load(f)

def fmt(v, unit=""):
    if isinstance(v, float):
        return f"{v:.2f}{unit}"
    return f"{v:,}{unit}"

def delta(o, n, unit="", lower_better=True):
    if o == 0:
        return "N/A"
    diff = n - o
    pct = (diff / o) * 100
    return f"{diff:+.1f}{unit} ({pct:+.1f}%)"

print()
print(f"{'Metric':<25} {'Dedicated (Old)':<20} {'Multi-tenant (New)':<20} {'Delta':<30}")
print("-" * 95)
print(f"{'Tenants (k)':<25} {fmt(old['k']):<20} {fmt(new['k']):<20}")
print(f"{'Duration':<25} {fmt(old['durationSec'], 's'):<20} {fmt(new['durationSec'], 's'):<20}")
print(f"{'Workers':<25} {fmt(old['workers']):<20} {fmt(new['workers']):<20}")
print(f"{'Total Queries':<25} {fmt(old['totalQueries']):<20} {fmt(new['totalQueries']):<20} {delta(old['totalQueries'], new['totalQueries'], '', False)}")
print(f"{'Errors':<25} {fmt(old['errors']):<20} {fmt(new['errors']):<20}")
print(f"{'QPS':<25} {fmt(old['qps']):<20} {fmt(new['qps']):<20} {delta(old['qps'], new['qps'], '', False)}")
print(f"{'p50 Latency':<25} {fmt(old['p50'], 'ms'):<20} {fmt(new['p50'], 'ms'):<20} {delta(old['p50'], new['p50'], 'ms', True)}")
print(f"{'p95 Latency':<25} {fmt(old['p95'], 'ms'):<20} {fmt(new['p95'], 'ms'):<20} {delta(old['p95'], new['p95'], 'ms', True)}")
print(f"{'p99 Latency':<25} {fmt(old['p99'], 'ms'):<20} {fmt(new['p99'], 'ms'):<20} {delta(old['p99'], new['p99'], 'ms', True)}")
print(f"{'Heap Before':<25} {fmt(old['heapBefore'], ' MB'):<20} {fmt(new['heapBefore'], ' MB'):<20}")
print(f"{'Heap After':<25} {fmt(old['heapAfter'], ' MB'):<20} {fmt(new['heapAfter'], ' MB'):<20}")
print(f"{'Heap Delta':<25} {fmt(old['heapDelta'], ' MB'):<20} {fmt(new['heapDelta'], ' MB'):<20} {delta(old['heapDelta'], new['heapDelta'], ' MB', True)}")
print()

old_cold = old.get('coldStartMs', [])
new_cold = new.get('coldStartMs', [])
if old_cold and new_cold:
    print(f"{'Cold Start (1st)':<25} {fmt(old_cold[0], 'ms'):<20} {fmt(new_cold[0], 'ms'):<20}")
    print(f"{'Cold Start (last)':<25} {fmt(old_cold[-1], 'ms'):<20} {fmt(new_cold[-1], 'ms'):<20}")
    if len(new_cold) > 1:
        new_avg2 = sum(new_cold[1:]) / len(new_cold[1:])
        old_avg2 = sum(old_cold[1:]) / len(old_cold[1:])
        print(f"{'Cold Start (2nd+ avg)':<25} {fmt(old_avg2, 'ms'):<20} {fmt(new_avg2, 'ms'):<20} {delta(old_avg2, new_avg2, 'ms', True)}")

print()
print("-" * 95)
PYEOF
}

# ─── Main Flow ───────────────────────────────────────────────────────────────

# Phase A: OLD mode (dedicated PostGraphile instances with enlarged cache)
start_server "old"
capture_memory "old-before"
run_e2e_benchmark "old"
capture_memory "old-after"
kill_server

# Phase B: NEW mode (multi-tenancy cache with shared templates)
start_server "new"
capture_memory "new-before"
run_e2e_benchmark "new"
capture_memory "new-after"
kill_server

# Phase C: Compare
compare_results

echo ""
echo "Comparison complete. Results in: $RUN_DIR"
echo "  Server logs: $RUN_DIR/server-{old,new}.log"
echo "  Memory snapshots: $RUN_DIR/memory-*.json"
echo "  Benchmark output: $RUN_DIR/benchmark-*-output.txt"
