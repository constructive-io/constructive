# Grafast cache capacity benchmark

This suite measures the latency/CPU/retained-memory tradeoffs of Grafast's three
cache capacities. It lives entirely in the private perf-harness workspace package
and uses its existing fresh-process runner, randomized blocked scheduling,
production environment, GC protocol, validation and JSON reporting.

TypeScript sources live in `src/benchmarks/grafast-cache/` and compile with the
existing package build into `dist/benchmarks/grafast-cache/`. The scripts start
those compiled JavaScript workers directly with Node; no runtime TS loader is used.
The TypeScript analyzer reuses the harness statistics and writes both summaries.

Workers configure the public `GraphQLSchema.extensions.grafast` settings directly.
They do not import CNC configuration, graphile-settings, the PR preset, or ts-node.
Each successful worker checks its loaded module paths for those dependencies.
Only this package needs to be built. Grafast 1.1.2, GraphQL 16.13.0 and
PostGraphile 5.1.4 remain pinned to the versions evaluated in PR #1746.

These experiments establish the value of configurable **capacities**. They do
not benchmark PR-versus-parent import overhead or prove application wiring.
The existing `grafast-cache-limits.test.ts` suites in graphile-settings and
graphql-env retain ownership of parsing, validation and preset/hook correctness.
No production defaults or generic harness behavior are changed by this suite.

## Run from the repository root

```sh
pnpm install --frozen-lockfile --filter @constructive-io/perf-harness...
pnpm --filter @constructive-io/perf-harness build
pnpm --filter @constructive-io/perf-harness cache:micro \
  --repetitions 8 --seed 20260921 --output /tmp/cache-micro.json
pnpm --filter @constructive-io/perf-harness cache:variants \
  --repetitions 8 --seed 20260921 --output /tmp/cache-variants.json
```

The micro suite has 20 cases: omitted/explicit defaults on hot traffic, 90% hot /
10% unique mixed traffic, entirely unique traffic, isolated query/operation
capacity sweeps across 600 cyclic documents, and eight schemas with 300 documents
each. `--case hot-omitted` selects one smoke case. The variants suite has three
cases: 64 `@include` combinations of one operation at plan capacities 8/50/128.

Use an existing local PostgreSQL benchmark database and a new `cperf_` schema.
The fixture command refuses to overwrite an existing schema. Set `BENCH_DB_URL`
to that database's connection URL before running:

```sh
pnpm --filter @constructive-io/perf-harness cperf prepare \
  --database-url "$BENCH_DB_URL" --schema cperf_cache1746 --tables 2
psql "$BENCH_DB_URL" -v ON_ERROR_STOP=1 -v schema=cperf_cache1746 \
  -f packages/perf-harness/benchmarks/grafast-cache/seed.sql
pnpm --filter @constructive-io/perf-harness cache:postgres \
  --database-url "$BENCH_DB_URL" --schema cperf_cache1746 \
  --repetitions 8 --seed 20260921 --cycles 4 --output /tmp/cache-postgres.json
```

The six PostgreSQL cases compare defaults, 512/256/32 and 1024/1024/128 capacities
against 32 hot or 600 cyclic documents. Each query returns five fixture rows;
the 600 operation names cover 32 selection shapes, not 600 distinct business tasks.
All result fields are checked. `--case pg-32-defaults` selects one smoke case.
After the run, remove only the isolated fixture schema you created:

```sh
psql "$BENCH_DB_URL" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA cperf_cache1746 CASCADE'
```

Run suites sequentially. Eight repetitions of all 29 cases produce 232 fresh
processes. Each worker separates schema build, first request, warmup and measured
requests. Cache capacities/occupancy and plan counts are asserted against the
pinned Grafast runtime. Read-only internal inspection deliberately fails if its
version-specific contract changes. It does not replace caches or execution.

## Results and interpretation

The [PR #1746 description](https://github.com/constructive-io/constructive/pull/1746)
records the measured revision, environment, key results, limitations and necessity
assessment. Generated reports stay local; they are not committed or required by
tests. Raw reports retain individual process samples,
latency percentiles, CPU, heap, RSS, input hashes, configuration and validation.
Retained memory is forced-GC heap after workload minus heap after schema creation;
it is not total service memory or a pure cache byte count. Compare process samples,
not pooled request counts, and do not infer production speedups from these fixtures.

After a full run, collect all three reports in the ignored local results directory
and generate summaries:

```sh
node --input-type=module - <<'JS'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const out = 'packages/perf-harness/benchmarks/grafast-cache/results';
mkdirSync(out, { recursive: true });
for (const name of ['micro', 'variants', 'postgres']) {
  writeFileSync(`${out}/${name}.json.gz`, gzipSync(readFileSync(`/tmp/cache-${name}.json`)));
}
JS
pnpm --filter @constructive-io/perf-harness cache:analyze
```

`cache:analyze --results-dir /absolute/path/to/results` analyzes another directory
containing the three gzip reports. It validates samples before writing
`summary.json` and `postgres-summary.json`.

Summarize the measured revision, environment, configuration, results and limitations
in the PR description. If raw samples are needed for review, share them separately
(for example as temporary CI artifacts). Smoke runs do not belong in final reports.
Analyzer tests construct deterministic synthetic inputs and hand-calculated expected
statistics; they do not read local benchmark outputs. `pnpm --filter
@constructive-io/perf-harness test --runInBand` builds the package and checks the
standalone workers and actual capacity behavior without timing thresholds.
