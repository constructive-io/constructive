/**
 * Single-query catalog introspection for the safegres audit.
 *
 * Pulls every relation + every policy + (parsed) role ACL per role in one shot,
 * so Script A can process the whole database from one in-memory snapshot.
 */

import type { Client, Pool } from 'pg';

/** Minimal query interface — accepts pg.Client, pg.Pool, or any `{ query }`. */
export interface QueryExecutor {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/**
 * `USAGE` never appears on a table — it is the sequence privilege (`nextval`),
 * and `EXECUTE` is the function one. Both are in this union because sequences
 * and functions are graded through the same grant closure as everything else,
 * and a reach path routinely starts on one and ends on a table.
 */
export type PgPrivilege =
  | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'REFERENCES' | 'TRIGGER'
  | 'USAGE' | 'EXECUTE';

/**
 * Mapping of ACL single-letter codes (from `aclexplode`) to our privilege names.
 * `r` = SELECT, `a` = INSERT, `w` = UPDATE, `d` = DELETE, etc.
 */
export const ACL_PRIVILEGE_MAP: Record<string, PgPrivilege> = {
  r: 'SELECT',
  a: 'INSERT',
  w: 'UPDATE',
  d: 'DELETE',
  D: 'TRUNCATE',
  x: 'REFERENCES',
  t: 'TRIGGER'
};

export interface GrantInfo {
  role: string;
  privilege: PgPrivilege;
  /** Was the grant delegated (i.e. `WITH GRANT OPTION`). */
  grantable: boolean;
  /**
   * `true` if the grantee role is a superuser or has `BYPASSRLS`. RLS policies
   * do not apply to this role, so coverage findings are suppressed for it.
   * `false` for `PUBLIC` and all other grantees.
   */
  bypassRls: boolean;
}

/**
 * A grant on one column (`pg_attribute.attacl`), which Postgres keeps entirely
 * separate from the table's own ACL: `GRANT SELECT (secret) ON t TO anon`
 * leaves `relacl` untouched, so any analysis that reads only `relacl`
 * concludes the role reaches nothing.
 *
 * Only SELECT, INSERT, UPDATE and REFERENCES can be column-scoped.
 */
export interface ColumnGrantInfo extends GrantInfo {
  column: string;
}

/** `pg_policy.polcmd` uses: `r` SELECT, `a` INSERT, `w` UPDATE, `d` DELETE, `*` ALL. */
export type PolicyCmd = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

export const POLICY_CMD_MAP: Record<string, PolicyCmd> = {
  r: 'SELECT',
  a: 'INSERT',
  w: 'UPDATE',
  d: 'DELETE',
  '*': 'ALL'
};

export interface PolicyInfo {
  name: string;
  cmd: PolicyCmd;
  permissive: boolean;
  /** Role names the policy applies to. `['PUBLIC']` if `polroles = {0}`. */
  roles: string[];
  using: string | null;
  withCheck: string | null;
}

export interface TableSnapshot {
  schema: string;
  name: string;
  oid: number;
  rlsEnabled: boolean;
  rlsForced: boolean;
  /** `true` if the table is partitioned or is a view — used to skip irrelevant findings. */
  isPartitioned: boolean;
  owner: string;
  grants: GrantInfo[];
  /**
   * Grants on individual columns. Disjoint from {@link TableSnapshot.grants}:
   * a column grant never appears in `relacl`, and a table grant never appears
   * in `attacl`, so a role can reach a relation through this list alone.
   */
  columnGrants: ColumnGrantInfo[];
  policies: PolicyInfo[];
}

export interface IntrospectOptions {
  /** Schemas to include. If omitted, all non-system schemas. */
  schemas?: string[];
  /**
   * Schemas to exclude. Applied on top of `schemas`.
   * Defaults to `['pg_catalog', 'information_schema', 'pg_toast']`.
   */
  excludeSchemas?: string[];
  /**
   * Roles to include when reporting grants. If omitted, all roles returned
   * by {@link listAuditableRoles}.
   */
  roles?: string[];
  /**
   * How to treat relations that belong to an installed extension.
   * Defaults to skipping them: they are the extension author's to secure and
   * tune, not the application's, and they cannot be altered without breaking
   * `pg_dump`/upgrade.
   */
  extensions?: ExtensionScopeOptions;
}

/**
 * Extension relations are the `node_modules` of a database: physically present,
 * scanned like anything else, and not yours to edit.
 */
export interface ExtensionScopeOptions {
  /**
   * Skip relations an extension owns (`pg_depend.deptype = 'e'`) and their
   * partitions. Default `true`.
   */
  skipOwned?: boolean;
  /**
   * Extension names whose *schemas* are skipped wholesale, for objects the
   * extension creates at runtime and never registers as dependencies —
   * `pg_partman`'s child partitions and templates being the motivating case.
   * Unknown/uninstalled names are ignored.
   */
  ignore?: string[];
}

/**
 * SQL predicate excluding extension relations, for a query where `c` is the
 * `pg_class` row and `n` its namespace. `paramIndex` is the bind position
 * holding {@link ExtensionScopeOptions.ignore}.
 */
export function extensionFilter(options: ExtensionScopeOptions | undefined, paramIndex: number): string {
  const skipOwned = options?.skipOwned ?? true;
  const clauses: string[] = [];
  if (skipOwned) {
    // A partition carries no extension dependency of its own, so ownership
    // has to be read off the partition tree it belongs to — at any depth.
    clauses.push(`
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass
          AND d.refclassid = 'pg_extension'::regclass
          AND d.deptype = 'e'
          AND (
            d.objid = c.oid
            OR d.objid IN (SELECT relid FROM pg_partition_ancestors(c.oid))
          )
      )`);
  }
  clauses.push(`
      AND NOT (n.oid = ANY (
        SELECT e.extnamespace FROM pg_extension e WHERE e.extname = ANY($${paramIndex}::text[])
      ))`);
  return clauses.join('');
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

/**
 * One-query snapshot of every table + its policies + its grants expanded per role.
 *
 * We deliberately avoid views that hide permissive vs restrictive distinctions
 * (like `pg_policies`) — `pg_policy` gives us `polpermissive` directly.
 */
export async function introspectTables(
  exec: QueryExecutor,
  options: IntrospectOptions = {}
): Promise<TableSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];

