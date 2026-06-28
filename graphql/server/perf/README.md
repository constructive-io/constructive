# Constructive GraphQL Server Perf Suite

This directory is the home for GraphQL server performance tooling around the multi-tenancy cache work.

This README documents the TypeScript perf CLI surface. Public DBPM and wrapper flows run through `perf/src/cli.ts`; private comparison and stress commands still delegate to the existing lightweight harnesses while their internals are migrated.

## What This Tests

The current optimization model is exact-match buildKey handler reuse:

- no template sharing
- no SQL rewrite
- no fingerprint-based handler reuse in the runtime path
- handler reuse only when the effective build inputs match exactly

The build inputs that matter for the current cache model are:

- connection identity
- schema set
- `anonRole`
- `roleName`

The benchmark goal is to compare the old dedicated-instance behavior against the new shared-handler behavior, and to verify that realistic multitenant public routing remains correct under load.

## Supported Use Cases

The maintained use cases are intentionally small.

### 1. Lightweight private-routing comparison

- routing mode: private/header routing
- server env: `API_IS_PUBLIC=false`
- data setup: synthetic route profiles, no DBPM tenant provisioning
- main purpose: quick old/new cache comparison
- commands:
  - `pnpm --dir graphql/server perf private-benchmark`
  - `pnpm --dir graphql/server perf private-compare`

### 2. DBPM-backed public multitenant load

- routing mode: public host routing
- server env: `API_IS_PUBLIC=true`
- data setup: real DBPM-provisioned tenants and business tables
- required local hosts:
  - `auth.localhost` for `signUp` / `signIn`
  - `modules.localhost` for DBPM provisioning mutations
  - `api-dbpm-*.localhost` for provisioned business-table GraphQL
- main purpose: realistic tenant/business workload
- commands:
  - `pnpm --dir graphql/server perf public-preflight`
  - `pnpm --dir graphql/server perf public-load`

### Wrapper flows

These are orchestration wrappers around the two primary use cases. They are not separate perf models.

- `pnpm --dir graphql/server perf run`
- `pnpm --dir graphql/server perf sweep`
- `pnpm --dir graphql/server perf stress`
- `pnpm --dir graphql/server perf e2e-matrix`

Options such as shape variants, sweeps, stress matrices, prewarm, and longer duration runs are modifiers of the two maintained flows above.

## TypeScript CLI Surface

The CLI is the stable operator interface for perf runs. Some implementations still delegate to compatibility modules or existing private harnesses, but callers should use the `perf` command surface.

Command surface:

| Command | Purpose | Backing implementation today |
|---|---|---|
| `perf private-benchmark` | Run a lightweight private/header-routing HTTP benchmark | `perf/e2e-benchmark.ts` |
| `perf private-compare` | Run old/new private-routing comparison | `perf/run-comparison.sh` |
| `perf stress` | Run the curated private comparison stress matrix | `perf/run-stress-suite.sh` |
| `perf public-preflight` | Provision/validate DBPM tenants and generate profiles | `perf/src/legacy/phase1-preflight.ts` |
| `perf public-load` | Run DBPM-backed business load | `perf/src/legacy/phase2-load.ts` |
| `perf run` | Run preflight + load for one run directory | `perf/src/commands/run.ts` |
| `perf sweep` | Run repeated K/tenant-count sweeps | `perf/src/commands/sweep.ts` |
| `perf e2e-matrix` | Run public/private x old/new verification matrix | `perf/src/commands/e2e-matrix.ts` |
| `perf summarize-shapes` | Summarize DBPM shape variants | `perf/src/commands/summarize-shapes.ts` |
| `perf prepare-public-access` | Prepare public grants for perf business tables | `perf/src/commands/prepare-public-access.ts` |
| `perf reset-business-data` | Truncate generated business workload table data | `perf/src/commands/reset-business-data.ts` |

Target library boundaries:

