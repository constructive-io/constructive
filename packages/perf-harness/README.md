# @constructive-io/perf-harness

Reusable performance / regression harness for the Constructive GraphQL server
(`cnc server` / PostGraphile v5 with blueprint pooling).

It is the packaged form of the ad-hoc `scripts/scale-validate/*.mjs` tooling built
during the 2026-07 blueprint-pooling scale-validation program. When a memory or
scale regression reappears, re-run it with **one command** instead of hand-driving
scripts.

Binary: `perf-harness` (alias `cperf`). Everything is non-interactive — it never
prompts, so it is safe in CI and unattended soaks.

```
perf-harness <domain> <subcommand> [flags]
```

| Domain | What it does |
|---|---|
| `fleet` | discover / provision / drift / canary / subset / teardown tenant fleets |
| `load` | `harness` (paced authenticated workload + cross-tenant bleed sentinel), `churn` (NOTIFY schema:update driver) |
| `measure` | `collector` (RSS + metrics tail), `pg` (Postgres-side sampler), `instance-heap` (per-blueprint resident heap) |
| `run` | `ramp` (multi-step regime sweep), `soak` (`start`/`status`/`stop` orchestrator), `soak-ops` (provision/teardown cycler) |
| `report` | `summarize` (per-step ramp results), `merge` (unified time series), `predict` (capacity / sizing) |
| `regression` | `run` (one-command pass/fail suite), `baselines` (list known baselines) |

Run `perf-harness <domain> --help` for a domain's subcommands.

---

## 30-second quickstart — "the regression is back"

