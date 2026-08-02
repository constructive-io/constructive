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
  /**
   * `reloptions.security_barrier`. Without it the planner may push a caller's
   * own qual below the view's `WHERE`, so a leaky operator or function sees
   * the rows the view filters out — the view is a filter, not a boundary.
   */
  securityBarrier: boolean;
  /** The owner is a superuser or has BYPASSRLS: the bases' policies never run. */
  ownerBypassesRls: boolean;
  /** ACL rows on the view itself, in the same shape as a table's. */
  grants: GrantInfo[];
  /** `pg_get_viewdef()` — the body, as SQL text. */
  definition: string;
  /**
   * The columns of each relation the view body actually reads, from the
   * `pg_depend` rows on the view's `_RETURN` rule. The catalog answers this
   * exactly — `SELECT *` is expanded at CREATE time, expressions and joins
   * are accounted for, and a nested view depends on the *inner view's*
   * columns, so the list is per hop. Absent when the caller built the
   * snapshot without it.
   */
  columnDeps?: Array<{ schema: string; table: string; columns: string[] }>;
  /**
   * The write commands Postgres accepts on the view, from
   * `pg_relation_is_updatable`. A simple view is *auto-updatable*: the write
   * is rewritten onto its single base relation, and on a definer view that
   * rewrite runs with the owner's privileges — a write edge the body alone
   * cannot prove, which is why it is read from the catalog.
   *
   * The bitmask also counts updatability conferred by rules and `INSTEAD OF`
   * triggers, so it is only auto-updatability when {@link rules} is empty and
   * {@link insteadOfTriggers} is false.
   */
  writable: Array<'INSERT' | 'UPDATE' | 'DELETE'>;
  /** The view has `INSTEAD OF` triggers: writes go wherever their bodies say. */
  insteadOfTriggers: boolean;
  /**
   * Those triggers, with the function each one runs. A write against the view
   * becomes that function's body, and the body is permission-checked against
   * the *function's* effective user — the caller, unless the function is
   * SECURITY DEFINER. The view's own owner does not enter into it, which is
   * why the trigger function has to be named rather than assumed.
   */
  insteadOf: InsteadOfTrigger[];
  /**
   * `WITH [LOCAL | CASCADED] CHECK OPTION`, from `reloptions.check_option`.
   * `'none'` — the default — means the view's own `WHERE` constrains which
   * rows come *out* and nothing about which rows go *in*: a writer can insert
   * or update rows the view will not then show them, straight past the filter
   * the view exists to apply. `'local'` enforces this view's condition,
   * `'cascaded'` also enforces every underlying view's.
   */
  checkOption: 'none' | 'local' | 'cascaded';
  /**
   * Rewrite rules other than the view's own `_RETURN` SELECT rule. These are
   * invisible to `pg_get_viewdef`, and their actions are permission-checked
   * against the *rule's table owner* — the view owner — regardless of
   * `security_invoker`, which only governs the view's own base relations.
   */
  rules: ViewRule[];
}

/** An `INSTEAD OF` trigger on a view, and the function it fires. */
export interface InsteadOfTrigger {
  name: string;
  /** The commands on the view that fire it. */
  events: Array<'INSERT' | 'UPDATE' | 'DELETE'>;
  functionSchema: string;
  functionName: string;
}

/** A rewrite rule on a view, other than the `_RETURN` rule that defines it. */
export interface ViewRule {
  name: string;
  /** The command on the view that fires the rule. */
  event: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  /** `DO INSTEAD` — the original command is replaced by the rule's actions. */
  instead: boolean;
  /** `pg_get_ruledef()` — the whole `CREATE RULE`, actions included. */
  definition: string;
}

