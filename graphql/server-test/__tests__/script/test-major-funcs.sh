#!/usr/bin/env bash
#
# test-major-funcs.sh
#
# Integration test runner that:
#   1. Creates a fresh PostgreSQL database
#   2. Deploys the constructive-local schema via pgpm
#   3. Runs the Jest integration tests
#   4. Cleans up the database (unless --keep is passed)
#
# Usage:
#   ./test-major-funcs.sh              # run tests, auto-cleanup
#   ./test-major-funcs.sh --keep       # run tests, keep database for debugging
#   ./test-major-funcs.sh --only auth  # run only authentication tests
#
# Prerequisites:
#   - PostgreSQL running with createdb/dropdb available
#   - pgpm installed and in PATH
#   - constructive-db repo checked out at the expected location
#   - pnpm installed
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_TEST_DIR="$(dirname "$TESTS_DIR")"
CONSTRUCTIVE_DIR="$(cd "$SERVER_TEST_DIR/../.." && pwd)"
CONSTRUCTIVE_DB_DIR="$(cd "$CONSTRUCTIVE_DIR/../constructive-db" && pwd 2>/dev/null || echo "")"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TEST_DB_NAME="constructive_test_${$}_$(date +%s)"
KEEP_DB=false
TEST_PATTERN=""
JEST_ARGS=()

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      KEEP_DB=true
      shift
      ;;
    --only)
      TEST_PATTERN="$2"
      shift 2
      ;;
    --db)
      TEST_DB_NAME="$2"
      shift 2
      ;;
    *)
      JEST_ARGS+=("$1")
      shift
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${BLUE}[test]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[fail]${NC} $*"; }

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
cleanup() {
  local exit_code=$?
  if [ "$KEEP_DB" = true ]; then
    warn "Keeping test database: ${TEST_DB_NAME}"
    warn "To drop it manually: dropdb ${TEST_DB_NAME}"
  else
    log "Dropping test database: ${TEST_DB_NAME}"
    dropdb --if-exists "${TEST_DB_NAME}" 2>/dev/null || true
  fi
  exit $exit_code
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
log "Preflight checks..."

if ! command -v createdb &>/dev/null; then
  err "createdb not found. Is PostgreSQL installed?"
  exit 1
fi

if ! command -v pgpm &>/dev/null; then
  err "pgpm not found. Install it first."
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  err "pnpm not found. Install it first."
  exit 1
fi

if [ -z "$CONSTRUCTIVE_DB_DIR" ] || [ ! -d "$CONSTRUCTIVE_DB_DIR" ]; then
  err "constructive-db directory not found at expected location."
  err "Expected: ${CONSTRUCTIVE_DIR}/../constructive-db"
  err "Make sure constructive-db is checked out as a sibling of constructive."
  exit 1
fi

ok "All preflight checks passed"

# ---------------------------------------------------------------------------
# Step 1: Create database
# ---------------------------------------------------------------------------
log "Creating test database: ${TEST_DB_NAME}"
createdb "${TEST_DB_NAME}"
ok "Database created: ${TEST_DB_NAME}"

# ---------------------------------------------------------------------------
# Step 1b: Bootstrap admin roles
# ---------------------------------------------------------------------------
log "Bootstrapping admin users (anonymous, authenticated, administrator roles)..."
pgpm admin-users bootstrap --database "${TEST_DB_NAME}"
ok "Admin users bootstrapped"

# ---------------------------------------------------------------------------
# Step 2: Deploy constructive-local
# ---------------------------------------------------------------------------
log "Deploying constructive-local to ${TEST_DB_NAME}..."
cd "${CONSTRUCTIVE_DB_DIR}"
pgpm deploy --yes --database "${TEST_DB_NAME}" --package constructive-local
ok "Schema deployed successfully"

# ---------------------------------------------------------------------------
# Step 3: Run tests
# ---------------------------------------------------------------------------
log "Running integration tests..."
cd "${SERVER_TEST_DIR}"

# Build test pattern if --only was specified
if [ -n "$TEST_PATTERN" ]; then
  JEST_ARGS+=("--testPathPatterns" "${TEST_PATTERN}")
  log "Filtering tests: ${TEST_PATTERN}"
fi

# Run jest with TEST_DB pointing to our fresh database
export TEST_DB="${TEST_DB_NAME}"
export NODE_ENV=test
export GRAPHILE_ENV=development
export PGDATABASE="${TEST_DB_NAME}"

set +e
pnpm test -- --forceExit --verbose ${JEST_ARGS[@]+"${JEST_ARGS[@]}"}
TEST_EXIT_CODE=$?
set -e

if [ $TEST_EXIT_CODE -eq 0 ]; then
  ok "All tests passed!"
else
  warn "Tests exited with code ${TEST_EXIT_CODE}"
  warn "Some tests may have failed -- review output above."
fi

exit $TEST_EXIT_CODE
