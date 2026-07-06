/**
 * SQL builders + constants for the `deep`-tier scenario checks
 * (src/regression/scenarios.ts).
 *
 * Every mutating statement here is PARAMETERIZED and paired with an exact
 * inverse so a scenario can restore the rig to precisely the state it found:
 *   - settings INSERT  <-> settings DELETE (by the same database_id set)
 *   - probe partition CREATE <-> DROP (by the same child name)
 *
 * Identifiers that reach a DDL string (schema / table / child names come from
 * the catalog, never from user argv) are double-quote escaped via `qid`; all
 * values flow as bind parameters. The flag-column allowlist (`SETTINGS_FLAGS`)
 * guards the ONE place a column name is interpolated (the settings INSERT).
 *
 * No IO here — these are pure string/param builders, unit-tested without PG.
 */

// LISTEN/NOTIFY channel the server subscribes to for cache invalidation
// (graphql/server/src/server.ts LISTEN "schema:update"; payload = databaseId).
export const SCHEMA_UPDATE_CHANNEL = 'schema:update';

// The 12 feature-flag columns on services_public.database_settings (and the
// matching per-API override columns on services_public.api_settings). Mirrors
// the loader mapping in packages/express-context/src/loaders/database-settings.ts.
export const SETTINGS_FLAGS = [
  'enable_aggregates',
  'enable_postgis',
  'enable_search',
  'enable_direct_uploads',
  'enable_presigned_uploads',
  'enable_many_to_many',
  'enable_connection_filter',
  'enable_ltree',
  'enable_llm',
  'enable_realtime',
  'enable_bulk',
  'enable_i18n'
] as const;

export type SettingsFlag = (typeof SETTINGS_FLAGS)[number];

// Double-quote-escape a SQL identifier (schema / table / child name from the
// catalog). Mirrors fleet/teardown.ts `qid`.
export const qid = (s: string): string => `"${String(s).replace(/"/g, '""')}"`;

// ---------------------------------------------------------------------------
// services_public.database_settings — variant seeding (checks 2 + 3)
// ---------------------------------------------------------------------------

// Are any of these database_ids ALREADY carrying a settings row? A scenario
// refuses to mutate (skips) when true, so teardown can never delete a row it
// did not create — the rig is left exactly as found.
export const SETTINGS_EXISTING_SQL =
  'SELECT database_id::text AS database_id FROM services_public.database_settings WHERE database_id = ANY($1::uuid[])';

/**
 * Parameterized single-row INSERT into services_public.database_settings.
 * `$1` = database_id; one bind param per requested flag follows, in the order
 * of `flagColumns`. Columns NOT listed keep their table defaults (postgis/
 * search/uploads/m2m/connection_filter/ltree ON; aggregates/llm/realtime/bulk/
 * i18n OFF), matching the rig's implicit per-tenant configuration.
 *
 * Throws on an unknown flag column (allowlist guard against injection).
 */
export function buildSettingsInsert(flagColumns: SettingsFlag[]): string {
  if (!flagColumns.length) throw new Error('buildSettingsInsert: at least one flag column required');
  for (const c of flagColumns) {
    if (!(SETTINGS_FLAGS as readonly string[]).includes(c)) {
      throw new Error(`buildSettingsInsert: unknown settings flag column '${c}'`);
    }
  }
  const cols = flagColumns.join(', ');
  const placeholders = flagColumns.map((_c, i) => `$${i + 2}`).join(', ');
  return `INSERT INTO services_public.database_settings (database_id, ${cols}) VALUES ($1, ${placeholders})`;
}

// Exact inverse of the INSERT: remove the rows for precisely the seeded ids.
export const SETTINGS_DELETE_SQL =
  'DELETE FROM services_public.database_settings WHERE database_id = ANY($1::uuid[])';

// Notify the server to flush its per-database pooling decisions. NOTE (recon b):
// this clears the pooling-decision memo + bp: instances but NOT the 5-minute
// databaseSettingsLoader TTL cache, so a settings change only takes effect
// deterministically on a FRESH server (which every scenario boots) — the NOTIFY
// is fired on teardown as a best-effort courtesy to any long-lived listener.
export const SCHEMA_UPDATE_NOTIFY_SQL = 'SELECT pg_notify($1, $2)';

// ---------------------------------------------------------------------------
// databaseId + schema resolution
// ---------------------------------------------------------------------------

// Resolve a tenant's control-plane database id from its name (when the fleet
// manifest lacks databaseId).
export const DATABASE_ID_BY_NAME_SQL =
  'SELECT id::text AS id FROM metaschema_public.database WHERE name = $1';