  // PUBLIC (grantee oid 0) always survives the role filter: it is not a role
  // that can be included or excluded — it is every role, including every one
  // in the filter.
  const roleFilter = options.roles && options.roles.length > 0
    ? `AND (g.grantee_oid = 0 OR rol.rolname = ANY($3::text[]))`
    : '';
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;
  const extFilter = extensionFilter(options.extensions, 4);

  // We reference every param at least once (even if trivially) so Postgres
  // can infer types for all of them. Unused parameters otherwise error with
  // "could not determine data type of parameter $N".
  const sql = `
    WITH _params AS (
      SELECT
        $1::text[] AS include_schemas,
        $2::text[] AS exclude_schemas,
        $3::text[] AS role_filter,
        $4::text[] AS ignore_extensions
    ),
    rels AS (
      SELECT
        n.nspname                                       AS schema_name,
        c.relname                                       AS table_name,
        c.oid                                           AS oid,
        c.relrowsecurity                                AS rls_enabled,
        c.relforcerowsecurity                           AS rls_forced,
        (c.relkind = 'p')                               AS is_partitioned,
        pg_catalog.pg_get_userbyid(c.relowner)          AS owner,
        c.relacl                                        AS relacl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        ${schemaFilter}${extFilter}
    ),
    grants_exploded AS (
      SELECT
        r.oid,
        (aclexplode(r.relacl)).grantee      AS grantee_oid,
        (aclexplode(r.relacl)).privilege_type AS privilege_type,
        (aclexplode(r.relacl)).is_grantable  AS is_grantable
      FROM rels r
      WHERE r.relacl IS NOT NULL
    ),
    grants AS (
      SELECT
        g.oid,
        CASE WHEN g.grantee_oid = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
        g.privilege_type,
        g.is_grantable,
        CASE
          WHEN g.grantee_oid = 0 THEN false
          ELSE COALESCE(rol.rolsuper OR rol.rolbypassrls, false)
        END AS bypass_rls
      FROM grants_exploded g
      LEFT JOIN pg_roles rol ON rol.oid = g.grantee_oid
      WHERE true
        ${roleFilter}
    ),
    -- Column ACLs live on pg_attribute, not pg_class: a column grant is
    -- invisible to relacl, and this is the only place it surfaces.
    col_grants_exploded AS (
      SELECT
        r.oid,
        a.attname                             AS column_name,
        (aclexplode(a.attacl)).grantee        AS grantee_oid,
        (aclexplode(a.attacl)).privilege_type AS privilege_type,
        (aclexplode(a.attacl)).is_grantable   AS is_grantable
      FROM rels r
      JOIN pg_attribute a ON a.attrelid = r.oid
      WHERE a.attacl IS NOT NULL
        AND a.attnum > 0
        AND NOT a.attisdropped
    ),
    col_grants AS (
      SELECT
        g.oid,
        g.column_name,
        CASE WHEN g.grantee_oid = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
        g.privilege_type,
        g.is_grantable,
        CASE
          WHEN g.grantee_oid = 0 THEN false
          ELSE COALESCE(rol.rolsuper OR rol.rolbypassrls, false)
        END AS bypass_rls
      FROM col_grants_exploded g
      LEFT JOIN pg_roles rol ON rol.oid = g.grantee_oid
      WHERE true
        ${roleFilter}
    ),
    policies AS (
      SELECT
        p.polrelid                                  AS oid,
        p.polname                                   AS name,
        p.polcmd                                    AS cmd,
        p.polpermissive                             AS permissive,
        CASE
          WHEN p.polroles = ARRAY[0]::oid[] THEN ARRAY['PUBLIC']
          ELSE COALESCE(
            (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(p.polroles)),
            ARRAY[]::text[]
          )
        END                                          AS roles,
        pg_get_expr(p.polqual, p.polrelid)          AS using_expr,
        pg_get_expr(p.polwithcheck, p.polrelid)     AS with_check_expr
      FROM pg_policy p
    )
    SELECT
      r.schema_name,
      r.table_name,
      r.oid::int                                          AS oid,
      r.rls_enabled,
      r.rls_forced,
      r.is_partitioned,
      r.owner,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'role', g.grantee,
          'privilege', g.privilege_type,
          'grantable', g.is_grantable,
          'bypassRls', g.bypass_rls
        )) FROM grants g WHERE g.oid = r.oid),
        '[]'::jsonb
      )                                                   AS grants,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'role', g.grantee,
          'column', g.column_name,
          'privilege', g.privilege_type,
          'grantable', g.is_grantable,
          'bypassRls', g.bypass_rls
        ) ORDER BY g.grantee, g.column_name, g.privilege_type)
         FROM col_grants g WHERE g.oid = r.oid),
        '[]'::jsonb
      )                                                   AS column_grants,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'name', p.name,
          'cmd', p.cmd::text,
          'permissive', p.permissive,
          'roles', to_jsonb(p.roles),
          'using', p.using_expr,
          'withCheck', p.with_check_expr
        )) FROM policies p WHERE p.oid = r.oid),
        '[]'::jsonb
      )                                                   AS policies
    FROM rels r
    ORDER BY r.schema_name, r.table_name
  `;

