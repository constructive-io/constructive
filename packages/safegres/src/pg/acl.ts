/**
 * Role-graph and schema-ACL introspection for the grant/policy lattice.
 *
 * The table snapshot reports grants exactly as the catalog stores them —
 * `GRANT TO PUBLIC` is one row, membership in a granted role is zero rows.
 * The lattice rules reason about *effective* access, which needs:
 *
 *   - the role inheritance closure (`pg_auth_members`, INHERIT-respecting);
 *   - which roles bypass RLS entirely (superuser / BYPASSRLS);
 *   - schema USAGE ACLs (an object grant without USAGE on its schema is
 *     unreachable);
 *   - whether a schema holds any function the role can EXECUTE (so "dead
 *     schema USAGE" doesn't false-positive on function-only schemas).
 */

import type { QueryExecutor } from './introspect';

export interface RoleAttributes {
  name: string;
  /** Superuser or BYPASSRLS — policies never apply. */
  bypassRls: boolean;
  /** Superuser — ACL checks never apply either. */
  isSuper: boolean;
  /**
   * Roles this role inherits privileges from, transitively. Only memberships
   * that actually confer inheritance (INHERIT) are followed.
   */
  inheritsFrom: string[];
  /**
   * Roles this role can assume with `SET ROLE`, transitively. Distinct from
   * `inheritsFrom`: on PG16+ a membership can confer the ability to `SET ROLE`
   * (`pg_auth_members.set_option`) *without* passive inheritance, so a role
   * that reaches nothing by inheritance can still execute with a target
   * role's full privileges by assuming it. Excludes the role itself.
   */
  canSetRole: string[];
}

export interface SchemaAclGrant {
  role: string; // 'PUBLIC' for grantee oid 0
  privilege: 'USAGE' | 'CREATE';
}

export interface SchemaAclInfo {
  schema: string;
  owner: string;
  grants: SchemaAclGrant[];
  /** Roles (incl. 'PUBLIC') holding EXECUTE on at least one function in the schema. */
  executeRoles: string[];
}

/**
 * Every non-system role with its RLS-bypass flags, its transitive
 * INHERIT-following membership closure, and its transitive `SET ROLE`
 * (`set_option`) closure.
 */
export async function introspectRoleGraph(
  exec: QueryExecutor
): Promise<Map<string, RoleAttributes>> {
  const { rows: roleRows } = await exec.query<{
    rolname: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolinherit: boolean;
  }>(`
    SELECT rolname, rolsuper, rolbypassrls, rolinherit
    FROM pg_roles
    WHERE rolname NOT LIKE 'pg\\_%'
    ORDER BY rolname
  `);

  // PG16+ decides both inheritance and role assumption per membership
  // (`inherit_option`, `set_option`); before that inheritance is the member
  // role's INHERIT attribute and membership *always* permits `SET ROLE`. Read
  // the per-membership flags when the columns exist, fall back otherwise.
  type MemberRow = { member: string; parent: string; inherits: boolean; canSet: boolean };
  let memberRows: MemberRow[];
  try {
    const { rows } = await exec.query<MemberRow>(`
      SELECT m.rolname AS member, p.rolname AS parent,
             am.inherit_option AS inherits, am.set_option AS "canSet"
      FROM pg_auth_members am
      JOIN pg_roles m ON m.oid = am.member
      JOIN pg_roles p ON p.oid = am.roleid
      WHERE m.rolname NOT LIKE 'pg\\_%' AND p.rolname NOT LIKE 'pg\\_%'
    `);
    memberRows = rows;
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    const { rows } = await exec.query<MemberRow>(`
      SELECT m.rolname AS member, p.rolname AS parent,
             m.rolinherit AS inherits, true AS "canSet"
      FROM pg_auth_members am
      JOIN pg_roles m ON m.oid = am.member
      JOIN pg_roles p ON p.oid = am.roleid
      WHERE m.rolname NOT LIKE 'pg\\_%' AND p.rolname NOT LIKE 'pg\\_%'
    `);
    memberRows = rows;
  }

  const parents = new Map<string, string[]>();
  const setTargets = new Map<string, string[]>();
  for (const m of memberRows) {
    if (m.inherits) {
      const list = parents.get(m.member) ?? [];
      list.push(m.parent);
      parents.set(m.member, list);
    }
    if (m.canSet) {
      const list = setTargets.get(m.member) ?? [];
      list.push(m.parent);
      setTargets.set(m.member, list);
    }
  }

  const graph = new Map<string, RoleAttributes>();
  for (const r of roleRows) {
    graph.set(r.rolname, {
      name: r.rolname,
      bypassRls: r.rolsuper || r.rolbypassrls,
      isSuper: r.rolsuper,
      inheritsFrom: closure(r.rolname, parents),
      canSetRole: closure(r.rolname, setTargets)
    });
  }
  return graph;
}

