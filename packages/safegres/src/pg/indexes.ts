/**
 * Catalog introspection for the performance dimension: indexes, foreign-key
 * constraints, primary keys, and replica identity, in one query.
 *
 * Kept separate from {@link introspectTables} so a security-only audit never
 * pays for it.
 */

import { extensionFilter, type GrantInfo, type IntrospectOptions, type QueryExecutor } from './introspect';

export interface IndexInfo {
  name: string;
  /**
   * Attribute numbers of the indexed columns, in index order. `0` marks an
   * expression column (the expression itself is in `definition`).
   */
  columns: number[];
  /** Column names aligned with `columns`; expression columns render as `(expr)`. */
  columnNames: string[];
  unique: boolean;
  primary: boolean;
  /** Backed by a constraint (PRIMARY KEY / UNIQUE / EXCLUDE). */
  constraint: boolean;
  /** Has a `WHERE` clause — only covers a subset of rows. */
  partial: boolean;
  /** Contains at least one expression column. */
  expression: boolean;
  /** Access method (`btree`, `gin`, …). */
  method: string;
  definition: string;
}

export interface ColumnInfo {
  name: string;
  /** `pg_attribute.attnum`. */
  attnum: number;
  /** `format_type()` output, e.g. `timestamptz`, `tsvector`, `vector(1536)`. */
  type: string;
  /** Base type name without modifiers, e.g. `timestamptz`, `vector`. */
  baseType: string;
  /** `pg_attribute.attnotnull`. */
  notNull: boolean;
  /** The column default as SQL, or `null` when it has none. */
  defaultExpr: string | null;
}

export interface ForeignKeyInfo {
  name: string;
  /** Referencing column attribute numbers, in constraint order. */
  columns: number[];
  columnNames: string[];
  /** Schema-qualified referenced table. */
  references: string;
}

export interface TableIndexSnapshot {
  schema: string;
  name: string;
  oid: number;
  /** The table is a partition of a partitioned table (indexes live on the parent). */
  isPartition: boolean;
  /** `pg_class.relreplident`: `d` default, `n` nothing, `f` full, `i` index. */
  replicaIdentity: string;
  hasPrimaryKey: boolean;
  /** `pg_class.reltuples` — planner row estimate, `-1` when never analyzed. */
  estimatedRows: number;
  /** User columns (no system or dropped attributes), in attribute order. */
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

/**
 * One-query snapshot of the index-shaped catalog for every table in scope.
 */
export async function introspectIndexes(
  exec: QueryExecutor,
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas' | 'extensions'> = {}
): Promise<TableIndexSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;
  const extFilter = extensionFilter(options.extensions, 3);

