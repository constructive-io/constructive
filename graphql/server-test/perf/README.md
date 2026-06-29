# graphql-server-test perf benchmarks

This directory is for the new `graphql/server-test` performance benchmark rewrite.

The confirmed implementation details live in [`SPEC.md`](./SPEC.md). This README and `SPEC.md` are the source of truth for the new implementation. Do not infer requirements from older perf code or compatibility scripts.

The earlier exploratory draft is preserved in [`README.bak`](./README.bak) for history only. Do not implement from it unless a section is explicitly promoted into this README or `SPEC.md`.

## Status

Design confirmed; implementation target ready.

The `constructive-local` DBPM strategy has been validated by an exploratory implementation. That code is preserved on the reference branch `perf/constructive-local-dbpm-reference` for implementation reference only. Future work should implement from this README and `SPEC.md`; the reference branch is not a source of additional requirements.

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
- The benchmark baseline seed is the `constructive-local` pgpm service from the companion `constructive-db` checkout.
- `constructive-local` must be resolved from the local repository layout or `PERF_CONSTRUCTIVE_LOCAL_PATH`; implementation must not hard-code a developer-specific absolute path.
- Public-route preflight uses a private GraphQL DBPM surface against the same test database to provision public tenants, hosts, and benchmark-owned business tables.
- Public measured load must go through real public host routing after preflight succeeds.

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
- `public`: DBPM-backed business-table workload

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

## Constructive-local DBPM strategy

The perf suite uses `constructive-local` as the shared local baseline for both private and public benchmark cases.

`getConnections()` must create the temporary test database, install `constructive-local`, start a real `@constructive-io/graphql-server` HTTP server, and provide teardown. The implementation may discover the companion `constructive-db/services/constructive-local` path by walking local ancestor/sibling repository directories, and it must allow an explicit `PERF_CONSTRUCTIVE_LOCAL_PATH` override for non-standard checkouts.

For public-routing cases, preflight prepares the public profiles through GraphQL:

- start with the public benchmark context from `getConnections()`;
- use a private admin GraphQL surface connected to the same test database;
- provision DBPM tenants/databases through private GraphQL;
- inspect generated services metadata through GraphQL;
- create benchmark-owned public business tables through GraphQL;
- introspect the generated public host schema;
- generate request profiles from the actual public host/table metadata;
- probe those profiles through public host routing before measured load begins.

This private-then-public flow is part of public preflight. It is not a separate user-facing command and must not shell out to legacy DBPM or perf scripts.

## Validation evidence

The exploratory implementation validated these behaviors on June 29, 2026:

- default Jest discovery did not include `perf/e2e-matrix.perf.ts`;
- perf unit tests passed;
- private smoke passed through the `constructive-local` private metadata routes;
- public smoke provisioned one DBPM public profile and completed measured load;
- public/new `k10-5min` provisioned 10 DBPM tenants, 10 public hosts, and 10 benchmark-owned business tables, then completed a 5 minute measured load with zero failed requests.

These results are evidence for the selected design, not fixed performance thresholds. QPS and latency are observations unless `SPEC.md` adds explicit threshold behavior later.

## Current public workload floor

The first implementation must prove public host routing against benchmark-owned DBPM business tables. The minimum accepted public operation mix is list/read traffic against the provisioned benchmark table plus lightweight route sanity operations.

Full create/update/delete mutation traffic can be added once the public GraphQL mutation shape is treated as stable for the benchmark. Until then, the `business-crud` workload name should be understood as the public business-table workload, not a promise that every CRUD mutation is exercised.

## Target details

The target preflight, matrix execution, file layout, fixture/setup strategy, parameter interface, report schema, and completeness contract are defined in [`SPEC.md`](./SPEC.md).

There are no separate implementation phases in this README. The README and spec describe the target behavior for the AI implementation.
