# Constructive GraphQL Server — Performance Test Suite

Migrated from the standalone perf framework into the Constructive monorepo.
Runs real GraphQL HTTP requests through the full Express → PostGraphile → Grafast pipeline.

## Quick Start

### E2E Comparison (Old vs New)

```bash
# 5-minute debug run, k=20 tenants, 8 workers
# Automatically enlarges GRAPHILE_CACHE_MAX for old approach
bash graphql/server/perf/run-comparison.sh --k 20 --duration 300 --workers 8
```

### Individual Scripts

```bash
# Phase 1: Preflight checks
node graphql/server/perf/phase1-preflight.mjs --run-dir /tmp/constructive-perf/run1

# Phase 2: Sustained load
node graphql/server/perf/phase2-load.mjs --run-dir /tmp/constructive-perf/run1 \
  --workers 8 --duration-seconds 300

# K-sweep: Multiple k-values with server restart per tier
node graphql/server/perf/run-k-sweep.mjs --k-values 10,20 \
  --duration-seconds 300 --workers 8 --api-is-public false

# Seed real tenants
node graphql/server/perf/seed-real-multitenant.mjs --tenant-count 20

# Build token pool from credentials
node graphql/server/perf/build-token-pool.mjs --run-dir /tmp/constructive-perf/run1

# Build business operation profiles
node graphql/server/perf/build-business-op-profiles.mjs --run-dir /tmp/constructive-perf/run1

# Reset test data
node graphql/server/perf/reset-business-test-data.mjs --run-dir /tmp/constructive-perf/run1
```

## Architecture

### Phases

| Phase | Script | Purpose |
|-------|--------|---------|
| Preflight | `phase1-preflight.mjs` | Health checks, token pool building, keyspace expansion |
| Tech Validate | `phase1-tech-validate-dbpm.mjs` | DBPM tenant provisioning, schema creation validation |
| Load | `phase2-load.mjs` | Concurrent GraphQL workers, cache activity tracking, fail-fast guards |
| K-Sweep | `run-k-sweep.mjs` | Multi-k orchestration with server restart per tier |
| Comparison | `run-comparison.sh` | Old vs New side-by-side with enlarged `GRAPHILE_CACHE_MAX` for old mode |

### Supporting Scripts

| Script | Purpose |
|--------|---------|
| `common.mjs` | Shared utilities (HTTP helpers, CLI arg parsing, file I/O) |
| `seed-real-multitenant.mjs` | Creates real tenants (orgs, users, memberships) |
| `build-token-pool.mjs` | Authenticates credentials, generates bearer tokens |
| `build-keyspace-profiles.mjs` | Expands route keyspace via schema combinations |
| `build-business-op-profiles.mjs` | Builds business operation profiles from manifest |
| `reset-business-test-data.mjs` | Truncates business test tables between runs |
| `prepare-public-test-access.mjs` | Sets up public lane access (grants, RLS policies) |
| `public-test-access-lib.mjs` | Shared library for public access preparation |
| `run-test-spec.mjs` | Phase orchestrator wrapper |

## Key Configuration

### GRAPHILE_CACHE_MAX

**CRITICAL**: When testing the old (dedicated) approach, always enlarge `GRAPHILE_CACHE_MAX`
to prevent cache eviction churn that would artificially penalize the old strategy.

The `run-comparison.sh` script automatically sets this to `max(100, k * 6)`.

For manual runs:
```bash
# Old mode: enlarge cache to hold all tenant instances
export GRAPHILE_CACHE_MAX=120  # for k=20 tenants × ~3 endpoints

# New mode: no need to set (multi-tenancy cache bypasses the graphile LRU cache)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGPASSWORD` | `password` | PostgreSQL password |
| `PGDATABASE` | `postgres` | PostgreSQL database |
| `API_IS_PUBLIC` | `false` | Routing mode (false = header-based private routing) |
| `USE_MULTI_TENANCY_CACHE` | unset | Enable multi-tenancy cache (new approach) |
| `GRAPHILE_CACHE_MAX` | `15` | Max graphile cache entries (enlarge for old approach!) |

## Output

All results are written to the run directory (`/tmp/constructive-perf/<run-id>/`):

```
<run-dir>/
├── data/           # Profiles, tokens, manifests
├── logs/           # Server logs, sampler output
│   ├── sampler/    # Debug sampler JSONL files
│   └── heap/       # Heap snapshots
├── reports/        # Summary reports, analysis output
└── tmp-scripts/    # Temporary script artifacts
```

## Adaptations from Original Framework

- `DEFAULT_TMP_ROOT` → `/tmp/constructive-perf` (was macOS user path)
- Server start via `npx ts-node src/run.ts` (was `packages/cli/dist/index.js`)
- Script paths adjusted for `graphql/server/perf/` location
- `capture-heap-snapshot.mjs` and `analyze-debug-logs.mjs` referenced from `../scripts/`

## TODO

Once Crystal PR #5 is published:
- Remove `link:` overrides from package.json
- Replace compat shim with direct import from `@dataplan/pg`
- Re-run full k-sweep comparison with published packages
