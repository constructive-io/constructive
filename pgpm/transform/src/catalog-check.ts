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
  /** Enums (labels in order), domains, composite and range types. */
  types: Record<string, string>;
  sequences: Record<string, string>;
  /** Views and materialized views (definition). */
  views: Record<string, string>;
  /** COMMENT ON for schemas, relations, columns, functions and types. */
  comments: Record<string, string>;
  defaultPrivileges: Record<string, string>;
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
           data_type, is_nullable, column_default, character_maximum_length,
           is_identity, identity_generation, is_generated, generation_expression, collation_name
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
      AND c.contype <> 'n'
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
  const types = await db.query(`
    SELECT n.nspname AS schema, t.typname, t.typtype,
           CASE t.typtype
             WHEN 'e' THEN (SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid)
             WHEN 'd' THEN format_type(t.typbasetype, t.typtypmod) || ' notnull=' || t.typnotnull
                        || ' default=' || coalesce(t.typdefault, 'none')
                        || ' checks=' || coalesce((SELECT string_agg(c.conname || ':' || pg_get_constraintdef(c.oid), ';' ORDER BY c.conname) FROM pg_constraint c WHERE c.contypid = t.oid), '')
             WHEN 'c' THEN (SELECT string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
                            FROM pg_attribute a WHERE a.attrelid = t.typrelid AND a.attnum > 0 AND NOT a.attisdropped)
             WHEN 'r' THEN (SELECT format_type(r.rngsubtype, NULL) FROM pg_range r WHERE r.rngtypid = t.oid)
             ELSE ''
           END AS def
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_class cl ON cl.oid = t.typrelid
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS}
      AND t.typtype IN ('e', 'd', 'c', 'r')
      AND (t.typtype <> 'c' OR cl.relkind = 'c')
      AND NOT EXISTS (SELECT 1 FROM pg_type el WHERE el.typarray = t.oid)
  `);
  const sequences = await db.query(`
    SELECT schemaname, sequencename, data_type, start_value, min_value, max_value, increment_by, cycle, cache_size
    FROM pg_sequences WHERE schemaname NOT IN ${SYSTEM_SCHEMAS}
  `);
  const views = await db.query(`
    SELECT n.nspname AS schema, cl.relname, cl.relkind, pg_get_viewdef(cl.oid, true) AS def
    FROM pg_class cl
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE cl.relkind IN ('v', 'm') AND n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);
  const comments = await db.query(`
    SELECT 'schema' AS kind, n.nspname AS target, obj_description(n.oid, 'pg_namespace') AS comment
    FROM pg_namespace n WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS} AND obj_description(n.oid, 'pg_namespace') IS NOT NULL
    UNION ALL
    SELECT 'relation', n.nspname || '.' || cl.relname, obj_description(cl.oid, 'pg_class')
    FROM pg_class cl JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS} AND obj_description(cl.oid, 'pg_class') IS NOT NULL
    UNION ALL
    SELECT 'column', n.nspname || '.' || cl.relname || '.' || a.attname, col_description(cl.oid, a.attnum)
    FROM pg_attribute a JOIN pg_class cl ON cl.oid = a.attrelid JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS} AND a.attnum > 0 AND NOT a.attisdropped AND col_description(cl.oid, a.attnum) IS NOT NULL
    UNION ALL
    SELECT 'function', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', obj_description(p.oid, 'pg_proc')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS} AND obj_description(p.oid, 'pg_proc') IS NOT NULL
    UNION ALL
    SELECT 'type', n.nspname || '.' || t.typname, obj_description(t.oid, 'pg_type')
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname NOT IN ${SYSTEM_SCHEMAS} AND obj_description(t.oid, 'pg_type') IS NOT NULL
  `);
  const defaultPrivileges = await db.query(`
    SELECT pg_get_userbyid(d.defaclrole) AS role, n.nspname AS schema, d.defaclobjtype AS objtype,
           array_to_string(d.defaclacl, ',') AS acl
    FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname IS NULL OR n.nspname NOT IN ${SYSTEM_SCHEMAS}
  `);

  return {
    schemas: record(schemas.rows, r => r.nspname, () => 'schema'),
    tables: record(tables.rows, r => `${r.table_schema}.${r.table_name}`, () => 'table'),
    columns: record(
      columns.rows,
      r => `${r.table_schema}.${r.table_name}.${r.column_name}`,
      r =>
        `#${r.ordinal_position} ${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ''} nullable=${r.is_nullable} default=${r.column_default ?? 'none'}` +
        `${r.is_identity === 'YES' ? ` identity=${r.identity_generation}` : ''}` +
        `${r.is_generated && r.is_generated !== 'NEVER' ? ` generated=${r.generation_expression}` : ''}` +
        `${r.collation_name ? ` collate=${r.collation_name}` : ''}`
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
    ),
    types: record(types.rows, r => `${r.schema}.${r.typname}`, r => `${r.typtype} ${r.def ?? ''}`),
    sequences: record(
      sequences.rows,
      r => `${r.schemaname}.${r.sequencename}`,
      r => `${r.data_type} start=${r.start_value} min=${r.min_value} max=${r.max_value} inc=${r.increment_by} cycle=${r.cycle} cache=${r.cache_size}`
    ),
    views: record(views.rows, r => `${r.schema}.${r.relname}`, r => `${r.relkind} ${r.def}`),
    comments: record(comments.rows, r => `${r.kind}:${r.target}`, r => r.comment),
    defaultPrivileges: record(
      defaultPrivileges.rows,
      r => `${r.role}:${r.schema ?? ''}:${r.objtype}`,
      r => r.acl
    )
  };
};

/**
 * Column-order-insensitive view of a snapshot. Migrations that drop and add
 * columns can never reproduce a fresh deploy's physical column order
 * (Postgres appends), so migration-equivalence checks (`pgpm diff --verify`)
 * compare columns by name and definition only.
 */
export const withoutColumnOrder = (snap: CatalogSnapshot): CatalogSnapshot => {
  const columns: Record<string, string> = {};
  for (const [key, value] of Object.entries(snap.columns)) {
    columns[key] = value.replace(/^#\d+ /, '');
  }
  return { ...snap, columns };
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
