# cperf Graphile density harness

`cperf` is a local-only runner for the Graphile customer-density spike. It launches a fresh production-mode server process for each arm/heap/customer-count/repetition, warms every configured GraphQL surface with bounded concurrency and a fleet-size-scaled deadline, drives an open-loop workload, runs hostile isolation canaries, samples `/debug/memory` and the dedicated PostgreSQL container, and writes one timestamped JSON result per run plus an NDJSON ledger.

The score is deliberately strict. A customer counts only when every declared surface warms, receives the configured minimum number of workload-phase requests, has an error rate of at most 0.5% and customer-workload p99 of at most 150 ms, runs all required capability operations, passes every required isolation canary conclusively with zero bleed, and sees no post-warmup Graphile or PostgreSQL pool eviction/refusal/build/disposal activity. Coverage probes prove operation support but do not contribute traffic, latency, or error samples. Results report customer workload RPS, periodic validation RPS, realtime validation RPS, and their combined HTTP RPS separately, so security probes cannot inflate customer throughput or pollute its latency percentiles. Runs shorter than 15 minutes always fail qualification, including `--smoke` runs. The JSON retains legacy `tenant*` aliases while the research interfaces migrate to customer terminology.

## Capacity methodology

The target is qualified complete customers per actual service memory unit, not fitting the fleet into a 1 GiB process. `tenantCountsByHeapMiB` retains its legacy name and supplies a different increasing customer ramp for each configured old-space size, while `tenantCounts` applies one ramp to every heap. A capacity result is complete only when all repetitions pass at one customer count and a greater count fails; an unbracketed last successful checkpoint is reported as observed capacity, not maximum capacity.

Use exactly one load mode. `rps` holds total offered load fixed as tenants are added, which isolates memory capacity but reduces per-tenant traffic; `rpsPerTenant` holds per-tenant load fixed, so total offered load grows with the fleet. Every result records the resolved total and per-tenant load. `minWorkloadRequestsPerSurface` prevents a tenant from qualifying without representative traffic, and `warmupTimeoutPerSurfaceMs` scales the warmup allowance by the number of bounded-concurrency waves in addition to `warmupTimeoutMs`.

Runs are deterministically interleaved across arms using `runOrderSeed`, so repeated experiments reproduce the order without always favoring the same arm. Each invocation also creates a random campaign ID and an immutable manifest for that exact ordered schedule. Per-campaign results form a forward SHA-256 chain, and report validation requires the manifest order, non-overlapping chronology, common runtime platform, and every chain pointer to agree; separately collected records cannot be spliced into qualification evidence. Results record the plan and fleet hashes, runtime versions, order, and resolved memory-governor policy. The runner also persists request, canary, memory, PostgreSQL, and workload-progress artifacts when a run fails partway through, so a failed capacity point remains diagnosable.

Spawned Node arms may select only `v8Profile: stock`, `optimize-for-size`, `baseline-optimize-for-size`, or `jitless-optimize-for-size`. The baseline-size profile uses `--max-opt=1 --optimize-for-size`, retaining Sparkplug while excluding the higher optimization tiers. The runner injects the exact allowlisted flags, strips inherited copies, rejects managed flags hidden in the command or plan `NODE_OPTIONS`, and records the profile, sanitized `NODE_OPTIONS`, direct Node arguments, and their effective ordered combination in provenance. Every non-stock profile is an explicit candidate and must pass the full loaded density curve, p99, throughput, and isolation gates.

`periodicCanarySchedule` defaults to the legacy `full-sweep` behavior. The `rotating-one` mode executes one deterministically staggered canary per tenant/surface in every timed round while retaining full initial and final sweeps. Timed rounds occupy only interval slots strictly before the workload deadline, so a 900-second run at a 60-second interval has exactly 14 rounds. Rounds are serialized and never dropped when one overlaps the next slot; each overlap, incomplete round, and deadline-late completion is recorded in `canary-schedule.json`. `canaryConcurrency` bounds parallelism across surfaces while every surface's probes stay sequential. A qualifying rotating plan should enable `requireCompletePeriodicCanaryCoverage`, which requires exact boundary sweeps, one exact result per selected target/round, complete configured-canary coverage, and every periodic round to finish by the workload deadline.

Realtime GraphQL routes use the same strict timed-workload boundary. After one initial correlated mutation/subscription delivery, the driver schedules a fresh delivery in every 60-second slot strictly before the workload deadline, serializes rounds, and persists credential-free correlation receipts for every exact tenant/surface route. The report derives counts, globally unique ordered digests, prime-request volume, prime-response p99, and delivery p99 from those raw receipts instead of trusting the summary fields; append-only histories and the single timed-coverage completion transition are also verified. A late, missed, reused, or unverified recurring round sets qualified customers to zero even when the final post-workload probe succeeds, so a healthy connection at the two bookends cannot conceal a subscription that stopped delivering during the workload.

