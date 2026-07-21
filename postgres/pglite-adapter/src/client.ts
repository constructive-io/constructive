import type { PGlite } from '@electric-sql/pglite';

import { boundQuery, type PgResultLike } from './runner';

/**
 * The minimal node-`pg` `Client` surface that `pgsql-client`'s `PgClient` uses:
 * `connect()`, `query()` and `end()`. A real `pg.Client` structurally satisfies
 * it, so registering a factory that returns this is transparent to consumers.
 */
export interface QueryablePgClient {
  connect(): Promise<void>;
  query(text: any, values?: any[]): Promise<PgResultLike>;
  end(): Promise<void>;
}

/**
 * Build a `pg.Client`-shaped object backed by an existing PGlite instance.
 *
 * Every client returned for the same instance shares that single in-process
 * session, so transaction control (`BEGIN`/`SAVEPOINT`/`ROLLBACK`/`COMMIT`) is
 * shared too. `end()` is a no-op: the instance lifecycle is owned by whoever
 * created it (see `registerPglite`), not by an individual client.
 */
export const createPgliteClient = (db: PGlite): QueryablePgClient => {
  const query = boundQuery(db);
  return {
    connect: async () => {
      await db.waitReady;
    },
    query,
    end: async () => {}
  };
};