Everything runs against an **isolated** Postgres and an **isolated** server port so
it can never touch a running hub (see [Hub safety](#hub-safety)). The rig used
throughout the program is Postgres on **:5433** in container `constructive-scale-pg`.

```bash
# 0. credentials (never passed on the command line / interpolated into shells)
export PERF_PASSWORD='…'          # seeder password; --email defaults to seeder@gmail.com

# 1. bring up an isolated Postgres on a NON-hub port (5433, never 5432)
pgpm docker start --recreate      # then point PG* at it:
export PGHOST=localhost PGPORT=5433 PGUSER=postgres PGPASSWORD=password PGDATABASE=constructive

# 2. a fleet: reuse an existing manifest, or provision fresh tenants
perf-harness fleet provision --count 10 --prefix factory --blueprint marketplace
perf-harness fleet discover  --like 'marketplace%' --out perf-out/fleet.json
perf-harness fleet canary    --fleet perf-out/fleet.json         # seed bleed canaries

# 3. run the regression suite (builds a fresh server, ramps, verdicts, tears down)
perf-harness regression run --fleet perf-out/fleet.json --suite quick
echo "exit=$?"                     # 0 pass · 1 fail · 2 cross-tenant bleed
```

`regression run` preflights (PG reachable, catalog `pg_class` count recorded, server
dist present, port free + allowed), then evaluates each check
`{ name, pass, value, threshold, note }` against the baseline (default
`catalog61k-2026-07`) and writes `regression-results.json` plus a human table.

Suite flags: `--fleet <manifest>` (required) · `--suite quick|standard|deep` (default
`quick`) · `--baseline <name>` · `--port` (default 3345) · `--heap-mb` (default
3584) · `--deep-heap-mb` (default 7168, `deep` only) · `--out-dir` (default
`./perf-out`) · `--only`/`--skip` (deep-check filter).

Checks: `healthy-single-bp` (errRate ≤ 0.005, p99 ≤ 150ms, 0 bleed) ·
`zero-marginal-tenants` (heapMax delta ≤ 100MB across tenant counts) · `bleed`
(sentinel violations == 0). The `standard` suite adds `instance-heap`
(≤ 28 KB/pg_class row) and `thrash-not-crash` (over-capacity step must **survive** —
degraded latency/errors are expected, a crashed process is the only failure). The
`deep` suite adds four rig-mutating scenarios that cover the axes the other suites
never touch — see [Deep suite](#deep-suite).

---

## Deep suite

**`--suite deep`** runs everything in `standard` **plus** four scenarios that exercise
scaling axes the quick/standard checks never touch: multiple hot API surfaces on one
node, settings-driven pool splits, the cost of a realtime (unpoolable) tenant, and
catalog creep from `pg_partman`. Unlike the other suites these checks **mutate the
rig** — they `INSERT` `services_public.database_settings` rows and `CREATE` a
partition — so each one is wrapped in `try/finally` teardown that returns the rig
**exactly** to how it was found, each is individually selectable via `--only`/`--skip`,
its mutating SQL is kept minimal and reversible, and every Postgres/server dial still
goes through the [hub guardrail](#hub-safety) (`--allow-hub` to override; PG on
:5433). `--deep-heap-mb` (default **7168**) sizes the server for the multi-API check,
which needs capacity ≥ 4; the other checks run at the normal `--heap-mb`.

Two of the four can fail the suite (exit 1); the other two are **advisory** — they
report pass/fail and record their findings but **never** change the verdict or exit
code (`bleed` remains the only exit-2 trigger):

| Check | Advisory? | Asserts |
|---|---|---|
| `multi-api-residency` | no | 4 surfaces resident, 0 evictions, heap ≈ base + 4×I |
| `settings-variant-split` | no | a settings row forks a 2nd pooled instance; both serve errRate 0 |
| `realtime-dedicated-cost` | **yes** | a realtime tenant is unpoolable (or captures why it cannot build) |
| `partition-creep` | **yes** | rows added per partition → projected catalog/heap creep per tenant per month |

### `multi-api-residency` (R=4)

Using 8–10 same-blueprint tenants, it derives one fleet **per surface** by rewriting
each tenant's `apiHost` to its `admin-…` / `usage-…` host (those domains exist on the
rig; the `auth-…` host stays for login). At `--deep-heap-mb` (capacity ≥ 4 — verified
via `computeCapacityFromBudget` or `/metrics`) it cold-builds all four surfaces (api,
auth via login, admin, usage), then holds all four **hot** for ~120s (a light
`gqlFetch` loop per surface every 1–2s; the harness child on the api fleet optionally
supplies the main load). **Asserts** the cache reaches size 4 with **zero LRU
evictions** during the hold, every surface keeps answering (a 2xx / valid GraphQL
response on a meta/introspection-safe op), and `heapUsed` plateaus at base + 4×I within
±20% (`multiApiHeapTolerance`). Records the measured heap-per-instance. Informational
sub-assert: repeated at heap 3584 (capacity 2), the same four-surface pattern must show
eviction **churn without process death** — thrash-not-crash at the surface level.

### `settings-variant-split`

`INSERT`s `services_public.database_settings` rows with `enable_aggregates=true` (every
other column left at its declared default) for exactly **2** same-blueprint tenants,
triggers them to take effect (a `pg_notify` on `schema:update` carrying those
`databaseId`s, or the documented flush), then drives one variant tenant and one control
tenant on the api surface. **Asserts** two **distinct** pooled instances for the same
relation shape (the builds counter climbs by 2 for the api surface, or the cache-key
count shows the split) and both groups serve errRate 0 (`settingsSplitExpectedInstances`
= 2). **Teardown** `DELETE`s the rows and re-flushes, then verifies the pool
**re-collapses** (or documents the one extra rebuild). If the flush does not pick the
settings up, the check asserts whatever the recon establishes as the actual contract and
is marked advisory.

### `realtime-dedicated-cost` (advisory)

`INSERT`s a `database_settings` row with `enable_realtime=true` for **one** tenant,
flushes, and hits that tenant's api host. Per
`graphql/server/src/middleware/pooling-decision.ts` a realtime service is unpoolable,
so the check **either** asserts a dedicated instance (pooling refused — the cache gains
a non-blueprint key / the pooling-attach counter does not tick for it) and measures its
heap cost, **or**, if the server cannot build realtime without the module infra,
captures the exact failure mode as the check result (that is useful data, not a suite
failure). Either way it confirms the other tenants stay pooled and serving. **Teardown**
`DELETE`s the row, re-flushes, and verifies the tenant returns to pooled serving.
Advisory: never flips the verdict.

### `partition-creep` (advisory)

A pure-SQL measurement — **no server**. It reads the `partman.part_config` rows for one
tenant's schema set (`parent_table LIKE '<tenant-schema>%'`), records each parent's
`partition_interval` and `premake`, `CREATE`s exactly one additional future partition
for one `events` parent (via the partman API, or a plain `CREATE TABLE … PARTITION OF`
with the correct bounds), and measures the `pg_class` row delta for that one partition
(table + indexes + toast). **Teardown** `DROP`s the partition and verifies the delta
returns to zero. From rows-per-partition × partitioned-parents-per-tenant ×
partitions-per-interval it projects catalog rows/tenant/month and, at 22KB/row, heap
creep MB/tenant/month. Reported as informational against a generous advisory threshold
(`partitionCreepMaxRowsPerTenantMonth` = 200). Advisory: never flips the verdict.

The four scenarios live in `src/regression/scenarios.ts` (SQL helpers in
`src/regression/sql.ts`), registered behind the `deep` tier. The baseline
(`catalog61k-2026-07`) gains deep thresholds `multiApiHeapTolerance: 0.2` ·
`settingsSplitExpectedInstances: 2` · `partitionCreepMaxRowsPerTenantMonth: 200` and
expected constants `apiSurfacesRoutable: 8` · `instanceHeapKBPerRow: 21`.

---

## Full soak recipe

A soak is a long-running background rig: one detached server plus five detached
workers, each with its own `<name>.pid` / `<name>.log` under `--out-dir`.

```bash
# start: spawns server + harness + churn + soak-ops + collector + pg-sampler (detached)
perf-harness run soak start \
  --fleet perf-out/fleet.json --label v3 \
  --port 3333 --heap-mb 3584 --duration-sec 18000 --out-dir perf-out

# status: pids alive? + last harness progress line + /metrics snapshot
perf-harness run soak status --label v3 --out-dir perf-out

# stop: ordered signal fan-out, then writes <label>.done
perf-harness run soak stop --label v3 --out-dir perf-out
```

`stop` signals the workers **in this order** so the workload quiesces before the
data collectors and the server go down (and provisioning/teardown finishes its
current cycle cleanly):

```
harness → collector → churn → soak-ops → pg-sampler → server
```

then writes `<label>.done`. Each worker flushes on `SIGTERM`: the harness drains
in-flight requests (≤ 15s) and writes its final `harness-<label>.json`; `soak-ops`
finishes the current provision/teardown cycle and drops its last tenant so the
fleet returns to baseline; the pg-sampler and metrics JSONL are append-per-line
(nothing to flush).

The server the soak launches gets the validated recipe: `NODE_ENV=production`,
`NODE_OPTIONS=--max-old-space-size=<heap-mb>`, `GRAPHILE_DEBUG_METRICS=1` +
`GRAPHILE_DEBUG_METRICS_FILE=<metrics-…>`, `GRAPHILE_BLUEPRINT_POOLING=1`,
`GRAPHILE_METRICS_ENDPOINT=1`, and `GRAPHILE_CACHE_*` when set, with args
`server --port <port> --origin * --simpleInflection --postgis --servicesApi`.

---

## Metrics tracking — what each artifact is

All artifacts land under `--out-dir` (default `./perf-out`, created `mkdir -p`).
File naming is `<kind>-<label>` so a soak's files group together:

| File | Producer | Contents |
|---|---|---|
| `metrics-<label>.jsonl` | server (`GRAPHILE_DEBUG_METRICS`) | ~10s server self-report lines (below) |
| `harness-<label>.json` | `load harness` | final workload report + all rolling progress lines |
| `pg-<label>.jsonl` | `measure pg` | one Postgres-side sample per interval |
| `<name>.json` (collector) | `measure collector` | RSS series + slope + metrics counter totals |
| `<label>-results.jsonl` | `run ramp` | one JSON object per ramp step |
| `report-data.json` | `report merge` | aligned, merged time series across all of the above |
| `<name>.log` / `.pid` / `.done` | `run soak` | per-worker stdout+stderr / pid / completion marker |

### Server metrics JSONL — `metrics-<label>.jsonl`

The schema is owned by the server instrumentation; the harness treats it as
schema-tolerant (flattens the last line, picks the best numeric per counter
family). Each ~10s line carries heap/RSS, build/eviction/drain activity, the build
queue depth, and a `counters` block. The counters that matter for regressions:

- `counters.evictions` — LRU evictions of resident blueprint instances. **Non-zero
  under a steady same-blueprint workload is the classic capacity-1 thrash signal**
  (batch relogins colliding with api traffic → api↔auth oscillation).
- `counters.connGuard` — connection-class errors **absorbed** by the guard
  (57P01 / 08006 / ECONNRESET / …) during a PG crash-recovery window. Counting up
  is healthy (the node survived); the alternative is a process death.
- `counters.buildWaitTimeouts` — requests that hit `GRAPHILE_BUILD_TIMEOUT_MS` and
  returned `503 BUILD_TIMEOUT` (the build still completes in the background). Rising
  under load means the build queue is backing up.
- `builds` / `drains` — schema build and drain totals.
- `heapUsedMB` / `rssMB` / `buildQueueDepth` — sampled gauges; `summarize` surfaces
  the `heapUsedMaxMB` / `rssMaxMB` / `buildQueueDepthMax` per ramp step.

### `/metrics` endpoint (live snapshot)

Set `GRAPHILE_METRICS_ENDPOINT=1` to expose the same snapshot as JSON at
`GET /metrics`. It is **loopback-guarded** — only requests from `127.0.0.1` / `::1`
are served (never reachable off-box), so it is safe to leave enabled on a soak.
`run soak status` reads it for the live snapshot.

### PG-side sampler line — `pg-<label>.jsonl`

`measure pg` opens a **fresh** `pg` client per sample (a persistent idle client
would be reaped by `idle_session_timeout`) and appends one line per `--interval-sec`
(default 30). Sampling errors are recorded on the line and never kill the sampler —
a PG crash/recovery window is exactly the data worth keeping. Fields:

```
t              ISO timestamp
docker         { raw, usedBytes, limitBytes }   # `docker stats` for --container (default constructive-scale-pg); {err} on failure
backendsByState{ active, idle, "idle in transaction", null, … }  # pg_stat_activity grouped by state
backendsTotal  total backends on this database
backendsAllDbs sum(numbackends) across all databases
pgClassRows    count(*) FROM pg_class   # catalog-size proxy; drives the 21KB/37KB laws
dbSizeBytes    pg_database_size(current_database())
err            present only if the whole sample failed
```

### Collector summary — `measure collector`

`measure collector` samples the server process RSS via `ps -o rss=` every
`--interval-sec` (default 15) and tails `metrics-<label>.jsonl`. At exit
(SIGINT/SIGTERM, `--duration-sec`, or the PID disappearing) it writes:

```
rss.minMb / maxMb / finalMb
rss.slopeMbPerHour     least-squares slope over the LAST HALF of samples (the leak signal)
rss.series[]           { tSec, rssMb }
metrics.evictionsTotal / drainsTotal / buildsTotal   picked from the final metrics line
metrics.linesSeen, metrics.lastLine
stopReason, durationSec
```

The last-half slope is the headline longevity number: a flat/negative
`slopeMbPerHour` over a multi-hour soak means no leak.

### Workload report — `load harness`

`load harness` streams a rolling progress JSONL line to stdout every `--report-sec`
and writes the full report to `--out` (`harness-<label>.json`) on completion or
`SIGTERM` (after a ≤ 15s drain). Each progress line:

```
t=progress, at, elapsedSec, windowSec,
sent, completed, ok, err,
windowRps, cumRps, windowErrRate, inFlight, dropped, rotating,
latencyWindow { count, min, mean, p50, p95, p99, max },
sentinelChecks, sentinelOwnSeen, sentinelOk
```

The **bleed sentinel** periodically (`--sentinel-interval-sec`, default 60) reads
each tenant and asserts no foreign `CANARY-<dbname>` row is visible. A violation
flips `sentinelOk=false`, records the offending rows, and **exits 2**. Exit codes:
`0` ok · `1` fatal · `2` bleed-sentinel violation.

### Merged report — `report merge`

`report merge` aligns the server metrics JSONL, harness progress JSONL, churn /
soak-ops event lines, and the pg-sampler JSONL into one `report-data.json`
(a single aligned time series with event markers, the heap slope, and counter
deltas) and prints a markdown summary table to stdout. `report summarize`
one-lines each `run ramp` step (crash / errRate / rps / p50-p95-p99 / heapMax /
evict / builds / connGuard / pgConnMax).

---

## Sizing model (capacity law + constants)

Memory cost is driven by **catalog size** (total relations in the PG database),
**not** by tenant count. Two constants, measured on the 61k-`pg_class`-row catalog:

- **Node instance heap** `I ≈ 50MB + 21KB × pg_class_rows` — every *resident schema
  instance* retains this, class-independent (it is the introspection graph), and it
  is live memory, not GC-able. ~1.3GB at 61k rows.
- **PG introspection spike** `≈ 37KB × pg_class_rows` **per build** — every schema
  build spikes a Postgres backend by this much (~2.7GB at 61k rows; OOM > 5.4GB at
  135k). Backends retain multi-GB relcache and accumulate across the pool; recycle
  via `idle_session_timeout` or pgbouncer `server_lifetime`.

Tenants that share a blueprint are **free** — zero marginal heap, zero marginal
builds. So you size in two axes: how many relations live in one PG database (shard
size) and how many distinct blueprint shapes a node keeps resident (node capacity
`R`).

**Node capacity** (`report predict`, via `graphile-cache.computeCapacityFromBudget`):

```
I = per-instance heap        (measure once per catalog size)
B = base reserve             (server + request working set; default 256MB)
T = build transient reserve  (one in-flight build;          default 768MB @ 61k rows)
H = --max-old-space-size

R = clamp( min( ⌊(H − B) / I⌋,  ⌊(H − B − T) / I⌋ + 1 ), 1, 50 )
```

Validated @61k rows: min viable heap **1536MB** (1 resident; 1152MB aborts
mid-build with a V8 SIGABRT); 2048MB → R=1; 3584MB → R=2 (api + auth both resident,
0 evictions). Container RSS ≈ heap × 1.4–1.5 (native/external on top of V8).

**Operating rule:** `R` must cover the node's *actively hit* blueprint set — api and
auth shapes count **separately**. A tenant fleet on one node needs `R ≥ 2`: at `R=1`
hourly batch relogins collide with api traffic and failed relogins retry every 30s →
self-sustaining eviction oscillation; at `R=2` the same workload runs clean.

**Shard-per-PG-database.** Tenants-per-database is the fundamental unit, bounded by
catalog size on both sides. Instance heap grows with the shard's catalog, so bigger
shards need disproportionately bigger app nodes — favor **more, smaller shards**. The
blueprint cache key already scopes by database, so shard-local pooling needs no code
change. Concretely, ~1000 marketplace-class tenants ≈ 10 shards × ~100 tenants (16GB
PG nodes), each served by one app node at `R=2` (heap ~6GB, container ~9GB).

---

## Environment knobs

Server behavior is controlled by `GRAPHILE_*` env vars (the harness sets the ones it
manages; set the rest to tune). Heap is controlled by Node.

| Knob | Effect |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=<mb>` | V8 heap budget `H` — the primary capacity lever |
| `GRAPHILE_BLUEPRINT_POOLING` | `1` = one shared instance per schema-shape (the whole point) |
| `GRAPHILE_DEBUG_METRICS` | `1` = write the metrics JSONL |
| `GRAPHILE_DEBUG_METRICS_FILE` | metrics JSONL path |
| `GRAPHILE_DEBUG_METRICS_INTERVAL_MS` | metrics sample period |
| `GRAPHILE_METRICS_ENDPOINT` | `1` = expose `GET /metrics` (loopback-guarded) |
| `GRAPHILE_CACHE_MAX` | hard cap on resident instances (heap-aware; floor 1) |
| `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES` | measured per-instance heap `I` (set to your catalog's delta + ~10%) |
| `GRAPHILE_CACHE_BASE_RESERVE_BYTES` | base reserve `B` (default 256MB) |
| `GRAPHILE_CACHE_BUILD_RESERVE_BYTES` | build transient reserve `T` (default 768MB @ 61k) |
| `GRAPHILE_CACHE_TTL_MS` | idle resident-instance TTL before drain |
| `GRAPHILE_CACHE_DRAIN_TIMEOUT_MS` | grace period to drain a to-be-evicted instance |
| `GRAPHILE_MEMORY_GOVERNOR` | `1` = enable the heap-pressure governor |
| `GRAPHILE_MEMORY_GOVERNOR_ELEVATED` | proactive-evict threshold (default ~85%) |
| `GRAPHILE_MEMORY_GOVERNOR_CRITICAL` | refuse-builds threshold (default ~92%; 503 + Retry-After) |
| `GRAPHILE_BUILD_CONCURRENCY` | BuildSemaphore size (default 1 — serializes node AND PG build spikes) |
| `GRAPHILE_BUILD_TIMEOUT_MS` | request build-wait bound (503 `BUILD_TIMEOUT`; build finishes in background) |
| `GRAPHILE_CONNECTION_GUARD` | `0` = disable the connection-class error guard (default on) |

Rule of thumb without measuring: `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES ≈ 50MB + 21KB ×
pg_class_rows`; measure yours with `perf-harness measure instance-heap`.

---

## Hub safety

`HUB_PORTS = [5432, 3000, 3001, 3002, 9000]` — the ports a local Constructive hub
(Postgres, the two GraphQL servers, the dashboard, MinIO) listens on. **Every**
command that dials Postgres or a server port refuses one of those ports unless you
pass `--allow-hub`, so the harness can never point load at, or spawn a server on top
of, a live hub. The Postgres port defaults to **5433, never 5432**. Only pass
`--allow-hub` when you genuinely mean to target the hub.

---

## Credentials

Never hardcoded, never interpolated into shell strings (children are spawned with
argument arrays only):

- `--email` defaults to `seeder@gmail.com`.
- `--password` has **no default**. Resolution order: `--password` flag → `PERF_PASSWORD`
  env. Commands that need auth error out with guidance when it is missing —
  `export PERF_PASSWORD=…` is the intended path.

---

## Command reference

```
fleet discover   --like <pat> --out <file> [--pretty] [--pg-*]
fleet provision  --count <n> --prefix <p> --blueprint <b> [--start-index] [--concurrency] [--validate]
fleet drift      --groups <n> --per-group <n> --column-drift <n> [--pg-*]
fleet canary     --fleet <file> [--table categories] [--cleanup] [--pg-*]
fleet subset     --fleet <file> [--blueprints <n>] [--per-blueprint <n>] [--tenants <n>] [--same-bp-regex] --out <file>
fleet teardown   --fleet <file> | --only <name> [--keep <n>] [--dry-run] [--pg-*]

load harness     --fleet <file> --port <n> [--rps] [--shape zipf|uniform|burst] [--mix read:..,write:..,meta:..]
                 [--auth 1] [--sentinel-interval-sec 60] [--relogin-sec 3600] [--duration-sec] --out <file>
load churn       --fleet <file> [--interval-notify-sec 20] [--provision-every-sec] [--channel schema:update] [--duration-sec]

measure collector    --pid <n> [--metrics-file <f>] [--interval-sec 15] [--duration-sec] --out <file>
measure pg           [--container constructive-scale-pg] [--interval-sec 30] [--duration-sec] --out <file> [--pg-*]
measure instance-heap --label <l> --host <api-host> [--port] [--heap-mb] [--cache-max 1] [--settle-sec]

run ramp         --plan <plan.json> [--only step1,step2] --out <results.jsonl>
run soak start   --fleet <file> --label <l> [--port] [--heap-mb] [--duration-sec] [--out-dir]
run soak status  --label <l> [--out-dir]
run soak stop    --label <l> [--out-dir]
run soak-ops     [--interval-sec 7200] [--duration-sec 86400] [--prefix soak]

report summarize <results.jsonl> [...more]
report merge     --metrics <m.jsonl> --harness-log <h.jsonl> [--churn-log <c.jsonl>] [--ops-log <o.log>] [--pg <pg.jsonl>] [--out-dir ./perf-out]
report predict   --instance-heap-bytes <n> [--heap-mb 1536,2048,3584] [--base-reserve-bytes <n>] [--build-reserve-bytes <n>]

regression run       --fleet <file> [--suite quick|standard|deep] [--baseline <name>] [--port] [--heap-mb] [--deep-heap-mb 7168] [--out-dir] [--only <checks>] [--skip <checks>]
regression baselines
```

Global: `--help` / `-h` (top-level or per-domain usage) · `--version`.
Connection flags `--pg-host/--pg-port/--pg-user/--pg-password/--pg-database` override
`PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`, which override
`localhost/5433/postgres/password/constructive`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | ok / suite pass |
| `1` | fatal error / suite fail / usage error |
| `2` | cross-tenant **bleed** sentinel violation (`load harness`, `regression run`) |

## Testing

`pnpm test` (jest) is pure-unit and needs **no** network, Postgres, or Docker:
argv parsing + coercions, the hub guardrail, RNG determinism, the zipf/mix samplers,
histogram percentiles, subset construction, collector math, token-field scoring,
ramp config merge, summarize/merge on fixtures, the baseline comparator, the deep-suite
helpers (host-rewrite fleet derivation, partition-creep math, advisory-verdict
aggregation, and the settings-SQL builder), and the tenant-factory shape fingerprint.
Anything needing a live server/PG is gated behind `PERF_E2E=1`.