Every persisted v6 result carries a SHA-256 binding over its complete result payload and the exact memory, PostgreSQL, request, canary, canary-schedule, retained-memory, workload-progress, realtime, and score-context evidence files. The credential-free score context binds the plan/fleet hashes and the few run facts that cannot be reconstructed from those raw files; workload load and warmup limits are re-derived from the plan and fleet. The report loader verifies every bound file, reconstructs the complete `scoreRun` input, reruns the scorer, and requires byte-equivalent result semantics, so recomputing public hashes cannot bless a hand-edited result. Soak records render in a separate section and never enter matrix medians, capacity boundaries, or candidate comparisons.

An arm may declare `envByHeapMiB` to override its base environment for each configured heap. When present, it must contain exactly every plan heap and only string values. This is the intended path for measured Graphile governor calibration: each checkpoint can pin its cache ceiling, instance estimate, server/build reserves, RSS build reserve, and `GRAPHILE_CACHE_CALIBRATION_ID`, and qualifying physical-database runs verify that the live cache reports that identity and enough configured/budget capacity for every requested surface. Physical fixture cache keys are process-random keyed HMACs, so cross-process scoring compares the fleet against the fixture's credential-free Graphile contract fingerprints; the live keys remain in same-process guard state to prove that no resident entry changed during a run.

The primary report metric is qualified customers divided by the maximum post-warmup time-aligned sum of current Node RSS and the dedicated PostgreSQL container's raw cgroup-v2 `memory.current` charge. On Linux, exact-process current RSS comes from `/proc` at 100 ms; on non-Linux diagnostic runs it comes from a bearer-authenticated loopback endpoint at 250 ms. Publication-quality qualification still requires Linux and cgroup v2. The runner pairs timestamped Node and PostgreSQL samples within one second and fails qualification when aligned service telemetry is unavailable. It also reports a conservative non-simultaneous upper bound—Node RSS high-water plus PostgreSQL peak—and retains Docker working set, configured old-space, and Node-only peak-RSS density as diagnostics. Candidate acceptance requires a complete paired matrix, the configured additional customers at every heap, the configured median improvement in both actual service-memory measures, and no per-heap regression in either of those measures; the heap sizes are measurement points rather than capacity targets.

Smoke results also include `configuredCustomersPerAlignedServiceGiB` and `configuredCustomersPerServiceMemoryUpperBoundGiB`. These diagnostic fields make a short fully warmed mechanics run numerically useful, but they use configured rather than qualified customers and never participate in acceptance; `customersPerAlignedServiceGiB` remains zero until the full duration, traffic, correctness, isolation, and residency gates pass.

Physical qualification arms must configure a prepare command that creates one fresh PostgreSQL fixture under the current run artifact directory before the measured Node process starts. The following audit binds the exact matrix coordinate, plan/fleet hashes, Docker image and resource/command configuration, cgroup-v2 identity, PostgreSQL system identifier and start time, exact database inventory, unique clone/nonce set, and recomputed live DDL/ACL/role/extension contracts. The sampler resolves the mutable Docker name once, pins the attested 64-character container ID for every `stats` and cgroup read, and revalidates the start time and cgroup identity after the final sample. The server then receives the attested manifest path, manifest hash, and clone ID as resolved command templates. Reusing or replacing any container, cluster, clone, attestation set, or nonce-set identity fails both the in-process schedule and cross-file report aggregation.

Measured GraphQL canaries remain request-path correctness evidence; they are not a substitute for an induced hostile campaign. A qualifying plan must bind one immutable `exact-runtime-hostile-validation-v1` artifact per arm, including the exact runtime-artifact and configuration fingerprints. If those artifacts are absent or mismatched, the runner labels the entire campaign diagnostic and the report refuses to promote it, even when every passive canary passed.

That full structural audit intentionally reads PostgreSQL catalogs before Graphile starts, so reported build latency is a post-attestation warm-catalog measurement. It is comparable across equally audited arms, but it is not evidence for a pristine-catalog cold start.

## Commands

```bash
pnpm --filter @constructive-io/perf-harness build

node packages/perf-harness/dist/index.js validate --plan path/to/completed-plan.json

node packages/perf-harness/dist/index.js run \
  --plan research/graphile-density/four-arm-plan.example.json \
  --smoke --arm scoped-introspection

node packages/perf-harness/dist/index.js report \
  --plan research/graphile-density/four-arm-plan.example.json \
  --results graphile-density-artifacts/results.ndjson \
  --out graphile-density-artifacts/report.md
```

