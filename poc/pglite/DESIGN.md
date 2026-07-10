# PGlite as a pluggable driver — design proposal

Goal: support PGlite across pgpm + the test frameworks **without putting any
`@electric-sql/pglite*` dependency into `@pgpmjs/core`** (or `pg-cache` /
`pgsql-client`). PGlite should be a **plugin**, mirroring how `drizzle-orm-test`
and `supabase-test` already extend the stack without forking it.

## TL;DR recommendation

Introduce a tiny **driver seam** at the one place everything funnels through —
the connection factory — and ship the PGlite implementation as a **separate
package** that owns all the PGlite deps:

- **`pg-cache`** gains a driver registry: `registerPgDriver(factory)`. Default
  driver = today's `new pg.Pool(...)`. Core keeps depending only on `pg`.
- **`@pgpmjs/pglite-adapter`** (new, standalone) implements a driver that backs
  the pool/client interface with an **in-process PGlite instance** (no socket, no
  TCP). This is the *only* package that imports `@electric-sql/pglite*`.
- **`pglite-test`** (new) is a drop-in `getConnections()` wrapper — exactly like
  `drizzle-orm-test` — that swaps the create-database-per-test model for a
  fresh-PGlite-instance-per-test model.
- One small **correctness fix** in `@pgpmjs/core` (transaction-scoped reads must
  use the transaction client) makes single-connection backends work; it's a no-op
  for real `pg`.

Nothing PGlite-specific lands in core. The PoC in this folder already proves the
engine works against PGlite; this is how to productionize it cleanly.

## The precedent already in the repo

The stack already has two "alternative backend/behavior" packages that plug in
without touching the base:

- **`SeedAdapter`** (`postgres/pgsql-test/src/seed/types.ts`) — a one-method
  interface `{ seed(ctx): Promise<void> }`, composed and injected into
  `getConnections(cn, seedAdapters)`. `seed.pgpm()`, `seed.sqlfile()`, `seed.fn()`.
- **`drizzle-orm-test` / `supabase-test`** — thin packages that re-export a
  `getConnections()` that calls `pgsql-test`'s and then adapts the result
  (e.g. `proxyClientQuery(db)` monkey-patches `db.client.query`). They add a whole
  ORM integration **without forking pgsql-test**.

PGlite should follow the same shape: a driver interface in the low-level packages,
an adapter package that implements it, and a `*-test` wrapper for the test layer.

## Where the stack hard-codes `pg` (the seams)

1. **`pg-cache` — the connection factory (the key seam).**
   `getPgPool(config)` does `new pg.Pool({ connectionString, ...poolConfig })`,
   cached by database name (`postgres/pg-cache/src/pg.ts:41`). *Everything*
   upstream gets its pool here.

2. **`@pgpmjs/core` `PgpmMigrate`** (`pgpm/core/src/migrate/client.ts`).
   `import { Pool } from 'pg'`, `this.pool = getPgPool(config)`; all work routes
   through `this.pool.query(...)` and `withTransaction(pool, ...)` which calls
   `pool.connect()` (`migrate/utils/transaction.ts`). The engine only ever needs
   `pool.query()` and `pool.connect() → { query, release }`.

3. **`pgsql-client`** — `PgClient` does `new Client({...})` from `pg`
   (`src/client.ts:24`); `DbAdmin` shells out to `createdb` / `dropdb` / `psql`
   via `execSync` and installs extensions with
   `psql -c 'CREATE EXTENSION ...'` (`src/admin.ts`). This subprocess layer is the
   part with no PGlite equivalent.

4. **`pgsql-test`** — `getConnections()` (`src/connect.ts`) orchestrates
   create-role → createdb/template → `installExtensions` → seed adapters →
   per-test transaction rollback. This is the drop-in seam the `*-test` packages
   wrap.

## Proposed design

### 1. A minimal driver interface (lives in `pg-cache`, deps: only `pg` types)

Core needs a tiny slice of the `pg.Pool` surface. Define it and a registry:

