# graphql-server-test perf benchmark spec

This spec records the confirmed design for the new `graphql/server-test/perf` benchmark implementation.

The implementation is centered on Jest and `getConnections()`. A benchmark run owns one or more managed benchmark contexts, where each context provides an isolated test database, a real `@constructive-io/graphql-server` HTTP server, request helpers, artifacts, and teardown.

## Design boundary

- `README.md` and this spec are the source of truth for the new implementation.
- Do not infer requirements from older perf code, compatibility scripts, or historical drafts.
- The public interface is a Jest benchmark runner selected by config groups/specs.
- Benchmark execution must stay inside this new Jest / `getConnections()` implementation.
- The implementation must not shell out to external benchmark CLIs or shell scripts.
- Preflight is not a standalone command. It is an internal step used by public-routing cases before measured load starts.
- The benchmark suite is local / opt-in and must not be part of the default test path or CI unless a future perf job explicitly opts in.

## Matrix dimensions

The first benchmark matrix expands these dimensions:

- `routingMode`: `private` / `public`
- `cacheMode`: `old` / `new`
- `scaleProfile`: named `k` / duration / workers tuple
- `workloadProfile`: named operation mix

For the first version, `k` is shared across routing modes:

- in `private` routing, `k` means private route/profile count;
- in `public` routing, `k` means public tenant/host/profile count.

Default workload profiles:

- `private`: metadata/read-oriented workload
- `public`: business CRUD-oriented workload

## Initial config groups

| Config group | Routing modes | Cache modes | Scale | Purpose |
| --- | --- | --- | --- | --- |
| `smoke` | `private` | `new` | very small / short | Fast runner and private-route sanity check |
| `public-smoke` | `public` | `new` | very small / short | Fast public-route sanity check with internal preflight |
| `private-cache-compare` | `private` | `old,new` | about 1 minute | Lightweight old/new cache comparison for private routing |
| `k10-5min` | `private,public` | `old,new` | `k=10`, `duration=5min` | First full local benchmark matrix |

## 1. Public preflight spec

Public-routing matrix cases must run preflight before measured load.

Preflight is only required for `routingMode = public`. Private-routing cases may still run lightweight setup and probe logic, but that is normal case setup, not public preflight.

### 1.1 Preflight inputs

Public preflight receives:

- the expanded matrix case;
- the active benchmark context;
- the selected scale profile, including `k`;
- the selected public workload profile;
- DBPM provision options derived from the config group/spec;
- the run artifact writer;
- hard-gate settings such as whether under-provisioning is allowed for tiny smoke runs.

### 1.2 Preflight stages

Public preflight should run these stages in order:

1. **Config snapshot**
   - Record the selected routing mode, cache mode, scale profile, workload profile, and provision options.
   - Record the server base URL and context identifier.

2. **DBPM provision**
   - Provision the DBPM-backed tenants, APIs, public hosts, and business API/table metadata needed by the selected `k`.
   - Run inside the active benchmark context.
   - Do not depend on a manually started external server.
   - Do not expose DBPM provision as a standalone benchmark command.

3. **Business workload preparation**
   - Ensure the public business workload has tables/data suitable for create, get-by-id, update-by-id, and list-recent style operations.
   - Prepare benchmark-owned schemas/tables only.

4. **Access preparation**
   - Prepare role/grant access required by the public workload.
   - Limit access changes to benchmark-owned objects.
   - Fail preflight if non-benchmark objects would be modified by default.

5. **Profile generation**
   - Generate public host-routing request profiles.
   - Generate public business operation profiles for the selected workload profile.
   - Preserve enough metadata to map every profile back to its tenant/API/host/table target.

6. **Scale and keyspace validation**
   - Validate provisioned public tenant/host/profile count against `k`.
   - Validate route-key diversity/count against the selected scale profile.
   - Tiny smoke groups may allow explicit under-provisioning only when the config says so.

7. **Route probes**
   - Run lightweight GraphQL requests before measured load.
   - Validate HTTP success and zero unexpected GraphQL errors.
   - Validate that host routing reaches the expected public API/table shape.

8. **Artifact writing**
   - Write a preflight report under the run directory.
   - Include enough paths/counts/errors to debug why load did or did not start.

### 1.3 DBPM provision helper

DBPM provision is a sub-step of public preflight.

Execution model:

