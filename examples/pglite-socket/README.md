# pgpm → PGlite

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

An end-to-end demonstration that the **unmodified** `@pgpmjs/core` migrate engine can deploy real migrations into [**PGlite**](https://github.com/electric-sql/pglite) — ElectricSQL's WASM build of Postgres ("SQLite for Postgres"): embedded, in-process, with **no Postgres server or service container**.

It proves the wire-protocol path (pgpm ↔ PGlite over a socket). The **in-process driver** path — `@pgpmjs/pglite-adapter` + `pglite-test`, with no socket — is the productized version. Both run in the same no-services `unit-tests (pglite …)` job in [`run-tests.yaml`](../../.github/workflows/run-tests.yaml).

## Run

```sh
cd examples/pglite-socket
pnpm test   # jest: boots PGlite, runs pgpm deploy → verify → data → revert, asserts
```

It's a normal workspace package, so `pnpm install` / `pnpm build` at the repo root wires it up. The test needs **no Postgres service** — PGlite runs in-process.

## How it works

The jest test boots a PGlite instance, exposes it over a socket with the official `pg-gateway` shim (`@electric-sql/pglite-socket`), and points the `@pgpmjs/core` `PgpmMigrate` engine at it as if it were ordinary Postgres:

```
pgpm (@pgpmjs/core, unmodified)  ──node-pg / TCP──▶  PGLiteSocketServer  ──▶  PGlite (WASM)
```

It then asserts a full lifecycle against `__fixtures__/` (a 4-change pgpm plan ending in a `pgvector` column):

* **initialize** — bootstraps the `pgpm_migrate` schema (tables + PL/pgSQL procs)
* **deploy** — `schema → table → index → embedding`
* **verify** — all four verified
* **data round-trip** — a pgvector nearest-neighbor query returns the seeded row
* **revert** — everything reverted, registry emptied

## The two accommodations this pins down

The engine runs against PGlite **today** with two call-site accommodations; the productized in-process driver folds these into the adapter layer:

1. **Single-connection / transaction affinity.** PGlite serializes everything and, while a transaction is open, pins the engine to that one connection. `deploy({ useTransaction: true })` opens `BEGIN` on one pooled connection and calls `isDeployed()` on a *second* — which can never run on PGlite → deadlock. This demo uses `useTransaction: false`; the in-process adapter avoids it entirely because both seams funnel to PGlite's single session. (The socket shim also defaults to `maxConnections: 1`; we raise it — PGlite still serializes, so multiplexing is safe.)

2. **Extensions are provisioned out-of-band.** pgpm's `cleanSql` deliberately strips `CREATE EXTENSION` (and `BEGIN`/`COMMIT`) from migrations — extensions come from the environment (the `postgres-plus` image / `pgsql-test`'s `installExtensions()`), not migrations. So the demo creates the extension at PGlite bootstrap, and PGlite additionally requires the extension registered in JS at construction (`PGlite.create({ extensions: { vector } })`).

Extension availability — not pgpm — is the functional boundary. Bundled/available: `pg_trgm`, `citext`, `ltree`, `uuid_ossp`, `pgvector`, … Not available (no WASM / no background workers): `pg_cron`, `pg_partman`, the BM25 search ext; PostGIS is experimental. A module needing those simply won't deploy to PGlite.

## See also

* [`@pgpmjs/pglite-adapter`](../../postgres/pglite-adapter) — the productized in-process driver (no socket): registers a PGlite instance as the `pg-cache` pool factory.
* [`pglite-test`](../../postgres/pglite-test) — a drop-in `getConnections()` on in-process PGlite for writing tests.
