# Grafast cache capacity mechanism suite

Feature-owned benchmark using the unchanged `@constructive-io/perf-harness`
runner/protocol. Real Grafast 1.1.2 parsing, validation, planning and execution;
no SQL, HTTP, mocked caches, artificial delays or production traffic claims.

Build/install prerequisites are listed in
[`../grafast-cache-postgres/README.md`](../grafast-cache-postgres/README.md).

```sh
node graphile/graphile-settings/benchmarks/grafast-cache-micro/run.cjs \
  --baseline-root /absolute/path/to/pr-parent-checkout \
  --repetitions 8 --seed 20260921 --output cache-micro-report.json
node graphile/graphile-settings/benchmarks/grafast-cache-variants/run.cjs \
  --repetitions 8 --seed 20260921 --output cache-variants-report.json
```

The optional parent checkout is PR #1746's parent
`7d28f718c049ae43aa9f04e1f7e1e6b39083ada4`. Install the same frozen dependencies
there. The parent arm loads its own Grafast/GraphQL packages and builds the same
fixture without the new cache preset. Head arms import the actual PR preset,
applying its schema hook to the fixture. This tests feature omission and the hook,
not the complete CNC server startup or HTTP middleware. TypeScript benchmark
tooling is loaded in both parent and head, outside phase timing. Absolute process
heap includes tooling; compare post-schema workload increments instead.

`--case NAME --repetitions 1` selects a micro smoke case. Keep smoke output separate
from final reports. Each arm in final reports has eight independent processes;
the seeded harness schedule randomizes arm order within each repetition.

## Cases

| Family | Purpose |
|---|---|
| hot | 32 documents; parent, omitted, explicit upstream defaults, PR example, larger capacity. All fit. |
| mixed | 90% uniformly selected from 32 hot documents, 10% never-before-used documents. Warmup 1,000; measured 6,000. |
| churn | 3,000 measured documents, each used once, after 300 disjoint warmup documents. Larger caches cannot create reuse. |
| broad-query | 600 documents in a fixed seeded cyclic permutation. Query cap 128/525/1024 with operations fixed at 1024. |
| broad-ops | Same 600 documents. Operation cap 64/500/1024 with query cap fixed at 1024. |
| multi | Eight separate schemas, each with 300 cyclic documents. Default/example/small caps demonstrate aggregate memory and replan tradeoffs. |
| variants (separate runner) | ONE document with six Boolean `@include` conditions: 64 distinct plan variants. Plans-per-operation cap 8/50/128; query/operation caps unchanged. |

In the micro suite documents differ by operation name, with identical selections;
they measure document diversity, not different business semantics. Variables carry
changing values and every output field is verified. The PG suite adds varying
selection sets. Cyclic working sets intentionally expose an LRU capacity cliff;
they are not forecasts of typical production hit rates. The mixed and one-off
families provide counterexamples to a universal speedup claim.

The constant probe's plan resolver counts actual new plans. Read-only pinned
cache inspection verifies capacities and occupancy. The variants suite checks
the internal plan-list length, single cached document/operation, exact result
shape for every Boolean combination, and measured replans. A dependency change
that violates these assumptions fails the run rather than silently changing the
benchmark. No private cache is modified.

Cold first requests, schema construction, warmup and steady measurements are
separate. Triple GC runs before baseline, after schema, after warmup and after
the measured phase, never within request timing. Runtime heap increment includes
retained generated code and execution state, not just cache entries. Generic
`memory.afterBuild` remains the post-schema value; runtime metrics are metadata.
CPU/window wall include result assertions; individual request latencies exclude
them. There are no timing pass/fail thresholds.

For reuse, retain raw reports and exact source/dependency revisions. Small timing
differences on a shared desktop are inconclusive. Entry count caps are not global
process memory budgets, and per-schema measurements should not be linearly
extrapolated into production tenant capacity without representative workloads.
