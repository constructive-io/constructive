# Graphile performance harness

Reusable infrastructure for measuring Graphile schema builds in fresh Node
processes. The core accepts any list of serializable benchmark cases; it does not
interpret case names or optimization-specific configuration.

Each measurement receives a new PID, starts Node with `--expose-gc`, runs a
deterministic GC sequence, records build time and memory metrics, validates a
runtime query, and reports a schema hash. Cases can opt into schema equivalence
groups and provide their own lifecycle validation through the worker result.

## Running locally

Build the package, then invoke its local CLI script from the workspace root:

```sh
pnpm --filter @constructive-io/perf-harness build
pnpm --filter @constructive-io/perf-harness cperf prepare \
  --database-url 'postgresql:///benchmark' \
  --schema cperf_example --tables 4
```

Use an existing local benchmark database. The equivalent direct CLI entry is
`node packages/perf-harness/dist/cli.js`; pass `run` with the suite's `--cases`
and `--worker` arguments to execute measurements.

`makage` assembles the package in `dist`, where `index.js` is the CommonJS library
entry, `esm/index.js` is the ESM library entry for bundlers, and `cli.js` is the
`cperf` executable. The package manifest's entry paths are relative to that
artifact directory. The private workspace package uses the local `cperf` script
above. Importing either library entry does not start the CLI.

`pnpm --filter @constructive-io/perf-harness test` rebuilds the package before
running unit tests and smoke tests against the generated library and CLI entries.

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

Each worker has a five-minute wall-clock deadline, including startup, database
access, validation, and cleanup. Set `options.workerTimeoutMs` or pass
`--worker-timeout-ms` to `cperf run` to override it with a positive integer
(maximum 2,147,483,647 ms). The effective deadline is recorded in `report.config`;
it does not change the build-only `buildMs` measurement.

A timed-out worker is killed and must finish closing before the next case starts.
Its failure is recorded even if it already printed a successful result. If its
process and stdio cannot be confirmed closed within another five seconds, the
suite stops scheduling cases and writes a failed report containing the completed
runs. Earlier successful samples may remain in summaries, but the report's
validation fails. The CLI exits nonzero for either kind of failure.

The package includes `stock-worker.js` as a minimal upstream Graphile baseline.
It emits one result after releasing its Graphile service. A measurement or release
failure fails the run; if both fail, the error report retains both diagnostics in
that order.
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
