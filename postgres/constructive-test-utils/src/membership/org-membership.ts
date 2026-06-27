import type { PgTestClient } from 'pgsql-test';
import { ident } from '../core/identifiers';

// ─── Database-Local Org Membership ──────────────────────────────────────────

/**
 * Set database-level org membership defaults (is_verified, is_approved).
 * Same pattern as app-level, but for scope='org'.
 */
export async function setDatabaseOrgMembershipDefaults(
  pg: PgTestClient,
  database_id: string,
  options: { is_verified: boolean; is_approved: boolean }
): Promise<void> {
  const defaults = await pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table t ON t.id = mm.membership_defaults_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE mm.database_id = $1 AND mm.scope = 'org'`,
    [database_id]
  );

  await pg.query(
    `UPDATE ${ident(defaults.schema_name, defaults.table_name)}
     SET is_verified = $1, is_approved = $2`,
    [options.is_verified, options.is_approved]
  );
}

/**
 * Set database-level org permission_defaults.
 * Used to grant specific permissions to all new org members by default.
 */
export async function setDatabaseOrgPermissionDefaults(
  pg: PgTestClient,
  database_id: string,
  permission_names: string[]
): Promise<void> {
  const perms = await pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.permissions_module pm
     JOIN metaschema_public.table t ON t.id = pm.permission_defaults_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE pm.database_id = $1 AND pm.scope = 'org'`,
    [database_id]
  );

  for (const name of permission_names) {
    await pg.query(
      `INSERT INTO ${ident(perms.schema_name, perms.table_name)} (name, is_enabled)
       VALUES ($1, TRUE)
       ON CONFLICT (name) DO UPDATE SET is_enabled = TRUE`,
      [name]
    );
  }
}

/**
 * Resolve the org memberships table for a provisioned database.
 */
export async function resolveDatabaseOrgMemberships(
  pg: PgTestClient,
  database_id: string
): Promise<{ schema_name: string; table_name: string }> {
  return pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table t ON t.id = mm.memberships_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE mm.database_id = $1 AND mm.scope = 'org'`,
    [database_id]
  );
}

/**
 * Make a user an org-level admin in the DATABASE-LOCAL memberships table.
 */
export async function makeDatabaseOrgAdmin(
  pg: PgTestClient,
  database_id: string,
  actor_id: string,
  entity_id: string
): Promise<void> {
  const mem = await resolveDatabaseOrgMemberships(pg, database_id);

  await pg.query(
    `UPDATE ${ident(mem.schema_name, mem.table_name)}
     SET is_admin = TRUE
     WHERE actor_id = $1 AND entity_id = $2`,
    [actor_id, entity_id]
  );
}