```ts
// pg-cache/src/driver.ts  (no pglite import anywhere here)
export interface QueryablePool {
  query(text: string, values?: any[]): Promise<QueryResult>;
  connect(): Promise<QueryableClient>;   // dedicated connection for a txn
  end(): Promise<void>;
}
export interface QueryableClient {
  query(text: string, values?: any[]): Promise<QueryResult>;
  release(): void;
}
export type PgDriver = (config: PgConfig & { pool?: PgPoolConfig }) => QueryablePool;

let activeDriver: PgDriver | undefined;               // default = pg
export const registerPgDriver = (d: PgDriver | undefined) => { activeDriver = d; };
```

`getPgPool` picks the driver instead of hard-constructing a `pg.Pool`:

```ts
export const getPgPool = (cfg) => {
  if (pgCache.has(key)) return pgCache.get(key);
  const pool = (activeDriver ?? defaultPgDriver)(cfg);   // defaultPgDriver = new pg.Pool
  pgCache.set(key, pool);
  return pool;
};
```

`pg.Pool` already satisfies `QueryablePool`, so the default path is unchanged and
`@pgpmjs/core` still only imports `pg`.

### 2. `@pgpmjs/pglite-adapter` (new, standalone — owns ALL pglite deps)

Implements a `PgDriver` backed by an in-process PGlite instance using PGlite's own
JS API (`db.query`, `db.transaction`) — **no `pglite-socket`, no TCP**:

```ts
import { PGlite } from '@electric-sql/pglite';
export function pgliteDriver(opts?: { dataDir?; extensions? }): { register(): void } {
  const db = new PGlite({ dataDir: opts?.dataDir, extensions: opts?.extensions });
  const pool: QueryablePool = {
    query: (t, v) => db.query(t, v),
    connect: async () => {
      // a "client" that pins to a single PGlite transaction (see fix #4)
      return makeTxBoundClient(db);
    },
    end: () => db.close(),
  };
  return { register: () => registerPgDriver(() => pool) };
}
```

This package is the *only* one that lists `@electric-sql/pglite` (and optional
extension packages like `@electric-sql/pglite-pgvector`) in its `dependencies`.

### 3. `pglite-test` (new — the `getConnections` wrapper, like drizzle-orm-test)

PGlite has no `createdb`/templates and one superuser, so the test model changes
from *database-per-test* to *instance-per-test* (fresh in-memory PGlite is fast):

```ts
export async function getConnections(cn?, seedAdapters?) {
  const { register } = pgliteDriver({ extensions: cn?.extensions });
  register();                        // route pg-cache through PGlite
  // reuse pgsql-test seeding/rollback, but skip createdb/role/template steps
  //   (superuser-only, single db) via a PGlite-aware admin
  ...
}
```

Extensions are provisioned out-of-band here (pgpm's `cleanSql` strips
`CREATE EXTENSION` from migrations by design), mirroring
`DbAdmin.installExtensions()` — the adapter runs `CREATE EXTENSION` at instance
bootstrap and registers the WASM ext in JS at construction.

### 4. One correctness fix in `@pgpmjs/core` (benign for pg, required for PGlite)

Today the deploy/revert loop opens a transaction on one pooled connection but calls
`isDeployed()` on `this.pool.query` — a *different* connection. On a
single-connection backend that second query can't run concurrently with the open
transaction. Fix: thread the transaction's client through so all in-transaction
reads use `context.client` (fall back to the pool only when not in a transaction).
This is invisible to `pg` (pool has many connections) and unblocks any
single-connection driver. It also removes the PoC's `useTransaction:false`
workaround.

## What stays out of scope

- RLS multi-role connections, GraphQL/PostGraphile, LISTEN/NOTIFY cache
  invalidation, Knative jobs — none are pgpm concerns.
- Extension availability is a **per-module** matter, not pgpm's: pgvector / pg_trgm
  / citext / ltree / uuid_ossp are available; pg_cron / pg_partman / BM25 are not
  (no WASM / no background workers), PostGIS experimental.

## Suggested rollout

1. **`pg-cache` driver seam + registry** (default = pg; zero behavior change). Land + prove green.
2. **Core transaction-client fix** (drop `useTransaction:false` from the PoC).
3. **`@pgpmjs/pglite-adapter`** (in-process driver, all pglite deps here).
4. **`pglite-test`** drop-in `getConnections` (instance-per-test) + a PGlite-aware admin.
5. Convert this PoC's CI job to use `pglite-test` instead of the socket shim.

Each step is independently shippable and testable; only step 1–2 touch core, and
neither adds a PGlite dependency to it.