```text
perf/src/cli.ts
perf/src/commands.ts
perf/src/commands/*
perf/src/lib/args.ts
perf/src/lib/config.ts
perf/src/lib/run-dir.ts
perf/src/lib/http.ts
perf/src/lib/graphql.ts
perf/src/lib/pg.ts
perf/src/lib/process.ts
perf/src/lib/stats.ts
perf/src/lib/reports.ts
perf/src/lib/profiles/*
perf/src/lib/dbpm/*
perf/src/lib/public-access.ts
perf/src/utils/*
perf/src/types.ts
```

The CLI keeps the public/private lane split explicit. It does not expose every helper as an equally important top-level concept.

## Prerequisites

Run commands from the repository root unless a command explicitly says otherwise.

Use an already deployed Constructive database. This perf directory does not currently create and deploy a database from zero.

Default PostgreSQL environment:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=<password>
export PGDATABASE=constructive
```

`postgres_perf` appears in older local notes only. It is not the current quick-start default. If you want an isolated perf database, create and deploy it externally, then set `PGDATABASE=postgres_perf` before running the perf commands.

For local host routing, always avoid proxying localhost traffic:

```bash
export NO_PROXY=localhost,127.0.0.1,::1
export no_proxy=localhost,127.0.0.1,::1
```

Use `/debug/memory` to verify server readiness and inspect cache state:

```bash
curl http://localhost:3000/debug/memory
```

For the new multi-tenancy cache path, useful debug fields include `multiTenancyCache.handlerCacheSize` and `graphileBuilds.started` when present.

## Perf Lanes

| Lane | Routing | Data | Main use | Entrypoints | Backing implementation today |
|---|---|---|---|---|---|
| Lightweight HTTP comparison | private header routing, `API_IS_PUBLIC=false` | synthetic route profiles | old/new cache comparison | `perf private-benchmark`, `perf private-compare`, `perf stress` | `e2e-benchmark.ts`, `run-comparison.sh`, `run-stress-suite.sh` |
| DBPM-backed multitenant | public host routing, `API_IS_PUBLIC=true` | real provisioned tenants | realistic tenant/business load | `perf public-preflight`, `perf public-load`, `perf run`, `perf sweep` | `perf/src/legacy/phase1-preflight.ts`, `perf/src/legacy/phase2-load.ts`, `perf/src/commands/run.ts`, `perf/src/commands/sweep.ts` |

Do not treat every helper script as a separate product surface. Most helpers exist to support one of these two lanes.

## Current Server Modes

### DBPM lane: public routing

Start the server in public routing mode for DBPM-backed multitenant runs:

```bash
cd graphql/server

PGHOST=localhost \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=<password> \
PGDATABASE=constructive \
NODE_ENV=development \
GRAPHILE_ENV=development \
GRAPHQL_OBSERVABILITY_ENABLED=true \
API_IS_PUBLIC=true \
USE_MULTI_TENANCY_CACHE=true \
PORT=3000 \
NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
pnpm dev
```

Why public mode: the DBPM flow provisions and exercises public hosts. The private `migrate` route is useful for admin/migration smoke checks, but it does not expose `SignUpInput` or `SignInInput`, and the provisioned DBPM tenant databases in this branch do not currently create private business APIs.

### Lightweight lane: private routing

Start the server in private/header-routing mode for the lightweight benchmark lane:

```bash
cd graphql/server

