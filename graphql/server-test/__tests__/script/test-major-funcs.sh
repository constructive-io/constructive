#!/usr/bin/env bash
#
# test-major-funcs.sh
#
# Runs integration tests for the Constructive GraphQL Server (PostGraphile V5).
# Handles database setup, test execution, and cleanup.
#
# Two modes of operation:
#
#   1. FRESH DB (default):
#      Creates a temporary database, deploys constructive-local schema via
#      pgpm, applies the FK fix, runs tests, and drops the database.
#
#   2. EXISTING DB (--use-existing or USE_EXISTING_DB=1):
#      Uses the existing constructive database directly. No database creation
#      or teardown. This is the mode Phase 4 established (TEST_DB=constructive).
#
# Usage:
#   ./test-major-funcs.sh                    # Fresh DB, run all tests
#   ./test-major-funcs.sh --use-existing     # Use existing constructive DB
#   ./test-major-funcs.sh --keep-db          # Fresh DB, keep after tests
#   TEST_PATTERN="authentication" ./test-major-funcs.sh  # Filter tests
#
# Requirements:
#   - PostgreSQL running and accessible
#   - pgpm CLI available (for fresh DB mode)
#   - Node.js 22+ installed (required for PostGraphile V5 Promise.withResolvers())
#   - pnpm installed
#

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_TEST_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONSTRUCTIVE_DB_DIR="$(cd "$SERVER_TEST_DIR/../../../../../constructive-db" 2>/dev/null && pwd || echo "")"

TIMESTAMP=$(date +%s)
KEEP_DB="${KEEP_DB:-0}"
USE_EXISTING="${USE_EXISTING_DB:-0}"

# Parse CLI args
for arg in "$@"; do
  case "$arg" in
    --keep-db) KEEP_DB=1 ;;
    --use-existing) USE_EXISTING=1 ;;
    --help|-h)
      echo "Usage: $0 [--keep-db] [--use-existing] [--help]"
      echo ""
      echo "Modes:"
      echo "  (default)        Create fresh DB, deploy schema, run tests, drop DB"
      echo "  --use-existing   Use existing constructive DB (Phase 4 TEST_DB mode)"
      echo "  --keep-db        Fresh DB mode, but keep database after tests finish"
      echo ""
      echo "Environment variables:"
      echo "  TEST_DB_NAME       Override test database name (fresh DB mode only)"
      echo "  TEST_PATTERN       Jest --testPathPattern filter"
      echo "  KEEP_DB=1          Skip database drop on cleanup"
      echo "  USE_EXISTING_DB=1  Same as --use-existing flag"
      echo "  PGHOST             PostgreSQL host (default: localhost)"
      echo "  PGPORT             PostgreSQL port (default: 5432)"
      echo "  PGUSER             PostgreSQL superuser (default: postgres)"
      echo "  PGPASSWORD         PostgreSQL password (default: password)"
      exit 0
      ;;
  esac
done

# Determine database name based on mode
if [ "$USE_EXISTING" = "1" ]; then
  DB_NAME="constructive"
  KEEP_DB=1  # Never drop the shared dev database
else
  DB_NAME="${TEST_DB_NAME:-constructive_test_${TIMESTAMP}}"
fi

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

  echo ""
  log "Cleaning up..."

  if [ "$KEEP_DB" = "1" ]; then
    if [ "$USE_EXISTING" = "1" ]; then
      ok "Using existing database -- nothing to clean up."
    else
      warn "KEEP_DB=1: Database '$DB_NAME' preserved for debugging."
      warn "Drop manually: dropdb $DB_NAME"
    fi
  else
    log "Dropping test database '$DB_NAME'..."
    dropdb --if-exists "$DB_NAME" 2>/dev/null && ok "Database dropped." || warn "Database drop failed (may not exist)."
  fi

  echo ""
  if [ $exit_code -eq 0 ]; then
    ok "=========================================="
    ok "  All done. Tests passed."
    ok "=========================================="
  else
    err "=========================================="
    err "  Tests failed with exit code $exit_code."
    err "=========================================="
  fi

  exit $exit_code
}
trap cleanup EXIT

