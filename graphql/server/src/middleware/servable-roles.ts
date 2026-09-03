import { ApiStructure } from '../types';

/**
 * The roles served traffic may run as. No database connection is public; a
 * request from the internet reaches PostgreSQL only through this process, which
 * chooses the role. That choice is limited to these two — `administrator`, the
 * provisioning owner, `authenticated_client` and everything else are internal.
 *
 * The routing plane enforces the same set with a CHECK on every `apis` table
 * (`apis_role_name_servable` / `apis_anon_role_servable`); this is the
 * server-side door check so a row that somehow says otherwise is refused before
 * any `SET ROLE`, never served under a fallback role.
 */
export const SERVABLE_ROLES: ReadonlySet<string> = new Set(['anonymous', 'authenticated']);

export const isServableRole = (role: unknown): role is string =>
  typeof role === 'string' && SERVABLE_ROLES.has(role);

export class NonServableRoleError extends Error {
  readonly code = 'NON_SERVABLE_ROLE';

  constructor(
    readonly source: string,
    readonly column: 'role_name' | 'anon_role',
    readonly role: unknown
  ) {
    super(
      `[${source}] refusing to serve: ${column} is ${
        role === null || role === undefined ? String(role) : JSON.stringify(role)
      }, not one of [${[...SERVABLE_ROLES].join(', ')}]`
    );
    this.name = 'NonServableRoleError';
  }
}

/**
 * Fail closed on a resolved API surface whose roles came from a row. Throws
 * before the structure can be cached or handed to Graphile.
 */
export const assertServableRoles = (structure: ApiStructure, source: string): void => {
  if (!isServableRole(structure.roleName)) {
    throw new NonServableRoleError(source, 'role_name', structure.roleName);
  }
  if (!isServableRole(structure.anonRole)) {
    throw new NonServableRoleError(source, 'anon_role', structure.anonRole);
  }
};