PGHOST=localhost \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=<password> \
PGDATABASE=constructive \
NODE_ENV=development \
GRAPHILE_ENV=development \
GRAPHQL_OBSERVABILITY_ENABLED=true \
API_IS_PUBLIC=false \
USE_MULTI_TENANCY_CACHE=true \
PORT=3000 \
NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
pnpm dev
```

### Cache mode note

`MODE=new` labels benchmark output. It does not switch an already running server.

The server environment controls cache behavior:

- new mode: `USE_MULTI_TENANCY_CACHE=true`
- old mode: unset `USE_MULTI_TENANCY_CACHE` and use an enlarged `GRAPHILE_CACHE_MAX` for fair comparison

For old-mode comparisons, enlarge `GRAPHILE_CACHE_MAX` so dedicated-instance mode is not artificially dominated by LRU churn.

## Quick Start: Lightweight Private Comparison

Command:

```bash
pnpm --dir graphql/server perf private-compare --k 20 --duration 300 --workers 8
```

This comparison runs:

- old mode with tuned `GRAPHILE_CACHE_MAX`
- new mode with `USE_MULTI_TENANCY_CACHE=true`
- side-by-side throughput, latency, and heap reporting

For a very small single-mode smoke test, start the server in the desired cache mode and run:

Command:

```bash
pnpm --dir graphql/server perf private-benchmark --mode new --k 2 --duration 2 --workers 1
```

For this branch's exact-match buildKey cache, multiple synthetic tenants with the same connection, schemas, roles, and settings should map to one handler build. Use `/debug/memory` to confirm cache behavior.

## Quick Start: DBPM Public Smoke Run

The public lane requires DBPM-backed setup. `API_IS_PUBLIC=true` alone is not enough; the run needs provisioned tenants, generated profiles, and public business hosts.

### Phase 1: provision tenants and profiles

Command:

```bash
RUN_DIR=/tmp/constructive-perf/dbpm-$(date +%Y%m%d-%H%M%S)

pnpm --dir graphql/server perf public-preflight \
  --run-dir "$RUN_DIR" \
  --base-url http://localhost:3000 \
  --dbpm-tenant-count 2 \
  --dbpm-shape-variants 1 \
  --auth-host auth.localhost \
  --provision-host modules.localhost \
  --business-routing-mode public \
  --business-compat-routing-mode public \
  --business-public-api-name api \
  --business-public-subdomain-prefix api-dbpm- \
  --allow-underprovisioned \
  --min-token-tenants 1 \
  --keyspace-min-route-keys 1
```

Expected smoke output shape:

```json
{
  "phase1AReady": true,
  "phase1BReady": true,
  "phase1CReady": true,
  "phase1Ready": true,
  "tokenSuccessCount": 2,
  "tokenDistinctTenants": 2,
  "errors": 0
}
```

Warnings about `min-tenant-count`, recommended token scale, or keyspace route count are expected when using the small `--dbpm-tenant-count 2` smoke size. In that small smoke shape, `tenantReadyForPhase2` may be `false`; that is the scale gate, not a provisioning failure. Use the matching `--allow-underprovisioned` flag in phase 2.

### Phase 2: short correctness load

Command:

```bash
pnpm --dir graphql/server perf public-load \
  --run-dir "$RUN_DIR" \
  --base-url http://localhost:3000 \
  --profiles "$RUN_DIR/data/business-op-profiles.json" \
  --workers 1 \
  --duration-seconds 3 \
  --idle-seconds 0 \
  --allow-underprovisioned \
  --min-tenant-count 1 \
  --disable-prewarm \
  --skip-analyze \
  --public-role anonymous
```

Expected output shape:

```json
{
  "profileCount": 2,
  "failed": 0
}
```

`--public-role anonymous` is required for the current local public business route smoke test because the bearer token produced through `auth.localhost` is not what makes the `api-dbpm-*.localhost` table operations run as the `authenticated` database role in this local setup.

The public access preparation should only prepare schemas whose names start with `perf-` by default. Override that safety guard only when you know exactly which schemas will be modified.

For longer loads, increase `--workers` and `--duration-seconds`, and remove `--disable-prewarm` after the short correctness run passes.

## Full E2E Matrix: public/private × old/new

Use `e2e-matrix` for the full verification shape discussed in this branch:

```text
routing modes: private, public
cache modes:   old, new
k:             10
duration:      300s
```

Recommended first full run:

```bash
pnpm --dir graphql/server perf e2e-matrix \
  --routing-modes private,public \
  --cache-modes old,new \
  --k 10 \
  --duration-seconds 300 \
  --workers 4 \
  --manage-server
```

If that passes, run a higher-concurrency comparison:

```bash
pnpm --dir graphql/server perf e2e-matrix \
  --routing-modes private,public \
  --cache-modes old,new \
  --k 10 \
  --duration-seconds 300 \
  --workers 10 \
  --manage-server
