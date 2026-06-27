import type { PgTestClient } from 'pgsql-test';
import { ident } from './table-client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateOrganizationOptions {
  display_name: string;
}

export interface AddOrgMemberOptions {
  actor_id: string;
  entity_id: string;
  is_approved?: boolean;
}

export interface MembershipRecord {
  id: string;
  actor_id: string;
  entity_id: string;
  is_approved: boolean;
  is_active: boolean;
  is_owner: boolean;
  is_admin: boolean;
  is_banned: boolean;
  is_disabled: boolean;
}

export interface MembershipDefaults {
  entity_id: string;
  is_approved: boolean;
}

export interface AppMembershipDefaults {
  is_verified: boolean;
  is_approved: boolean;
}

export interface MembershipInfo {
  schema: string;
  table: string;
  grants_schema: string;
  grants_table: string;
}

export interface TableInfo {
  schema: string;
  table: string;
}

export interface SprtInfo extends TableInfo {
  columns: string[];
}

export interface PermissionsInfo {
  schema: string;
  table: string;
  get_mask_fn: string;
}

// ─── Organization ───────────────────────────────────────────────────────────

/**
 * Create an organization (type=2 user). Returns the organization ID.
 */
export async function createOrganization(
  client: PgTestClient,
  options: CreateOrganizationOptions
): Promise<string> {
  const { display_name } = options;

  const result = await client.one<{ id: string }>(
    `INSERT INTO constructive_users_public.users (display_name, type)
     VALUES ($1, 2)
     RETURNING id`,
    [display_name]
  );

  return result.id;
}

// ─── App membership ─────────────────────────────────────────────────────────

/**
 * Get the app membership ID for a user.
 */
export async function getAppMembershipId(
  client: PgTestClient,
  actor_id: string
): Promise<string> {
  const result = await client.one<{ id: string }>(
    `SELECT id FROM constructive_memberships_public.app_memberships WHERE actor_id = $1`,
    [actor_id]
  );
  return result.id;
}

/**
 * Grant create_entity permission to a user. Uses pg (superuser) to bypass RLS.
 */
export async function grantCreateEntityPermission(
  pg: PgTestClient,
  actor_id: string,
  permission_mask: string
): Promise<void> {
  await pg.query(
    `INSERT INTO constructive_memberships_public.app_grants (actor_id, permissions, is_grant)
     VALUES ($1, $2::bit varying, true)`,
    [actor_id, permission_mask]
  );
}

/**
 * Grant an org-level permission to a member by updating the SPRT directly.
 * Temporarily elevates to administrator role to bypass RLS.
 */
export async function grantOrgPermission(
  client: PgTestClient,
  options: { actor_id: string; entity_id: string; permissions: string }
): Promise<void> {
  const prev = client.getContext();
  client.setContext({ role: 'administrator' });
  await client.query(
    `UPDATE constructive_memberships_private.org_memberships_sprt
     SET permissions = permissions | $3::bit(64)
     WHERE actor_id = $1 AND entity_id = $2`,
    [options.actor_id, options.entity_id, options.permissions]
  );
  client.setContext(prev);
}

/**
 * Make a user an app-level admin. Uses pg (superuser) to bypass RLS.
 */
export async function makeAppAdmin(
  pg: PgTestClient,
  actor_id: string
): Promise<void> {
  await pg.query(
    `UPDATE constructive_memberships_public.app_memberships
     SET is_admin = TRUE
     WHERE actor_id = $1`,
    [actor_id]
  );
}

// ─── Org membership ─────────────────────────────────────────────────────────

/**
 * Add a member to an organization. Returns the membership ID.
 */
export async function addOrgMember(
  client: PgTestClient,
  options: AddOrgMemberOptions
): Promise<string> {
  const { actor_id, entity_id, is_approved } = options;

  const columns = ['actor_id', 'entity_id'];
  const values: unknown[] = [actor_id, entity_id];
  const placeholders = ['$1', '$2'];

  if (is_approved !== undefined) {
    columns.push('is_approved');
    values.push(is_approved);
    placeholders.push(`$${values.length}`);
  }

  const result = await client.one<{ id: string }>(
    `INSERT INTO constructive_memberships_public.org_memberships (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING id`,
    values
  );

  return result.id;
}

/**
 * Get membership record for a user in an organization.
 */
export async function getMembership(
  client: PgTestClient,
  actor_id: string,
  entity_id: string
): Promise<MembershipRecord | null> {
  return client.oneOrNone<MembershipRecord>(
    `SELECT id, actor_id, entity_id, is_approved, is_active, is_owner, is_admin, is_banned, is_disabled
     FROM constructive_memberships_public.org_memberships
     WHERE actor_id = $1 AND entity_id = $2`,
    [actor_id, entity_id]
  );
}

/**
 * Get membership defaults for an organization.
 */
