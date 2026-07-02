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
 * Compute a fingerprint of the relational shape shared by a set of physical
 * schemas. Physical schema names are mapped to their logical form (hash prefix
 * stripped) so that different tenants of the same shape collapse to the same
 * fingerprint. The fingerprint is a sha256 hex digest over the sorted
 * `[logicalSchema, relname]` pairs.
 */
export const computeShapeFingerprint = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<string> => {
  const result = await pool.query<{ nspname: string; relname: string }>(
    `SELECT n.nspname, c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = ANY($1) AND c.relkind IN ('r','v','m','p')
     ORDER BY 1, 2`,
    [physicalSchemas]
  );

  const pairs: [string, string][] = result.rows.map((row) => [
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
 * Detect relation-name collisions that would make unqualified SQL ambiguous:
 * relation names present in more than one of the given schemas. Returns the
 * offending relation names (sorted). E.g. a tenant with `identity_providers`
 * as a table in `auth-private` and a view in `auth-public` yields
 * `['identity_providers']`.
 */
export const checkUnqualifiedCollisions = async (
  pool: Pool,
  physicalSchemas: string[]
): Promise<string[]> => {
  const result = await pool.query<{ relname: string }>(
    `SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = ANY($1) AND c.relkind IN ('r','v','m','p')
     GROUP BY c.relname
     HAVING count(DISTINCT n.nspname) > 1
     ORDER BY c.relname`,
    [physicalSchemas]
  );

  return result.rows.map((row) => row.relname);
};

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
}): string => {
  const payload = {
    s: [...input.logicalSchemas].sort(),
    f: input.shapeFingerprint,
    g: Object.entries(input.flags || {}).sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    ),
    a: input.apiName || '',
    m: input.mode
  };

  return 'bp:' + createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};
