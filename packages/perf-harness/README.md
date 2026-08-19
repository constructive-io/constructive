# Graphile performance harness

Reusable infrastructure for measuring Graphile schema builds in fresh Node
processes. The core accepts any list of serializable benchmark cases; it does not
interpret case names or optimization-specific configuration.

Each measurement receives a new PID, starts Node with `--expose-gc`, runs a
deterministic GC sequence, records build time and memory metrics, validates a
runtime query, and reports a schema hash. Cases can opt into schema equivalence
groups and provide their own lifecycle validation through the worker result.

## Extending the harness

Define a suite and provide a dedicated worker entry point:

```ts
const suite = {
  name: 'example',
  cases: [
    {
      name: 'baseline',
      workerConfig: { schemas: ['cperf_example'] },
      expectedSchemaGroup: 'example-schema',
    },
  ],
};

await runBenchmarkSuite(suite, options, workerPath);
```

`workerConfig` must be JSON-serializable. Logic is implemented in the worker
entry rather than serializing functions across process boundaries.

The package includes `stock-worker.js` as a minimal upstream Graphile baseline.
The top-level commands require `--database-url`; the runner forwards it and the
opaque case configuration to each short-lived worker as CLI arguments. Database
credentials are redacted from worker failures and JSON reports. This harness is
intended for local development on a trusted machine because command arguments
may be visible to other local processes.

The PostgreSQL fixture command only creates a previously absent schema whose
name starts with `cperf_`; it never drops or replaces schemas.

## Scoped introspection catalog benchmark

`cperf-scoped-catalog` isolates the upstream stock introspection query from the
opt-in scoped query. It does not load `ConstructivePreset`, build-state
retirement, cache limits, request admission, or other CNC application plugins.

Prepare an explicitly named fixture outside the measured phase, then run both
JIT settings with fresh, interleaved stock/scoped processes:

```sh
node packages/perf-harness/dist/scoped-catalog.js prepare \
  --database-url "$DATABASE_URL" \
  --fixture cperf_scoped_small_20260819 \
  --size small

node packages/perf-harness/dist/scoped-catalog.js run \
  --database-url "$DATABASE_URL" \
  --fixture cperf_scoped_small_20260819 \
  --size small \
  --repetitions 10 \
  --seed 20260819 \
  --output-directory packages/perf-harness/artifacts/cperf_scoped_small_20260819
```

Repeat with unique `medium` and `large` fixture names. Medium and large are
local diagnostics and are not ordinary CI tests. Fixture preparation never
replaces, drops, or reuses existing schemas. Its root GraphQL surface remains fixed while
unrelated tables, indexes, sequences, types, and functions increase catalog
size.

Each run writes generic build and query reports plus a scoped analysis with
p50/p95, paired percent changes, schema/runtime validation, payload and parsed
entity counts, real catalog counts, and SHA-256 hashes of the raw reports. The
query diagnostic is labeled `shared-server-not-reset`: it is not a pristine
PostgreSQL catalog-cache cold start. Synthetic large-catalog results show scale
behavior and should not be described as typical production gains.
