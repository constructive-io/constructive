# pglite-test

A drop-in [`pgsql-test`](../pgsql-test) `getConnections()` backed by an in-process
[**PGlite**](https://github.com/electric-sql/pglite) instance (WASM Postgres) —
**no Postgres server, no `createdb`, no `psql`, no TCP.**

It follows the same pattern as `drizzle-orm-test` / `supabase-test`: compose the
existing seams instead of forking the base.

- [`@pgpmjs/pglite-adapter`](../pglite-adapter)'s `registerPglite()` routes
  `pg-cache`'s `getPgPool()` at PGlite, so `seed.pgpm()` deploys your module into
  it with the unmodified pgpm engine.
- `pgsql-client`'s client-factory seam routes `PgTestClient`'s underlying
  `pg.Client` at the same PGlite session.

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

Jest must run with `NODE_OPTIONS=--experimental-vm-modules` (PGlite loads a WASM
module); the package's `test` script sets this.

## Single-session model

PGlite is one in-process session, so `pg` and `db` share it. That differs from
`pgsql-test` (two authenticated connections on a real server):

- Transaction control is **ref-counted** (`SharedTxn`) so the standard
  two-client `beforeEach`/`afterEach` harness emits exactly one
  `BEGIN`/`SAVEPOINT`/`ROLLBACK`/`COMMIT` per test. The single-client (`db` only)
  pattern also works.
- Role-based RLS uses `setContext({ role })` (i.e. `SET LOCAL role`) on the shared
  session rather than separate authenticated connections. Any role you switch to
  must exist — create it via `pglite.extensionSql` (e.g.
  `['CREATE ROLE authenticated;']`).
- `publish()` (commit-and-continue) is not supported under the shared-session
  coordinator.

## Options

```typescript
await getConnections(
  {
    pglite: {
      dataDir: undefined,          // in-memory by default
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
