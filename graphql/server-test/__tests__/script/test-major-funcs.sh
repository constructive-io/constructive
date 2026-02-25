#!/usr/bin/env bash
#
# test-major-funcs.sh
#
# Runs integration tests for the Constructive GraphQL Server (PostGraphile V5).
# Handles database setup, test execution, and cleanup.
#
# Usage:
#   ./test-major-funcs.sh                    # Run all tests
#   ./test-major-funcs.sh --keep-db          # Run all tests, keep DB after
#   TEST_PATTERN="authentication" ./test-major-funcs.sh  # Run specific tests
#
# Requirements:
#   - PostgreSQL running and accessible
#   - pgpm CLI available
#   - Node.js 22+ installed
#   - pnpm installed
#

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_TEST_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONSTRUCTIVE_DB_DIR="$(cd "$SERVER_TEST_DIR/../../../../constructive-db" 2>/dev/null && pwd || echo "")"
MONOREPO_ROOT="$(cd "$SERVER_TEST_DIR/../../../.." && pwd)"

TIMESTAMP=$(date +%s)
DB_NAME="${TEST_DB_NAME:-constructive_test_${TIMESTAMP}}"
KEEP_DB="${KEEP_DB:-0}"

# Parse CLI args
for arg in "$@"; do
  case "$arg" in
    --keep-db) KEEP_DB=1 ;;
    --help|-h)
      echo "Usage: $0 [--keep-db] [--help]"
      echo ""
      echo "Environment variables:"
      echo "  TEST_DB_NAME   Override test database name"
      echo "  TEST_PATTERN   Jest --testPathPattern filter"
      echo "  KEEP_DB=1      Skip database drop on cleanup"
      echo "  PGHOST         PostgreSQL host (default: localhost)"
      echo "  PGPORT         PostgreSQL port (default: 5432)"
      echo "  PGUSER         PostgreSQL superuser (default: postgres)"
      echo "  PGPASSWORD     PostgreSQL password (default: password)"
      exit 0
      ;;
  esac
done

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[test]${NC} $1"; }
ok()  { echo -e "${GREEN}[  OK]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[FAIL]${NC} $1"; }

# --- Cleanup trap ---
cleanup() {
  local exit_code=$?

  log "Cleaning up..."

  if [ "$KEEP_DB" = "1" ]; then
    warn "KEEP_DB=1: Database '$DB_NAME' preserved for debugging."
    warn "Drop manually: dropdb $DB_NAME"
  else
    log "Dropping test database '$DB_NAME'..."
    dropdb --if-exists "$DB_NAME" 2>/dev/null && ok "Database dropped." || warn "Database drop failed (may not exist)."
  fi

  if [ $exit_code -eq 0 ]; then
    ok "All done. Tests passed."
  else
    err "Tests failed with exit code $exit_code."
  fi

  exit $exit_code
}
trap cleanup EXIT

# --- Pre-flight checks ---
log "Pre-flight checks..."

# Check PostgreSQL connection
if ! pg_isready -q 2>/dev/null; then
  err "PostgreSQL is not running or not accessible."
  err "Check PGHOST, PGPORT, PGUSER, PGPASSWORD environment variables."
  exit 1
fi
ok "PostgreSQL is running."

# Check Node.js version (need 22+ for Promise.withResolvers)
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  err "Node.js 22+ required (found v$(node -v)). PostGraphile V5 needs Promise.withResolvers()."
  exit 1
fi
ok "Node.js version: $(node -v)"

# Check pgpm
if ! command -v pgpm &>/dev/null; then
  err "pgpm CLI not found. Install from constructive-db or ensure it is in PATH."
  exit 1
fi
ok "pgpm found: $(which pgpm)"

# Check constructive-db directory
if [ -n "$CONSTRUCTIVE_DB_DIR" ] && [ -d "$CONSTRUCTIVE_DB_DIR" ]; then
  ok "constructive-db found at: $CONSTRUCTIVE_DB_DIR"
