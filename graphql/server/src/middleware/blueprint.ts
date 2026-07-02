import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

// =============================================================================
// Blueprint pooling identity helpers
//
// OPT-IN "blueprint pooling" shares one PostGraphile instance per schema-shape.
// Tenants are routed per request via a search_path pgSetting. These helpers
// derive the identity of a shared instance (shape fingerprint + blueprint key)
// and provide the search_path plumbing needed to route unqualified SQL.
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

/**
 * Render a list of schema names as a Postgres `search_path` value: each name is
 * wrapped in double quotes (embedded double quotes doubled) and comma-joined,
 * e.g. `["a-b-c", "a-b-d"]` -> `"a-b-c", "a-b-d"`.
 */
export const quoteSearchPath = (schemas: string[]): string =>
  schemas.map((name) => `"${name.replace(/"/g, '""')}"`).join(', ');

/**
 * Render the per-request search_path for a pooled instance: the tenant's
 * physical schemas FIRST (so unqualified tenant relations resolve to the
 * tenant), then `public` LAST. `public` must stay on the path because shared
 * objects live there (e.g. the `email` domain used by SECURITY DEFINER auth
 * functions without their own `SET search_path`); dropping it breaks sign_in
 * with "type email does not exist".
 */
export const tenantSearchPath = (schemas: string[]): string =>
  quoteSearchPath([...schemas.filter((s) => s !== 'public'), 'public']);

export interface SchemaRelation {
  nspname: string;
  relname: string;
}

/**
 * Single catalog scan backing both the shape fingerprint and the collision
 * check (they previously issued the same pg_class scan twice per decision).
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
 * Pure collision detection over pre-fetched relations: relation names present
 * in more than one PHYSICAL schema of the set (would make unqualified SQL
 * ambiguous under search_path routing).
 */
export const collisionsFromRelations = (rows: SchemaRelation[]): string[] => {
  const schemasByRelname = new Map<string, Set<string>>();
  for (const row of rows) {
    let set = schemasByRelname.get(row.relname);
    if (!set) {
      set = new Set<string>();
      schemasByRelname.set(row.relname, set);
    }
    set.add(row.nspname);
  }
  return [...schemasByRelname.entries()]
    .filter(([, schemas]) => schemas.size > 1)
    .map(([relname]) => relname)
    .sort();
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
 * Detect relation-name collisions that would make unqualified SQL ambiguous:
 * relation names present in more than one of the given schemas. Returns the
 * offending relation names (sorted). E.g. a tenant with `identity_providers`
 * as a table in `auth-private` and a view in `auth-public` yields
 * `['identity_providers']`.
 */
export const checkUnqualifiedCollisions = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<string[]> => collisionsFromRelations(await fetchSchemaRelations(pool, physicalSchemas));

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
