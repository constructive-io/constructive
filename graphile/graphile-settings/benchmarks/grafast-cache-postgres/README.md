# PostgreSQL confirmation for PR #1746

This feature-owned suite uses the existing `@constructive-io/perf-harness`
fresh-process runner, randomized schedules, worker protocol and atomic reports.
It adds no new harness or production dependencies. The cache preset is loaded
from this checkout's actual TypeScript source, and Graphile applies its schema
hook during real PostGraphile schema construction.

## Reproduce

From the workspace root with Node 22 and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile --ignore-scripts \
  --filter @constructive-io/perf-harness... --filter graphile-settings...
pnpm --filter @constructive-io/perf-harness build
pnpm --filter @constructive-io/graphql-env... build
```

Use a local, disposable benchmark database. Set `CACHE_BENCH_DATABASE_URL` to its
connection URL. No production database is needed. Choose a new `cperf_` schema:

```sh
pnpm --filter @constructive-io/perf-harness cperf prepare \
  --database-url "$CACHE_BENCH_DATABASE_URL" \
  --schema cperf_cache1746 --tables 2
psql "$CACHE_BENCH_DATABASE_URL" -v ON_ERROR_STOP=1 -f \
  graphile/graphile-settings/benchmarks/grafast-cache-postgres/seed.sql
node graphile/graphile-settings/benchmarks/grafast-cache-postgres/run.cjs \
  --database-url "$CACHE_BENCH_DATABASE_URL" --schema cperf_cache1746 \
  --repetitions 8 --cycles 4 --seed 20260921 --output cache-postgres-report.json
```

The seed file uses `cperf_cache1746`; update that explicit identifier if choosing
a different schema. Preparation refuses an existing schema and never replaces
one. The seed is intentionally single-use. Drop only your own fixture after use.

## Interpretation

- The 32-document workload fits all three configurations. It measures 2,048
  requests per process with the default `--cycles 4`.
- The 600-document workload measures 2,400 requests per process. It cycles a
  seeded permutation, deliberately exceeding default capacity. The 600 distinct
  operation names cover 32 selection shapes: these are distinct documents, not
  600 demonstrated production business operations. This is a capacity stress
  test with an intentionally unfavorable LRU reuse distance.
- Each process first measures schema construction and one cold request, then
  executes two warmup cycles. All arms use the same sequence. Warmup and forced
  GC are outside the measured request window.
- Every request executes real SQL and validates its complete deterministic data
  result. A constant probe field's plan resolver counts actual new plans; the
  suite asserts zero steady-state new plans when the working set fits and one
  per request when this cyclic working set exceeds capacity.
- Per-request latency excludes result assertions. Whole-window wall/CPU include
  the same assertions in every arm. Queries are sequential, without HTTP,
  authentication, contention or simulated network delays. PostgreSQL is shared
  and its buffer cache is not reset. These are not end-to-end production RPS.
- `retainedWorkloadHeapBytes` is post-workload forced-GC heap minus post-schema
  forced-GC heap, including caches, generated runtime code and other retained
  execution state. It is not an exact byte-size measurement of cache entries.
  The generic harness's `memory.afterBuild` remains the post-schema measurement;
  runtime memory is explicitly recorded in metadata.
- Configurations are omitted upstream defaults (525/500/50), the PR description's
  example (512/256/32), and a larger capacity (1024/1024/128). None is a proposed
  universal default. Grafast 1.1.2's real LRU capacities are asserted by pinned,
  read-only inspection; no cache implementation is replaced or patched.

Keep reports from smoke runs separate from final repeated measurements. Compare
medians and per-process ranges, actual planning counts, and retained heap. Small
wall-time differences on a shared desktop are inconclusive.