  // Every parameter is referenced (even when only one filters) so Postgres
  // can infer their types — an unused $N errors out at bind time.
  const sql = `
    WITH _params AS (
      SELECT
        $1::text[] AS include_schemas,
        $2::text[] AS exclude_schemas,
        $3::text[] AS ignore_extensions
    ),
    rels AS (
      SELECT
        n.nspname          AS schema_name,
        c.relname          AS table_name,
        c.oid              AS oid,
        c.relispartition   AS is_partition,
        c.relreplident     AS replica_identity,
        c.reltuples        AS estimated_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        ${schemaFilter}${extFilter}
    ),
    indexes AS (
      SELECT
        ix.indrelid                                     AS oid,
        i.relname                                       AS name,
        string_to_array(ix.indkey::text, ' ')::int[]    AS columns,
        ix.indisunique                                  AS is_unique,
        ix.indisprimary                                 AS is_primary,
        (con.oid IS NOT NULL)                           AS is_constraint,
        (ix.indpred IS NOT NULL)                        AS is_partial,
        (ix.indexprs IS NOT NULL)                       AS is_expression,
        am.amname                                       AS method,
        pg_get_indexdef(i.oid)                          AS definition
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON am.oid = i.relam
      LEFT JOIN pg_constraint con
        ON con.conindid = i.oid AND con.contype IN ('p', 'u', 'x')
      WHERE ix.indislive
    ),
    fks AS (
      SELECT
        co.conrelid                                     AS oid,
        co.conname                                      AS name,
        co.conkey::int[]                                AS columns,
        co.confrelid::regclass::text                    AS references_table
      FROM pg_constraint co
      WHERE co.contype = 'f'
    )
    SELECT
      r.schema_name,
      r.table_name,
      r.oid::int                                        AS oid,
      r.is_partition,
      r.replica_identity::text                          AS replica_identity,
      r.estimated_rows::float8                          AS estimated_rows,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'name', x.name,
          'columns', to_jsonb(x.columns),
          'columnNames', to_jsonb(${columnNamesExpr('x')}),
          'unique', x.is_unique,
          'primary', x.is_primary,
          'constraint', x.is_constraint,
          'partial', x.is_partial,
          'expression', x.is_expression,
          'method', x.method,
          'definition', x.definition
        ) ORDER BY x.name) FROM indexes x WHERE x.oid = r.oid),
        '[]'::jsonb
      )                                                 AS indexes,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'name', f.name,
          'columns', to_jsonb(f.columns),
          'columnNames', to_jsonb(${columnNamesExpr('f')}),
          'references', f.references_table
        ) ORDER BY f.name) FROM fks f WHERE f.oid = r.oid),
        '[]'::jsonb
      )                                                 AS foreign_keys,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'name', a.attname,
          'attnum', a.attnum,
          'type', format_type(a.atttypid, a.atttypmod),
          'baseType', t.typname,
          'notNull', a.attnotnull,
          'defaultExpr', pg_get_expr(d.adbin, d.adrelid)
        ) ORDER BY a.attnum)
         FROM pg_attribute a
         JOIN pg_type t ON t.oid = a.atttypid
         LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped),
        '[]'::jsonb
      )                                                 AS columns
    FROM rels r
    ORDER BY r.schema_name, r.table_name
  `;

  const { rows } = await exec.query<{
    schema_name: string;
    table_name: string;
    oid: number;
    is_partition: boolean;
    replica_identity: string;
    estimated_rows: number;
    indexes: IndexInfo[];
    foreign_keys: ForeignKeyInfo[];
    columns: ColumnInfo[];
  }>(sql, [options.schemas ?? [], excludes, options.extensions?.ignore ?? []]);

  return rows.map((r) => ({
    schema: r.schema_name,
    name: r.table_name,
    oid: r.oid,
    isPartition: r.is_partition,
    replicaIdentity: r.replica_identity,
    hasPrimaryKey: r.indexes.some((i) => i.primary),
    estimatedRows: Number(r.estimated_rows),
    columns: r.columns,
    indexes: r.indexes,
    foreignKeys: r.foreign_keys
  }));
}

/** A view (or materialized view) with everything an access check needs. */
export interface ViewSnapshot {
  schema: string;
  name: string;
  /**
   * The role a non-`security_invoker` view executes as. Postgres checks the
   * base relations' ACLs and policies against *this* role, not the caller's.
   */
  owner: string;
  /** `relkind = 'm'` — stored rows, so a query never touches the bases. */
  materialized: boolean;
  /**
   * `reloptions.security_invoker`. When true the view executes as the caller
   * and confers nothing; when false (the default) it executes as `owner`.
   */
  securityInvoker: boolean;
  /** The owner is a superuser or has BYPASSRLS: the bases' policies never run. */
  ownerBypassesRls: boolean;
  /** ACL rows on the view itself, in the same shape as a table's. */
  grants: GrantInfo[];
  /** `pg_get_viewdef()` — the body, as SQL text. */
  definition: string;
}

/**
 * Every view and materialized view in scope, with its owner, its
 * `security_invoker` setting and its own ACL.
 *
 * The definition alone answers "is this column read by anything" (see
 * {@link classifyPaths}); the owner and `security_invoker` answer *whose*
 * privileges the read runs under, which is what the view-ownership reach edge
 * needs (L8).
 */
