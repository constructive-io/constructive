import type { PgTestClient } from 'pgsql-test';

/**
 * Set the authenticated JWT context on a db client.
 *
 * Replaces the repeated pattern:
 * ```
 * db.setContext({
 *   role: 'authenticated',
 *   'jwt.claims.user_id': user_id,
 * });
 * ```
 */
export function setUserContext(
  db: PgTestClient,
  user_id: string,
  database_id?: string
): void {
  const ctx: Record<string, string> = {
    role: 'authenticated',
    'jwt.claims.user_id': user_id,
    'jwt.claims.principal_id': user_id,
  };
  if (database_id) {
    ctx['jwt.claims.database_id'] = database_id;
  }
  db.setContext(ctx);
}
