# Default scoped introspection comparison

Schema-scoped introspection reduces catalog work for a small API within a large database. This experiment compares stock with the copied CNC plugin enabled by `gather.pgScopedIntrospection.main: true` on the main-based implementation.

This is a historical run captured on 2026-09-10. Its measurements describe that implementation and environment, not the current runner build.

## Method

- The target schema stays fixed at 9 tables and 8 functions. Each unrelated schema adds 21 tables and 20 functions.
- Each scale discards one stock/scoped warm-up pair, then measures seven fresh Node processes per case, interleaved with seed `20260910`. Database caches are warm.
- Both cases use the upstream `makePgService` and its default session settings. No `catalogTypes` override or scoped-only GUC is applied.
- `buildMs` measures `makeSchema` only; module loading, process startup, runtime verification, and service release are outside that interval.
- Every sample must pass actual table, relation, and function queries and schema hash equivalence. Retained heap is measured after validation and forced GC; peak RSS is read at that point, before service release.
- This is a shared host with background load and a synthetic fixture. Medians and ranges describe these samples and do not establish a production speedup.

Environment: Linux x64 on an Intel Xeon Gold 6152 at 2.10 GHz, Node v24.20.0, PostgreSQL 18.6, 3 logical CPUs, and 3.82 GiB RAM. The initial 1/5/15-minute load averages were 6.24/5.67/5.14. The run used `jit=on`, `jit_above_cost=100000`, `jit_inline_above_cost=500000`, `jit_optimize_above_cost=-1`, `max_parallel_workers_per_gather=2`, `statement_timeout=0`, and `work_mem=4096 kB`. The captured Constructive main base was `e008e936`; the copied query source was Crystal #2 commit `441cef73b0a12ed24343b7f38241af28b6454280`. Historical [environment metadata](https://github.com/constructive-io/constructive/blob/66c6bf8b7892a0a19169ddf9ae36b157707abef5/packages/perf-harness/benchmarks/scoped-introspection-environment.json) records the compiled-code hashes and per-scale load averages.

## Results

| Unrelated schemas / tables | Stock build | Scoped build | Build change | Stock / scoped retained heap | Stock / scoped peak RSS |
|---|---:|---:|---:|---:|---:|
| 0 / 0 | 1.204 s | 4.199 s | +248.8% | 26.4 / 26.5 MiB | 118.9 / 119.0 MiB |
| 10 / 210 | 2.395 s | 4.023 s | +68.0% | 41.8 / 26.5 MiB | 186.3 / 119.2 MiB |
| 50 / 1050 | 6.630 s | 4.267 s | -35.6% | 103.2 / 26.5 MiB | 313.6 / 120.0 MiB |

All 42 measured samples passed validation and used distinct PIDs. The original [sample CSV](https://github.com/constructive-io/constructive/blob/66c6bf8b7892a0a19169ddf9ae36b157707abef5/packages/perf-harness/benchmarks/scoped-introspection-samples.csv) remains available at the commit that recorded this run.

| Unrelated schemas | Stock build range | Scoped build range |
|---|---:|---:|
| 0 | 1.117–1.323 s | 3.745–4.496 s |
| 10 | 2.207–2.630 s | 3.940–4.746 s |
| 50 | 6.383–7.758 s | 4.127–4.675 s |

The default scoped query is slower in the two smaller catalogs and faster in the largest catalog. It is therefore an opt-in with workload-dependent benefits. This comparison contains no historical implementation and does not quantify a change relative to the previous PR.

## SQL diagnostics

After measurement, the script runs one `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` per query through the same default adaptor. These diagnostic timings are not included in the build medians.

- stock: SQL execution 3.339 s; no JIT reported.
- scoped: SQL execution 3.102 s; JIT 815 functions, 2.812 s total.

The adaptor sets `jit_optimize_above_cost = -1` for both cases. Scoped SQL still triggers JIT, providing an observable source of fixed overhead; this single diagnostic does not isolate every contributor to build time.

## Reproduce

Use the repository development instructions to load a test-admin PostgreSQL connection through the standard `PG*` environment. The runner creates a temporary database through `pgsql-test` and cleans it up.

```sh
pnpm install --frozen-lockfile
pnpm -r --filter '@constructive-io/perf-harness...' run build
pnpm --filter @constructive-io/perf-harness scoped:introspection
```

By default, outputs are written under `packages/perf-harness/benchmarks/scoped-introspection/results/`; append `--output /tmp/cnc-scoped-results` to the runner command to choose another directory. The output contains `environment.json`, `warmup-{0,10,50}.json`, `report-{0,10,50}.json`, and `plans-default.json` SQL diagnostics. The default results directory is ignored by Git.

The copied query comes from [Crystal #2](https://github.com/constructive-io/crystal/pull/2), commit `441cef73b0a12ed24343b7f38241af28b6454280`. The original result artifacts are linked above for historical reference; the current runner reproduces the methodology, not the 2026-09-10 measurements.
