# PR #1746: measured cache-capacity tradeoffs

## Decision

**Retain the optional capacity controls with unchanged defaults. Do not describe
this as an automatic speed improvement or an urgent general latency fix.**

Grafast already bounds its caches. PR #1746 exposes and validates their capacities;
it does not introduce caching or optimize SQL. If a deployment's hot working set
fits the defaults and memory is adequate, the feature has little immediate value.
If cache eviction causes repeated planning, or many schemas retain excessive
workload memory, the controls can be valuable. These measurements establish that
tradeoff, not that an existing production deployment needs different limits.

## Independent harness strategy

All benchmark code, fixture seed, analyzers and evidence now live under
`packages/perf-harness/benchmarks/grafast-cache`. Workers use the native public
`GraphQLSchema.extensions.grafast` settings, without application configuration,
the PR preset or ts-node. Every successful worker checks the loaded modules.
The generic harness and PR production implementation are unchanged.

The previous feature-owned workers and root-level result directory have been
removed. These are **fresh measurements**, not relocated historical results.
The parent-checkout case is removed because this experiment measures capacity
choices on one pinned runtime. Omitted and explicit-default hot controls remain.
Application parsing and preset/hook wiring are covered separately by the original
25 correctness tests. This suite does not measure PR-versus-parent startup cost.

- 29 cases × 8 repetitions = **232 distinct fresh worker processes**, run serially.
- Randomized case order within each repetition, seed 20260921, production runtime.
- All output, schema-equivalence, effective-capacity and plan-count checks passed.
- Node v22.22.0, Apple M3, macOS arm64, 16 GiB RAM; PostgreSQL 18.4 in local Docker.
- Grafast 1.1.2, GraphQL 16.13.0, PostGraphile 5.1.4; no resolved version changes.
- Harness build and 70 tests passed; original configuration/plugin 25 tests passed.

Raw reports: [micro](micro.json.gz), [PostgreSQL](postgres.json.gz),
[plan variants](variants.json.gz). [Summary](summary.json) gives per-process
median/min/max; [paired PostgreSQL comparisons](postgres-summary.json) retain
within-repetition differences. [Provenance](provenance.json) records source and
artifact checksums. Smoke/unit-test workers are excluded from these 232 samples.

## Configurations

Capacities count entries, not bytes. The third limit is per operation.

| Arm | Query documents | Operations | Plans per operation |
|---|---:|---:|---:|
| Native defaults / omitted | 525 | 500 | 50 |
| PR description example | 512 | 256 | 32 |
| Small test arm | 128 | 64 | 8 |
| Large test arm | 1024 | 1024 | 128 |

The native query default is `ceil(50 × 1024 × 1024 / 100000) = 525`, using a rough
size assumption; it does not enforce a 50 MiB byte budget.

## PostgreSQL confirmation

All table values are medians of eight process-level measurements. Mean and P95
refer to request latency within each process. Retained increment is forced-GC
heap after the workload minus forced-GC heap after schema creation. It includes
retained generated code and execution state, not just cache bytes or total RSS.

| Case | Mean request ms | P95 ms | CPU ms/request | Retained increment MiB | New plans |
|---|---:|---:|---:|---:|---:|
| pg-32-defaults | 0.2911 | 0.4963 | 0.2621 | 8.11 | 0 |
| pg-32-example | 0.2882 | 0.4887 | 0.2695 | 8.11 | 0 |
| pg-32-large | 0.2956 | 0.5329 | 0.2711 | 8.11 | 0 |
| pg-600-defaults | 1.2251 | 2.0964 | 1.0756 | 71.03 | 2400 |
| pg-600-example | 1.3156 | 2.2216 | 1.0685 | 41.45 | 2400 |
| pg-600-large | 0.2507 | 0.3472 | 0.2344 | 83.01 | 0 |

The 32-document hot workload creates zero plans during all 2,048 measured
requests. All capacities fit; small timing differences on this shared desktop
are not evidence of a reliable speed improvement.

For 600 cyclic documents, the large arm eliminates all 2,400 measured replans.
Its median paired mean-latency change is **-79.3%**
(individual pairs -81.3% to -72.8%),
CPU/request changes **-77.8%**, and retained
workload heap changes **+16.9%**. The example arm
changes retained heap **-41.7%** but still plans
every measured request; it does not resolve the capacity cliff.

This deliberately unfavorable cyclic reuse pattern proves the mechanism, not a
production speedup. Its 600 operation names cover only 32 selection shapes, not
600 distinct business tasks. SQL returns five small fixture rows, sometimes with
a related account. Larger SQL/network costs reduce the relative planning benefit.

## Mixed traffic, churn and schema density

Mixed traffic uses 32 hot documents for 90% of requests and new documents for
10%. Every capacity receives identical warmup and measured streams, verified by
hashes. All cases have 6,000 measured requests.