1. matrix runner expands a public case;
2. the case acquires a benchmark context from the context manager;
3. public preflight runs inside that context;
4. public preflight calls the DBPM provision helper;
5. provision output is converted into request/workload profiles;
6. route probes validate those profiles;
7. measured load starts only after preflight passes.

The DBPM provision helper should be callable code used by preflight. It can have focused implementation tests, but benchmark users should not run it directly as the public benchmark interface.

Required DBPM provision output:

- public tenant / host profiles usable by the load runner;
- business API/table metadata usable by public host routing;
- business operation profiles for the public workload;
- enough provisioned public route/profile count to satisfy `k` unless the config explicitly allows under-provisioning;
- a machine-readable provision/preflight report.

### 1.4 Preflight hard gates

Public preflight hard gates:

- DBPM provision completed without unexpected errors;
- provisioned tenant/host/profile counts satisfy the selected `k`, unless under-provisioning is explicitly allowed;
- generated request profiles are non-empty;
- generated operation profiles are non-empty;
- public access preparation did not touch non-benchmark objects;
- route probes completed successfully;
- GraphQL responses contain zero unexpected errors;
- the preflight artifact was written.

If any hard gate fails, the matrix case fails before measured load starts.

### 1.5 Preflight output shape

Preflight returns a structured result to the matrix runner.

Minimum shape:

```ts
interface PublicPreflightResult {
  ok: boolean;
  routingMode: 'public';
  scaleProfile: string;
  workloadProfile: string;
  k: number;
  provisionedTenantCount: number;
  publicHostCount: number;
  requestProfileCount: number;
  operationProfileCount: number;
  routeProbe: RouteProbeSummary;
  requestProfiles: RequestProfile[];
  operationProfiles: OperationProfile[];
  artifactPath: string;
  hardGateFailures: string[];
}
```

## 2. Matrix benchmark execution spec

The matrix benchmark is the public benchmark entrypoint.

### 2.1 Runner responsibilities

The runner should:

1. enforce local/opt-in guards;
2. load the selected config group/spec;
3. expand matrix cases from routing modes, cache modes, scale profiles, and workload profiles;
4. create a run directory;
5. initialize a benchmark context manager;
6. run each case in a deterministic order;
7. write per-case reports;
8. write an aggregate summary;
9. tear down all managed contexts.

### 2.2 Connection lifecycle policy

Connection lifecycle is configurable.

Default policy:

```ts
type ConnectionPolicy = 'reuse' | 'per-case';
```

- Default: `reuse`.
- `reuse` means the runner should not blindly call `getConnections()` for every matrix case.
- The context manager should reuse an existing benchmark context when the target database/server state is compatible with the next case.
- If a server-level setting cannot be changed safely inside an existing context, the context manager may create a new compatible context key rather than forcing unsafe mutation.
- `per-case` means every matrix case gets a fresh `getConnections()` context and teardown.

The report must record which connection policy was used and which context id each case ran against.

### 2.3 Context compatibility

Context compatibility should account for settings that affect the database/server lifecycle, including:

- routing mode;
- cache mode;
- exposed schemas;
- anonymous/authenticated role settings;
- DBPM provision state;
- workload state when public mutations are involved.

A reused context must not let one case's mutating workload invalidate another case's comparison. If public business data is reused across cases, the runner must either:

- reset benchmark-owned data before the next measured case; or
- provision case-scoped benchmark-owned data so cases do not collide.

### 2.4 Case execution flow

Each matrix case should follow this flow:

1. **Acquire context**
   - Ask the context manager for a compatible benchmark context according to the connection policy.

2. **Prepare profiles**
   - For `public`, run public preflight.
   - For `private`, build private request profiles and run lightweight setup/probe logic.

3. **Prepare isolation**
   - If the context is reused and the workload mutates data, reset or isolate benchmark-owned data before measured load.

4. **Capture memory/cache before**
   - Capture `/debug/memory` or equivalent debug snapshot when available.

5. **Run final route probe**
   - Confirm the selected request profiles still work immediately before measured load.

6. **Run measured load**
   - Run for the selected duration and worker count.
   - Distribute requests across profiles.
   - Select operations according to the workload profile.
   - Apply fail-fast rules.

7. **Capture memory/cache after**
   - Capture the same snapshot shape as the before snapshot.

