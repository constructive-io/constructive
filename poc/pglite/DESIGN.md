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

### 4. One correctness fix in `@pgpmjs/core` — NOT needed for the in-process adapter

The deploy/revert loop opens a transaction on one pooled connection but calls
`isDeployed()` on `this.pool.query` — a *different* connection. Over the **socket**
shim (multiple TCP sessions against a single-connection backend) that second query
can't run while the transaction is open → the PoC's `useTransaction:false`
workaround.

**Empirically, the in-process `@pgpmjs/pglite-adapter` does NOT hit this.** PGlite
is one in-process session, and the adapter funnels both `pool.query` and the
`connect()` client to that same session, so `BEGIN` + `isDeployed()` + `COMMIT`
all share one session — no cross-connection deadlock. The adapter's tests run with
the default `useTransaction: true` and pass. The core fix (thread `context.client`
through in-transaction reads) remains a nice-to-have for any *multi-connection*
single-writer backend, but is not required for this rollout.

## What stays out of scope

- RLS multi-role connections, GraphQL/PostGraphile, LISTEN/NOTIFY cache
  invalidation, Knative jobs — none are pgpm concerns.
- Extension availability is a **per-module** matter, not pgpm's: pgvector / pg_trgm
  / citext / ltree / uuid_ossp are available; pg_cron / pg_partman / BM25 are not
  (no WASM / no background workers), PostGIS experimental.

## Suggested rollout

1. **`pg-cache` driver seam + registry** (default = pg; zero behavior change). ✅ **DONE** — `registerPgPoolFactory` / `defaultPgPoolFactory`, 19 unit tests, CI green.
2. **`@pgpmjs/pglite-adapter`** (in-process driver, all pglite deps here). ✅ **DONE** — `registerPglite()` registers a PGlite-backed `QueryablePool`; 6 tests deploy→verify→revert an unmodified pgpm plan into in-process PGlite (no socket), with `useTransaction: true`.
2b. **`pgsql-client` client-factory seam** (default = `new pg.Client`; zero behavior change). ✅ **DONE** — `registerPgClientFactory` / `defaultPgClientFactory` / `getActivePgClientFactory`, mirroring the `pg-cache` pool seam; `PgClient` routes its underlying client through it; 4 unit tests. Needed because `pgsql-test`/`pgsql-client` build `pg.Client`s directly rather than via `getPgPool`.
3. **`pglite-test`** drop-in `getConnections` (instance-per-suite). ✅ **DONE** — composes `registerPglite()` (pool seam) + `registerPgClientFactory` (client seam) so `pg`/`db` share one in-process PGlite session; a `SharedTxn` ref-counter keeps the standard two-client `beforeEach`/`afterEach` savepoint harness working over a single session; seeds via `seed.pgpm()`; no `createdb`/`psql`. 5 tests cover deploy, per-test isolation, and RLS role/JWT switching (incl. `WITH CHECK`). No separate PGlite-aware `DbAdmin` subclass was needed — the instance *is* the database and extension/role bootstrap runs via `pglite.extensionSql`.
4. The socket-shim CI job (`pglite.yaml`, job `pglite-socket-e2e`) is **kept** — a standalone, out-of-workspace demonstration of the `pg-gateway` wire-protocol path (own lockfile, published `@pgpmjs/core`). The canonical in-process path is proven by the `@pgpmjs/pglite-adapter` and `pglite-test` jest suites in the no-services `unit-tests (pglite ...)` job in `run-tests.yaml`.
5. (Optional) Core transaction-client fix — only if a *multi-connection* single-writer backend is ever targeted; the in-process adapter does not need it.
6. (Future) `pgpm init --pglite` scaffolder — CLI-layer convenience; no PGlite dep in core.

Each shipped step is independently testable; only step 1 touches core, and it adds
no PGlite dependency to it. All `@electric-sql/pglite*` deps live in
`@pgpmjs/pglite-adapter`.