| Case | Mean request ms | P95 ms | CPU ms/request | Retained increment MiB | New plans |
|---|---:|---:|---:|---:|---:|
| mixed-omitted | 0.0396 | 0.2286 | 0.0838 | 34.58 | 613 |
| mixed-example | 0.0385 | 0.2188 | 0.0845 | 20.95 | 613 |
| mixed-small | 0.0408 | 0.2349 | 0.0897 | 7.16 | 606 |
| mixed-large | 0.0365 | 0.2182 | 0.0808 | 49.05 | 600 |

The small arm retains **79.3%
less workload heap**, with similar observed sub-millisecond latency. Six hundred
cold documents necessarily need planning; extra hot-document plans reflect the
interaction of the two caches. Plan counts are observed executions of the planner,
not independently instrumented LRU hit-rate counters.

Entirely unique traffic offers no reuse: all arms create 3,000 new plans.
Retained increments are 34.97 MiB
(defaults), 21.36 MiB (example) and
68.03 MiB (large). More capacity cannot
make those documents reusable.

Eight schemas each repeatedly using 300 documents show why shrinking is risky:

| Case | Mean request ms | P95 ms | CPU ms/request | Retained increment MiB | New plans |
|---|---:|---:|---:|---:|---:|
| multi-omitted | 0.0152 | 0.0228 | 0.0312 | 155.33 | 0 |
| multi-example | 0.0978 | 0.1055 | 0.1623 | 136.01 | 4800 |
| multi-small | 0.1839 | 0.2254 | 0.2813 | 39.98 | 4800 |

The example reduces retained increment by
12.4% but makes mean
request time about **6.4×**
as large. The small arm reduces it by
74.3% but takes about
**12.1×** as long. Both replan
all 4,800 measured requests. These are in-memory ratios, not HTTP latency forecasts.

## Isolating the three capacities

| Case | Mean request ms | P95 ms | CPU ms/request | Retained increment MiB | New plans |
|---|---:|---:|---:|---:|---:|
| broad-query128 | 0.1903 | 0.2509 | 0.3267 | 67.50 | 2400 |
| broad-query525 | 0.1959 | 0.2605 | 0.3338 | 67.71 | 2400 |
| broad-query1024 | 0.0171 | 0.0192 | 0.0341 | 40.56 | 0 |
| broad-ops64 | 0.1048 | 0.1276 | 0.2018 | 11.20 | 2400 |
| broad-ops500 | 0.1087 | 0.1318 | 0.1956 | 35.31 | 2400 |
| broad-ops1024 | 0.0183 | 0.0229 | 0.0381 | 40.55 | 0 |

The query sweep holds operations at 1024; the operation sweep holds queries at
1024. With 600 cyclic documents, values below 600 replan all 2,400 requests;
1024 fits and eliminates replanning. A smaller query cache alone can retain more
combined heap because the operation cache still retains plans for older parsed
document identities. Adjusting one limit is not a monotonic total-memory control.

One operation with six Boolean `@include` conditions produces 64 plan variants:

| Case | Mean request ms | P95 ms | CPU ms/request | Retained increment MiB | New plans |
|---|---:|---:|---:|---:|---:|
| variants-8 | 0.1184 | 0.1826 | 0.2546 | 2.41 | 2048 |
| variants-50 | 0.1183 | 0.1841 | 0.2537 | 4.10 | 2048 |
| variants-128 | 0.0148 | 0.0197 | 0.0280 | 4.02 | 0 |

The query and operation caches each contain exactly one entry. The plan lists
contain 8/50/64 entries; caps 8/50 replan all 2,048 measured requests and cap 128
replans none. This verifies the third control independently of the other two.

Omitted and explicit-default hot controls both have zero steady-state replans.
Their measured request means are 0.0138
and 0.0134 ms respectively. This checks
native setting equivalence, not the application's import or configuration cost.

## Necessity and limits

1. Keep the option and existing defaults. The data supports workload-specific
   tuning; it does not support shipping 512/256/32 as a universal default.
2. If ordinary-query speed is the sole goal and the working set already fits,
   deferring this PR is reasonable. Configuration alone adds no automatic benefit.
3. Before production tuning, measure document/operation counts, plan variants,
   reuse/skew, planning CPU, memory per active schema and P95/P99 on representative
   traffic. Choose capacities against the omitted-default control.
4. Entry counts do not budget all resident schemas, cap individual plan size or
   solve arbitrary-query CPU abuse.

[Reproduction commands](../README.md) build only perf-harness. The source hashes
in provenance identify this rerun independently of the later enclosing commit.
The workload streams and deterministic planning outcomes match the shared cases
of the previous approach; timing and memory were remeasured after removing its
configuration/tooling imports. That supports the same capacity tradeoff conclusion,
while PR wiring remains a separate correctness question.

The desktop was shared, CPU affinity unset, and background load uncontrolled.
PostgreSQL's server cache was shared and not reset. There is no production trace,
HTTP/auth path, concurrent load or natural-GC pause distribution. Triple GC is
outside request timing; result assertions are outside individual latency windows
but included in whole-window CPU/wall measurements equally across cases. Input
preparation precedes the memory baseline. Small timing differences are inconclusive;
large effects are supported by deterministic planning-count changes. Memory
percentages describe the workload increment, **not total service memory**.