export async function introspectViews(
  exec: QueryExecutor,
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas'> = {}
): Promise<ViewSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;

  const { rows } = await exec.query<{
    schema_name: string;
    view_name: string;
    owner: string;
    materialized: boolean;
    security_invoker: boolean;
    owner_bypasses_rls: boolean;
    grants: Array<{ role: string; privilege: string; grantable: boolean; bypassRls: boolean }>;
    definition: string;
  }>(
    // Both parameters are referenced (even when only one filters) so Postgres
    // can infer their types — an unused $N errors out at bind time.
    `WITH _params AS (
       SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
     ),
     views AS (
       SELECT
         n.nspname                                AS schema_name,
         c.relname                                AS view_name,
         c.oid                                    AS oid,
         c.relkind = 'm'                          AS materialized,
         pg_catalog.pg_get_userbyid(c.relowner)   AS owner,
         COALESCE(o.rolsuper OR o.rolbypassrls, false) AS owner_bypasses_rls,
         COALESCE(
           (SELECT option_value FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'security_invoker'),
           'false'
         ) = 'true'                               AS security_invoker,
         c.relacl                                 AS relacl,
         pg_get_viewdef(c.oid)                    AS definition
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_roles o ON o.oid = c.relowner
       WHERE c.relkind IN ('v', 'm')
         ${schemaFilter}
     ),
     grants AS (
       SELECT
         v.oid,
         CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
         a.privilege_type,
         a.is_grantable,
         CASE
           WHEN a.grantee = 0 THEN false
           ELSE COALESCE(rol.rolsuper OR rol.rolbypassrls, false)
         END AS bypass_rls
       FROM views v, aclexplode(v.relacl) a
       LEFT JOIN pg_roles rol ON rol.oid = a.grantee
       WHERE v.relacl IS NOT NULL
     )
     SELECT
       v.schema_name,
       v.view_name,
       v.owner,
       v.materialized,
       v.security_invoker,
       v.owner_bypasses_rls,
       v.definition,
       COALESCE(
         (SELECT jsonb_agg(jsonb_build_object(
           'role', g.grantee,
           'privilege', g.privilege_type,
           'grantable', g.is_grantable,
           'bypassRls', g.bypass_rls
         )) FROM grants g WHERE g.oid = v.oid),
         '[]'::jsonb
       )                                          AS grants
     FROM views v
     ORDER BY v.schema_name, v.view_name`,
    [options.schemas ?? [], excludes]
  );

  return rows.map((r) => ({
    schema: r.schema_name,
    name: r.view_name,
    owner: r.owner,
    materialized: r.materialized,
    securityInvoker: r.security_invoker,
    ownerBypassesRls: r.owner_bypasses_rls,
    grants: r.grants.map((g) => ({
      role: g.role,
      privilege: g.privilege as GrantInfo['privilege'],
      grantable: g.grantable,
      bypassRls: g.bypassRls
    })),
    definition: r.definition
  }));
}

/**
 * Every view and materialized-view body in scope, as SQL text.
 *
 * A column named in a view definition is read by something, which is the
 * cheapest available refutation of "nothing queries this column" — see
 * {@link classifyPaths}.
 */
export async function introspectViewBodies(
  exec: QueryExecutor,
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas'> = {}
): Promise<string[]> {
  return (await introspectViews(exec, options)).map((v) => v.definition);
}

/**
 * Resolve attribute numbers to column names for the relation `alias.oid`.
 * `0` (an expression column) renders as `(expr)` so positions stay aligned.
 */
function columnNamesExpr(alias: string): string {
  return `(
    SELECT COALESCE(array_agg(
      COALESCE((
        SELECT att.attname
        FROM pg_attribute att
        WHERE att.attrelid = ${alias}.oid AND att.attnum = k.attnum
      ), '(expr)') ORDER BY k.ord
    ), ARRAY[]::text[])
    FROM unnest(${alias}.columns) WITH ORDINALITY AS k(attnum, ord)
  )`;
}
