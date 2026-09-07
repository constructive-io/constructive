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
The top-level commands require `--database-url`; the runner forwards it and the
opaque case configuration to each short-lived worker as CLI arguments. Database
credentials are redacted from worker failures and JSON reports. This harness is
intended for local development on a trusted machine because command arguments
may be visible to other local processes.

The PostgreSQL fixture command only creates a previously absent schema whose
name starts with `cperf_`; it never drops or replaces schemas.
