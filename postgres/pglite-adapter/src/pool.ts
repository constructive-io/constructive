import type { PGlite } from '@electric-sql/pglite';
import type { QueryableClient, QueryablePool } from 'pg-cache';

/**
 * A node-`pg`-shaped result. pgpm only reads `rows` and (occasionally)
 * `rowCount`, so we normalize PGlite's `{ rows, affectedRows, fields }` onto
 * that shape.
 */
interface PgResultLike {
  rows: any[];
  rowCount: number;
  fields: any[];
}

const toResult = (r: any): PgResultLike => {
  const rows = r?.rows ?? [];
  const rowCount = typeof r?.affectedRows === 'number' ? r.affectedRows : rows.length;
  return { rows, rowCount, fields: r?.fields ?? [] };
};

/**
 * Run a statement against the single in-process PGlite engine.
 *
 * PGlite mirrors node-`pg`'s two protocols:
 * - parameterized (`$1`, ...) -> `db.query` (extended protocol, single statement)
 * - no parameters -> `db.exec` (simple protocol, supports the multi-statement
 *   bootstrap SQL pgpm runs in `initialize()`), returning the last result.
 */
const run = async (db: PGlite, text: string, values?: any[]): Promise<PgResultLike> => {
  if (values && values.length > 0) {
    return toResult(await db.query(text, values));
  }
  const results = await db.exec(text);
  const last = Array.isArray(results) && results.length ? results[results.length - 1] : undefined;
  return toResult(last);
};

/** Normalize the two call shapes pgpm/pg accept: `(text, values)` or `({ text, values })`. */
const normalize = (first: any, second?: any[]): { text: string; values?: any[] } => {
  if (first && typeof first === 'object' && 'text' in first) {
    return { text: first.text, values: first.values };
  }
  return { text: first, values: second };
};

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
 * its lifecycle is owned by whoever created it (see `createPglite`).
 */
export const createPglitePool = (db: PGlite): QueryablePool => {
  let ended = false;

  const client: QueryableClient = {
    query: (text: any, values?: any[]) => {
      const q = normalize(text, values);
      return run(db, q.text, q.values);
    },
    release: () => {}
  };

  const pool = {
    get ended() {
      return ended;
    },
    query: (text: any, values?: any[]) => {
      const q = normalize(text, values);
      return run(db, q.text, q.values);
    },
    connect: async () => client,
    end: async () => {
      ended = true;
    }
  };

  return pool as unknown as QueryablePool;
};
