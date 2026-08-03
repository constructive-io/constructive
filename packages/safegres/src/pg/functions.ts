/**
 * Function catalog introspection for the call-graph audit.
 *
 * One query over `pg_proc` returns every user-defined function with the
 * attributes the trust-boundary analysis needs: SECURITY DEFINER vs INVOKER,
 * the owner role (what a DEFINER actually runs as), whether `search_path`
 * is pinned, the language, the body source, and EXECUTE grants per role.
 */

import type { ExtensionScopeOptions, QueryExecutor } from './introspect';

export interface FunctionGrant {
  role: string;
  /** Was the grant delegated (`WITH GRANT OPTION`). */
  grantable: boolean;
}

export interface FunctionSnapshot {
  oid: number;
  schema: string;
  name: string;
  /** Argument type signature, e.g. `text, uuid` — disambiguates overloads. */
  args: string;
  owner: string;
  /** Owner is a superuser or has BYPASSRLS — RLS never applies to it. */
  ownerBypassesRls: boolean;
  isSecurityDefiner: boolean;
  /** True when `proconfig` pins `search_path` (CWE-426 mitigation for DEFINERs). */
  searchPathPinned: boolean;
  language: string;
  /** Raw body (`prosrc`); null for C/internal functions. */
  source: string | null;
  /** Full `CREATE FUNCTION` statement — what `parsePlPgSQL` consumes. */
  definition: string | null;
  /**
   * EXECUTE grants. `PUBLIC` appears as the role name `PUBLIC`.
   * When `proacl` is NULL Postgres applies the default function ACL, which
   * includes EXECUTE to PUBLIC — represented here as a synthetic PUBLIC grant.
   */
  grants: FunctionGrant[];
  /** True when the grants came from the default ACL (no explicit GRANT/REVOKE). */
  defaultAcl: boolean;
  /**
   * The function returns `trigger`, so Postgres refuses to call it directly
   * however wide its EXECUTE ACL is. EXECUTE on one confers nothing on its
   * own: the body is only reachable by firing the trigger it is attached to.
   */
  returnsTrigger: boolean;
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

export interface IntrospectFunctionOptions {
  schemas?: string[];
  excludeSchemas?: string[];
  extensions?: ExtensionScopeOptions;
}

/**
 * Extension scoping for routines. The table-side filter reads ownership off
 * `pg_class`; a function's is on `pg_proc`, and nothing about a routine is
 * inherited the way a partition inherits its parent's dependency — so this is
 * the same rule expressed against the other catalog, not a shared helper.
 *
 * Without it `extensions.ignore` narrowed the relation rules and left the
 * routine rules reading the extension's own bodies: `pg_partman` alone
 * accounted for every C1 finding and 60% of C4 on a real audit.
 */
function routineExtensionFilter(
  options: ExtensionScopeOptions | undefined,
  paramIndex: number
): string {
  const clauses: string[] = [];
  if (options?.skipOwned ?? true) {
    clauses.push(`
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass
            AND d.refclassid = 'pg_extension'::regclass
            AND d.deptype = 'e'
            AND d.objid = p.oid
        )`);
  }
  clauses.push(`
        AND NOT (n.oid = ANY (
          SELECT e.extnamespace FROM pg_extension e WHERE e.extname = ANY($${paramIndex}::text[])
        ))`);
  return clauses.join('');
}

export async function introspectFunctions(
  exec: QueryExecutor,
  options: IntrospectFunctionOptions = {}
): Promise<FunctionSnapshot[]> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND n.nspname = ANY($1::text[])`
    : `AND NOT (n.nspname = ANY($2::text[]))`;
  const extFilter = routineExtensionFilter(options.extensions, 3);

  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas,
             $3::text[] AS ignore_extensions
    ),
    procs AS (
      SELECT
        p.oid,
        n.nspname                                    AS schema_name,
        p.proname                                    AS name,
        pg_get_function_identity_arguments(p.oid)    AS args,
        pg_get_userbyid(p.proowner)                  AS owner,
        COALESCE(o.rolsuper OR o.rolbypassrls, false) AS owner_bypasses_rls,
        p.prosecdef                                  AS security_definer,
        EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
          WHERE cfg LIKE 'search_path=%'
        )                                            AS search_path_pinned,
        l.lanname                                    AS language,
        p.prorettype = 'pg_catalog.trigger'::regtype  AS returns_trigger,
        p.prosrc                                     AS source,
        CASE WHEN l.lanname IN ('sql', 'plpgsql')
             THEN pg_get_functiondef(p.oid)
             ELSE NULL END                           AS definition,
        p.proacl                                     AS proacl
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l  ON l.oid = p.prolang
      LEFT JOIN pg_roles o ON o.oid = p.proowner
      WHERE p.prokind IN ('f', 'p')
        ${schemaFilter}${extFilter}
    ),
    grants AS (
      SELECT
        pr.oid,
        CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
        a.is_grantable
      FROM procs pr,
           LATERAL aclexplode(pr.proacl) a
      LEFT JOIN pg_roles rol ON rol.oid = a.grantee
      WHERE pr.proacl IS NOT NULL
        AND a.privilege_type = 'EXECUTE'
    )
    SELECT
      p.oid::int            AS oid,
      p.schema_name,
      p.name,
      p.args,
      p.owner,
      p.owner_bypasses_rls,
      p.security_definer,
      p.search_path_pinned,
      p.returns_trigger,
      p.language,
      p.source,
      p.definition,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('role', g.grantee, 'grantable', g.is_grantable))
         FROM grants g WHERE g.oid = p.oid),
        '[]'::jsonb
      )                     AS grants,
      (p.proacl IS NULL)    AS default_acl
    FROM procs p
    ORDER BY p.schema_name, p.name, p.args
  `;

  const { rows } = await exec.query<{
    oid: number;
    schema_name: string;
    name: string;
    args: string;
    owner: string;
    owner_bypasses_rls: boolean;
    security_definer: boolean;
    search_path_pinned: boolean;
    returns_trigger: boolean;
    language: string;
    source: string | null;
    definition: string | null;
    grants: Array<{ role: string; grantable: boolean }>;
    default_acl: boolean;
  }>(sql, [options.schemas ?? [], excludes, options.extensions?.ignore ?? []]);

  return rows.map((r) => ({
    oid: r.oid,
    schema: r.schema_name,
    name: r.name,
    args: r.args,
    owner: r.owner,
    ownerBypassesRls: r.owner_bypasses_rls,
    isSecurityDefiner: r.security_definer,
    searchPathPinned: r.search_path_pinned,
    returnsTrigger: r.returns_trigger,
    language: r.language,
    source: r.source,
    definition: r.definition,
    grants: r.default_acl
      ? [{ role: 'PUBLIC', grantable: false }]
      : r.grants.map((g) => ({ role: g.role, grantable: g.grantable })),
    defaultAcl: r.default_acl
  }));
}