### Catalog cache-warmth benchmark

Scoped runs accept `--scoped-catalog-types all|dependency-closure`. The default
is `all`, which preserves the current scoped-required query; the experimental
`dependency-closure` arm retains only catalog types reached by the requested
schemas' object closure. The flag is rejected for stock mode, and its value is
recorded in worker configs, results, summaries, provenance, and cache build
identities so the two scoped arms cannot share a Graphile instance.

`--release-build-state-after-validation` enables the opt-in lifecycle candidate
for `catalog-bench`. Its boolean value is written to the worker config, progress,
result, summary, provenance, Graphile preset, and cache identity; omitting the
flag always measures the default retained-build-state behavior.

`--introspection-client-release-mode reuse|destroy` selects how the PostgreSQL
checkout used for catalog introspection is released and defaults to `reuse`.
In `destroy` mode the worker proves the full PID plus SQL `backend_start`
identity has disappeared through a separate control connection before it
acquires a replacement; token canaries and cache-warm operations must then
leave that replacement identity unchanged. Snapshot RSS is the steady
replacement backend's RSS and its delta is relative to replacement acquisition.

`--postgres-backend-sampler off|diagnostic-lower-bound` defaults to
`diagnostic-lower-bound` and gives paired sampler-on/off runs for quantifying
observer cost. Before each destroy-mode build, the fixed external sampler binds
the SQL `backend_start` to `/proc/<pid>/stat` within an explicit 1.5-second
boot-time tolerance, then revalidates the immutable proc start token, PostgreSQL
process name, and PID namespace identity on every 10 ms sample. A Linux Docker
host prefers the container's procfs through host procfs; the fallback pins one
`docker exec` to the inspected 64-character container ID and revalidates the
name, ID, start time, and init PID after sampling. The fallback starts
`/usr/bin/env -i` with a path-only shell environment, but the initial Docker
exec process may briefly inherit the container's configured environment before
`env -i` clears it. Artifacts record only the allowlisted host variable names,
never their values.

The worker traps shell exits, stops the sampler process group with bounded
graceful, TERM, and KILL phases, and awaits tree closure before backend
retirement. Even a cadence-complete `VmRSS`/`VmHWM` trace is a diagnostic lower
bound because Graphile has no pre-destroy acknowledgement guaranteeing a final
sample; artifacts never promote it to an exact peak or density authority.
Sampler launch and shutdown time are recorded without subtracting a correction.
Service-density authority remains the separately validated Linux cgroup-v2
`memory.current` measurement, while Docker Desktop backend traces carry an
additional VM-boundary limitation.

`--v8-profile stock|optimize-for-size|baseline-optimize-for-size|jitless-optimize-for-size` selects the
worker's named V8 configuration and defaults to `stock`. The parent sanitizes
inherited managed flags, launches the worker with the profile's exact direct
Node arguments, and pins `--heap-mib` through `NODE_OPTIONS`. Worker config,
progress, result, summary, and provenance artifacts record the selected profile,
the sanitized `NODE_OPTIONS`, its tokenization, `process.execArgv`, and the
effective ordered combination; a mismatch fails the run. Starting the parent
Node process with an optimization flag is not evidence that workers inherited
it, so benchmark comparisons must select the profile explicitly through this
flag. The baseline and jitless profiles remain opt-in candidates and must pass the same
loaded latency, throughput, and isolation gates as stock.

`catalog-bench` can populate every resident schema's Grafast parse/query and
operation-plan caches with reproducible, distinct named operations. A nonzero
`--warm-operations-per-instance` requires one exact `--expected-tokens` value
per schema; every operation executes through `grafast({ source })`, and the
artifact records p50/p99 population latency plus conclusive token correctness.
`--warm-operation-replay-passes N` then replays that exact ordered source set
through Grafast `N` times for each instance. Replay execution counts, p50/p99
latency, errors, exact-token correctness, mismatches, and cross-tenant results
are recorded separately from population, so cache-limit comparisons do not
mix cold source admission with cache-hit or cache-churn behavior. Replay is
disabled by default, and a positive pass count requires a nonempty population
set from `--warm-operations-per-instance`.
The three cache-limit flags are independently optional. Omitting all three uses
Grafast's defaults, while providing them installs the shared
`createGrafastCacheLimitsPreset` before schema construction.