else
  warn "constructive-db directory not found. Database setup may fail."
  warn "Expected at: $SERVER_TEST_DIR/../../../../constructive-db"
fi

# --- Step 1: Create test database ---
log "Creating test database: $DB_NAME"
createdb "$DB_NAME"
ok "Database created: $DB_NAME"

# --- Step 2: Deploy constructive-local schema ---
log "Deploying constructive-local schema..."
if [ -n "$CONSTRUCTIVE_DB_DIR" ] && [ -d "$CONSTRUCTIVE_DB_DIR" ]; then
  (cd "$CONSTRUCTIVE_DB_DIR" && pgpm deploy --yes --database "$DB_NAME" --package constructive-local)
  ok "Schema deployed via pgpm."
else
  err "Cannot deploy schema: constructive-db directory not found."
  exit 1
fi

# --- Step 3: Apply FK fix (deterministic_id trigger workaround) ---
log "Applying FK reference fix..."
psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'FIXSQL'
-- Fix broken FK references caused by deterministic_id trigger
-- overwriting hardcoded migration IDs in services_public.apis
DO $$
BEGIN
  -- Only run if the tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'services_public' AND table_name = 'apis') THEN

    -- Fix domains.api_id
    UPDATE services_public.domains d
    SET api_id = a.id
    FROM services_public.apis a
    WHERE d.api_id = md5('028752cb-510b-1438-2f39-64534bd1cbd7'::text || '|' || a.name)::uuid;

    -- Fix api_schemas.api_id
    UPDATE services_public.api_schemas aps
    SET api_id = a.id
    FROM services_public.apis a
    WHERE aps.api_id = md5('028752cb-510b-1438-2f39-64534bd1cbd7'::text || '|' || a.name)::uuid;

    -- Fix database_id references
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'metaschema_public' AND table_name = 'database') THEN
      UPDATE services_public.apis
      SET database_id = (SELECT id FROM metaschema_public.database WHERE name = 'constructive' LIMIT 1)
      WHERE database_id = '028752cb-510b-1438-2f39-64534bd1cbd7';

      UPDATE services_public.domains
      SET database_id = (SELECT id FROM metaschema_public.database WHERE name = 'constructive' LIMIT 1)
      WHERE database_id = '028752cb-510b-1438-2f39-64534bd1cbd7';

      UPDATE services_public.api_schemas
      SET database_id = (SELECT id FROM metaschema_public.database WHERE name = 'constructive' LIMIT 1)
      WHERE database_id = '028752cb-510b-1438-2f39-64534bd1cbd7';
    END IF;

  END IF;
END
$$;
FIXSQL
ok "FK fix applied."

# --- Step 4: Build server-test if needed ---
log "Ensuring server-test package is built..."
if [ ! -d "$SERVER_TEST_DIR/dist" ]; then
  (cd "$SERVER_TEST_DIR" && pnpm build)
  ok "server-test built."
else
  ok "server-test dist/ exists, skipping build."
fi

# --- Step 5: Run tests ---
log "Running integration tests..."
log "Database: $DB_NAME"
log "Test directory: $SERVER_TEST_DIR/__tests__/"

JEST_ARGS=(
  --config jest.integration.config.js
  --forceExit
  --verbose
  --runInBand
)

if [ -n "${TEST_PATTERN:-}" ]; then
  JEST_ARGS+=(--testPathPattern="$TEST_PATTERN")
  log "Test filter: $TEST_PATTERN"
fi

# Set PGDATABASE to the test database for the server-test suite
export PGDATABASE="$DB_NAME"

(cd "$SERVER_TEST_DIR" && npx jest "${JEST_ARGS[@]}")
TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
  ok "All tests passed!"
else
  err "Some tests failed (exit code: $TEST_EXIT)."
fi

# Propagate the test exit code through the cleanup trap
exit $TEST_EXIT