8. **Evaluate gates**
   - Convert preflight, route probe, load, memory/report, and reset failures into hard gate failures.

9. **Write case report**
   - Include metrics, artifacts, context id, lifecycle policy, and hard gate failures.

10. **Post-case cleanup**
    - If reusing the context, leave it in a known state for the next compatible case.
    - If using `per-case`, teardown immediately.

### 2.5 Failure behavior

- Preflight failure fails the case and skips measured load.
- Route probe failure fails the case and skips measured load.
- Fail-fast during load fails the case and records the reason.
- A failed case should still write its case report when possible.
- The aggregate summary should include both passed and failed cases.

### 2.6 Memory and cache snapshots

Each measured case should capture memory/cache snapshots before and after load when the debug endpoint is available.

Snapshots should record useful fields such as:

- process memory / heap fields exposed by the server;
- multi-tenancy cache size/counters when present;
- Graphile build counters when present.

Because the server is started through `getConnections()` inside the Jest process, process-level heap measurements are relative local signals, not isolated production memory measurements. Cache counters and before/after deltas are still useful observations.

### 2.7 Load runner

The load runner should be duration- and worker-based.

Required behavior:

- run requests for the selected `durationSeconds`;
- use the selected concurrent worker count;
- distribute requests across selected request profiles;
- select operations according to the workload profile;
- collect latency, request count, error count, and representative error samples;
- support early stop when fail-fast conditions are met.

### 2.8 Fail-fast

Long benchmark cases should not keep running when setup is obviously wrong.

Initial fail-fast behavior should cover:

- repeated network failures;
- repeated HTTP failures;
- repeated unexpected GraphQL errors;
- error rates high enough that continuing would not produce useful benchmark data.

Fail-fast should mark the case as failed and include the reason in the case report.

### 2.9 Case report shape

Each case should produce a machine-readable report containing at least:

- routing mode;
- cache mode;
- scale profile;
- workload profile;
- connection policy;
- context id;
- started/finished timestamps;
- total requests;
- failed request count;
- unexpected GraphQL error count;
- QPS / requests per second;
- p50 / p95 / p99 latency;
- representative error samples;
- preflight artifact path for public cases;
- memory/cache snapshot paths;
- hard gate failures;
- final pass/fail status.

The run should also write an aggregate summary for all cases in the selected config group.

## 3. Directory and file layout spec

Initial target layout:

```text
graphql/server-test/perf/
  README.md
  README.bak
  SPEC.md
  jest.config.js
  e2e-matrix.perf.ts
  specs/
    smoke.json
    public-smoke.json
    private-cache-compare.json
    k10-5min.json
  reports/
    .gitignore
  src/
    artifacts.ts
    ci-guard.ts
    config.ts
    context.ts
    dbpm-provision.ts
    gates.ts
    load.ts
    matrix.ts
    setup.ts
    memory.ts
    operations.ts
    preflight.ts
    profiles.ts
    reset.ts
    stats.ts
    types.ts
```

### 3.1 Entrypoint

`e2e-matrix.perf.ts`

- Jest benchmark entrypoint.
- Loads config group/spec.
- Expands matrix cases.
- Calls the matrix runner.
- Contains minimal orchestration only; implementation details live under `src/`.

### 3.2 Config and guards

`src/config.ts`

- Defines built-in config groups.
- Loads spec JSON files.
- Applies environment overrides according to the parameter interface in this spec.
- Produces a normalized `PerfRunConfig`.

`src/ci-guard.ts`

- Enforces local/opt-in execution.
- Refuses default CI execution unless a future explicit opt-in is configured.

### 3.3 Matrix and context lifecycle

`src/matrix.ts`

- Expands config into cases.
- Owns deterministic run order.
- Calls case execution and aggregate reporting.

`src/context.ts`

- Owns `getConnections()` lifecycle.
- Implements connection policy: `reuse` by default, `per-case` when configured.
- Tracks context ids, compatibility keys, and teardown.

### 3.4 Public preflight and DBPM provision

`src/preflight.ts`

- Implements public-only preflight orchestration.
- Calls DBPM provision, access preparation, profile generation, scale validation, route probes, and artifact writing.

`src/dbpm-provision.ts`

- Implements callable DBPM provision helper used by public preflight.
- Does not expose a standalone benchmark command.

### 3.5 Profiles, operations, and load

