# pglite-test

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
  <a href="https://www.npmjs.com/package/pglite-test">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpglite-test%2Fpackage.json"/>
  </a>
</p>

`pglite-test` is a [**PGlite**](https://github.com/electric-sql/pglite)-optimized version of [`pgsql-test`](https://www.npmjs.com/package/pgsql-test) that runs entirely **in-process** — no Postgres server, no `createdb`, no `psql`, no TCP. It provides instant, isolated PostgreSQL databases for testing with automatic transaction rollbacks, context switching, and clean seeding, all backed by ElectricSQL's WASM build of Postgres. It's ideal for local-first development and especially great for GitHub Actions and CI/CD — **no service container required**.

Like [`supabase-test`](https://www.npmjs.com/package/supabase-test) and [`drizzle-orm-test`](https://www.npmjs.com/package/drizzle-orm-test), it's a thin `getConnections()` wrapper that composes the existing `pg-cache` / `pgsql-client` seams, so your tests read exactly like `pgsql-test`.

## Install

```sh
npm install pglite-test
```

You also install PGlite yourself (it's a peer dependency, so you pin the version):

```sh
npm install @electric-sql/pglite
```

## Features

* 🚀 **Zero infrastructure** — pure WASM, no Postgres server, no Docker, no service container in CI
* ⚡ **Instant test DBs** — spin up an isolated in-process instance per suite
* 🔄 **Per-test rollback** — every test runs in its own transaction/savepoint (ref-counted for the single session)
* 🛡️ **RLS-friendly** — role-based auth via `.setContext()` (full GUC support)
* 🌱 **pgpm-native seeding** — deploy your real modules with the unmodified pgpm engine via `seed.pgpm()`
* 🧠 **pgvector & friends** — register WASM extensions (`vector`, `pg_trgm`, …) at construction
* 🧪 **Compatible with any async runner** — works with `Jest`, `Mocha`, etc.
* 🧹 **Auto teardown** — no residue, no reboots, just clean exits

## How it works

- [`@pgpmjs/pglite-adapter`](https://www.npmjs.com/package/@pgpmjs/pglite-adapter)'s `registerPglite()` routes `pg-cache`'s `getPgPool()` at an in-process PGlite instance, so `seed.pgpm()` deploys your module into it with the **unmodified pgpm engine**.
- `pgsql-client`'s client-factory seam routes `PgTestClient`'s underlying `pg.Client` at the same PGlite session.

## Usage

```typescript
import { getConnections, PgTestClient } from 'pglite-test';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await pg.beforeEach();
  await db.beforeEach();
});

afterEach(async () => {
  await db.afterEach();
  await pg.afterEach();
});

it('queries the pgpm-deployed schema', async () => {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM app.users');
  expect(rows[0].n).toBe(0);
});
```

Jest must run with `NODE_OPTIONS=--experimental-vm-modules` (PGlite loads a WASM module); the package's `test` script sets this.

## Options

```typescript
import { vector } from '@electric-sql/pglite-pgvector';

await getConnections(
  {
    pglite: {
      dataDir: undefined,           // in-memory by default
      extensions: { vector },       // WASM extensions (e.g. pglite-pgvector)
      extensionSql: [               // run once after ready
        'CREATE EXTENSION IF NOT EXISTS vector;',
        'CREATE ROLE authenticated;'
      ]
    }
  },
  [seed.pgpm()]                     // default seed adapter
);
```

## Single-session model

PGlite is one in-process session, so `pg` and `db` share it. That differs from `pgsql-test` (two authenticated connections on a real server):

- Transaction control is **ref-counted** (`SharedTxn`) so the standard two-client `beforeEach`/`afterEach` harness emits exactly one `BEGIN`/`SAVEPOINT`/`ROLLBACK`/`COMMIT` per test. The single-client (`db` only) pattern also works.
- Role-based RLS uses `setContext({ role })` (i.e. `SET LOCAL role`) on the shared session rather than separate authenticated connections. Any role you switch to must exist — create it via `pglite.extensionSql` (e.g. `['CREATE ROLE authenticated;']`).
- `publish()` (commit-and-continue) is not supported under the shared-session coordinator.

## Related

- [`@pgpmjs/pglite-adapter`](https://www.npmjs.com/package/@pgpmjs/pglite-adapter) — the in-process PGlite driver that both this package and the pgpm engine ride on.
- [`pgsql-test`](https://www.npmjs.com/package/pgsql-test) — the server-backed original this mirrors.
- [`supabase-test`](https://www.npmjs.com/package/supabase-test) · [`drizzle-orm-test`](https://www.npmjs.com/package/drizzle-orm-test) — sibling `getConnections()` wrappers.
