import { PGlite } from '@electric-sql/pglite';
import { getActivePgPoolFactory, registerPgPoolFactory } from 'pg-cache';

import { createPglitePool } from './pool';

export { createPglitePool } from './pool';

export interface PgliteAdapterOptions {
  /** Persist to a directory (default: in-memory). */
  dataDir?: string;
  /**
   * PGlite WASM extensions to register at construction, e.g. `{ vector }` from
   * `@electric-sql/pglite-pgvector`. The corresponding `CREATE EXTENSION`
   * statements still run out-of-band (see `extensionSql`) because pgpm's
   * `cleanSql` strips `CREATE EXTENSION` from migration scripts.
   */
  extensions?: Record<string, any>;
  /**
   * SQL run once after the instance is ready — the place for
   * `CREATE EXTENSION IF NOT EXISTS ...`, mirroring pgsql-test's
   * `DbAdmin.installExtensions()`.
   */
  extensionSql?: string[];
  /** Reuse an already-created PGlite instance instead of creating one. */
  instance?: PGlite;
}

export interface PgliteAdapterHandle {
  /** The underlying PGlite instance (for direct queries / lifecycle control). */
  db: PGlite;
  /** Restore the previously-active pg-cache factory. Does not close `db`. */
  unregister: () => void;
  /** Unregister and close the PGlite instance. */
  close: () => Promise<void>;
}

/**
 * Create (or adopt) a PGlite instance and register it as the pg-cache pool
 * factory, so every `getPgPool()` call — and therefore the unmodified pgpm
 * engine — talks to PGlite in-process. No socket, no Postgres server.
 *
 * @example
 * const { db, close } = await registerPglite();
 * const migrate = new PgpmMigrate({ database: 'postgres', ... });
 * await migrate.deploy({ modulePath });
 * await close();
 */
export const registerPglite = async (
  options: PgliteAdapterOptions = {}
): Promise<PgliteAdapterHandle> => {
  const db =
    options.instance ??
    (await PGlite.create({ dataDir: options.dataDir, extensions: options.extensions }));
  await db.waitReady;

  for (const sql of options.extensionSql ?? []) {
    await db.exec(sql);
  }

  const previous = getActivePgPoolFactory();
  const pool = createPglitePool(db);
  registerPgPoolFactory(() => pool);

  return {
    db,
    unregister: () => registerPgPoolFactory(previous),
    close: async () => {
      registerPgPoolFactory(previous);
      await db.close();
    }
  };
};
