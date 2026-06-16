# Real Multitenant E2E Perf Runbook

This is the current verified runbook for the real DBPM-backed multitenant perf
lane in this branch. It supersedes the older local notes that assumed a single
private route and a `postgres_perf` database.

## Database

Use an already deployed Constructive database. The perf scripts default to:

```bash
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=constructive
```

`postgres_perf` is only an optional isolated database name from older local
notes. This branch does not include a perf-local script that creates and deploys
that database from zero. If you want isolation, create and deploy it externally,
then export `PGDATABASE=postgres_perf` before running these scripts.

## Server Modes

The current DBPM flow needs the server in public routing mode:

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive/graphql/server

PGHOST=localhost \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=password \
PGDATABASE=constructive \
NODE_ENV=development \
GRAPHILE_ENV=development \
GRAPHQL_OBSERVABILITY_ENABLED=true \
API_IS_PUBLIC=true \
USE_MULTI_TENANCY_CACHE=true \
PORT=3000 \
NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
npx ts-node src/run.ts
```

Why public mode: current local DBPM provisioning exposes auth/provision/business
through public hosts:

- `auth.localhost` for `signUp` and `signIn`
- `modules.localhost` for DBPM provisioning mutations
- `api-dbpm-*.localhost` for provisioned business-table GraphQL

The private `migrate` route is useful for admin/migration smoke checks, but it
does not expose `SignUpInput` or `SignInInput`, and the provisioned DBPM tenant
databases created here do not currently create private business APIs.

## Phase 1: Provision Tenants

From the repo root:

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive

RUN_DIR=/tmp/constructive-perf/dbpm-$(date +%Y%m%d-%H%M%S)

NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
node graphql/server/perf/phase1-preflight.mjs \
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

Expected smoke output for a small local run:

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

Warnings about `min-tenant-count`, recommended token scale, or keyspace route
count are expected when using the small `--dbpm-tenant-count 2` smoke size. In
that small smoke shape, `tenantReadyForPhase2` may be `false`; that is the scale
gate, not a provisioning failure. Use the matching `--allow-underprovisioned`
flag in the phase 2 smoke command below.

## Phase 2: Business Load

Run a short correctness load first:

```bash
node graphql/server/perf/phase2-load.mjs \
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

Expected output:

```json
{
  "profileCount": 2,
  "failed": 0
}
```

`--public-role anonymous` is required for the current public business route
because the bearer token produced through `auth.localhost` is not what makes the
`api-dbpm-*.localhost` table operations run as the `authenticated` database
role in this local setup. The script only prepares schemas whose names start
with `perf-` unless explicitly overridden.

For a longer load, increase `--workers`, `--duration-seconds`, and remove
`--disable-prewarm` after the short correctness run passes.

## Lightweight HTTP Lane

The lightweight benchmark is separate from DBPM and uses synthetic private
header routing. Start the server in private mode:

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive/graphql/server

PGHOST=localhost \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=password \
PGDATABASE=constructive \
NODE_ENV=development \
GRAPHILE_ENV=development \
GRAPHQL_OBSERVABILITY_ENABLED=true \
API_IS_PUBLIC=false \
USE_MULTI_TENANCY_CACHE=true \
PORT=3000 \
NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
npx ts-node src/run.ts
```

Then run:

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive

MODE=new \
K=2 \
DURATION=2 \
WORKERS=1 \
SERVER_PORT=3000 \
NO_PROXY=localhost,127.0.0.1,::1 \
no_proxy=localhost,127.0.0.1,::1 \
npx ts-node graphql/server/perf/e2e-benchmark.ts
```

Important: `MODE=new` labels the client-side benchmark output. It does not
switch an already running server. The server must be started with
`USE_MULTI_TENANCY_CACHE=true` to exercise the new cache path.

For this branch's exact-match buildKey cache, multiple synthetic tenants with
the same connection/schemas/roles/settings should map to one handler build.
Use `/debug/memory` to confirm `multiTenancyCache.handlerCacheSize` and
`graphileBuilds.started`.

## Cleanup

`reset-business-test-data.mjs` truncates business workload tables for a run. It
does not drop DBPM-created tenant databases, API/domain rows, schemas, or
metaschema records. Use unique `RUN_DIR` values and periodically clean old
`perf-dbpm-*` data manually if the local database becomes noisy.

## Troubleshooting

- `Unknown type "SignUpInput"`: the DBPM phase is pointed at a private/migrate
  route. Use `--auth-host auth.localhost`.
- `Cannot query field "nodeType" on type "SecureTableProvision"`: old script
  shape. Current `SecureTableProvision` does not expose `nodeType`.
- `BAD_FIELD_INPUT`: field types must be JSON objects such as
  `{ "name": "text" }`, not plain strings like `"text"`.
- `phase2` route probe passes but business operations fail with missing table
  fields: the profile probably points at `admin-dbpm-*` or `auth-dbpm-*`.
  Use `--business-public-api-name api --business-public-subdomain-prefix api-dbpm-`.
- `permission denied for table items_dbpm_*`: pass `--public-role anonymous`
  for the current local public business route smoke test.
