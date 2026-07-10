# pgpm → PGlite (proof of concept)

Proof that the **unmodified** pgpm migrate engine can deploy real migrations into
[**PGlite**](https://github.com/electric-sql/pglite) — ElectricSQL's WASM build of
Postgres ("SQLite for Postgres"): embedded, in-process, **no Postgres server or
service container required**.

```bash
cd poc/pglite
npm ci
npm start   # boots PGlite in-process, runs pgpm deploy -> verify -> revert, asserts
```

This runs in CI via `.github/workflows/pglite-poc.yaml` with no `services:` block —
the whole point: PGlite needs no external database.

## What it does

`run.mjs` boots a PGlite instance, exposes it over a socket with the official
`pg-gateway` shim (`@electric-sql/pglite-socket`), and points the published
`@pgpmjs/core` `PgpmMigrate` engine at it as if it were ordinary Postgres:

```
pgpm (@pgpmjs/core, unmodified)  --node-pg / TCP-->  PGLiteSocketServer  -->  PGlite (WASM)
```

It then asserts a full lifecycle against `module/` (a 4-change pgpm plan that ends
in a `pgvector` column):

- `initialize` — bootstraps the `pgpm_migrate` schema (tables + PL/pgSQL procs)
- `deploy` — `schema → table → index → embedding`
- `verify` — all four verified
- data round-trip — a pgvector nearest-neighbor query returns the seeded row
- `revert` — everything reverted, registry emptied

## Why the code isn't quite drop-in (the findings this PoC pins down)

The engine works against PGlite **today** with two call-site accommodations; a real
`pglite` target would fold these into the engine/driver layer:

1. **Single-connection / transaction affinity.** PGlite serializes everything and,
   while a transaction is open, pins the engine to that one connection. The engine's
   `deploy({useTransaction:true})` opens `BEGIN` on one pooled connection and calls
   `isDeployed()` on a *second* — which can never run on PGlite → deadlock. The PoC
   uses `useTransaction:false`. Proper fix: run all transaction-scoped work on the
   same client. (Also: the socket shim defaults to `maxConnections:1`; we raise it —
   PGlite still serializes, so multiplexing is safe.)

2. **Extensions are provisioned out-of-band.** pgpm's `cleanSql` deliberately strips
   `CREATE EXTENSION` (and `BEGIN/COMMIT`) from migrations — extensions come from the
   environment (the `postgres-plus` image / `pgsql-test`'s `installExtensions()`),
   not migrations. So the PoC creates the extension at PGlite bootstrap, and PGlite
   additionally requires the extension registered in JS at construction
   (`PGlite.create({ extensions: { vector } })`).

Extension availability — not pgpm — is the functional boundary. Bundled/available:
`pg_trgm`, `citext`, `ltree`, `uuid_ossp`, `pgvector`, … Not available (no WASM /
no background workers): `pg_cron`, `pg_partman`, the BM25 search ext; PostGIS is
experimental. A module needing those simply won't deploy to PGlite.

## Notes

Standalone on purpose: this directory is **not** part of the pnpm workspace (its own
`package.json` + `package-lock.json`, run with `npm ci`) so the PoC stays independent
of the monorepo build. It depends on the *published* `@pgpmjs/core`; it could be
repointed at the workspace build to track unreleased engine changes.
