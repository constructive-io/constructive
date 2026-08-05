# Physical-database customer-density fixture

This fixture measures complete customers per actual GiB consumed; it does not try to fit the service into 1 GiB. The 1, 2, and 4 GiB V8 settings are repeatable pressure points, while the primary denominator is the maximum post-warmup time-aligned sum of current Node RSS and the dedicated PostgreSQL container's raw cgroup-v2 memory charge.

One logical customer owns one physical PostgreSQL database. Every database has the same three canonical GraphQL surfaces (`ctf_a`, `ctf_b`, and `ctf_c`), the same realtime schemas, build-visible dependency schemas, extension versions, and role-relative ACL shape. Each surface still gets its own least-privilege login, pool identity, and dedicated Graphile instance, so this is the secure production baseline rather than a shared-blueprint implementation.

The provisioner emits two hashes. The database-contract hash covers normalized schema DDL and ACLs, extension versions, and runtime-role safety flags. The input preflight combines that hash with the exact fixture plugin/settings configuration, dependency closure, source, and built runtime artifact hash. That second hash proves only the structural prerequisites for a future no-rewrite blueprint experiment; it does not authorize sharing, and the fixture never rewrites SQL.

## Run locally

Use an existing disposable PostgreSQL 17 container with all fixture extensions available. Input generation only inspects and preflights that exact container. Each later cperf job deliberately removes it and creates a fresh replacement with the same immutable image, loopback port, cgroup resource limits, and narrowly validated `postgres -c name=value` settings; it never inherits data volumes and never accesses `constructive-db`.

```bash
pnpm build

PGHOST=127.0.0.1 \
PGPORT=55432 \
PGUSER=postgres \
PGPASSWORD=local-admin-password \
PGDATABASE=postgres \
node research/graphile-density/physical-database-density/provision.cjs \
  --prefix pdc_density \
  --customers 64 \
  --out-dir research/graphile-density/physical-database-density/.local \
  --maintenance-database postgres
```

Provisioning fails if any target already exists. Replacing this exact disposable prefix requires both `--recreate` and `--yes`; no wildcard or workspace-wide deletion path exists.

Before generating a density plan, derive the governor calibration from at least three clean, conclusive one-surface `catalog-bench` results produced with the ordered production schema set and explicit dependency allowlist. Every source must have build-state retirement enabled and must prove that its exact PostgreSQL introspection PID disappeared before a different steady-state PID was acquired. The tool takes the maximum measured retained heap, server baseline, build-transient heap, and build-transient RSS across repetitions, applies an explicit safety factor, and binds the retirement proof, source artifact hashes, and provisioned database-contract hash into one calibration identity.

```bash
node research/graphile-density/physical-database-density/cache-calibration.cjs \
  --results /tmp/catalog/rep-1/result.json,/tmp/catalog/rep-2/result.json,/tmp/catalog/rep-3/result.json \
  --manifest research/graphile-density/physical-database-density/.local/provision.json \
  --safety-factor 1.25 \
  --out research/graphile-density/physical-database-density/.local/cache-calibration.json
```

Inconclusive, cross-tenant, legacy one-schema-layout, or scope-mismatched results are rejected. Dirty source state is retained explicitly as `sourceWorktreesClean: false`, which permits local diagnostic sizing but cannot turn the later run into qualifying evidence because cperf independently requires clean server provenance. The calibration is a governor sizing input, not a performance claim; the complete-customer workload still decides qualification.

Generate the credential-free fleet and plan after provisioning. The secret file remains mode `0600`, and generated plans contain only its path.

```bash
node research/graphile-density/physical-database-density/generate-inputs.cjs \
  --manifest research/graphile-density/physical-database-density/.local/provision.json \
  --secrets research/graphile-density/physical-database-density/.local/runtime-secrets.json \
  --out-dir research/graphile-density/physical-database-density/.local/inputs \
  --cache-calibration research/graphile-density/physical-database-density/.local/cache-calibration.json \
  --postgres-container postgres-density \
  --arm-profile density-tuning \
  --tenant-counts-by-heap-mib '1024:8,12,16;2048:16,24,32;4096:32,48,64' \
  --heaps 1024,2048,4096 \
  --repetitions 3 \
  --duration-sec 900

node packages/perf-harness/dist/index.js validate \
  --plan research/graphile-density/physical-database-density/.local/inputs/plan.json

node packages/perf-harness/dist/index.js run \
  --plan research/graphile-density/physical-database-density/.local/inputs/plan.json
```

