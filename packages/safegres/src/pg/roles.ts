import type { QueryExecutor } from './introspect';

/** A filterable PostgreSQL role for audit purposes. */
export interface RoleInfo {
  name: string;
  canLogin: boolean;
  isSuper: boolean;
  isSystem: boolean; // `pg_*` prefix, not user-created
}

/**
 * Enumerate every non-system role that could meaningfully appear as a
 * grantee. By default we include every role — caller may pass `--roles`
 * to narrow to e.g. `authenticated, anonymous`.
 */
export async function listAuditableRoles(
  exec: QueryExecutor
): Promise<RoleInfo[]> {
  const { rows } = await exec.query<{
    rolname: string;
    rolcanlogin: boolean;
    rolsuper: boolean;
  }>(`
    SELECT rolname, rolcanlogin, rolsuper
    FROM pg_roles
    ORDER BY rolname
  `);

  return rows.map((r) => ({
    name: r.rolname,
    canLogin: r.rolcanlogin,
    isSuper: r.rolsuper,
    isSystem: r.rolname.startsWith('pg_')
  }));
}

export interface RoleResolution {
  /** Final list of role names used for the audit. */
  roles: string[];
  /** Roles returned by pg_roles but filtered out. */
  excluded: string[];
}

/**
 * Apply `--roles` / `--exclude-roles` filters against the full pg_roles list.
 *
 * - If `include` is non-empty, only those names survive.
 * - Else, every non-system role survives.
 * - `exclude` is applied on top.
 */
export function resolveRoles(
  allRoles: RoleInfo[],
  include: string[] | undefined,
  exclude: string[] = []
): RoleResolution {
  const excludeSet = new Set(exclude);
  const includeSet = include && include.length > 0 ? new Set(include) : null;

  const roles: string[] = [];
  const excluded: string[] = [];

  for (const r of allRoles) {
    if (excludeSet.has(r.name)) {
      excluded.push(r.name);
      continue;
    }
    if (includeSet) {
      if (includeSet.has(r.name)) roles.push(r.name);
      else excluded.push(r.name);
      continue;
    }
    if (r.isSystem) {
      excluded.push(r.name);
      continue;
    }
    roles.push(r.name);
  }

  return { roles, excluded };
}
