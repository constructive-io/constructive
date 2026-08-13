# Graphile scoped/retirement performance harness

This package measures only the two changes in the preceding stacked PRs:

| Arm | Catalog introspection | Introspection client | Build state |
| --- | --- | --- | --- |
| `stock` | stock | reuse | retained |
| `scoped` | dependency closure | destroy | retained |
| `retire` | stock | reuse | retired |
| `scoped-retire` | dependency closure | destroy | retired |

Every arm/repetition runs in a new Node process with `--expose-gc`. The harness
uses the Graphile default presets directly, so CNC application plugins (including
pg-many-to-many) are not part of the measurement. It verifies a simple query and
requires every successful run to produce the same printed-schema hash.

## Run

Build the package, point it at a disposable PostgreSQL database, and use the
same schema fixture for every arm:

```sh
pnpm --filter @constructive-io/perf-harness build
export CPERF_DATABASE_URL=postgres:///cperf
node packages/perf-harness/dist/index.js prepare \
  --schema cperf_example \
  --tables 64
node packages/perf-harness/dist/index.js run \
  --schemas cperf_example \
  --repetitions 5 \
  --seed 20260813 \
  --output perf-results/scoped-retirement.json
```

`prepare` is intentionally conservative: it only accepts a previously absent
schema whose name starts with `cperf_`; it never drops or replaces a schema.
For an existing representative database, omit `prepare` and pass its exposed
schemas to `run`. Add cross-schema dependencies explicitly with
`--allowed-dependency-schemas`.

By default each repetition gets a deterministic seeded shuffle. To pin an exact
order, pass all four arms once, for example:

```sh
--order stock,scoped,retire,scoped-retire
```

The output JSON contains every raw sample, median summaries, all useful 2×2
pairwise deltas, the complete schedule, process IDs, and validation results.
Memory values are bytes and include both post-build snapshots and the process's
cumulative peak RSS. Database credentials are passed to workers through the
environment and are not written to the result.

This is a focused regression/attribution harness. It is not a production
capacity, concurrency, or tenant-density test.