// Every physical schema of a tenant database (used to scope the partman scan).
export const TENANT_SCHEMAS_SQL =
  'SELECT schema_name FROM metaschema_public.schema WHERE database_id = $1 ORDER BY schema_name';

// ---------------------------------------------------------------------------
// partman.part_config — partition-creep measurement (check 4)
// ---------------------------------------------------------------------------

// Time-partitioned parents belonging to a tenant's schema set. `$1` is an array
// of `'<schema>.%'` LIKE patterns built by buildPartConfigLikePatterns, which
// escapes the LIKE metacharacters in the schema names (so an underscore in a
// schema cannot act as a single-char wildcard and pull in a DIFFERENT tenant's
// parents). Matching relies on LIKE's default backslash escape — an explicit
// ESCAPE clause is not permitted with the `LIKE ANY` quantified form.
// partition_interval is returned as text and parsed in JS
// (parsePartitionIntervalSeconds) so a non-time interval simply fails to parse
// and that parent is skipped, rather than throwing here.
export const PART_CONFIG_FOR_TENANT_SQL = `
  SELECT parent_table,
         partition_interval::text AS partition_interval,
         premake
    FROM partman.part_config
   WHERE parent_table LIKE ANY($1)
   ORDER BY parent_table`;

// Escape the three LIKE metacharacters (backslash, %, _) in a literal so it
// matches only itself. PostgreSQL's LIKE treats backslash as its default escape
// character, so an escaped literal needs no explicit ESCAPE clause.
export const escapeLikeLiteral = (s: string): string => String(s).replace(/([\\%_])/g, '\\$1');

// Build the `'<schema>.%'` patterns for PART_CONFIG_FOR_TENANT_SQL's `LIKE ANY`.
// Physical schema names here carry dashes and MAY carry underscores; left
// unescaped, an underscore is a LIKE single-character wildcard, so a schema
// 'foo_bar' would yield 'foo_bar.%' and also match a DIFFERENT tenant's
// 'fooXbar.<table>' parent (a cross-tenant over-match). Escaping the
// metacharacters pins the schema to itself; the trailing '.%' stays the one
// intended wildcard (the table component), and the '.' is a literal that anchors
// the schema/table boundary exactly.
export function buildPartConfigLikePatterns(schemas: string[]): string[] {
  return schemas.map((s) => `${escapeLikeLiteral(s)}.%`);
}

// Confirm a parent is a native partitioned table (relkind 'p') before we add a
// child to it. `$1` = schema, `$2` = table.
export const IS_PARTITIONED_PARENT_SQL = `
  SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'p'
   LIMIT 1`;

// pg_class row count — the catalog-size proxy the whole sizing model rides on.
export const PG_CLASS_COUNT_SQL = 'SELECT count(*)::int AS n FROM pg_class';

/**
 * CREATE one throwaway future partition of a native partitioned parent. Because
 * PARTITION OF auto-creates the child's indexes (from the parent's partitioned
 * indexes) and a toast table, the pg_class delta around this statement is the
 * TRUE marginal per-partition footprint (table + indexes + toast + toast index).
 * `lo`/`hi` are far-future ISO timestamps (validated by the caller against
 * ISO_TS_RE) chosen to never overlap a premade partition, so the CREATE cannot
 * collide; the child is DROPped in teardown regardless.
 */
export function buildCreateProbePartition(
  schema: string,
  parent: string,
  child: string,
  lo: string,
  hi: string
): string {
  if (!ISO_TS_RE.test(lo) || !ISO_TS_RE.test(hi)) {
    throw new Error(`buildCreateProbePartition: bound is not an ISO timestamp: ${lo} / ${hi}`);
  }
  return (
    `CREATE TABLE ${qid(schema)}.${qid(child)} PARTITION OF ${qid(schema)}.${qid(parent)} ` +
    `FOR VALUES FROM ('${lo}') TO ('${hi}')`
  );
}

// Exact inverse of the probe CREATE.
export function buildDropProbePartition(schema: string, child: string): string {
  return `DROP TABLE IF EXISTS ${qid(schema)}.${qid(child)}`;
}

// Strict ISO-8601 timestamp (date, or date + time + optional zone). Guards the
// only literal values interpolated into the probe-partition DDL.
export const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)?)?$/;

// Split a `schema.table` parent_table into its parts on the LAST dot (physical
// schema names contain dashes but never dots, so the last dot is the separator).
export function splitParentTable(parentTable: string): { schema: string; table: string } | null {
  const i = parentTable.lastIndexOf('.');
  if (i <= 0 || i >= parentTable.length - 1) return null;
  return { schema: parentTable.slice(0, i), table: parentTable.slice(i + 1) };
}