export async function getMembershipDefaults(
  client: PgTestClient,
  entity_id: string
): Promise<MembershipDefaults | null> {
  return client.oneOrNone<MembershipDefaults>(
    `SELECT entity_id, is_approved
     FROM constructive_memberships_public.org_membership_defaults
     WHERE entity_id = $1`,
    [entity_id]
  );
}

/**
 * Update membership defaults for an organization.
 */
export async function updateMembershipDefaults(
  client: PgTestClient,
  entity_id: string,
  options: { is_approved?: boolean }
): Promise<void> {
  if (options.is_approved === undefined) return;

  await client.query(
    `UPDATE constructive_memberships_public.org_membership_defaults
     SET is_approved = $1
     WHERE entity_id = $2`,
    [options.is_approved, entity_id]
  );
}

/**
 * Approve a membership (admin approves a member).
 */
export async function approveMembership(
  client: PgTestClient,
  actor_id: string,
  entity_id: string
): Promise<void> {
  await client.query(
    `UPDATE constructive_memberships_public.org_memberships
     SET is_approved = TRUE
     WHERE actor_id = $1 AND entity_id = $2`,
    [actor_id, entity_id]
  );
}

/**
 * Get the org membership ID for a user in an org.
 */
export async function getOrgMembershipId(
  client: PgTestClient,
  actor_id: string,
  entity_id: string
): Promise<string> {
  const result = await client.one<{ id: string }>(
    `SELECT id FROM constructive_memberships_public.org_memberships
     WHERE actor_id = $1 AND entity_id = $2`,
    [actor_id, entity_id]
  );
  return result.id;
}

/**
 * Get profile_id from an org membership.
 */
export async function getOrgMembershipProfileId(
  client: PgTestClient,
  membership_id: string
): Promise<string | null> {
  const result = await client.one<{ profile_id: string | null }>(
    `SELECT profile_id FROM constructive_memberships_public.org_memberships WHERE id = $1`,
    [membership_id]
  );
  return result.profile_id;
}

// ─── App membership defaults ────────────────────────────────────────────────

/**
 * Get app_membership_defaults.
 */
export async function getAppMembershipDefaults(
  pg: PgTestClient
): Promise<AppMembershipDefaults | null> {
  return pg.oneOrNone<AppMembershipDefaults>(
    `SELECT is_verified, is_approved
     FROM constructive_memberships_public.app_membership_defaults
     LIMIT 1`
  );
}

/**
 * Set app_membership_defaults to enable users to be active by default.
 */
export async function setAppMembershipDefaults(
  pg: PgTestClient,
  options: { is_verified: boolean; is_approved: boolean }
): Promise<void> {
  await pg.query(
    `UPDATE constructive_memberships_public.app_membership_defaults
     SET is_verified = $1, is_approved = $2`,
    [options.is_verified, options.is_approved]
  );
}

/**
 * Set global org_membership_defaults for a specific org entity.
 */
export async function setOrgMembershipDefaults(
  pg: PgTestClient,
  entity_id: string,
  options: { is_approved: boolean }
): Promise<void> {
  await pg.query(
    `INSERT INTO constructive_memberships_public.org_membership_defaults
       (entity_id, is_approved)
     VALUES ($2, $1)
     ON CONFLICT (entity_id) DO UPDATE
       SET is_approved = EXCLUDED.is_approved`,
    [options.is_approved, entity_id]
  );
}

// ─── Database-level membership defaults (resolved via metaschema) ───────────

/**
 * Set database-level app membership defaults.
 * Call AFTER provisionDatabase and BEFORE seedDatabaseUser.
 */