The container passed to `--postgres-container` is destructive, disposable fixture state. Generation captures its exact 64-character ID as the only unlabeled container the runner may remove; every replacement must carry the exact fixture, prefix, purpose, image, port, command, and resource-limit contract before it can be removed again. A same-named unrelated container fails closed. The source command may be the image default `postgres`, in which case generation adds and pins a sufficient `max_connections`; otherwise only the checked-in PostgreSQL setting allowlist is accepted, and explicit settings such as `max_connections` and `shared_buffers` are preserved and audited live.

For each matrix coordinate the prepare wrapper reuses the validated private credential template, but live runtime-pool and Graphile cache identities use a process-random keyed HMAC and intentionally change between preflight and measurement. The fleet carries deterministic, credential-free pool and build-contract fingerprints instead; each process proves the one-to-one mapping from those fingerprints to its live role, database, schema, pool object, and resident cache entry. The wrapper writes a new `0600` secret file and credential-free manifest under that run's artifact directory, provisions a unique run-bound clone and nonce set into the fresh cluster, then runs the full live DDL/ACL/role/extension audit outside the measured Node process. Cperf starts the server with the attested per-run manifest path, manifest hash, and clone ID; a static preflight manifest cannot accidentally satisfy that binding.

The `density-tuning` profile compares the dedicated-listener baseline with one exact notification broker per physical customer and one-client runtime pools. It isolates stock prepared statements, prepared statements disabled, native single-checkout client retirement (`maxUses=1`), and each V8 size profile before testing a cumulative single-checkout/size arm. Input preflight starts a fresh Node child for every arm, waits for that child to report readiness, validates every customer status plus representative shared realtime, and waits for the child to terminate before starting the next arm. This process boundary matters because Dataplan and pool modules may snapshot environment on first import; setting and restoring `process.env` around multiple in-process servers cannot prove arm isolation. Each child strips ambient Node preload/module-path hooks, runs the arm's exact V8 profile, behaviorally attests the loaded Dataplan prepared-statement cache, and keeps process-global `PG_POOL_MAX=1` plus `PG_POOL_MAX_USES=0`; arm-specific runtime capacity and `maxUses` travel only through exact server options. None is accepted from a microbenchmark alone. The default `idle` profile instead isolates PostgreSQL idle-client retention at 30, 5, and 1 seconds. Every heap checkpoint gets an explicit environment block containing the measured instance cost, server reserve, build reserve, RSS build reserve, calibrated budget capacity as the cache ceiling, `GRAPHILE_CACHE_ADMISSION_MODE=preserve-resident`, and the calibration identity. Input generation resolves Node's effective V8 heap limit and fails before starting runtime status collection when the calibrated resident-plus-next-build budget cannot admit all three surfaces for that heap's requested maximum. The plan records the required residents, calibrated capacity, remaining headroom, and stable boundary refusal reason/code; a 1 GiB checkpoint may still fail under real pressure or correctness gates, but it cannot fail merely because it inherited the old fixed 768 MiB reserve.

Before scoring begins, every Graphile surface is warm, every configured capability has returned exact customer and physical-database evidence, every realtime manager is running, and one `graphql-transport-ws` subscription per surface has received its configured tenant-specific database event through the exact customer/tenant route. Fixture-only `BEFORE` triggers stamp read/search source rows and upload, bulk, function-binding, and realtime side effects with `current_database()`; i18n translations and RAG source content also carry a database-derived marker. Collection oracles assert every returned row plus nonempty one-row cardinality, and deterministic LLM/RAG, vector, PostGIS, ltree, and search results have operation-specific semantic assertions.

Every presigned-upload invocation selects a fixture-only VOLATILE mutation sibling that returns `current_database()`, so timed workload calls carry direct physical-database evidence. Coverage then extracts the exact `fileId` returned by that invocation and verifies the stamped `appFiles` row by both ID and content hash, which prevents a reused fixture row from satisfying the check. Buckets start with `physical_name = NULL`, forcing the first upload through the plugin's `withPgClient(null)` provisioning lane while the fixture keeps forced RLS intact. Missing, ambiguous, or foreign evidence fails with stable oracle codes; none of these fixture-only fields or functions belongs to the production API design.