/** Transitive parents of `role`, excluding itself, cycle-safe. */
function closure(role: string, parents: Map<string, string[]>): string[] {
  const seen = new Set<string>();
  const stack = [...(parents.get(role) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (next === role || seen.has(next)) continue;
    seen.add(next);
    stack.push(...(parents.get(next) ?? []));
  }
  return [...seen].sort();
}

function isUndefinedColumn(e: unknown): boolean {
  return (e as { code?: string }).code === '42703';
}

export interface SchemaAclOptions {
  schemas?: string[];
  excludeSchemas?: string[];
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

/**
 * Schema ACLs plus, per schema, the roles holding EXECUTE on at least one of
 * its functions. A NULL `nspacl` means the default ACL (owner-only + nothing
 * for PUBLIC on non-`public` schemas); a NULL `proacl` means EXECUTE for
 * PUBLIC, which is why the EXECUTE aggregation has to account for it.
 */
export async function introspectSchemaAcls(
  exec: QueryExecutor,
  options: SchemaAclOptions = {}
): Promise<SchemaAclInfo[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;

  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
    ),
    ns AS (
      SELECT n.oid, n.nspname, pg_get_userbyid(n.nspowner) AS owner, n.nspacl
      FROM pg_namespace n
      WHERE n.nspname NOT LIKE 'pg\\_%'
        ${schemaFilter}
    ),
    schema_grants AS (
      SELECT
        ns.oid,
        CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
        a.privilege_type
      FROM ns, aclexplode(ns.nspacl) a
      LEFT JOIN pg_roles rol ON rol.oid = a.grantee
      WHERE ns.nspacl IS NOT NULL
    ),
    fn_execute AS (
      SELECT
        p.pronamespace AS oid,
        CASE
          WHEN p.proacl IS NULL THEN 'PUBLIC'
          WHEN a.grantee = 0 THEN 'PUBLIC'
          ELSE rol.rolname
        END AS grantee
      FROM pg_proc p
      LEFT JOIN LATERAL aclexplode(p.proacl) a
        ON p.proacl IS NOT NULL AND a.privilege_type = 'EXECUTE'
      LEFT JOIN pg_roles rol ON rol.oid = a.grantee
      WHERE p.pronamespace IN (SELECT oid FROM ns)
    )
    SELECT
      ns.nspname AS schema_name,
      ns.owner,
      COALESCE(
        (SELECT jsonb_agg(DISTINCT jsonb_build_object('role', g.grantee, 'privilege', g.privilege_type))
         FROM schema_grants g WHERE g.oid = ns.oid),
        '[]'::jsonb
      ) AS grants,
      COALESCE(
        (SELECT array_agg(DISTINCT f.grantee) FROM fn_execute f
         WHERE f.oid = ns.oid AND f.grantee IS NOT NULL),
        ARRAY[]::text[]
      ) AS execute_roles
    FROM ns
    ORDER BY ns.nspname
  `;

  const { rows } = await exec.query<{
    schema_name: string;
    owner: string;
    grants: Array<{ role: string; privilege: string }>;
    execute_roles: string[];
  }>(sql, [options.schemas ?? [], excludes]);

  return rows.map((r) => ({
    schema: r.schema_name,
    owner: r.owner,
    grants: r.grants
      .filter((g) => g.privilege === 'USAGE' || g.privilege === 'CREATE')
      .map((g) => ({ role: g.role, privilege: g.privilege as 'USAGE' | 'CREATE' })),
    executeRoles: r.execute_roles
  }));
}
