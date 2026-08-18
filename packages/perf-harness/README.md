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