Realtime verification requires permanent tenant and physical-database invariants plus a one-time prime payload; later legitimate payload changes remain valid, while another selected database is an explicit forbidden match. The subscription clients live in the perf-harness driver process, outside the measured server RSS; the server retains only its real websocket/session state and independently reports one accepted live connection per surface. The post-warmup hook asserts those server-side managers and connections instead of constructing load-generator clients. Driver credentials may be sourced from environment-variable names declared in the fleet, and neither their values nor resolved headers are written to evidence. Post-warmup samples then record Graphile residency and the live budget capacity/calibration identity, concrete `pg.Pool` clients, `pg_stat_activity` backends, raw cgroup-v2 `memory.current`, `memory.peak`, `memory.stat`, `memory.events`, and Docker working set.

One generated plan owns the full customer-count ramp, and the highest count across all heaps must equal the source manifest's physical database count. Use `--tenant-counts` for one shared ramp or `--tenant-counts-by-heap-mib` for semicolon-separated heap-specific ramps; the latter lets each heap push its own density boundary without forcing the smallest heap to admit the largest fleet. Every matrix coordinate still gets a fresh container provisioned with exactly that coordinate's customer count, so lower-count samples cannot inherit unused databases or catalog cache. Keeping the complete ramp, every configured arm, and every repetition under one immutable plan/fleet cohort lets the report reject spliced or partial evidence while still bracketing the highest passing count with a greater failure.

## Qualification conditions

Use one dedicated PostgreSQL container for the measured Node process, with no unrelated databases or traffic. The memory endpoint enumerates `pg_database` and the score fails unless the container contains only the maintenance database and the selected physical customer databases, so extra provisioned-but-unserved databases and shared development databases both make the run non-qualifying. Every scheduled run gets a unique Docker ID, cgroup identity, PostgreSQL system identifier, clone ID, attestation set, and nonce set; reuse of any one identity rejects every affected result, including when separately generated result files are combined for reporting. On Linux the sampler reads the target container's cgroup directly from the host; Docker Desktop falls back to reads inside the container, so publishable numbers should be reproduced on a Linux cgroup-v2 host.

The perf harness rejects a capacity point unless a greater customer count fails, all repetitions are present, every physical database and realtime transport remains resident, all request-path isolation canaries are conclusive, cross-customer results stay zero, and latency, error, eviction, build, pool, backend, OOM, and heap-growth gates pass. Each 15-minute measured run performs full request-path canary sweeps before and after timed traffic, plus 14 one-canary-per-surface rounds at 60-second intervals. The per-surface rotation is deterministic and staggered, covers all 14 configured canaries exactly once during the timed window, runs at concurrency 16 across surfaces, and never drops an overlapping round; incomplete or deadline-late validation fails the run. These passive probes do not count as induced hostile validation. The current generated physical plan deliberately omits `qualification.hostileValidationEvidence`, so cperf records diagnostic evidence until one immutable `exact-runtime-hostile-validation-v1` report is attached for every exact arm runtime and configuration. Configured V8 old space, Node-only RSS, Docker working set, and cumulative peaks remain diagnostics; customers per aligned Node-plus-PostgreSQL GiB is the decision metric once all qualification prerequisites exist.

The harness also requires a clean pinned worktree for qualifying evidence. Until these local changes are reviewed and recorded on a local branch, smoke runs can validate mechanics but intentionally cannot count as performance evidence. A smoke still gets a fresh database epoch so it exercises the real lifecycle, but its five-second workload always receives zero qualified customers and cannot enter a capacity or density decision.

## Offline checks

```bash
node --test \
  research/graphile-density/physical-database-density/cache-calibration.test.cjs \
  research/graphile-density/physical-database-density/lib.test.cjs \
  research/graphile-density/physical-database-density/inputs.test.cjs \
  research/graphile-density/physical-database-density/prepare-measurement-run.test.cjs \
  research/graphile-density/physical-database-density/measurement-attestation.test.cjs \
  research/graphile-density/physical-database-density/server-realtime.test.cjs \
  research/graphile-density/physical-database-density/server-retained-memory.test.cjs

pnpm --dir packages/perf-harness exec jest --runInBand
pnpm --dir packages/perf-harness build
```
