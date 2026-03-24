# Graphile Cache Leak Perf Runner (Initial)

This is the initial implementation for the two-step execution flow from the spec:

1. Phase 1: flow + technical validation (`preflight`) with mandatory A+B+C gates
2. Phase 2: pressure load + snapshots + analysis artifacts

## Output boundary

All runtime outputs are written under:

- `/Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/...`

No logs/debug artifacts are intentionally written into the repo.

## Scripts

- `phase1-preflight.mjs`
  - Phase 1A: checks `/debug/memory` and `/debug/db`, tenant baseline, routing profile smoke
  - Phase 1B (mandatory): builds token pool and enforces token coverage gate
  - Phase 1C (mandatory): builds `tokens.keyspace.json` and enforces route keyspace gate for graphile cache growth
  - if credentials are absent, can auto-bootstrap credential rows using local default admin login

- `phase2-load.mjs`
  - loads `tokens.keyspace.json` by default when present (falls back to `tokens.json`)
  - runs concurrent workers
  - captures baseline/after/idle snapshots
  - enforces tenant scale gate by default (`>=10`, configurable)
  - supports tenant churn windows: some tenants can go inactive for `cool` minutes (to trigger TTL eviction) and later become active again
  - optionally captures heap snapshot (`--heap-pid`)
  - optionally runs `analyze-debug-logs.mjs` on sampler dir

- `build-token-pool.mjs`
  - reads tenant credential input
  - calls `signIn` mutation and generates bearer-token profiles
  - writes `tokens.json` for authenticated multi-tenant load

- `build-keyspace-profiles.mjs`
  - reads `tokens.json`
  - expands route keyspace by generating additional routing headers (`X-Schemata` and/or private API headers)
  - optionally smoke-checks each candidate route with `__typename`
  - writes `tokens.keyspace.json` for graphile-cache size growth tests

- `seed-real-multitenant.mjs`
  - creates real test tenants (`type=2` org users)
  - creates login users and org memberships
  - writes `tenant-manifest.json` + `tenant-credentials.json`

- `run-test-spec.mjs`
  - wrapper for `--phase phase1|phase2|all`

## Quick start

From `graphql/server`:

```bash
pnpm perf:seed -- --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> --tenant-count 10
pnpm perf:phase1 -- --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>
```

This prints a run summary and writes:

- `.../reports/preflight.json`
- `.../data/request-profiles.discovered.json`
- `.../data/request-profiles.ready.json`
- `.../data/tokens.json` (Phase 1B mandatory output)
- `.../data/tokens.keyspace.json` (Phase 1C mandatory output)

Then run pressure phase on the same run dir (defaults to `tokens.json`):

```bash
pnpm perf:phase2 -- --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> --workers 16 --duration-seconds 1200 --tier 20tenant
```

Example with churn (50 tenants, 15-minute load):

```bash
pnpm perf:phase2 -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --min-tenant-count 50 \
  --workers 16 \
  --duration-seconds 900 \
  --idle-seconds 60 \
  --tier 50tenant-15min-churn \
  --churn-ratio 0.4 \
  --churn-warm-seconds 120 \
  --churn-cool-seconds 360 \
  --churn-cohorts 2
```

If you want to provide your own credential file:

```bash
pnpm perf:tokens -- --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> --credentials /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/tenant-credentials.json
pnpm perf:phase2 -- --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> --profiles /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/tokens.json --workers 16 --duration-seconds 1200 --tier 20tenant-auth
```

If you want to build/refresh keyspace-expanded profiles independently (outside phase1):

```bash
pnpm perf:keyspace -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --input /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/tokens.json \
  --output /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/tokens.keyspace.json \
  --mode schemata \
  --target-route-keys 24
```

Then run phase2 against the expanded profile set:

```bash
pnpm perf:phase2 -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --profiles /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/tokens.keyspace.json \
  --workers 16 \
  --duration-seconds 900 \
  --idle-seconds 60 \
  --tier 50tenant-15min-keyspace
```

Or run both:

```bash
pnpm perf:run -- --phase all
```

By default, under-provisioned runs fail fast. For smoke-only runs, explicitly add `--allow-underprovisioned`.

## Recommended server startup (tmp-bound logs)

When starting server for perf runs, point sampler logs into the same run dir:

```bash
GRAPHQL_OBSERVABILITY_ENABLED=true \
GRAPHQL_DEBUG_SAMPLER_ENABLED=true \
GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS=5000 \
GRAPHQL_DEBUG_SAMPLER_DIR=/Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/logs/sampler \
NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2 --expose-gc" \
node ./packages/cli/dist/index.js server --port=3000 --origin='*'
```