# --- Pre-flight checks ---
echo ""
log "=========================================="
log "  Constructive GraphQL Integration Tests"
log "=========================================="
echo ""
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
  err "Node.js 22+ required (found $(node -v)). PostGraphile V5 needs Promise.withResolvers()."
  exit 1
fi
ok "Node.js version: $(node -v)"

# Check pgpm (only required for fresh DB mode)
if [ "$USE_EXISTING" = "0" ]; then
  if ! command -v pgpm &>/dev/null; then
    err "pgpm CLI not found. Required for fresh DB mode."
    err "Install pgpm or use --use-existing to skip DB setup."
    exit 1
  fi
  ok "pgpm version: $(pgpm --version)"

  if [ -n "$CONSTRUCTIVE_DB_DIR" ] && [ -d "$CONSTRUCTIVE_DB_DIR" ]; then
    ok "constructive-db found at: $CONSTRUCTIVE_DB_DIR"
  else
    err "constructive-db directory not found."
    err "Expected at: $SERVER_TEST_DIR/../../../../../constructive-db"
    err "Use --use-existing to skip fresh DB setup."
    exit 1
  fi
else
  # Verify the existing database actually exists
  if ! psql -d constructive -c "SELECT 1" &>/dev/null; then
    err "Existing database 'constructive' is not accessible."
    err "Ensure the constructive database exists and is deployed."
    exit 1
  fi
  ok "Existing database 'constructive' is accessible."
fi

echo ""
log "Mode: $([ "$USE_EXISTING" = "1" ] && echo "EXISTING DB" || echo "FRESH DB")"
log "Database: $DB_NAME"
log "Keep DB: $([ "$KEEP_DB" = "1" ] && echo "yes" || echo "no")"
echo ""

# --- Step 1: Create test database (fresh DB mode only) ---
if [ "$USE_EXISTING" = "0" ]; then
  log "Step 1: Creating test database '$DB_NAME'..."
  createdb "$DB_NAME"
  ok "Database created: $DB_NAME"

  # --- Step 2: Deploy constructive-local schema ---
  log "Step 2: Deploying constructive-local schema via pgpm..."
  (cd "$CONSTRUCTIVE_DB_DIR" && pgpm deploy --yes --database "$DB_NAME" --package constructive-local)
  ok "Schema deployed."

  # --- Step 3: Apply FK fix (deterministic_id trigger workaround) ---
  log "Step 3: Applying FK reference fix..."
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
else
  log "Step 1-3: Skipped (using existing database)."
fi

# --- Step 4: Build server-test if needed ---
log "Step 4: Ensuring server-test package is built..."
if [ ! -d "$SERVER_TEST_DIR/dist" ]; then
  (cd "$SERVER_TEST_DIR" && pnpm build)
  ok "server-test built."
else
  ok "server-test dist/ exists, skipping build."
fi

# --- Step 5: Run tests ---
echo ""
log "=========================================="
log "  Step 5: Running integration tests"
log "=========================================="
echo ""
log "Database: $DB_NAME"
log "Test directory: $SERVER_TEST_DIR/__tests__/"
echo ""

JEST_ARGS=(
  --forceExit
  --verbose
  --runInBand
)

if [ -n "${TEST_PATTERN:-}" ]; then
  JEST_ARGS+=(--testPathPattern="$TEST_PATTERN")
  log "Test filter: $TEST_PATTERN"
fi

# Set environment variables for the test run:
#   PGDATABASE  - tells PostgreSQL client which database to connect to
#   TEST_DB     - tells pgsql-test to use this database directly (no create/drop)
#                 Also triggers keepDb:true in get-connections.ts teardown
export PGDATABASE="$DB_NAME"
export TEST_DB="$DB_NAME"

(cd "$SERVER_TEST_DIR" && npx jest "${JEST_ARGS[@]}")
TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  ok "All tests passed!"
else
  err "Some tests failed (exit code: $TEST_EXIT)."
fi

# Propagate the test exit code through the cleanup trap
exit $TEST_EXIT
