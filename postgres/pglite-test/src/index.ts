/**
 * pglite-test
 *
 * A drop-in `getConnections()` — like `drizzle-orm-test` / `supabase-test` — that
 * backs the pgsql-test client model with an in-process **PGlite** instance
 * instead of a Postgres server. No `createdb`, no `psql`, no TCP: one WASM
 * Postgres session per suite.
 *
 * It composes the existing seams rather than forking anything:
 * - `@pgpmjs/pglite-adapter`'s `registerPglite()` routes `pg-cache`'s
 *   `getPgPool()` at PGlite (so `seed.pgpm()` deploys into it), and
 * - `pgsql-client`'s client-factory seam routes `PgTestClient`'s underlying
 *   `pg.Client` at the same PGlite session.
 *
 * Because PGlite is a single session, `pg` and `db` share it; transaction
 * control is ref-counted (see `SharedTxn`) so the standard
 * `pg.beforeEach()/db.beforeEach()` + `db.afterEach()/pg.afterEach()` harness
 * works unchanged.
 *
 * @example
 * ```typescript
 * import { getConnections, PgTestClient } from 'pglite-test';
 *
 * let pg: PgTestClient, db: PgTestClient, teardown: () => Promise<void>;
 * beforeAll(async () => { ({ pg, db, teardown } = await getConnections()); });
 * afterAll(async () => { await teardown(); });
 * beforeEach(async () => { await pg.beforeEach(); await db.beforeEach(); });
 * afterEach(async () => { await db.afterEach(); await pg.afterEach(); });
 * ```
 */

import type { PGlite } from '@electric-sql/pglite';
import { generateCreateBaseRolesSQL, generateCreateClientRoleSQL } from '@pgpmjs/core';
import { createPgliteClient, registerPglite } from '@pgpmjs/pglite-adapter';
import { getPgEnvOptions, PgConfig } from 'pg-env';
import { getActivePgClientFactory, getRoleMapping, registerPgClientFactory } from 'pgsql-client';
import { DbAdmin, GetConnectionOpts, PgTestClient, seed, SeedAdapter } from 'pgsql-test';

import { PgliteTestClient, SharedTxn } from './txn';

export interface PgliteConnectionOpts extends GetConnectionOpts {
  /** PGlite-specific knobs (in-memory by default). */
  pglite?: {
    /** Persist to a directory (default: in-memory). */
    dataDir?: string;
    /** WASM extensions registered at construction, e.g. `{ vector }`. */
    extensions?: Record<string, any>;
    /**
     * SQL run once after the instance is ready — the place for
     * `CREATE EXTENSION ...` (and any extra roles/objects you want).
     */
    extensionSql?: string[];
    /**
     * Auto-create the standard app roles (`anonymous` / `authenticated` /
     * `administrator`) with the same attributes
     * pgsql-test's server bootstrap uses, before seeding. This is what lets a
     * bare `getConnections()` switch into an app role via `db.setContext()`
     * with no manual `CREATE ROLE`. Defaults to `true`.
     *
     * Set `false` to boot as a lone superuser and manage your own roles/users
     * through `extensionSql` (see the README for the pattern). Role *names* can
     * be customized via `db.roles` (a `RoleMapping`), mirroring pgsql-test.
     */
    roles?: boolean;
    /** Reuse an already-created PGlite instance instead of creating one. */
    instance?: PGlite;
  };
}

export interface PgliteConnectionResult {
  /** Superuser-style client (bypasses RLS by not switching role). */
  pg: PgTestClient;
  /** Application client (role/context switched via `setContext`). */
  db: PgTestClient;
  /** The underlying PGlite instance, for direct access. */
  instance: PGlite;
  /** Unregister the seams and close the PGlite instance. */
  teardown: () => Promise<void>;
}

/**
 * Create an isolated PGlite-backed test environment and return `pg`/`db` clients
 * plus a `teardown()`. Defaults to seeding via `seed.pgpm()` (deploys the pgpm
 * module in `cwd`) and creating the standard app roles, matching pgsql-test — so
 * a bare `getConnections()` is enough to deploy and switch roles with no manual
 * `CREATE ROLE`. Opt out of the role bootstrap with `pglite: { roles: false }`.
 */
export const getConnections = async (
  cn: PgliteConnectionOpts = {},
  seedAdapters: SeedAdapter[] = [seed.pgpm()]
): Promise<PgliteConnectionResult> => {
  // Capture the previously-active client factory so teardown restores it
  // (rather than clobbering to the default), mirroring how registerPglite
  // restores the previous pool factory. Keeps nested/sequential suites clean.
  const previousClientFactory = getActivePgClientFactory();

  // Seed the standard app roles by default so `db.setContext({ role })` works
  // out of the box — PGlite boots as a lone superuser with no app roles, unlike
  // a server where pgsql-test bootstraps them at createdb. Opt out with
  // `pglite: { roles: false }` to manage your own (see README).
  const bootstrapRoles = cn.pglite?.roles !== false;
  const roleMapping = getRoleMapping({ roles: cn.db?.roles });
  const roleSql = bootstrapRoles
    ? [
        generateCreateBaseRolesSQL(roleMapping),
        generateCreateClientRoleSQL(roleMapping)
      ]
    : [];

  const handle = await registerPglite({
    dataDir: cn.pglite?.dataDir,
    extensions: cn.pglite?.extensions,
    extensionSql: [...roleSql, ...(cn.pglite?.extensionSql ?? [])],
    instance: cn.pglite?.instance
  });

  // Route pgsql-client's PgClient at the same in-process PGlite session.
  registerPgClientFactory(() => createPgliteClient(handle.db));

  try {
    const config: PgConfig = getPgEnvOptions({ database: 'postgres', ...cn.pg });

    const txn = new SharedTxn();
    const pg = new PgliteTestClient(config, {}, txn);
    const db = new PgliteTestClient(config, { auth: cn.db?.auth, roles: cn.db?.roles }, txn);

    // seed.pgpm deploys via getPgPool -> PGlite; sqlfile/json/csv/fn use ctx.pg.
    if (seedAdapters.length) {
      await seed.compose(seedAdapters).seed({
        connect: cn.db ?? {},
        admin: undefined as unknown as DbAdmin, // unused by the PGlite-safe adapters
        config,
        pg
      });
    }

    const teardown = async (): Promise<void> => {
      registerPgClientFactory(previousClientFactory);
      await pg.close();
      await db.close();
      await handle.close();
    };

    return { pg, db, instance: handle.db, teardown };
  } catch (err) {
    // Setup failed after registering the seams — unwind so a broken suite
    // doesn't leak factories/instance into the next one.
    registerPgClientFactory(previousClientFactory);
    await handle.close();
    throw err;
  }
};

export { PgliteTestClient, SharedTxn } from './txn';
export type { GetConnectionOpts, SeedAdapter } from 'pgsql-test';
export { PgTestClient, seed } from 'pgsql-test';