/** `pg_rewrite.ev_type` is a char code, not the command name. */
const RULE_EVENTS: Record<string, ViewRule['event']> = {
  1: 'SELECT',
  2: 'UPDATE',
  3: 'INSERT',
  4: 'DELETE'
};

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
    security_barrier: boolean;
    owner_bypasses_rls: boolean;
    grants: Array<{ role: string; privilege: string; grantable: boolean; bypassRls: boolean }>;
    definition: string;
    column_deps: Array<{ schema: string; table: string; columns: string[] }>;
    updatable_bits: number;
    check_option: string;
    instead_of_triggers: boolean;
    instead_of: Array<{ name: string; tgtype: number; fnSchema: string; fnName: string }>;
    rules: Array<{ name: string; event: string; instead: boolean; definition: string }>;
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
         -- Postgres stores a boolean reloption verbatim, so this is any of
         -- true/on/1/yes/t/y depending on how the view was written; the cast
         -- accepts every spelling the option itself accepts, and reloption
         -- validation at CREATE time guarantees it parses.
         COALESCE(
           (SELECT option_value FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'security_invoker'),
           'false'
         )::boolean                               AS security_invoker,
         -- Same spelling latitude, and the same reason to read it: a view
         -- used as a row filter is only a boundary when it is a barrier.
         COALESCE(
           (SELECT option_value FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'security_barrier'),
           'false'
         )::boolean                               AS security_barrier,
         c.relacl                                 AS relacl,
         pg_get_viewdef(c.oid)                    AS definition,
         -- Bitmask over 1 << CMD_*: UPDATE 4, INSERT 8, DELETE 16. The second
         -- argument asks the same question the rewriter asks at runtime, so
         -- rules and INSTEAD OF triggers count towards it too.
         pg_relation_is_updatable(c.oid, true)    AS updatable_bits,
         -- 'local' | 'cascaded' when the view was created WITH CHECK OPTION,
         -- absent otherwise. Unlike the boolean reloptions above this one is
         -- already a keyword, so it needs no cast.
         COALESCE(
           (SELECT option_value FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'check_option'),
           'none'
         )                                        AS check_option,
         -- TRIGGER_TYPE_INSTEAD = 1 << 6.
         EXISTS (
           SELECT 1 FROM pg_trigger t
           WHERE t.tgrelid = c.oid AND NOT t.tgisinternal AND (t.tgtype & 64) <> 0
         )                                        AS instead_of_triggers
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
     ),
     -- Which columns of which relation the view body reads. The rewriter
     -- records one pg_depend row per referenced column, so this is the
     -- catalog's own answer to "what escapes through this view" — no parsing,
     -- no star expansion, no alias resolution.
     column_deps AS (
       SELECT DISTINCT
         r.ev_class    AS view_oid,
         dn.nspname    AS dep_schema,
         dc.relname    AS dep_table,
         a.attname     AS dep_column
       FROM pg_depend d
       JOIN pg_rewrite r ON r.oid = d.objid AND d.classid = 'pg_rewrite'::regclass
       JOIN views v ON v.oid = r.ev_class
       JOIN pg_class dc ON dc.oid = d.refobjid
       JOIN pg_namespace dn ON dn.oid = dc.relnamespace
       JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
       WHERE d.refclassid = 'pg_class'::regclass
         AND d.refobjsubid > 0
         AND r.ev_class <> d.refobjid
     ),
     instead_of AS (
       -- The same TRIGGER_TYPE_INSTEAD bit as above, but carrying the function:
       -- where a write against the view actually goes is in that body.
       SELECT
         t.tgrelid  AS oid,
         t.tgname,
         t.tgtype,
         pn.nspname AS fn_schema,
         p.proname  AS fn_name
       FROM pg_trigger t
       JOIN views v ON v.oid = t.tgrelid
       JOIN pg_proc p ON p.oid = t.tgfoid
       JOIN pg_namespace pn ON pn.oid = p.pronamespace
       WHERE NOT t.tgisinternal AND (t.tgtype & 64) <> 0
     ),
     rules AS (
       -- _RETURN is the SELECT rule that *is* the view; every other rule is
       -- behaviour pg_get_viewdef does not show.
       SELECT
         r.ev_class AS oid,
         r.rulename,
         r.ev_type,
         r.is_instead,
         pg_get_ruledef(r.oid) AS definition
       FROM pg_rewrite r
       JOIN views v ON v.oid = r.ev_class
       WHERE r.rulename <> '_RETURN'
     )
     SELECT
       v.schema_name,
       v.view_name,
       v.owner,
       v.materialized,
       v.security_invoker,
       v.security_barrier,
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
       )                                          AS grants,
       COALESCE(
         (SELECT jsonb_agg(t) FROM (
           SELECT jsonb_build_object(
             'schema', cd.dep_schema,
             'table', cd.dep_table,
             'columns', jsonb_agg(cd.dep_column ORDER BY cd.dep_column)
           ) AS t
           FROM column_deps cd
           WHERE cd.view_oid = v.oid
           GROUP BY cd.dep_schema, cd.dep_table
         ) deps),
         '[]'::jsonb
       )                                          AS column_deps,
       v.updatable_bits,
       v.check_option,
       v.instead_of_triggers,
       COALESCE(
         (SELECT jsonb_agg(jsonb_build_object(
           'name', i.tgname,
           'tgtype', i.tgtype,
           'fnSchema', i.fn_schema,
           'fnName', i.fn_name
         )) FROM instead_of i WHERE i.oid = v.oid),
         '[]'::jsonb
       )                                          AS instead_of,
       COALESCE(
         (SELECT jsonb_agg(jsonb_build_object(
           'name', r.rulename,
           'event', r.ev_type,
           'instead', r.is_instead,
           'definition', r.definition
         )) FROM rules r WHERE r.oid = v.oid),
         '[]'::jsonb
       )                                          AS rules
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
    securityBarrier: r.security_barrier,
    ownerBypassesRls: r.owner_bypasses_rls,
    grants: r.grants.map((g) => ({
      role: g.role,
      privilege: g.privilege as GrantInfo['privilege'],
      grantable: g.grantable,
      bypassRls: g.bypassRls
    })),
    definition: r.definition,
    columnDeps: r.column_deps,
    writable: [
      ...(r.updatable_bits & 8 ? ['INSERT' as const] : []),
      ...(r.updatable_bits & 4 ? ['UPDATE' as const] : []),
      ...(r.updatable_bits & 16 ? ['DELETE' as const] : [])
    ],
    checkOption: r.check_option === 'local' || r.check_option === 'cascaded'
      ? r.check_option
      : 'none',
    insteadOfTriggers: r.instead_of_triggers,
    insteadOf: r.instead_of.map((t) => ({
      name: t.name,
      // tgtype bits: INSERT 1 << 2, DELETE 1 << 3, UPDATE 1 << 4.
      events: [
        ...(t.tgtype & 4 ? ['INSERT' as const] : []),
        ...(t.tgtype & 16 ? ['UPDATE' as const] : []),
        ...(t.tgtype & 8 ? ['DELETE' as const] : [])
      ],
      functionSchema: t.fnSchema,
      functionName: t.fnName
    })),
    rules: r.rules.flatMap((rule) => {
      const event = RULE_EVENTS[rule.event];
      return event
        ? [{ name: rule.name, event, instead: rule.instead, definition: rule.definition }]
        : [];
    })
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
