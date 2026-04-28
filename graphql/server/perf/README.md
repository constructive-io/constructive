# Constructive GraphQL Server Perf Suite

This directory contains the performance tooling for the GraphQL server.

The current optimization model being exercised is:

- exact-match buildKey handler reuse
- no template sharing
- no SQL rewrite
- no fingerprint-based handler reuse in the runtime path

In practice, handlers are reused only when the build inputs match exactly:

- connection identity
- schema set
- role configuration

## Perf Lanes

There are two distinct lanes in this folder.

### 1. Lightweight HTTP comparison

This lane drives real HTTP requests through Express -> PostGraphile -> Grafast -> PostgreSQL.

Primary entrypoints:

- `e2e-benchmark.ts`
- `run-comparison.sh`
- `run-stress-suite.sh`

Use this lane when you want:

- old vs new mode comparison
- QPS / latency / heap snapshots
- repeated server restarts and cache warm/cold behavior

`e2e-benchmark.ts` is the simple benchmark entrypoint. It currently exercises the private-routing path with header-based requests and a fixed query mix.

### 2. DBPM-backed perf framework

This lane provisions real tenant data, builds token pools and request profiles, and can be used for longer-running or more realistic tenant workflows.

Primary entrypoints:

- `phase1-preflight.mjs`
- `phase1-tech-validate-dbpm.mjs`
- `phase2-load.mjs`
- `run-test-spec.mjs`
- `run-k-sweep.mjs`

Use this lane when you want:

- DBPM tenant provisioning
- business-table validation
- shape-variant experiments
- profile-driven sustained load

## Option A Shape Variants

The DBPM flow now supports Option A shape divergence through additional provisioned tables created via the same provisioning mutation used for the main business table.

Relevant files:

- `phase1-tech-validate-dbpm.mjs`
- `phase1-preflight.mjs`
- `summarize-shapes.mjs`

The intended usage is:

1. Provision the normal tenant database and main business table.
2. Add extra provisioned variant tables for selected tenants with `--dbpm-shape-variants`.
3. Keep the main CRUD workload pointed only at the original business table.
4. Use `summarize-shapes.mjs` to inspect structural divergence without relying on raw GraphQL introspection names.

`summarize-shapes.mjs` is a perf-local diagnostic. It is not part of the runtime handler reuse mechanism.

## Quick Start

### Old vs New comparison

```bash
bash graphql/server/perf/run-comparison.sh --k 20 --duration 300 --workers 8
```

This runs:

- old mode with enlarged `GRAPHILE_CACHE_MAX`
- new mode with `USE_MULTI_TENANCY_CACHE=true`
- a simple side-by-side comparison of throughput, latency, and heap

### Stress suite

```bash
bash graphql/server/perf/run-stress-suite.sh
```

This is the curated multi-run shell harness for repeated old/new comparisons under a fixed matrix of scenarios.

### DBPM preflight + load

```bash
node graphql/server/perf/phase1-preflight.mjs \
  --run-dir /tmp/constructive-perf/run1 \
  --dbpm-tenant-count 20 \
  --dbpm-shape-variants 3

node graphql/server/perf/phase2-load.mjs \
  --run-dir /tmp/constructive-perf/run1 \
  --workers 8 \
  --duration-seconds 300
```

### Shape summary

```bash
node graphql/server/perf/summarize-shapes.mjs \
  --manifest /tmp/constructive-perf/run1/data/business-table-manifest.json
```

## Key Scripts

| Script | Purpose |
|---|---|
| `e2e-benchmark.ts` | Simple HTTP benchmark through the full GraphQL stack |
| `run-comparison.sh` | Old vs new comparison harness |
| `run-stress-suite.sh` | Curated multi-run stress matrix |
| `phase1-preflight.mjs` | Preflight orchestration, DBPM validation, token/keyspace/profile setup |
| `phase1-tech-validate-dbpm.mjs` | DBPM tenant provisioning and business-table validation |
| `phase2-load.mjs` | Sustained profile-driven GraphQL load |
| `run-test-spec.mjs` | Wrapper around phase orchestration |
| `run-k-sweep.mjs` | Multi-k orchestration |
| `build-token-pool.mjs` | Sign-in and bearer-token generation |
| `build-keyspace-profiles.mjs` | Route/keyspace expansion |
| `build-business-op-profiles.mjs` | Business workload profile construction |
| `reset-business-test-data.mjs` | Cleanup between runs |
| `prepare-public-test-access.mjs` | Public-lane preparation |
| `public-test-access-lib.mjs` | Shared helpers for public-lane access |
| `summarize-shapes.mjs` | Name-agnostic structural shape summary |

## Important Notes

### `GRAPHILE_CACHE_MAX`

For old-mode comparisons, enlarge `GRAPHILE_CACHE_MAX` so dedicated-instance mode is not artificially dominated by LRU churn.

`run-comparison.sh` already does this automatically.

### Interpreting the two lanes

The lightweight benchmark lane is best for:

- cache-mode comparison
- heap growth
- restart / warmup / burst behavior

The DBPM-backed lane is best for:

- tenant provisioning realism
- shape-variant experiments
- profile-driven workload behavior

### Report file

`E2E_BENCHMARK_REPORT.md` is the archived stress-test writeup for the current multi-tenancy cache evaluation. Treat it as a results document, not as the single source of truth for script capabilities.

## Output Layout

Most scripts write to a run directory under `/tmp/constructive-perf/`:

```text
<run-dir>/
├── data/
├── logs/
├── reports/
└── tmp-scripts/
```

Typical artifacts include:

- tenant credentials
- token pools
- business table manifests
- business operation profiles
- load summaries
- debug and memory snapshots