export async function setDatabaseAppMembershipDefaults(
  pg: PgTestClient,
  database_id: string,
  options: { is_verified: boolean; is_approved: boolean }
): Promise<void> {
  const defaults = await pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table t ON t.id = mm.membership_defaults_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE mm.database_id = $1 AND mm.scope = 'app'`,
    [database_id]
  );

  await pg.query(
    `UPDATE ${ident(defaults.schema_name, defaults.table_name)}
     SET is_verified = $1, is_approved = $2`,
    [options.is_verified, options.is_approved]
  );
}

/**
 * Set database-level org membership defaults for a specific entity.
 * Call AFTER provisionDatabase + createOrganization and BEFORE addEntityMember.
 */
export async function setDatabaseOrgMembershipDefaults(
  pg: PgTestClient,
  database_id: string,
  entity_id: string,
  options: { is_approved: boolean }
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
    `INSERT INTO ${ident(defaults.schema_name, defaults.table_name)}
       (entity_id, is_approved)
     VALUES ($1, $2)
     ON CONFLICT (entity_id) DO UPDATE
       SET is_approved = EXCLUDED.is_approved`,
    [entity_id, options.is_approved]
  );
}

/**
 * Set database-level org permission defaults for a specific entity.
 * Call AFTER provisionDatabase + createOrganization and BEFORE addEntityMember.
 */
export async function setDatabaseOrgPermissionDefaults(
  pg: PgTestClient,
  database_id: string,
  entity_id: string
): Promise<void> {
  const pm = await pg.one<{ schema_name: string; default_table_name: string; bitlen: number }>(
    `SELECT s.schema_name, pm.default_table_name::text, pm.bitlen
     FROM metaschema_modules_public.permissions_module pm
     JOIN metaschema_public.schema s ON s.id = pm.schema_id
     WHERE pm.database_id = $1 AND pm.scope = 'org'
     LIMIT 1`,
    [database_id]
  );

  const full_mask = '1'.repeat(pm.bitlen || 64);
  const table = ident(pm.schema_name, pm.default_table_name);

  const updated = await pg.query(
    `UPDATE ${table} SET permissions = $1 WHERE entity_id = $2`,
    [full_mask, entity_id]
  );
  if (updated.rowCount === 0) {
    await pg.query(
      `INSERT INTO ${table} (entity_id, permissions) VALUES ($1, $2)`,
      [entity_id, full_mask]
    );
  }
}

// ─── Membership resolution (via metaschema) ─────────────────────────────────

/**
 * Resolve the membership and grants tables for a given scope.
 */
export async function resolveMemberships(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<MembershipInfo> {
  const row = await client.one<{
    m_schema: string;
    m_table: string;
    g_schema: string;
    g_table: string;
  }>(
    `SELECT
       ms.schema_name AS m_schema, mt.name AS m_table,
       gs.schema_name AS g_schema, gt.name AS g_table
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table mt ON mt.id = mm.memberships_table_id
     JOIN metaschema_public.schema ms ON ms.id = mt.schema_id
     JOIN metaschema_public.table gt ON gt.id = mm.grants_table_id
     JOIN metaschema_public.schema gs ON gs.id = gt.schema_id
     WHERE mm.database_id = $1 AND mm.scope = $2`,
    [database_id, scope]
  );
  return {
    schema: row.m_schema,
    table: row.m_table,
    grants_schema: row.g_schema,
    grants_table: row.g_table,
  };
}

/**
 * Resolve the SPRT table + column list for a given scope.
 */
export async function resolveSprt(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<SprtInfo> {
  const row = await client.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name as table_name
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table t ON t.id = mm.sprt_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE mm.database_id = $1 AND mm.scope = $2`,
    [database_id, scope]
  );
  const cols = (
    await client.any<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
      [row.schema_name, row.table_name]
    )
  ).map((c) => c.column_name);
  return { schema: row.schema_name, table: row.table_name, columns: cols };
}

/**
 * Add a member to an entity-level membership table.
 */
export async function addEntityMember(
  client: PgTestClient,
  membership: MembershipInfo,
  actor_id: string,
  entity_id: string
): Promise<string> {
  const result = await client.one<{ id: string }>(
    `INSERT INTO ${ident(membership.schema, membership.table)}
     (actor_id, entity_id)
     VALUES ($1, $2)
     RETURNING id`,
    [actor_id, entity_id]
  );
  return result.id;
}

/**
 * Grant permissions to a member via the grants table.
 */
export async function grantEntityPermissions(
  client: PgTestClient,
  membership: MembershipInfo,
  actor_id: string,
  entity_id: string,
  permissions: string
): Promise<void> {
  await client.query(
    `INSERT INTO ${ident(membership.grants_schema, membership.grants_table)}
     (actor_id, entity_id, permissions, is_grant)
     VALUES ($1, $2, $3::bit varying, true)
     ON CONFLICT DO NOTHING`,
    [actor_id, entity_id, permissions]
  );
}

// ─── Permissions resolution ─────────────────────────────────────────────────

/**
 * Resolve permissions table + get_mask_by_name function for a given scope.
 */
export async function resolvePermissions(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<PermissionsInfo> {
  const row = await client.one<{
    schema_name: string;
    table_name: string;
    get_mask_by_name: string;
  }>(
    `SELECT s.schema_name, t.name AS table_name, pm.get_mask_by_name
     FROM metaschema_modules_public.permissions_module pm
     JOIN metaschema_public.table t ON t.id = pm.table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE pm.database_id = $1 AND pm.scope = $2`,
    [database_id, scope]
  );
  return {
    schema: row.schema_name,
    table: row.table_name,
    get_mask_fn: row.get_mask_by_name,
  };
}

/**
 * Call the get_permission_mask function for a given set of permission names.
 */
export async function getPermissionMask(
  client: PgTestClient,
  perms_info: PermissionsInfo,
  perm_names: string[]
): Promise<string> {
  const result = await client.one<{ mask: string }>(
    `SELECT ${ident(perms_info.schema, perms_info.get_mask_fn)}($1::citext[]) AS mask`,
    [perm_names]
  );
  return result.mask;
}
