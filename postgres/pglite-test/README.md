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
      roles: true,                  // seed standard app roles (default) — see below
      extensions: { vector },       // WASM extensions (e.g. pglite-pgvector)
      extensionSql: [               // run once after ready
        'CREATE EXTENSION IF NOT EXISTS vector;'
      ]
    }
  },
  [seed.pgpm()]                     // default seed adapter
);
```

## Roles

On a server, `pgsql-test` bootstraps the standard app roles at `createdb`. PGlite
has no `createdb` — it boots as a lone superuser — so by default `getConnections()`
creates the same roles for you before seeding: `anonymous`, `authenticated`,
`administrator` (with `BYPASSRLS`), and `authenticated_client`, using the same
attributes as the server bootstrap. That's why `db.setContext({ role: 'authenticated' })`
just works with no manual `CREATE ROLE`. Custom role *names* come from `db.roles`
(a `RoleMapping`), exactly like `pgsql-test`.

### Bring your own roles/users

Want a clean superuser-only instance and full control over your own roles? Opt
out with `pglite: { roles: false }` and create them in `extensionSql` (real
Postgres DDL — the same statements you'd run on a server):

```typescript
await getConnections({
  pglite: {
    roles: false, // skip the built-in bootstrap
    extensionSql: [
      "CREATE ROLE app_reader NOLOGIN;",
      "CREATE ROLE app_writer NOLOGIN;",
      // a login user, if a test needs one (no password needed in-process):
      "CREATE ROLE app_user LOGIN;",
      "GRANT app_writer TO app_user;"
    ]
  }
});
```

## Single-session model

PGlite is one in-process session, so `pg` and `db` share it. That differs from `pgsql-test` (two authenticated connections on a real server):

- Transaction control is **ref-counted** (`SharedTxn`) so the standard two-client `beforeEach`/`afterEach` harness emits exactly one `BEGIN`/`SAVEPOINT`/`ROLLBACK`/`COMMIT` per test. The single-client (`db` only) pattern also works.
- Role-based RLS uses `setContext({ role })` (i.e. `SET LOCAL role`) on the shared session rather than separate authenticated connections. The standard app roles are created for you by default (see [Roles](#roles)); any *extra* role you switch to must be created via `pglite.extensionSql`.
- `publish()` (commit-and-continue) is not supported under the shared-session coordinator.

## Related

- [`@pgpmjs/pglite-adapter`](https://www.npmjs.com/package/@pgpmjs/pglite-adapter) — the in-process PGlite driver that both this package and the pgpm engine ride on.
- [`pgsql-test`](https://www.npmjs.com/package/pgsql-test) — the server-backed original this mirrors.
- [`supabase-test`](https://www.npmjs.com/package/supabase-test) · [`drizzle-orm-test`](https://www.npmjs.com/package/drizzle-orm-test) — sibling `getConnections()` wrappers.
