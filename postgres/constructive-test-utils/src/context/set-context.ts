import type { PgTestClient } from 'pgsql-test';

/**
 * Set the authenticated JWT context on a test client.
 *
 * Replaces the verbose repeated pattern:
 * ```
 * db.setContext({
 *   role: 'authenticated',
 *   'jwt.claims.user_id': user_id,
 *   'jwt.claims.database_id': database_id,
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
  };
  if (database_id) {
    ctx['jwt.claims.database_id'] = database_id;
  }
  db.setContext(ctx);
}

/**
 * Set administrator context. Uses the `administrator` PG role which has BYPASSRLS.
 *
 * WARNING: This bypasses ALL row-level security. Use ONLY for:
 * - Initial data seeding in beforeAll/beforeEach
 * - Verifying data exists after RLS-blocked operations
 *
 * NEVER use for testing RLS policies — RLS is completely skipped.
 */
export function setAdminContext(db: PgTestClient): void {
  db.setContext({ role: 'administrator' });
}

/**
 * Temporarily execute a callback as a specific user, then restore previous context.
 *
 * @example
 * const result = await asUser(db, ALICE_ID, async () => {
 *   return db.one(`SELECT * FROM my_table WHERE id = $1`, [id]);
 * });
 */
export async function asUser<T>(
  db: PgTestClient,
  user_id: string,
  fn: () => Promise<T>,
  database_id?: string
): Promise<T> {
  setUserContext(db, user_id, database_id);
  try {
    return await fn();
  } finally {
    // Reset to superuser (no RLS) for subsequent setup operations
    db.setContext({});
  }
}

/**
 * Temporarily execute a callback as administrator (BYPASSRLS), then restore.
 *
 * Use for seeding data that an authenticated user couldn't insert directly.
 */
export async function asAdmin<T>(
  db: PgTestClient,
  fn: () => Promise<T>
): Promise<T> {
  setAdminContext(db);
  try {
    return await fn();
  } finally {
    db.setContext({});
  }
}
