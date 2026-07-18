import type { PGlite } from '@electric-sql/pglite';
import type { QueryableClient, QueryablePool } from 'pg-cache';

import { boundQuery } from './runner';

/**
 * Build a `QueryablePool` backed by an existing PGlite instance.
 *
 * PGlite is a single in-process engine (one session), so both `pool.query` and
 * the client returned by `connect()` funnel to the same instance. That is
 * exactly what lets pgpm's transactional deploy work: the `BEGIN` opened on the
 * connected client and the `isDeployed()` check issued via `pool.query` share
 * one session, so there is no cross-connection deadlock (the failure mode of a
 * multi-connection pool against a single-connection backend).
 *
 * `end()` intentionally does NOT close the PGlite instance: the same instance
 * may back several cached pool wrappers (pg-cache keys by database name), and
 * its lifecycle is owned by whoever created it (see `registerPglite`).
 */
export const createPglitePool = (db: PGlite): QueryablePool => {
  let ended = false;
  const query = boundQuery(db);

  const client: QueryableClient = {
    query,
    release: () => {}
  };

  const pool = {
    get ended() {
      return ended;
    },
    query,
    connect: async () => client,
    end: async () => {
      ended = true;
    }
  };

  return pool as unknown as QueryablePool;
};