`src/setup.ts`

- Owns GraphQL-first setup after the server starts.
- Keeps direct SQL/bootstrap work limited to the minimum needed before GraphQL can serve requests.
- Provides helpers for benchmark-owned setup operations used by preflight and private case setup.

`src/profiles.ts`

- Defines and builds request profiles.
- Converts provision/preflight output into load-runner inputs.

`src/operations.ts`

- Defines workload operations and operation weights.
- Keeps private metadata/read and public business CRUD workloads explicit.

`src/load.ts`

- Implements duration/worker load loop.
- Records request outcomes and error samples.
- Applies fail-fast signals from the runner.

### 3.6 Measurements, gates, and reports

`src/memory.ts`

- Captures memory/cache snapshots.
- Normalizes debug endpoint responses.

`src/stats.ts`

- Computes request totals, QPS, p50, p95, p99, and error summaries.

`src/gates.ts`

- Converts preflight/probe/load/report failures into hard gate failures.
- Keeps QPS/latency as observations unless a later spec explicitly adds thresholds.

`src/artifacts.ts`

- Creates run directories.
- Writes JSON artifacts atomically where practical.
- Owns artifact path conventions.

`src/reset.ts`

- Resets or isolates benchmark-owned data when a reused context would otherwise leak state across cases.
- Must not touch non-benchmark objects by default.

`src/types.ts`

- Defines shared types for configs, matrix cases, contexts, profiles, preflight results, load results, reports, gates, and artifacts.

## 4. Fixture and setup strategy

The setup strategy is GraphQL-first.

Core principle:

- After the benchmark server has started, benchmark setup and benchmark operations should use GraphQL whenever the product surface can express the operation.
- SQL/bootstrap fixtures should be rare and limited to what must exist before the GraphQL server can boot or before GraphQL can expose the required API surface.

### 4.1 Allowed direct SQL/bootstrap use

Direct SQL or seed adapters are allowed only for bootstrap boundaries such as:

- creating roles, schemas, extensions, or baseline database objects required for the server to start;
- installing minimal module/database structure that must exist before DBPM GraphQL operations are available;
- creating benchmark-owned guard schemas/tables that cannot be created through GraphQL yet;
- teardown/reset of benchmark-owned objects when the context manager reuses a context and GraphQL cannot safely reset the data;
- test-only assertions against database state, when those assertions do not mutate non-benchmark objects.

Direct SQL/bootstrap must not become the normal way to provision tenants, APIs, hosts, or business workload data after the server is running.

### 4.2 GraphQL-first setup after server start

Once `getConnections()` has started the server, setup should proceed through GraphQL-facing behavior:

- DBPM provision should be driven through GraphQL operations against the active benchmark server;
- public tenant/API/host setup should use GraphQL mutations where available;
- business API/table metadata should be created through the GraphQL surface where available;
- business workload seed data should be created through GraphQL mutations where available;
- route probes and workload validation should use HTTP GraphQL requests, not direct database reads, for pass/fail behavior.

Direct database reads may still be used for diagnostics or artifact enrichment, but hard gates should prefer observable GraphQL behavior when possible.

### 4.3 Benchmark-owned data rule

All setup, GraphQL or SQL, must stay inside benchmark-owned scope.

Benchmark-owned scope means:

- generated tenant/API/host names include a run/case prefix or another unambiguous benchmark marker;
- generated schemas/tables are clearly benchmark-owned;
- generated data can be reset or discarded without affecting non-benchmark state;
- reports include enough identifiers to audit what was created.

### 4.4 Reused context cleanup

Because the default connection policy is `reuse`, context reuse must not leak mutating workload state into later cases.

Preferred cleanup order:

1. avoid collision by creating case-scoped benchmark-owned GraphQL data;
2. reset benchmark-owned data through GraphQL operations when product APIs support it;
3. use direct SQL reset only for benchmark-owned objects when GraphQL reset is not available or not reliable enough for the benchmark.

## 5. Parameter interface and override precedence

The first implementation should use environment variables plus optional JSON specs. This keeps Jest invocation simple and avoids relying on custom Jest CLI flags.

### 5.1 Required opt-in

A benchmark run requires:

```sh
PERF_BENCHMARK=1
```

If `PERF_BENCHMARK` is not set to `1`, the Jest perf entrypoint must refuse to run.

