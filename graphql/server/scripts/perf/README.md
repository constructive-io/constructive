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
  - runs a mandatory route probe (`{ __typename }`) before taking baseline snapshot; fails fast when routing/auth is broken (can bypass with `--skip-route-probe`)
  - runs optional keyspace prewarm before baseline snapshot (enabled by default; tune with `--prewarm-sample-size`, `--prewarm-concurrency`, `--prewarm-timeout-ms`, `--prewarm-max-failures`, disable via `--disable-prewarm`)
  - has fail-fast guards for abnormal runs (high error-rate or consecutive network failures); disable only with `--disable-fail-fast`
  - runs concurrent workers
  - captures baseline/after/idle snapshots
  - enforces tenant scale gate by default (`>=10`, configurable)
  - supports `--keyspace-mode auto|schemata|none` (public lane should use `none`)
  - supports `--public-access-mode auto|on|off` (default `auto`) to prepare public-lane table grants/policies before load
  - supports `--public-role` and `--public-read-role` for public-lane access prep
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

- `build-business-op-profiles.mjs`
  - builds business operation profiles from `business-table-manifest.json` + `tokens.json`
  - supports `--routing-mode private|public|dual`
  - supports `--compat-routing-mode private|public` for writing `business-op-profiles.json`
  - in public mode, resolves `Host` from `services_public.apis/domains` (preferred API name configurable via `--public-api-name`)

- `seed-real-multitenant.mjs`
  - creates real test tenants (`type=2` org users)
  - creates login users and org memberships
  - writes `tenant-manifest.json` + `tenant-credentials.json`

- `run-test-spec.mjs`
  - wrapper for `--phase phase1|phase2|all`

- `reset-business-test-data.mjs`
  - truncates all business pressure-test tables from `business-op-profiles.json`
  - default safety gate: only allows schemas with `perf-` prefix
  - supports `--ensure-public-test-access` to apply test-only grants/policies for public-lane load (`authenticated` role by default)

- `prepare-public-test-access.mjs`
  - standalone public-lane access preparation for business tables
  - applies grants + minimal test RLS policies on perf schemas
  - intended for phase1/phase2 direct runs when you want to pre-open table access explicitly

- `run-k-sweep.mjs`
  - orchestrates multi-k runs (`k=3,7,...`) with per-k isolation:
    - stop old service on port 3000
    - restart service with configurable `--api-is-public true|false` and default `--max-old-space-size=15360` (override by `--max-old-space-size-mb` or `--node-options`)
    - supports schema readiness wait tuning via `--graphile-schema-wait-time-ms` (forwarded as `GRAPHILE_SCHEMA_WAIT_TIME_MS`)
    - route probe
    - truncate business test tables
    - for `--api-is-public=true`, automatically prepares public test-table access (grant + minimal RLS policies on perf tables)
    - run `phase2-load.mjs` for the target k
    - if service process crashes/exits mid-run, abort current phase2 immediately (avoid burning full duration on `fetch failed`)
  - supports two tier models:
    - `--tier-mode keyspace` (private lane): `k` means keyspace multiplier
    - `--tier-mode active-tenants` (public lane): `k` means active tenant/profile count (`--profile-limit=k`)

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

For public-lane business profiles, you can prepare table access explicitly:

```bash
pnpm perf:prepare-public-access -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --profiles /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/business-op-profiles.public.json
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

Build dual business profiles for private/public lanes:

```bash
pnpm perf:business-profiles -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --routing-mode dual \
  --compat-routing-mode private
```

Run k-sweep in public lane (k = active tenants):

```bash
pnpm perf:k-sweep -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --profiles /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/business-op-profiles.public.json \
  --api-is-public true \
  --routing-mode public \
  --tier-mode active-tenants \
  --graphile-cache-max 75 \
  --k-values 3,7,15,24
```

Public lane access preparation is enabled automatically when `--api-is-public=true`. If needed, override roles:

```bash
pnpm perf:k-sweep -- \
  --run-dir /Users/zeta/Projects/interweb/src/agents/tmp/<run-id> \
  --profiles /Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/data/business-op-profiles.public.json \
  --api-is-public true \
  --routing-mode public \
  --tier-mode active-tenants \
  --graphile-cache-max 75 \
  --public-role authenticated \
  --public-read-role anonymous \
  --k-values 3,7
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
GRAPHQL_DEBUG_SAMPLER_MEMORY_INTERVAL_MS=10000 \
GRAPHQL_DEBUG_SAMPLER_DB_INTERVAL_MS=30000 \
GRAPHQL_DEBUG_SAMPLER_DIR=/Users/zeta/Projects/interweb/src/agents/tmp/<run-id>/logs/sampler \
API_IS_PUBLIC=<true-or-false> \
NODE_OPTIONS="--max-old-space-size=15360 --heapsnapshot-signal=SIGUSR2 --expose-gc" \
node ./packages/cli/dist/index.js server --port=3000 --origin='*'
```
