import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

// =============================================================================
// Blueprint pooling identity helpers
//
// OPT-IN "blueprint pooling" shares one PostGraphile instance per schema-shape.
// Tenants are routed per request by the rewriting pool (canonical→tenant schema-
// identifier rewrite; see ./rewrite-pool). These helpers derive the identity of a
// shared instance (shape fingerprint + blueprint key).
// =============================================================================

/**
 * Whether blueprint pooling is enabled via the GRAPHILE_BLUEPRINT_POOLING env
 * flag. Accepts '1' or 'true'; anything else (incl. unset) means disabled.
 */
export const isBlueprintPoolingEnabled = (): boolean => {
  const value = process.env.GRAPHILE_BLUEPRINT_POOLING;
  return value === '1' || value === 'true';
};

/**
 * Strip the tenant hash prefix from a physical schema name.
 *
 * Tenant physical schemas look like `<dashed-dbname>-<8hex>-<logical>`, e.g.
 * `marketplace-db-tenant1-5e6b13b2-app-public` -> `app-public`. We strip through
 * the FIRST `-<8 lowercase hex>-` occurrence and return the remainder. Control
 * plane schemas (e.g. `services_public`) contain no such segment and are
 * returned unchanged.
 */
export const stripSchemaHashPrefix = (name: string): string => {
  const match = /-[0-9a-f]{8}-/.exec(name);
  if (!match) return name;
  return name.slice(match.index + match[0].length);
};

export interface SchemaRelation {
  nspname: string;
  relname: string;
}

/**
 * Single catalog scan backing the shape fingerprint.
 */
export const fetchSchemaRelations = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<SchemaRelation[]> => {
  const result = await pool.query<SchemaRelation>(
    `SELECT n.nspname, c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = ANY($1) AND c.relkind IN ('r','v','m','p')
     ORDER BY 1, 2`,
    [physicalSchemas]
  );
  return result.rows;
};

/**
 * Pure fingerprint over pre-fetched relations: sha256 of the sorted
 * `[logicalSchema, relname]` pairs (physical names mapped to logical form so
 * same-shape tenants collapse to the same fingerprint).
 *
 * NOTE (v1 granularity): the fingerprint covers relation NAMES only — not
 * columns, functions or enum labels. Same-relname column drift between tenants
 * is not detected here; it is bounded by flushService's flush-all-pooled-on-
 * schema:update semantics. Extending the fingerprint to attributes/procs is a
 * documented follow-up.
 */
export const fingerprintFromRelations = (rows: SchemaRelation[]): string => {
  const pairs: [string, string][] = rows.map((row) => [
    stripSchemaHashPrefix(row.nspname),
    row.relname
  ]);
  pairs.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
    return 0;
  });
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
};

/**
 * Compute a fingerprint of the relational shape shared by a set of physical
 * schemas. Physical schema names are mapped to their logical form (hash prefix
 * stripped) so that different tenants of the same shape collapse to the same
 * fingerprint. The fingerprint is a sha256 hex digest over the sorted
 * `[logicalSchema, relname]` pairs.
 */
export const computeShapeFingerprint = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<string> => fingerprintFromRelations(await fetchSchemaRelations(pool, physicalSchemas));

/**
 * Compute the stable blueprint key that identifies a poolable PostGraphile
 * instance. Two requests share an instance iff they agree on logical schemas,
 * shape fingerprint, gather/schema flags, api name and mode. Inputs are
 * normalized (schemas sorted, flag entries sorted by key) so the key is
 * independent of ordering.
 */
export const computeBlueprintKey = (input: {
  logicalSchemas: string[];
  shapeFingerprint: string;
  flags: Record<string, any> | undefined;
  apiName?: string | null;
  mode: string;
  /**
   * Physical database backing the instance's pool. REQUIRED for correctness in
   * multi-database fleets: without it, same-shape tenants living in DIFFERENT
   * physical databases would share one instance whose pool points at only one
   * of them.
   */
  dbname?: string | null;
}): string => {
  const payload = {
    s: [...input.logicalSchemas].sort(),
    f: input.shapeFingerprint,
    g: Object.entries(input.flags || {}).sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    ),
    a: input.apiName || '',
    m: input.mode,
    d: input.dbname || ''
  };

  return 'bp:' + createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

/**
 * Detect bm25 indexes (pg_textsearch / VectorChord-BM25 access method) in the
 * given physical schemas.
 *
 * WHY THIS GATES POOLING: graphile-search's bm25 adapter passes the
 * schema-qualified index name to to_bm25query() as a BIND VALUE captured at
 * build time. The rewriting pool maps canonical→tenant schema identifiers in
 * SQL TEXT only — bind values are user data and are deliberately never
 * rewritten — so a pooled instance would aim every tenant's bm25 scoring at
 * the CANONICAL tenant's index. Shapes that carry bm25 indexes therefore keep
 * per-tenant instances (see pooling-decision.ts) until the seam learns to
 * rewrite regclass-shaped values (documented follow-up).
 */
export const hasBm25Indexes = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_am am ON am.oid = c.relam
       WHERE n.nspname = ANY($1) AND c.relkind = 'i' AND am.amname = 'bm25'
     ) AS exists`,
    [physicalSchemas]
  );
  return result.rows[0]?.exists === true;
};
