/**
 * ACLs on the relations that are not tables.
 *
 * `introspectTables` reads `relkind IN ('r','p')` and `introspectViews` reads
 * views and matviews, which leaves two kinds of relation carrying privileges
 * that nothing in this package ever looked at:
 *
 *   - **sequences** (`relkind = 'S'`), where `USAGE`/`UPDATE` let a role call
 *     `nextval`/`setval` and `SELECT` lets it read `last_value`; and
 *   - **foreign tables** (`relkind = 'f'`), which cannot carry RLS at all —
 *     `ALTER FOREIGN TABLE ... ENABLE ROW LEVEL SECURITY` is rejected by
 *     Postgres (verified on 18), so a grant on one is never row-filtered.
 *
 * Both are read here rather than folded into the table snapshot: neither has
 * RLS state, policies or column ACLs, and giving them a `TableSnapshot` with
 * those fields stubbed out would invite every table rule to grade something it
 * does not understand.
 */

import type { GrantInfo, IntrospectOptions, QueryExecutor } from './introspect';

export type PgObjectKind = 'sequence' | 'foreign table';

export interface ObjectAclSnapshot {
  schema: string;
  name: string;
  kind: PgObjectKind;
  owner: string;
  grants: GrantInfo[];
  /** The foreign server behind a foreign table; absent for a sequence. */
  server?: string;
  /**
   * For a sequence, the `schema.table.column` it is attached to by an
   * `OWNED BY` dependency (a `serial`/identity column records one). A role
   * that inserts into that table legitimately needs `USAGE`, which is what
   * keeps the sequence rule from recommending a revoke.
   */
  ownedBy?: string;
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

export async function introspectObjectAcls(
  exec: QueryExecutor,
  options: IntrospectOptions = {}
): Promise<ObjectAclSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? 'AND n.nspname = ANY($1::text[])'
    : 'AND NOT (n.nspname = ANY($2::text[]))';

  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
    ),
    rels AS (
      SELECT
        n.nspname                              AS schema_name,
        c.relname                              AS object_name,
        c.oid                                  AS oid,
        c.relkind                              AS relkind,
        pg_catalog.pg_get_userbyid(c.relowner) AS owner,
        c.relacl                               AS relacl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('S', 'f')
        ${schemaFilter}
    ),
    grants AS (
      SELECT
        r.oid,
        CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
        a.privilege_type,
        a.is_grantable,
        CASE
          WHEN a.grantee = 0 THEN false
          ELSE COALESCE(rol.rolsuper OR rol.rolbypassrls, false)
        END AS bypass_rls
      FROM rels r, aclexplode(r.relacl) a
      LEFT JOIN pg_roles rol ON rol.oid = a.grantee
      WHERE r.relacl IS NOT NULL
    ),
    -- A serial/identity column records an OWNED BY dependency on its
    -- sequence. The role inserting into that table needs USAGE on it, so the
    -- link is what separates a load-bearing grant from a gratuitous one.
    owners AS (
      SELECT
        d.objid AS seq_oid,
        n.nspname || '.' || c.relname || '.' || a.attname AS owned_by
      FROM pg_depend d
      JOIN pg_class c ON c.oid = d.refobjid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
      WHERE d.classid = 'pg_class'::regclass
        AND d.refclassid = 'pg_class'::regclass
        AND d.deptype IN ('a', 'i')
        AND d.objid IN (SELECT oid FROM rels WHERE relkind = 'S')
    )
    SELECT
      r.schema_name,
      r.object_name,
      r.relkind,
      r.owner,
      o.owned_by,
      srv.srvname AS server_name,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'role', g.grantee,
            'privilege', g.privilege_type,
            'grantable', g.is_grantable,
            'bypassRls', g.bypass_rls
          ) ORDER BY g.grantee, g.privilege_type)
          FROM grants g
          WHERE g.oid = r.oid
        ),
        '[]'::jsonb
      ) AS grants
    FROM rels r
    LEFT JOIN owners o ON o.seq_oid = r.oid
    LEFT JOIN pg_foreign_table ft ON ft.ftrelid = r.oid
    LEFT JOIN pg_foreign_server srv ON srv.oid = ft.ftserver
    ORDER BY r.schema_name, r.object_name
  `;

  const { rows } = await exec.query<{
    schema_name: string;
    object_name: string;
    relkind: string;
    owner: string;
    owned_by: string | null;
    server_name: string | null;
    grants: GrantInfo[];
  }>(sql, [options.schemas ?? null, excludes]);

  return rows.map((r) => ({
    schema: r.schema_name,
    name: r.object_name,
    kind: r.relkind === 'S' ? ('sequence' as const) : ('foreign table' as const),
    owner: r.owner,
    grants: r.grants,
    ...(r.server_name ? { server: r.server_name } : {}),
    ...(r.owned_by ? { ownedBy: r.owned_by } : {})
  }));
}
