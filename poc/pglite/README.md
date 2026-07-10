# pgpm → PGlite

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/pglite.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/pglite.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

A standalone, end-to-end demonstration that the **unmodified, published** `@pgpmjs/core` migrate engine can deploy real migrations into [**PGlite**](https://github.com/electric-sql/pglite) — ElectricSQL's WASM build of Postgres ("SQLite for Postgres"): embedded, in-process, with **no Postgres server or service container**.

It proves the wire-protocol path (pgpm ↔ PGlite over a socket). The **in-process driver** path — `@pgpmjs/pglite-adapter` + `pglite-test`, with no socket — is the productized version and is covered by the `unit-tests (pglite …)` job in [`run-tests.yaml`](../../.github/workflows/run-tests.yaml).

## Run

```sh
cd poc/pglite
pnpm install --ignore-workspace
pnpm start   # boots PGlite in-process, runs pgpm deploy → verify → revert, asserts
```

Runs in CI via [`.github/workflows/pglite.yaml`](../../.github/workflows/pglite.yaml) (job `pglite-socket-e2e`) with **no `services:` block** — the whole point: PGlite needs no external database.

## How it works

`run.js` boots a PGlite instance, exposes it over a socket with the official `pg-gateway` shim (`@electric-sql/pglite-socket`), and points the published `@pgpmjs/core` `PgpmMigrate` engine at it as if it were ordinary Postgres:

```
pgpm (@pgpmjs/core, unmodified)  ──node-pg / TCP──▶  PGLiteSocketServer  ──▶  PGlite (WASM)
```

It then asserts a full lifecycle against `module/` (a 4-change pgpm plan ending in a `pgvector` column):

* **initialize** — bootstraps the `pgpm_migrate` schema (tables + PL/pgSQL procs)
* **deploy** — `schema → table → index → embedding`
* **verify** — all four verified
* **data round-trip** — a pgvector nearest-neighbor query returns the seeded row
* **revert** — everything reverted, registry emptied

Assertions exit non-zero on any mismatch, so CI fails loudly on regression.

## The two accommodations this pins down

The engine runs against PGlite **today** with two call-site accommodations; the productized in-process driver folds these into the adapter layer:

1. **Single-connection / transaction affinity.** PGlite serializes everything and, while a transaction is open, pins the engine to that one connection. `deploy({ useTransaction: true })` opens `BEGIN` on one pooled connection and calls `isDeployed()` on a *second* — which can never run on PGlite → deadlock. This demo uses `useTransaction: false`; the in-process adapter avoids it entirely because both seams funnel to PGlite's single session. (The socket shim also defaults to `maxConnections: 1`; we raise it — PGlite still serializes, so multiplexing is safe.)

2. **Extensions are provisioned out-of-band.** pgpm's `cleanSql` deliberately strips `CREATE EXTENSION` (and `BEGIN`/`COMMIT`) from migrations — extensions come from the environment (the `postgres-plus` image / `pgsql-test`'s `installExtensions()`), not migrations. So the demo creates the extension at PGlite bootstrap, and PGlite additionally requires the extension registered in JS at construction (`PGlite.create({ extensions: { vector } })`).

Extension availability — not pgpm — is the functional boundary. Bundled/available: `pg_trgm`, `citext`, `ltree`, `uuid_ossp`, `pgvector`, … Not available (no WASM / no background workers): `pg_cron`, `pg_partman`, the BM25 search ext; PostGIS is experimental. A module needing those simply won't deploy to PGlite.

## Notes

Standalone on purpose: this directory is **not** part of the pnpm workspace. It has its own `package.json` + `pnpm-lock.yaml` and is installed with `pnpm install --ignore-workspace`, so the demo stays independent of the monorepo build and depends on the *published* `@pgpmjs/core` (it could be repointed at the workspace build to track unreleased engine changes).