```

`--manage-server` is recommended for this full matrix. In managed mode the wrapper starts one server process per case, waits for `/debug/memory`, runs the case, captures memory before/after, then stops only the process that it started.

Manual mode is still available by omitting `--manage-server`, but it does not switch an already-running server between old/new or public/private modes. In manual mode the operator must restart the server with the correct environment before each case; otherwise `MODE=old|new` may only label the benchmark output while all requests hit the same server configuration.

The matrix provisions the public DBPM setup once before measured public load. For public old/new comparisons it resets generated business table data between cache modes by default. Disable that only for debugging with:

```bash
--no-reset-between-public-cache-modes
```

For local `constructive-hub` runs, pass the real Postgres password from `docker-compose.yml` (or your real environment), not a redacted placeholder. A safe local pattern is:

```bash
PGPASSWORD="$(node -e "const fs=require('fs'); const s=fs.readFileSync('docker-compose.yml','utf8'); const m=s.match(/POSTGRES_PASSWORD:\\s*([^\\s]+)/); process.stdout.write(m[1]);")" \
  pnpm --dir graphql/server perf e2e-matrix ...
```

For public smoke/debug runs, token keyspace route keys may collapse to `auth.localhost` even when tenant/profile counts are healthy. Keep tenant count gates strict, but lower only the token route-key gate when needed:

```bash
--keyspace-min-route-keys 1
```

The wrapper writes a summary to:

```text
<run-dir>/reports/e2e-matrix-summary.json
```

Hard pass gates:

- every requested case completed
- private benchmark `errors = 0`
- public load `load.failed = 0`
- case result reports exist
- `/debug/memory` before/after snapshots were captured
- public reset between cache modes succeeded when enabled

Soft observations:

- new-mode heap delta should generally be lower than old-mode heap delta
- new-mode QPS does not need to be a hard pass condition
- p95/p99 should not regress dramatically
- handler/cache counts in `/debug/memory` should match the expected cache mode

## Longer Runs

### Stress suite

Command:

```bash
pnpm --dir graphql/server perf stress
```

The stress suite is a curated multi-run private comparison harness.

### K / tenant-count sweep

Command:

```bash
pnpm --dir graphql/server perf sweep \
  --k-values 3,7 \
  --duration-seconds 600 \
  --workers 16
```

Public routing should use active tenant routing. Private routing can use keyspace-style synthetic expansion.

## Shape Variants

Shape variants are an optional modifier for the DBPM public lane, not a separate primary use case.

The DBPM flow supports Option A shape divergence through additional provisioned tables created via the same provisioning mutation used for the main business table.

Use this when you need to check structural divergence while keeping the main CRUD workload pointed at the original business table:

```bash
pnpm --dir graphql/server perf public-preflight \
  --run-dir "$RUN_DIR" \
  --dbpm-tenant-count 20 \
  --dbpm-shape-variants 3
```

Summarize generated shapes:

Command:

```bash
pnpm --dir graphql/server perf summarize-shapes \
  --manifest "$RUN_DIR/data/business-table-manifest.json"