`--tenant-proxy-surfaces N` adds an explicitly synthetic density projection to
the parent `summary.json`; it does not change the worker or turn these fixtures
into measured complete tenants. The projection divides resident surface
instances into full groups of `N`, records any remainder, and reports group
density against both the configured `--max-old-space-size` GiB and the absolute
lifetime process peak-RSS GiB. It never uses baseline-relative RSS or the
per-instance slope as the peak-RSS denominator. Because the final checkpoint is
a scheduled stop rather than a discovered memory boundary, the summary records
`capacityBoundaryReached: false` and must be read as an observed synthetic
checkpoint, not maximum customer capacity.

These four commands reproduce the default-versus-all8 comparison at 100 and
500 operations for the disposable density fixture, assuming the `PG*`
environment variables already select its least-privilege runtime login:

```bash
node packages/perf-harness/dist/index.js catalog-bench --database graphile_density_20260801_a --mode scoped-required --schemas gd_t001_api --instances 1 --expected-tokens tenant-001-token --warm-operations-per-instance 100 --warm-operation-replay-passes 3 --heap-mib 2048 --repetitions 3 --postgres-container postgres --out /tmp/cperf-cache-default-100

node packages/perf-harness/dist/index.js catalog-bench --database graphile_density_20260801_a --mode scoped-required --schemas gd_t001_api --instances 1 --expected-tokens tenant-001-token --warm-operations-per-instance 500 --warm-operation-replay-passes 3 --heap-mib 2048 --repetitions 3 --postgres-container postgres --out /tmp/cperf-cache-default-500

node packages/perf-harness/dist/index.js catalog-bench --database graphile_density_20260801_a --mode scoped-required --schemas gd_t001_api --instances 1 --expected-tokens tenant-001-token --warm-operations-per-instance 100 --warm-operation-replay-passes 3 --grafast-query-cache-max 8 --grafast-operations-cache-max 8 --grafast-operation-plans-cache-max 8 --heap-mib 2048 --repetitions 3 --postgres-container postgres --out /tmp/cperf-cache-all8-100

node packages/perf-harness/dist/index.js catalog-bench --database graphile_density_20260801_a --mode scoped-required --schemas gd_t001_api --instances 1 --expected-tokens tenant-001-token --warm-operations-per-instance 500 --warm-operation-replay-passes 3 --grafast-query-cache-max 8 --grafast-operations-cache-max 8 --grafast-operation-plans-cache-max 8 --heap-mib 2048 --repetitions 3 --postgres-container postgres --out /tmp/cperf-cache-all8-500
```

With no warmth or cache-limit flags, the command retains its prior behavior and
does not install a cache-limit preset. Each build now also records an
approximate transient heap/RSS peak sampled every 5 ms from an immediately
preceding forced-GC resident baseline. The process RSS high-water is recorded
as a backstop, but synchronous event-loop work can still hide a short heap peak,
so this number is a measured reserve input rather than an exact maximum.
`--heap-mib` configures Node's old-space flag; the worker records V8's effective
total heap limit separately because the two values are not interchangeable.

The legacy `--schemas a,b --instances 1,2` form still means one schema per
resident instance. To measure one production-shaped surface that exposes an
ordered schema set, use `--surface-schemas` with exactly one instance and an
explicit `--allowed-dependency-schemas` list:

```bash
node packages/perf-harness/dist/index.js catalog-bench \
  --database production_shape \
  --mode scoped-required \
  --scoped-catalog-types dependency-closure \
  --surface-schemas app_public,app_auth,app_users \
  --allowed-dependency-schemas app_extensions,jwt_private \
  --instances 1 \
  --heap-mib 2048 \
  --repetitions 3 \
  --out /tmp/cperf-production-shape-scoped
```

Both ordered lists are validated, included in the worker config and provenance,
and hashed into the Graphile build and fixture identities. The exposed list must
be nonempty; an explicitly supplied empty dependency value is retained as `[]`
and remains distinct from an omitted flag. Names must be unique within each
list and the lists must be disjoint, and a manually edited worker config fails
closed under the same checks.

The checked-in example plan and fleet are deliberately incomplete placeholders, so `validate` rejects them until they are copied and filled with real tenant routes, queries, tokens, credentials, and separate worktree paths. Spawned arms must pin a commit. Each run verifies and records the actual Git HEAD and dirty state, command, working directory, entry and lockfile hashes, server PID, and effective V8 heap limit; optional `entrySha256` and `lockfileSha256` plan pins make mismatches fail before traffic starts.