CI guard:

```sh
ALLOW_PERF_IN_CI=1
```

is required only if a future CI perf job intentionally runs these benchmarks under `CI=true`.

### 5.2 Primary selectors

| Env var | Default | Meaning |
| --- | --- | --- |
| `PERF_CONFIG_GROUP` | `smoke` | Built-in config group to run: `smoke`, `public-smoke`, `private-cache-compare`, or `k10-5min` |
| `PERF_SPEC` | unset | Optional JSON spec path. When provided, it overlays the selected config group. |
| `PERF_RUN_DIR` | generated under `/tmp/constructive-perf/` | Artifact output directory |
| `PERF_CONNECTION_POLICY` | `reuse` | `reuse` or `per-case` |

### 5.3 Matrix overrides

| Env var | Meaning |
| --- | --- |
| `PERF_ROUTING_MODES` | Comma-separated override for routing modes, e.g. `private,public` |
| `PERF_CACHE_MODES` | Comma-separated override for cache modes, e.g. `old,new` |
| `PERF_K` | Override selected scale profile `k` |
| `PERF_DURATION_SECONDS` | Override selected scale profile duration |
| `PERF_WORKERS` | Override selected scale profile worker count |
| `PERF_PRIVATE_WORKLOAD` | Override private workload profile name |
| `PERF_PUBLIC_WORKLOAD` | Override public workload profile name |
| `PERF_ALLOW_UNDERPROVISIONED` | If `1`, allow explicit under-provisioning for smoke/debug runs |

### 5.4 Runtime behavior overrides

| Env var | Default | Meaning |
| --- | --- | --- |
| `PERF_FAIL_FAST` | `1` | Enable fail-fast during measured load |
| `PERF_CAPTURE_MEMORY` | `1` | Capture memory/cache snapshots when debug endpoint is available |
| `PERF_ROUTE_PROBE_SAMPLE_SIZE` | group-defined | Number of request profiles to probe before load; `0` means all profiles |
| `PERF_ERROR_SAMPLE_LIMIT` | `20` | Maximum representative error samples stored in reports |
| `PERF_TEST_TIMEOUT_MS` | group-derived | Jest timeout for the perf entrypoint |

### 5.5 Override precedence

Config is resolved in this order:

```text
built-in defaults
  < built-in config group
  < PERF_SPEC JSON overlay
  < PERF_* environment overrides
```

The normalized config written to `summary.json` must include both the resolved values and enough source metadata to explain which group/spec/overrides produced the run.

### 5.6 JSON spec shape

A JSON spec may override any normalized config field, but should keep the same concepts as the built-in groups.

Minimal shape:

```json
{
  "name": "k10-5min",
  "connectionPolicy": "reuse",
  "routingModes": ["private", "public"],
  "cacheModes": ["old", "new"],
  "scaleProfile": {
    "name": "k10-5min",
    "k": 10,
    "durationSeconds": 300,
    "workers": 4
  },
  "workloadProfiles": {
    "private": "metadata-read",
    "public": "business-crud"
  },
  "publicPreflight": {
    "allowUnderProvisioned": false
  }
}
```

## 6. Report and artifact schema

Reports are machine-readable JSON artifacts. They are part of the target behavior, not incidental debug output.

### 6.1 Common rules

- Every JSON artifact should include `schemaVersion`.
- Timestamps should be ISO strings.
- Reports must redact secrets, tokens, cookies, passwords, and authorization headers.
- Error samples should be representative and capped by `PERF_ERROR_SAMPLE_LIMIT`.
- Paths should be absolute or relative to `runDir`, but the convention must be consistent within a run.

### 6.2 Run summary: `summary.json`

Minimum shape:

```ts
interface PerfRunSummary {
  schemaVersion: 1;
  runId: string;
  runDir: string;
  configGroup: string;
  specPath?: string;
  startedAt: string;
  finishedAt: string;
  pass: boolean;
  config: NormalizedPerfRunConfig;
  totals: {
    caseCount: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  cases: CaseSummary[];
  artifacts: {
    summaryPath: string;
    casesDir: string;
    preflightDir: string;
    memoryDir: string;
    errorsDir: string;
  };
}
```

### 6.3 Case report: `cases/<case-id>.json`

Minimum shape:

