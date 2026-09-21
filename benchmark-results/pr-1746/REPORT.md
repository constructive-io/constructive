# PR #1746: measured cache-capacity tradeoffs

## Decision

**Retain this as an optional capacity-tuning feature, with unchanged defaults.
Do not describe it as an automatic performance improvement or an urgent speed
fix.** The measurements establish real tuning value, particularly for retained
memory, but do not establish that a production deployment currently needs it.

If the sole acceptance criterion is “merge this and ordinary requests become
faster,” this PR does not meet it: omitted configuration preserves existing
behavior. If the criterion includes “operators can trade schema-local cache
memory against re-planning under different tenant workloads,” there is material
evidence to keep the capability. There is no evidence here for adopting the PR
description's example values as universal defaults.

The important distinction is between the existing Grafast cache mechanism and
CNC's new configuration bridge. Grafast already bounded these caches before this
PR. The PR exposes and validates capacities; it does not introduce plan caching,
fix an unlimited cache, or improve the SQL execution algorithm.

## Scope and evidence

- PR head: `67f47e488de11fe6a21d2c4327b2ceb3ef780983`.
- Exact parent: `7d28f718c049ae43aa9f04e1f7e1e6b39083ada4`.
- Same frozen lockfile and byte-identical built generic harness runner/metrics
  between parent and head. Grafast 1.1.2, GraphQL 16.13.0, PostGraphile 5.1.4.
- Node v22.22.0, macOS arm64, Apple M3, 16 GiB RAM; PostgreSQL 18.4 in local Docker.
- 30 cases × 8 independent processes = **240 distinct worker PIDs**. All runtime
  output, schema-equivalence, capacity, and planning-count validations passed.
- Existing `@constructive-io/perf-harness` owns process spawning, randomized
  blocked scheduling, production environment, `--expose-gc`, protocol validation
  and reports. Generic harness and production implementation were not modified.
- Feature-owned workers use the actual PR preset/hook. The PostgreSQL suite
  additionally applies that preset through real Graphile schema construction.
- Parent/omitted/explicit-default controls, isolated first/second/third cache
  limits, hot, mixed, one-off churn, broad cyclic and eight-schema cases.
- Existing configuration and cache tests: **2 suites / 25 tests passed**.

Raw reports: [micro](micro.json.gz), [PostgreSQL](postgres.json.gz),
[plan variants](variants.json.gz). [Summary](summary.json) contains per-process
median/min/max. [PostgreSQL paired changes](postgres-summary.json) preserves
within-repetition comparisons. [Provenance](provenance.json) records environment,
source checksums and report checksums. Smoke runs are excluded.

## Configurations

These numbers are entry counts, not megabytes or a process-wide memory budget.
The third limit is **per operation**, not total plans per schema.

| Arm | Query documents | Operations | Plans per operation |
|---|---:|---:|---:|
| Upstream defaults / omitted | 525 | 500 | 50 |
| PR description example | 512 | 256 | 32 |
| Small test arm | 128 | 64 | 8 |
| Large test arm | 1024 | 1024 | 128 |

The pinned upstream query default is `ceil(50 × 1024 × 1024 / 100000) = 525`.
That formula uses a rough size assumption; it does not enforce a 50 MiB byte cap.

## Real PostgreSQL confirmation

Values below are medians of eight process measurements. Latency is the mean of
requests within each process. “Retained increment” means forced-GC heap after
the workload minus forced-GC heap after schema creation; it includes generated
code and retained execution state, not just cache entries or total RSS.

| Workload / arm | Mean request ms | Request P95 ms | CPU ms/request | Retained increment MiB | New plans in measured phase |
|---|---:|---:|---:|---:|---:|
| 32 hot documents / defaults | 0.295 | 0.568 | 0.268 | 8.10 | 0 / 2048 |
| 32 hot / example | 0.312 | 0.536 | 0.278 | 8.10 | 0 / 2048 |
| 32 hot / large | 0.328 | 0.536 | 0.282 | 8.10 | 0 / 2048 |
| 600 cyclic documents / defaults | 1.324 | 2.378 | 1.134 | 71.02 | 2400 / 2400 |
| 600 cyclic / example | 1.392 | 2.355 | 1.145 | 41.47 | 2400 / 2400 |
| 600 cyclic / large | 0.260 | 0.399 | 0.247 | 82.97 | 0 / 2400 |

**Hot workload:** no stable speed benefit or retained-memory benefit. All
capacities already fit. Paired mean-latency changes varied in sign and magnitude;
do not turn these small differences into a regression/improvement claim.

**600 cyclic documents:** the large arm removes repeated planning. Median paired
mean-latency change is **−80.0%** (individual pairs −84.3% to −73.3%); CPU/request
is **−77.9%**, with **+16.9%** retained workload heap. The example arm saves
**41.6%** retained heap (all pairs approximately −41.5% to −41.8%), but shows no
stable speed benefit and still plans every measured request.

This workload deliberately crosses the LRU capacity threshold. Its 600 distinct
operation names cover only 32 selection shapes. It proves the mechanism under
an unfavorable cyclic reuse distance; it is **not evidence of an 80% production
speedup**, nor evidence that CNC currently sees this traffic. SQL returns five
rows from a deterministic small fixture, sometimes with a related account. Real
business queries with greater SQL/network costs can show much smaller relative
benefits.

## Mixed traffic and memory

