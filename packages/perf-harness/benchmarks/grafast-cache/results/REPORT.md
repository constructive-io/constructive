# PR #1746: measured cache-capacity tradeoffs

## Decision

**Retain optional capacity tuning with unchanged defaults. There is no automatic
speedup from merging this configuration feature.** Grafast already bounds these
caches; the PR exposes their capacities rather than introducing caching or changing
SQL execution. The controls have value when operators need to balance retained
memory against repeated planning. These fixtures do not establish that a current
production deployment needs different limits.

## TypeScript harness and validation

Benchmark and analysis sources live in `src/benchmarks/grafast-cache/` within
perf-harness. The existing package build emits JavaScript under `dist`; Node
executes those compiled workers in fresh processes. No ts-node, hand-written CJS
worker or Python analyzer is needed. SQL seeds, compressed raw reports and this
evaluation remain under `benchmarks/grafast-cache/`.

Workers directly configure public `GraphQLSchema.extensions.grafast` settings
and assert that application configuration/ts-node modules were not loaded. The
runner, scheduling, production flags and measurement phases are preserved. The
analyzer reuses the existing `metricSummary` implementation. PR configuration
parsing and schema-hook wiring remain covered by separate correctness tests.

- 29 cases × 8 repetitions = **232 distinct fresh worker processes**, run serially.
- Randomized order within each repetition, seed 20260921, production environment.
- Every runtime output, schema, effective capacity and planning check passed.
- All 232 samples match the prior CJS run in input/schema hashes, request counts,
  warmup/measured planning counts and final cache state.
- The TS analyzer exactly reproduces both Python-generated summary objects from
  the previous raw reports. These committed timings are freshly measured with TS
  workers; they are not relabeled CJS measurements.
- Package build and 76 harness tests pass; the original 25 feature tests pass.
- Node v22.22.0, Apple M3, macOS arm64, 16 GiB RAM, PostgreSQL 18.4 in local Docker.
- Grafast 1.1.2, GraphQL 16.13.0, PostGraphile 5.1.4; dependency versions unchanged.

[Raw micro reports](micro.json.gz), [PostgreSQL reports](postgres.json.gz),
[plan-variant reports](variants.json.gz), [summary](summary.json),
[paired PostgreSQL comparisons](postgres-summary.json), and
[provenance/checksums](provenance.json) retain the full evidence.

## Capacity arms

These are entry counts, not megabytes. The third limit is per operation.

| Arm | Query documents | Operations | Plans per operation |
|---|---:|---:|---:|
| Native defaults / omitted | 525 | 500 | 50 |
| PR description example | 512 | 256 | 32 |
| Small | 128 | 64 | 8 |
| Large | 1024 | 1024 | 128 |

The native query default is `ceil(50 × 1024 × 1024 / 100000) = 525`; this rough
size assumption does not enforce a 50 MiB byte budget.

All tables show medians across eight process measurements. Mean/P95 describe
request latency within each process. Retained MiB is forced-GC heap after workload
minus heap after schema creation, including generated code and execution state.
It is not a pure cache byte count or total service memory.

## PostgreSQL confirmation

| Case | Mean ms | P95 ms | CPU ms/request | Retained MiB | New plans |
|---|---:|---:|---:|---:|---:|
| pg-32-defaults | 0.3018 | 0.5324 | 0.2714 | 8.11 | 0 |
| pg-32-example | 0.2979 | 0.4917 | 0.2680 | 8.11 | 0 |
| pg-32-large | 0.2859 | 0.4707 | 0.2651 | 8.11 | 0 |
| pg-600-defaults | 1.2191 | 1.9899 | 1.0960 | 70.99 | 2400 |
| pg-600-example | 1.2832 | 2.0419 | 1.1206 | 41.49 | 2400 |
| pg-600-large | 0.2643 | 0.3660 | 0.2453 | 83.06 | 0 |

For 32 hot documents, all capacities fit and no plans are rebuilt during 2,048
measured requests. Small timing differences on the shared desktop do not establish
a reliable speed advantage.

For 600 cyclic documents, increasing capacity eliminates all 2,400 measured
replans. Median paired mean-latency change is **-78.1%**
(individual pairs -81.2% to -75.2%),
CPU/request changes **-77.4%**, and retained
workload heap changes **+17.0%**. The example arm
changes retained heap **-41.6%**
but still plans every measured request.

This intentionally unfavorable cyclic pattern crosses the cache-capacity limit.
Its 600 operation names cover 32 selection shapes, not 600 business tasks. SQL
returns five small fixture rows, sometimes with a related account. It demonstrates
a mechanism, not a production speedup; larger SQL/network costs can reduce the
relative planning benefit substantially.

## Mixed traffic, unique traffic and multiple schemas

Mixed traffic consists of 90% requests drawn from 32 hot documents and 10% new
documents, with identical input streams across arms and 6,000 measured requests.

