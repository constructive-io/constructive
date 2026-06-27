import type { PgTestClient } from 'pgsql-test';
import { ident } from './table-client';

// ─── Types ──────────────────────────────────────────────────────────────────

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