The in-memory fixture uses 32 hot documents for 90% of requests and disjoint,
never-before-used documents for the remaining 10%. Every arm receives identical
warmup and measured input streams (hashes verified).

| Arm | Mean request ms | CPU ms/request | Retained increment MiB | New plans / 6000 |
|---|---:|---:|---:|---:|
| Defaults | 0.0389 | 0.0825 | 34.57 | 613 |
| Example | 0.0396 | 0.0832 | 20.94 | 613 |
| Small | 0.0384 | 0.0836 | 7.15 | 606 |
| Large | 0.0375 | 0.0808 | 49.04 | 600 |

The small arm retains **79.3% less workload heap**, with similar observed latency
and CPU cost. This is the strongest evidence for an operator-facing memory knob.
The 600 unavoidable cold documents still require planning; extra hot-document
plans depend on interactions between the document and operation caches. These
counts are measured plans, not independently instrumented LRU hit-rate counters.

For 3,000 one-off documents, all arms plan 3,000 times. Retained increments are
34.96 MiB (defaults), 21.33 MiB (example) and 68.02 MiB (large), with no clear
CPU/request improvement. More cache cannot create reuse that does not exist.

## Shrinking can be expensive

Eight in-memory schemas each repeatedly use 300 documents:

| Arm | Mean request ms | CPU ms/request | Process retained increment MiB | New plans / 4800 |
|---|---:|---:|---:|---:|
| Defaults | 0.0152 | 0.0308 | 155.33 | 0 |
| Example | 0.1040 | 0.1674 | 136.02 | 4800 |
| Small | 0.1683 | 0.2627 | 39.98 | 4800 |

The example saves only 12.4% of retained heap here, while average measured request
time becomes about **6.8×** the default. Small saves 74.3% but becomes about
**11.1×** slower in this in-memory fixture. This is a concrete reason not to ship
the example as a new default. Absolute sub-millisecond microbenchmark times must
not be treated as HTTP/SQL latency forecasts.

## Isolated limits and plan variants

- Query-cap sweep, operation cap held at 1024: 600 cyclic documents replan on
  every request at query caps 128/525, and do not replan at 1024. Mean times are
  0.185/0.191/0.018 ms. Reducing only the query cache does not necessarily reduce
  the combined heap much: the operation cache can retain plans for older parsed
  document identities (observed increments 67.49/67.71/40.56 MiB).
- Operation-cap sweep, query cap held at 1024: operation caps 64/500 replan every
  request, while 1024 fits all 600. Mean times are 0.103/0.118/0.018 ms and retained
  increments 11.19/35.31/40.56 MiB.
- One operation with six Boolean `@include` conditions yields 64 plan variants.
  At per-operation caps 8/50, all 2,048 measured requests replan; at 128, none do.
  Mean times are 0.118/0.118/0.015 ms. The cached document and operation counts
  remain exactly one, and plan-list lengths are asserted as 8/50/64. This directly
  verifies the third knob independently of the other two.
- Parent, head omitted and explicit-default hot controls all produce zero
  steady-state new plans, approximately 0.013 ms/request and 3.90 MiB retained
  workload heap. This supports unchanged steady behavior, not a claim about the
  complete server's import/startup overhead.

## Practical necessity

1. **Keep the option, keep defaults unchanged.** The capability can produce
   substantial memory savings or eliminate a capacity cliff when workloads justify
   it. “No universal speedup” does not mean “no capacity value.”
2. **Do not prioritize it as a general latency optimization.** A service whose
   hot working set fits upstream defaults and has adequate memory gets little
   benefit from configuration alone. For that deployment, deferring the PR is
   reasonable.
3. **Do not choose production numbers from these fixtures.** Before changing a
   deployment, collect distinct document/operation counts, plan variants, request
   skew, planning CPU, retained memory per active schema and P95/P99 latency.
   Compare candidates against the omitted-default arm on representative traffic.
4. **Entry limits are not full memory governance.** This PR does not budget total
   resident schemas, cap individual plan size, remove schema build state, or solve
   arbitrary-query CPU abuse. Those require separate mechanisms.

## Reproduction and limitations

Commands and fixture setup:
[micro/variants README](../../graphile/graphile-settings/benchmarks/grafast-cache-micro/README.md)
and [PostgreSQL README](../../graphile/graphile-settings/benchmarks/grafast-cache-postgres/README.md).
Raw JSON is stored as deterministic gzip to keep generated data out of the review diff. After a new run, gzip the three raw reports (or use `gzip -k` to keep the plain files). From the repository root, regenerate summaries with:

```sh
python3 benchmark-results/pr-1746/analyze.py
python3 benchmark-results/pr-1746/analyze-postgres.py
```

Each worker separates schema creation, cold first request, warmup and steady
requests. Triple GC occurs outside timed request windows. Input preparation is
outside baseline memory measurement. Assertions are outside individual request
latency intervals, but included equally in whole-window CPU/wall measurements.
No concurrent benchmark suites were run during final measurements.

The desktop was shared with other apps, had no CPU affinity, and background load
was not controlled. PostgreSQL's server cache was shared and not reset. There is
no production trace, HTTP/auth path, concurrent load, multi-host deployment,
natural-GC pause distribution, or tenant-density limit measurement. Reports
retain CPU, latency percentiles, heap, peak RSS and load metadata; small timing
differences remain inconclusive. The large changes are supported by deterministic
planning-count changes across all repetitions. Memory percentages describe the
workload increment, **not total service memory**.
