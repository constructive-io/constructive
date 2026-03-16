# Observability and Memory Debugging Runbook

Use this runbook when reproducing Graphile/server memory growth locally or in staging, or when you need a quick operational view of Graphile build churn and PostgreSQL activity.

## What observability enables

Set `GRAPHQL_OBSERVABILITY_ENABLED=true` to turn on the graphql/server observability surfaces.

When enabled:

- `GET /debug/memory` returns a process snapshot with Node/V8 memory, Graphile cache state, in-flight builds, and Graphile build timings
- `GET /debug/db` returns PostgreSQL pool usage, active queries, blocked sessions, lock summary, and selected database stats
- the debug sampler writes periodic NDJSON snapshots for offline analysis

Observability only activates when all of the following are true:

- `GRAPHQL_OBSERVABILITY_ENABLED=true`
- `NODE_ENV=development`
- the GraphQL server is bound to a loopback host such as `localhost`, `127.0.0.1`, or `::1`

When those conditions are not met:

- `/debug/memory` returns `404`
- `/debug/db` returns `404`
- the sampler does not start
- no debug log directory is created

This mode is intended for local debugging only. It is not a live operational surface.

## Start the server with profiling enabled

```bash
cd graphql/server
NODE_ENV=development \
GRAPHQL_OBSERVABILITY_ENABLED=true \
NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2 --expose-gc" \
GRAPHQL_DEBUG_SAMPLER_ENABLED=true \
GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS=10000 \
pnpm dev
```

`GRAPHQL_OBSERVABILITY_ENABLED` is the master switch. When it is not `true`, the server does not mount `/debug/memory`, does not mount `/debug/db`, and does not start the sampler.
`NODE_ENV` must also be `development`, and the server host must be loopback-only.

Optional knobs:

- `GRAPHQL_DEBUG_SAMPLER_ENABLED=false` disables the sampler while leaving the debug routes available
- `GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS=<ms>` changes the sampling interval
- `GRAPHQL_DEBUG_SAMPLER_DIR=/abs/path` writes the sampler output somewhere other than `graphql/server/logs`

The debug sampler writes one run directory per server process under `graphql/server/logs/` by default.

Expected files per sampler session:

- `debug-memory.ndjson`
- `debug-db.ndjson`
- `debug-sampler-errors.ndjson`

## Debug routes

Use these routes for live inspection while a server is running:

- `GET /debug/memory`
  - process memory usage
  - V8 heap statistics and heap spaces
  - Graphile cache state
  - in-flight handler creation count
  - Graphile build timing aggregates
  - PostGIS codec telemetry
- `GET /debug/db`
  - PG pool totals, idle count, and waiters
  - active queries and blocked sessions
  - lock summary
  - selected `pg_stat_database` counters
  - `pg_notification_queue_usage()`

## Analyze the latest sampler run

```bash
cd graphql/server
pnpm debug:memory:analyze
```

To analyze a specific run directory:

```bash
cd graphql/server
pnpm debug:memory:analyze -- --dir ./logs/run-2026-03-09T12-00-00-000Z-pid12345
```

## Capture a heap snapshot

```bash
cd graphql/server
pnpm debug:heap:capture -- --pid <server-pid>
```

If your server writes snapshots somewhere else, pass `--dir`.

## Tooling reference

- `pnpm debug:memory:analyze`
  - reads the latest sampler directory by default
  - summarizes heap/RSS range, Graphile build stats, DB waiters, and blocked sessions
- `pnpm debug:heap:capture -- --pid <server-pid>`
  - sends `SIGUSR2` to the server process
  - requires `NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2 --expose-gc"`
  - prints the created `.heapsnapshot` path

## Recommended incident workflow

1. Start the server with `GRAPHQL_OBSERVABILITY_ENABLED=true` and `NODE_ENV=development` on a loopback host.
2. Reproduce the issue.
3. Inspect `/debug/memory` and `/debug/db` live if you need immediate feedback.
4. Run `pnpm debug:memory:analyze` against the generated logs.
5. If retained heap is still unclear, capture one or more heap snapshots.
6. Disable observability again when you are done.

## How to read the snapshots

Focus on a few high-signal sections first.

- Memory and V8
  - `heapUsedBytes`, `rssBytes`, and the V8 heap space breakdown tell you whether pressure is in old space, new space, or large object space
- Graphile cache and builds
  - `graphileCache` shows how many cached handlers are live
  - `graphileBuilds` shows how often handlers are being rebuilt and how expensive the builds are
- PostgreSQL activity
  - `pool.waitingCount`, `blockedActivity`, and `lockSummary` are the fastest indicators of DB contention
  - `activeActivity` highlights long-running queries and transaction age
## What to watch for

- `heapUsedMb.max` and `rssMb.max` relative to baseline
- last 6 sampler samples still trending upward in heap or RSS after load stops
- repeated Graphile builds with high `averageBuildMs` or `maxBuildMs`
- blocked DB sessions or `pool.waitingCount > 0`
- active queries with long `xact_age` or `query_age`

## Current acceptance bar

- no blocked DB sessions
- no PG pool waiters
- last 6 idle samples do not trend upward by more than 5% for heap or RSS

## Operational note

The observability routes and sampler are designed for engineering use on a local machine. Keep them disabled by default and do not treat them as a staging or production feature.
