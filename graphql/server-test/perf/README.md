# graphql-server-test perf benchmarks

This directory is for the new `graphql/server-test` performance benchmark rewrite.

The confirmed implementation details live in [`SPEC.md`](./SPEC.md). This README and `SPEC.md` are the source of truth for the new implementation. Do not infer requirements from older perf code or compatibility scripts.

The earlier exploratory draft is preserved in [`README.bak`](./README.bak) for history only. Do not implement from it unless a section is explicitly promoted into this README or `SPEC.md`.

## Status

Draft / design in progress.

We are confirming the benchmark scope, file layout, and execution model before implementing the Jest perf runner.

## Confirmed decisions

- The new perf benchmark path lives under `graphql/server-test/perf/`.
- This is a fresh rewrite, not a direct move of existing benchmark scripts.
- Jest will be used as the benchmark runner for parameterized, on-demand local runs.
- Benchmark servers will be started through `graphql-server-test`'s `getConnections()` helper.
- The `getConnections()` path should create the test database, start a real `@constructive-io/graphql-server` HTTP server, and provide teardown.
- These benchmarks are local / opt-in and must not run as part of the default `pnpm test` path.
- These benchmarks must not enter CI unless a future CI perf job explicitly opts in.
- The rewritten benchmark suite should include a matrix benchmark path with an internal preflight step.
- Preflight is part of the benchmark implementation, not a separately exposed command; it is only needed for public-routing cases.
- A benchmark run should be selected through config groups/specs that determine which matrix dimensions are exercised in that run.
- Benchmark execution must stay inside the new Jest / `getConnections()` implementation and must not shell out to external benchmark CLIs or shell scripts.

## Benchmark scope

The rewritten perf suite exposes one Jest benchmark entrypoint: the matrix benchmark.

Preflight is not a standalone command. It is an internal implementation step used by public-routing matrix cases to prepare and validate fixture readiness, route profiles, and public host routing before load begins.

The first matrix dimensions are:

- `routingMode`: `private` / `public`
- `cacheMode`: `old` / `new`
- `scaleProfile`: a named `k` / duration / workers tuple
- `workloadProfile`: a named operation mix

For the first version, `k` is a single shared scale value. Its concrete meaning depends on routing mode:

- in `private` routing, `k` means private route/profile count;
- in `public` routing, `k` means public tenant/host/profile count.

For the first version, the default workload profiles are:

- `private`: metadata/read-oriented workload
- `public`: business CRUD-oriented workload

## Config groups

A single benchmark run is selected through a config group. The config group determines which matrix dimensions are exercised.

Initial config groups:

| Config group | Routing modes | Cache modes | Scale | Purpose |
| --- | --- | --- | --- | --- |
| `smoke` | `private` | `new` | very small / short | Fast runner and private-route sanity check |
| `public-smoke` | `public` | `new` | very small / short | Fast public-route sanity check; runs internal public preflight |
| `private-cache-compare` | `private` | `old,new` | about 1 minute | Lightweight old/new cache comparison for private routing |
| `k10-5min` | `private,public` | `old,new` | `k=10`, `duration=5min` | First full local benchmark matrix |

Additional config groups can be added later, but they should not expand the default scope until the first matrix is stable.

## Target details

The target preflight, matrix execution, file layout, fixture/setup strategy, parameter interface, report schema, and completeness contract are defined in [`SPEC.md`](./SPEC.md).

There are no separate implementation phases in this README. The README and spec describe the target behavior for the AI implementation.