  const params: unknown[] = [
    options.schemas ?? [],
    excludes,
    options.roles ?? [],
    options.extensions?.ignore ?? []
  ];

  const { rows } = await exec.query<{
    schema_name: string;
    table_name: string;
    oid: number;
    rls_enabled: boolean;
    rls_forced: boolean;
    is_partitioned: boolean;
    owner: string;
    grants: Array<{ role: string; privilege: string; grantable: boolean; bypassRls: boolean }>;
    column_grants: Array<{
      role: string;
      column: string;
      privilege: string;
      grantable: boolean;
      bypassRls: boolean;
    }>;
    policies: Array<{
      name: string;
      cmd: string;
      permissive: boolean;
      roles: string[];
      using: string | null;
      withCheck: string | null;
    }>;
  }>(sql, params);

  return rows.map((r) => ({
    schema: r.schema_name,
    name: r.table_name,
    oid: r.oid,
    rlsEnabled: r.rls_enabled,
    rlsForced: r.rls_forced,
    isPartitioned: r.is_partitioned,
    owner: r.owner,
    grants: r.grants.map((g) => ({
      role: g.role,
      privilege: normalizePrivilege(g.privilege),
      grantable: g.grantable,
      bypassRls: g.bypassRls === true
    })),
    columnGrants: r.column_grants.map((g) => ({
      role: g.role,
      column: g.column,
      privilege: normalizePrivilege(g.privilege),
      grantable: g.grantable,
      bypassRls: g.bypassRls === true
    })),
    policies: r.policies.map((p) => ({
      name: p.name,
      cmd: POLICY_CMD_MAP[p.cmd] ?? 'ALL',
      permissive: p.permissive,
      roles: p.roles,
      using: p.using,
      withCheck: p.withCheck
    }))
  }));
}

function normalizePrivilege(raw: string): PgPrivilege {
  const upper = raw.toUpperCase();
  switch (upper) {
  case 'SELECT':
  case 'INSERT':
  case 'UPDATE':
  case 'DELETE':
  case 'TRUNCATE':
  case 'REFERENCES':
  case 'TRIGGER':
    return upper;
  default:
    // `r`, `a`, `w`, `d` — ACL single-letter form
    return ACL_PRIVILEGE_MAP[raw] ?? 'SELECT';
  }
}

/**
 * Convenience: accept any of `pg.Client` / `pg.Pool` / a custom executor.
 */
export function asExecutor(client: Client | Pool | QueryExecutor): QueryExecutor {
  return client as QueryExecutor;
}
