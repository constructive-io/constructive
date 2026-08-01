/**
 * Catalog introspection for the performance dimension: indexes, foreign-key
 * constraints, primary keys, and replica identity, in one query.
 *
 * Kept separate from {@link introspectTables} so a security-only audit never
 * pays for it.
 */

import type { IntrospectOptions, QueryExecutor } from './introspect';

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
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas'> = {}
): Promise<TableIndexSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;

  // Both parameters are referenced (even when only one filters) so Postgres
  // can infer their types — an unused $N errors out at bind time.
  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
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
        ${schemaFilter}
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
  }>(sql, [options.schemas ?? [], excludes]);

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
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;

  const { rows } = await exec.query<{ definition: string }>(
    // Both parameters are referenced (even when only one filters) so Postgres
    // can infer their types — an unused $N errors out at bind time.
    `WITH _params AS (
       SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
     )
     SELECT pg_get_viewdef(c.oid) AS definition
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('v', 'm')
       ${schemaFilter}`,
    [options.schemas ?? [], excludes]
  );
  return rows.map((r) => r.definition);
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
