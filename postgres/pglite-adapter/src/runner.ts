import type { PGlite } from '@electric-sql/pglite';

/**
 * A node-`pg`-shaped result. pgpm / pgsql-client read `rows` and (occasionally)
 * `rowCount`, so we normalize PGlite's `{ rows, affectedRows, fields }` onto that
 * shape.
 */
export interface PgResultLike {
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
export const run = async (
  db: PGlite,
  text: string,
  values?: any[]
): Promise<PgResultLike> => {
  if (values && values.length > 0) {
    return toResult(await db.query(text, values));
  }
  const results = await db.exec(text);
  const last = Array.isArray(results) && results.length ? results[results.length - 1] : undefined;
  return toResult(last);
};

/** Normalize the two call shapes pg accepts: `(text, values)` or `({ text, values })`. */
export const normalize = (first: any, second?: any[]): { text: string; values?: any[] } => {
  if (first && typeof first === 'object' && 'text' in first) {
    return { text: first.text, values: first.values };
  }
  return { text: first, values: second };
};

/** A bound `(text, values | { text, values })` query function over a PGlite instance. */
export const boundQuery =
  (db: PGlite) =>
    (text: any, values?: any[]): Promise<PgResultLike> => {
      const q = normalize(text, values);
      return run(db, q.text, q.values);
    };
