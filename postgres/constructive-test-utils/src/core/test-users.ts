import type { PgTestClient } from 'pgsql-test';

/**
 * Well-known deterministic UUIDs for test actors.
 * Use these instead of generating random UUIDs — they make test output readable.
 */
export const TEST_USER_IDS = {
  ALICE: '00000000-0000-4000-a000-000000000001',
  BOB: '00000000-0000-4000-a000-000000000002',
  CHARLIE: '00000000-0000-4000-a000-000000000003',
  DAVE: '00000000-0000-4000-a000-000000000004',
  EVE: '00000000-0000-4000-a000-000000000005',
  FRANK: '00000000-0000-4000-a000-000000000006',
} as const;

/**
 * Create a user in the GLOBAL constructive_users_public.users table.
 * This uses `pg` (superuser) to bypass RLS.
 *
 * Most tests should use this + seedDatabaseUser() to populate a provisioned database.
 */
export async function createTestUser(
  pg: PgTestClient,
  opts: {
    user_id: string;
    username: string;
    display_name?: string;
  }
): Promise<string> {
  const { user_id, username, display_name } = opts;
  await pg.query(
    `INSERT INTO constructive_users_public.users (id, username, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [user_id, username, display_name ?? username]
  );
  return user_id;
}

export interface SeedDatabaseUserOptions {
  user_id: string;
  username: string;
  display_name?: string;
}

/**
 * Seed a user into a provisioned database's local users table.
 *
 * This resolves the database-local users table via metaschema,
 * then inserts the user there. The trigger chain automatically
 * creates the app_membership + SPRT rows (if membership defaults
 * are set to is_verified=true, is_approved=true).
 *
 * Call setDatabaseAppMembershipDefaults() BEFORE this function
 * to ensure the SPRT gets populated.
 */
export async function seedDatabaseUser(
  pg: PgTestClient,
  database_id: string,
  opts: SeedDatabaseUserOptions
): Promise<void> {
  const { user_id, username, display_name } = opts;

  const users = await pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.users_module um
     JOIN metaschema_public.table t ON t.id = um.table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE um.database_id = $1`,
    [database_id]
  );

  await pg.query(
    `INSERT INTO "${users.schema_name}"."${users.table_name}" (id, username, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [user_id, username, display_name ?? username]
  );
}

/**
 * Seed a user email into the database-local emails table.
 */
export async function seedUserEmail(
  pg: PgTestClient,
  database_id: string,
  user_id: string,
  email: string,
  opts?: { is_verified?: boolean; is_primary?: boolean }
): Promise<void> {
  const emails = await pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.emails_module em
     JOIN metaschema_public.table t ON t.id = em.table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE em.database_id = $1`,
    [database_id]
  );

  await pg.query(
    `INSERT INTO "${emails.schema_name}"."${emails.table_name}" (user_id, email, is_verified, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [user_id, email, opts?.is_verified ?? true, opts?.is_primary ?? true]
  );
}