| Case | Mean ms | P95 ms | CPU ms/request | Retained MiB | New plans |
|---|---:|---:|---:|---:|---:|
| mixed-omitted | 0.0398 | 0.2310 | 0.0869 | 34.58 | 613 |
| mixed-example | 0.0412 | 0.2328 | 0.0895 | 20.94 | 613 |
| mixed-small | 0.0400 | 0.2305 | 0.0882 | 7.16 | 606 |
| mixed-large | 0.0398 | 0.2303 | 0.0868 | 49.05 | 600 |

The small arm retains **79.3% less workload heap**.
Six hundred cold documents require planning regardless of capacity. Extra hot
plans depend on interactions between document and operation caches. These are
observed planning counts, not separately instrumented LRU hit-rate counters.

For entirely unique traffic, every arm creates 3,000 new plans. The retained
increments are 34.97 MiB
(defaults), 21.34 MiB
(example) and 68.02 MiB
(large). More capacity cannot create reuse.

Eight schemas each repeatedly using 300 documents demonstrate the shrinking risk:

| Case | Mean ms | P95 ms | CPU ms/request | Retained MiB | New plans |
|---|---:|---:|---:|---:|---:|
| multi-omitted | 0.0147 | 0.0197 | 0.0309 | 155.32 | 0 |
| multi-example | 0.0969 | 0.1011 | 0.1624 | 136.01 | 4800 |
| multi-small | 0.1780 | 0.2154 | 0.2742 | 39.99 | 4800 |

The example reduces retained heap by 12.4%
but mean request time becomes **6.6×**
as large. Small reduces heap by 74.3%
but takes **12.1×** as long.
Both replan all 4,800 measured requests. These in-memory ratios are not HTTP
latency forecasts and do not support using the example as a universal default.

## Isolated capacities and plan variants

| Case | Mean ms | P95 ms | CPU ms/request | Retained MiB | New plans |
|---|---:|---:|---:|---:|---:|
| broad-query128 | 0.1803 | 0.2320 | 0.3025 | 67.49 | 2400 |
| broad-query525 | 0.1915 | 0.2457 | 0.3268 | 67.70 | 2400 |
| broad-query1024 | 0.0177 | 0.0203 | 0.0360 | 40.56 | 0 |
| broad-ops64 | 0.1065 | 0.1339 | 0.2032 | 11.21 | 2400 |
| broad-ops500 | 0.1087 | 0.1237 | 0.1951 | 35.32 | 2400 |
| broad-ops1024 | 0.0176 | 0.0227 | 0.0372 | 40.56 | 0 |

The query sweep holds operations at 1024; the operation sweep holds queries at
1024. With 600 cyclic documents, lower capacities replan all 2,400 requests while
1024 fits the working set. Reducing query capacity alone can retain more combined
heap because the operation cache retains plans for older parsed document identities.
A single entry limit is not a monotonic total-memory control.

Six Boolean `@include` conditions produce 64 plan variants of one operation:

| Case | Mean ms | P95 ms | CPU ms/request | Retained MiB | New plans |
|---|---:|---:|---:|---:|---:|
| variants-8 | 0.1140 | 0.1802 | 0.2471 | 2.41 | 2048 |
| variants-50 | 0.1198 | 0.1907 | 0.2549 | 4.11 | 2048 |
| variants-128 | 0.0152 | 0.0203 | 0.0293 | 4.03 | 0 |

The query/operation caches each hold one entry; plan-list lengths are 8/50/64.
Caps 8/50 replan all 2,048 requests, while 128 replans none. This isolates the third
control. Omitted and explicit-default hot controls also both rebuild zero plans;
their means are 0.0132 and
0.0126 ms. This checks native
setting equivalence, not PR-versus-parent import/startup overhead.

## Necessity and practical limits

Keep the option and the existing defaults. If ordinary-query speed is the sole
goal and the working set already fits, deferring this PR is reasonable. For a
memory-constrained deployment or a workload suffering cache eviction, capacity
tuning can be useful. Choose production values from representative traffic:
document/operation counts, plan variants, request reuse/skew, planning CPU,
memory per active schema and P95/P99 latency.

Entry counts do not budget the total number of resident schemas, cap individual
plan size or solve arbitrary-query CPU abuse. The shared desktop had no CPU
affinity or controlled background load; PostgreSQL's server cache was not reset.
There is no production trace, HTTP/auth path, concurrent load or natural-GC pause
distribution. Triple GC and result assertions are outside individual latency
windows; whole-window CPU includes result checks equally across arms. Input
preparation precedes the memory baseline. Small differences remain inconclusive.

[Reproduction commands](../README.md) build only perf-harness and use
`cache:analyze` for both summaries. Source/build checksums in provenance identify
this run. Memory percentages refer to the workload increment, **not total service
memory**.
