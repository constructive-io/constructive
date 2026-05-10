import type { PgTestClient } from 'pgsql-test/test-client';

export * from 'pgsql-test/utils';

/**
 * Set authenticated user context for RLS testing.
 * Convenience wrapper around db.setContext() with standard constructive JWT claims.
 */
export function setUserContext(
  db: PgTestClient,
  userId: string,
  databaseId: string,
): void {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': userId,
    'jwt.claims.database_id': databaseId,
  });
}