```ts
interface CaseReport {
  schemaVersion: 1;
  runId: string;
  caseId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  matrix: {
    routingMode: 'private' | 'public';
    cacheMode: 'old' | 'new';
    scaleProfile: ScaleProfile;
    workloadProfile: string;
  };
  lifecycle: {
    connectionPolicy: 'reuse' | 'per-case';
    contextId: string;
    contextReused: boolean;
    compatibilityKey: string;
    serverUrl: string;
  };
  preflight?: {
    ok: boolean;
    artifactPath: string;
    provisionedTenantCount?: number;
    publicHostCount?: number;
    requestProfileCount: number;
    operationProfileCount: number;
    hardGateFailures: string[];
  };
  routeProbe: RouteProbeSummary;
  load?: LoadReport;
  memory?: {
    beforePath?: string;
    afterPath?: string;
    beforeOk: boolean;
    afterOk: boolean;
  };
  gates: {
    hardGateFailures: string[];
    observations: Record<string, unknown>;
  };
  artifacts: {
    caseReportPath: string;
    preflightPath?: string;
    memoryBeforePath?: string;
    memoryAfterPath?: string;
    errorsPath?: string;
  };
}
```

### 6.4 Preflight report: `preflight/<case-id>.json`

Minimum shape:

```ts
interface PreflightReport {
  schemaVersion: 1;
  runId: string;
  caseId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  configSnapshot: Record<string, unknown>;
  provision: {
    ok: boolean;
    tenantCount: number;
    publicHostCount: number;
    apiCount: number;
    businessTableCount: number;
    reportPath?: string;
    errors: RedactedErrorSample[];
  };
  profiles: {
    requestProfileCount: number;
    operationProfileCount: number;
    routeKeyCount: number;
  };
  routeProbe: RouteProbeSummary;
  hardGateFailures: string[];
}
```

### 6.5 Load report

Minimum shape embedded in the case report:

```ts
interface LoadReport {
  ok: boolean;
  durationSeconds: number;
  workers: number;
  totalRequests: number;
  failedRequests: number;
  unexpectedGraphqlErrors: number;
  qps: number;
  latencyMs: {
    p50: number | null;
    p90: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
  };
  operations: Record<string, {
    total: number;
    failed: number;
  }>;
  failFast?: {
    triggered: boolean;
    reason?: string;
  };
  errorSamples: RedactedErrorSample[];
}
```

### 6.6 Hard gates vs observations

Hard gates fail a case. Initial hard gates are:

- local/opt-in guard passed;
- context acquisition succeeded;
- public preflight passed for public cases;
- route probes passed;
- measured load had zero unexpected GraphQL errors unless the case explicitly expects errors;
- measured load had zero unexpected HTTP/network failures;
- memory/cache snapshots were readable when capture is enabled;
- reports were written successfully;
- reused contexts did not leak mutating benchmark data across cases.

Observations are recorded but do not fail by default:

- QPS;
- latency percentiles;
- heap delta;
- cache size/counters;
- Graphile build counters.

Threshold-based performance failures require an explicit future spec setting.

## 7. Target implementation completeness

This README and spec describe the target implementation. They are not a phased migration plan.

The implementation is considered complete when:

- the target directory/file layout exists;
- the Jest perf entrypoint runs config groups through the matrix runner;
- `smoke`, `public-smoke`, `private-cache-compare`, and `k10-5min` are represented as built-in config groups or specs;
- public cases run DBPM provision through public preflight;
- setup after server start is GraphQL-first;
- connection policy defaults to `reuse` and supports `per-case`;
- per-case and aggregate JSON reports are written;
- hard gates and observations follow this spec;
- default unit/integration test runs do not pick up perf benchmarks;
- CI execution is refused unless explicitly opted in.

## 8. Artifacts

A benchmark run should write artifacts under an explicit run directory.

Suggested shape:

```text
<run-dir>/
  summary.json
  cases/
    <case-id>.json
  preflight/
    <case-id>.json
  memory/
    <case-id>-before.json
    <case-id>-after.json
  errors/
    <case-id>.json
```

Generated artifacts should stay out of git.

## First-version non-goals

- No default CI execution.
- No external benchmark CLI/script execution.
- No top-level preflight command.
- No strict QPS/latency regression threshold by default.
- No sweep/stress command surface in the first version.
- No shape-variant dimension unless explicitly added later.