`postgresContainer` is sampled from raw cgroup-v2 `memory.current`, `memory.peak`, `memory.stat`, and `memory.events` at 250 ms when available; Docker working set is sampled separately at a lower frequency as a diagnostic. The recorded cold-build spike is the greatest sampled raw charge before the post-warmup boundary minus the first raw sample, and it is meaningful only when the container is dedicated to the arm. Backend process RSS is never summed because PostgreSQL processes share pages; backend and concrete pool-client counts are reported separately instead. The aligned service metric is meaningful only when that PostgreSQL container is dedicated to the measured Node process and no unrelated workload runs in either boundary.

## Fleet contract

A fleet contains customers (the legacy JSON key remains `tenants`), each with one or more named surfaces. A qualifying fleet also declares the exact customer → logical database → API topology: stable database/API IDs, a credential-free physical database label, ordered physical schemas, opaque credential-sensitive runtime-pool identities, and the surface names served by each API. Validation requires every surface to appear exactly once and rejects build-contract or runtime-pool identities reused across customers, so host labels and instance counts cannot be mistaken for customer isolation or density.

Every surface defines a warmup query, weighted workload operations tagged with the capability they actually exercise, and isolation canaries. Operations may use typed `requiredMatches` and `forbiddenMatches` response oracles; a matching forbidden value produces `GRAPHQL_OPERATION_ORACLE_FORBIDDEN`, while a successful response missing required evidence produces `GRAPHQL_OPERATION_ORACLE_MISSING`. Wildcard-capable `invariants` add an exhaustive `everyEquals` assertion with positive `min` and optional `max`, so an empty collection or a later foreign row cannot pass after checking node zero. Transport and GraphQL failures remain inside the configured 0.5% error budget and are marked oracle-unavailable, while missing or unexpected evidence in a successful response still fails immediately and every operation must have exactly one conclusive coverage result.

Mutations may declare an untimed `postCoverageVerification` query with the same oracle contract. `variablesFromResponse` binds each verification variable to exactly one JSON pointer from the primary response; a missing or ambiguous extraction fails closed before the verification query runs. This lets side-effect checks correlate by the ID returned by the current mutation instead of accepting a stale row selected by a reusable content hash. `requireConclusiveOperationOracles` rejects the plan unless every warmup and operation has direct or post-coverage evidence, and rejects the run on missing or foreign evidence without changing the production GraphQL API.

Canaries use the same RFC 6901 JSON `path` plus exact JSON `value` model; point them at customer-specific result fields so unrelated strings elsewhere in a response cannot trigger or satisfy an isolation check. A realtime surface also declares its exact subscription and prime mutation with permanent required/forbidden identity invariants plus correlation paths. The driver replaces the declared prime variable with a fresh opaque nonce for every delivery round and requires that exact nonce in both the mutation response and subscription event, so a stale cursor replay cannot satisfy recurring coverage. Artifacts contain only ordered SHA-256 bindings of issued and verified nonces. Those clients remain in the driver rather than the measured server process, and sensitive HTTP/websocket headers are resolved from declared environment-variable names without entering the fleet or artifacts.

If arms produce different cache identities, set `buildContracts` on each surface
with one exact hash per arm name. Validation rejects a partial mapping, and the
runner selects only the current arm's hash; a stock identity therefore cannot
silently satisfy a scoped run (or vice versa).

Capabilities and canaries are plan-level allowlists. A run fails unless every tenant serves every configured operation and capability on its configured surface, every tenant covers every required capability, and every surface runs every required canary. The production plan should require generated Graphile plans plus i18n, LLM/RAG, BM25, tsvector, trigram, vector, PostGIS, ltree, uploads/storage, bulk mutations, realtime, and function bindings. It should also require cross-schema identifiers, metadata, functions, sequences, prepared-statement reuse, poisoned GUCs, rollback/savepoints, plugin raw SQL, owner/BYPASS-role probes, schema drift, cache invalidation, concurrent builds, and connection reuse.

## Safety

Ports 3000–3002, 5432, and 9000 are rejected unless `--allow-reserved-ports` is explicit. For each spawned process, cperf generates a fresh strong observability token and sends it only as an `Authorization` header to the loopback memory endpoint; the token is never put in a URL, log, provenance record, or artifact. Server credentials stay in the inherited environment and are never serialized into result files. An arm without a launch command is treated as an external reused server and can produce diagnostics, but it cannot qualify because the cache and process boundary are not fresh. Missing endpoint fields remain `null` and disqualify the run instead of becoming zero-valued measurements.

This harness never provisions or modifies `constructive-db`. Fixture creation belongs in a disposable PostgreSQL database or an independently managed validation environment.
