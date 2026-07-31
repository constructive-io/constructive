/**
 * Structural catalog snapshot + equivalence check, used by
 * `pgpm transform --check` to prove a transform is lossless: deploy the
 * original and the transformed module(s) into two scratch databases and
 * assert the resulting catalogs describe the same schema.
 *
 * The snapshot is intentionally order-insensitive per object class (objects
 * are keyed by identity and compared by definition), but column order within
 * a table IS part of the comparison — the dials pipeline preserves it.
 */
/** Minimal query surface: satisfied by pg Pool/PoolClient and test clients. */
export interface CatalogQueryable {
  query(text: string): Promise<{ rows: any[] }>;
}

/** Catalog snapshot: object identity -> normalized definition. */
export interface CatalogSnapshot {
  schemas: Record<string, string>;
  tables: Record<string, string>;
  columns: Record<string, string>;
  constraints: Record<string, string>;
  indexes: Record<string, string>;
  functions: Record<string, string>;
  triggers: Record<string, string>;
  policies: Record<string, string>;
  rls: Record<string, string>;
  grants: Record<string, string>;
}

const SYSTEM_SCHEMAS = `('pg_catalog', 'information_schema', 'pg_toast', 'pgpm_migrate', 'public')`;

const record = (rows: any[], key: (r: any) => string, value: (r: any) => string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const row of rows) out[key(row)] = value(row);
  return out;
};

/**
 * Snapshot the user-schema surface of a database: schemas, tables, columns,
 * constraints, indexes, functions, triggers, policies, RLS flags, and table
 * grants. System schemas, `public`, and the pgpm ledger are excluded.
 */
export const snapshotCatalog = async (db: CatalogQueryable): Promise<CatalogSnapshot> => {
  const schemas = await db.query(`
    SELECT nspname FROM pg_namespace
    WHERE nspname NOT IN ${SYSTEM_SCHEMAS} AND nspname NOT LIKE 'pg_temp%' AND nspname NOT LIKE 'pg_toast%'
    ORDER BY nspname
  `);

  const tables = await db.query(`
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_schema NOT IN ${SYSTEM_SCHEMAS} AND table_type = 'BASE TABLE'
  `);

  const columns = await db.query(`
    SELECT table_schema, table_name, column_name, ordinal_position,
           data_type, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema NOT IN ${SYSTEM_SCHEMAS}
  `);

  const constraints = await db.query(`
    SELECT n.nspname AS schema, cl.relname AS table, c.conname,
           pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const indexes = await db.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes WHERE schemaname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const functions = await db.query(`
    SELECT n.nspname AS schema, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const triggers = await db.query(`
    SELECT n.nspname AS schema, cl.relname AS table, t.tgname,
           pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t
    JOIN pg_class cl ON cl.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const policies = await db.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd,
           qual, with_check
    FROM pg_policies WHERE schemaname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const rls = await db.query(`
    SELECT n.nspname AS schema, cl.relname AS table,
           cl.relrowsecurity, cl.relforcerowsecurity
    FROM pg_class cl
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE cl.relkind = 'r' AND n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);

  const grants = await db.query(`
    SELECT table_schema, table_name, grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema NOT IN ${SYSTEM_SCHEMAS}
      AND grantee <> (SELECT current_user)
  `);

  return {
    schemas: record(schemas.rows, r => r.nspname, () => 'schema'),
    tables: record(tables.rows, r => `${r.table_schema}.${r.table_name}`, () => 'table'),
    columns: record(
      columns.rows,
      r => `${r.table_schema}.${r.table_name}.${r.column_name}`,
      r =>
        `#${r.ordinal_position} ${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ''} nullable=${r.is_nullable} default=${r.column_default ?? 'none'}`
    ),
    constraints: record(constraints.rows, r => `${r.schema}.${r.table}.${r.conname}`, r => r.def),
    indexes: record(indexes.rows, r => `${r.schemaname}.${r.tablename}.${r.indexname}`, r => r.indexdef),
    functions: record(functions.rows, r => `${r.schema}.${r.proname}(${r.args})`, r => r.def),
    triggers: record(triggers.rows, r => `${r.schema}.${r.table}.${r.tgname}`, r => r.def),
    policies: record(
      policies.rows,
      r => `${r.schemaname}.${r.tablename}.${r.policyname}`,
      r =>
        `permissive=${r.permissive} roles=${[...(r.roles ?? [])].sort().join(',')} cmd=${r.cmd} qual=${r.qual ?? 'none'} check=${r.with_check ?? 'none'}`
    ),
    rls: record(
      rls.rows,
      r => `${r.schema}.${r.table}`,
      r => `enabled=${r.relrowsecurity} forced=${r.relforcerowsecurity}`
    ),
    grants: record(
      grants.rows,
      r => `${r.table_schema}.${r.table_name}:${r.grantee}:${r.privilege_type}`,
      () => 'grant'
    )
  };
};

/**
 * Compare two catalog snapshots. Returns a flat list of human-readable
 * differences; an empty list means the catalogs are structurally equivalent.
 */
export const diffCatalogSnapshots = (a: CatalogSnapshot, b: CatalogSnapshot): string[] => {
  const diffs: string[] = [];
  for (const section of Object.keys(a) as (keyof CatalogSnapshot)[]) {
    const left = a[section];
    const right = b[section];
    for (const key of Object.keys(left).sort()) {
      if (!(key in right)) {
        diffs.push(`${section}: ${key} only in original`);
      } else if (left[key] !== right[key]) {
        diffs.push(`${section}: ${key} differs\n  original:    ${left[key]}\n  transformed: ${right[key]}`);
      }
    }
    for (const key of Object.keys(right).sort()) {
      if (!(key in left)) diffs.push(`${section}: ${key} only in transformed`);
    }
  }
  return diffs;
};