```

`summarize-shapes` is a perf-local diagnostic. It is not part of the runtime handler reuse mechanism.

## Scripts and Helpers

| Group | Command | Backing implementation today | Notes |
|---|---|---|---|
| Private lane | `perf private-benchmark` | `e2e-benchmark.ts` | Lightweight HTTP benchmark through Express -> PostGraphile -> Grafast -> PostgreSQL |
| Private lane | `perf private-compare` | `run-comparison.sh` | Old/new comparison with tuned old-mode cache max |
| Private lane | `perf stress` | `run-stress-suite.sh` | Curated private stress matrix |
| Public lane | `perf public-preflight` | `src/legacy/phase1-preflight.ts` | DBPM validation, tenant provisioning, token/profile setup |
| Public lane | `perf public-load` | `src/legacy/phase2-load.ts` | Sustained profile-driven GraphQL business load |
| Wrapper | `perf run` | `src/commands/run.ts` | Preflight + load orchestration |
| Wrapper | `perf sweep` | `src/commands/sweep.ts` | Repeated K/tenant-count orchestration |
| Wrapper | `perf e2e-matrix` | `src/commands/e2e-matrix.ts` | public/private x old/new verification matrix with managed-server option |
| Public helper | `perf prepare-public-access` | `src/commands/prepare-public-access.ts` | Grant preparation for public business tables |
| Public helper | `perf reset-business-data` | `src/commands/reset-business-data.ts` | Truncates business workload table data |
| Public helper | internal library | `src/legacy/public-test-access-lib.ts` | Shared public access helper logic |
| Profile helper | internal library | `src/legacy/build-token-pool.ts` | Token generation for DBPM profiles |
| Profile helper | internal library | `src/legacy/build-keyspace-profiles.ts` | Route/keyspace expansion |
| Profile helper | internal library | `src/legacy/build-business-op-profiles.ts` | Business operation profile construction |
| Diagnostics | `perf summarize-shapes` | `src/commands/summarize-shapes.ts` | Name-agnostic structural shape summary |

## Output Layout

Most commands write to a run directory under `/tmp/constructive-perf/`:

```text
<run-dir>/
├── data/
├── logs/
│   ├── heap/
│   └── sampler/
├── reports/
└── tmp-scripts/
```

Typical artifacts include:

- tenant credentials and token pools
- route/keyspace profiles
- business table manifests
- business operation profiles
- load summaries
- debug and memory snapshots

## Cleanup

Command:

```bash
pnpm --dir graphql/server perf reset-business-data --run-dir "$RUN_DIR"
```

Cleanup semantics:

- truncates generated business workload tables for a run
- does not drop DBPM-created tenant databases
- does not delete API/domain rows
- does not delete schemas or metaschema records

Use unique `RUN_DIR` values and periodically clean old `perf-dbpm-*` data manually if the local database becomes noisy.

## Troubleshooting

- `Unknown type "SignUpInput"`: the DBPM phase is pointed at a private/migrate route. Use `--auth-host auth.localhost` and start the server with `API_IS_PUBLIC=true`.
- `Cannot query field "nodeType" on type "SecureTableProvision"`: old script shape. Current `SecureTableProvision` does not expose `nodeType`.
- `BAD_FIELD_INPUT`: field types must be JSON objects such as `{ "name": "text" }`, not plain strings like `"text"`.
- `phase2` route probe passes but business operations fail with missing table fields: the profile probably points at `admin-dbpm-*` or `auth-dbpm-*`. Use `--business-public-api-name api --business-public-subdomain-prefix api-dbpm-`.
- `permission denied for table items_dbpm_*`: pass `--public-role anonymous` for the current local public business route smoke test.
- Old/new comparison looks wrong: remember that `MODE=new` only labels benchmark output. Verify the server was actually started with `USE_MULTI_TENANCY_CACHE=true`.
- Local host requests unexpectedly leave the machine or fail through a proxy: export both `NO_PROXY` and `no_proxy` for localhost addresses.

## Historical Benchmark Notes

Older stress runs for this branch showed substantial memory savings from exact-match buildKey deduplication.

The historical result pattern was:

- large heap savings when many `svc_key`s collapsed onto fewer exact-match buildKeys
- modest but consistent QPS gains because the benchmark still exercises full HTTP, Grafast, and PostgreSQL work
- narrower heap savings during soak runs because repeated flushes interrupt steady-state reuse
- stable behavior under concurrency and flush churn
- no observed need to reintroduce template sharing or SQL rewriting to get meaningful wins from handler reuse

Why heap savings can be large: in old mode, every `svc_key` keeps its own PostGraphile instance, compiled schema, and runtime caches. In new mode, `svc_key`s that resolve to the same build inputs share a handler.

Why QPS gains are smaller than heap gains: request execution is still dominated by network, GraphQL execution, and PostgreSQL work. The new path primarily reduces working-set size and GC pressure.

Why soak savings narrow: repeated flushes force both modes to destroy and rebuild runtime state, interrupting steady-state reuse.

These notes are historical context and explanatory material. They are not current run instructions, and the old `postgres_perf` configuration from that report is intentionally not part of the main quick start.
