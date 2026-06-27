import type { PgTestClient } from 'pgsql-test';
import { ident } from '../core/identifiers';
import { resolveSchemaName } from '../modules/resolve';

export interface EntityMembershipInfo {
  schema_name: string;
  table_name: string;
  sprt_schema_name: string;
  sprt_table_name: string;
  membership_type: string;
}

/**
 * Resolve entity-level memberships (e.g., org memberships) for a given
 * database + scope. Returns the memberships table, SPRT table, and membership_type.
 */
export async function resolveEntityMembership(
  pg: PgTestClient,
  database_id: string,
  scope: string
): Promise<EntityMembershipInfo> {
  const row = await pg.one<{
    memberships_table_id: string;
    sprt_table_id: string;
    schema_id: string;
    membership_type: string;
  }>(
    `SELECT mm.memberships_table_id, mm.sprt_table_id,
            mm.schema_id, mm.membership_type
     FROM metaschema_modules_public.memberships_module mm
     WHERE mm.database_id = $1 AND mm.scope = $2`,
    [database_id, scope]
  );

  const [mem_info, sprt_info, schema_name] = await Promise.all([
    pg.one<{ schema_name: string; name: string }>(
      `SELECT s.schema_name, t.name
       FROM metaschema_public.table t
       JOIN metaschema_public.schema s ON s.id = t.schema_id
       WHERE t.id = $1`,
      [row.memberships_table_id]
    ),
    pg.one<{ schema_name: string; name: string }>(
      `SELECT s.schema_name, t.name
       FROM metaschema_public.table t
       JOIN metaschema_public.schema s ON s.id = t.schema_id
       WHERE t.id = $1`,
      [row.sprt_table_id]
    ),
    resolveSchemaName(pg, row.schema_id),
  ]);

  return {
    schema_name: mem_info.schema_name,
    table_name: mem_info.name,
    sprt_schema_name: sprt_info.schema_name,
    sprt_table_name: sprt_info.name,
    membership_type: row.membership_type,
  };
}

/**
 * Add a user as a member of an entity (org/team/group).
 *
 * Inserts directly into the resolved entity-level memberships table.
 * The membership trigger chain automatically populates the SPRT.
 */
export async function addEntityMember(
  pg: PgTestClient,
  database_id: string,
  scope: string,
  entity_id: string,
  actor_id: string,
  opts?: { is_admin?: boolean }
): Promise<void> {
  const mem = await resolveEntityMembership(pg, database_id, scope);

  await pg.query(
    `INSERT INTO ${ident(mem.schema_name, mem.table_name)} (entity_id, actor_id, is_admin)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [entity_id, actor_id, opts?.is_admin ?? false]
  );
}

// ─── Permission Handling ────────────────────────────────────────────────────

export interface PermissionsInfo {
  schema_name: string;
  permissions_table_name: string;
  entity_permissions_table_name: string;
}

/**
 * Resolve the permissions tables for entity-level grants.
 */
export async function resolveEntityPermissions(
  pg: PgTestClient,
  database_id: string,
  scope: string
): Promise<PermissionsInfo> {
  const row = await pg.one<{
    schema_id: string;
    permissions_table_id: string;
    entity_permissions_table_id: string;
  }>(
    `SELECT pm.schema_id, pm.permissions_table_id, pm.entity_permissions_table_id
     FROM metaschema_modules_public.permissions_module pm
     WHERE pm.database_id = $1 AND pm.scope = $2`,
    [database_id, scope]
  );

  const [schema, perm_table, eperm_table] = await Promise.all([
    resolveSchemaName(pg, row.schema_id),
    pg.one<{ name: string }>(`SELECT name FROM metaschema_public.table WHERE id = $1`, [row.permissions_table_id]),
    pg.one<{ name: string }>(`SELECT name FROM metaschema_public.table WHERE id = $1`, [row.entity_permissions_table_id]),
  ]);

  return {
    schema_name: schema,
    permissions_table_name: perm_table.name,
    entity_permissions_table_name: eperm_table.name,
  };
}

/**
 * Get the bitmask for a set of permission names at a given scope.
 *
 * The bitmask is built by OR-ing the individual permission bitmask values.
 * Used when granting or verifying permissions.
 */
export async function getPermissionMask(
  pg: PgTestClient,
  perms: PermissionsInfo,
  permission_names: string[]
): Promise<string> {
  if (permission_names.length === 0) return '0';

  const result = await pg.one<{ mask: string }>(
    `SELECT bit_or(bitmask)::text AS mask
     FROM ${ident(perms.schema_name, perms.permissions_table_name)}
     WHERE name = ANY($1)`,
    [permission_names]
  );
  return result.mask ?? '0';
}

/**
 * Grant specific permissions to an entity member.
 *
 * Uses the entity_permissions table (entity_id, actor_id, permissions_mask).
 */
export async function grantEntityPermissions(
  pg: PgTestClient,
  database_id: string,
  scope: string,
  entity_id: string,
  actor_id: string,
  permission_names: string[]
): Promise<void> {
  const perms = await resolveEntityPermissions(pg, database_id, scope);
  const mask = await getPermissionMask(pg, perms, permission_names);

  await pg.query(
    `INSERT INTO ${ident(perms.schema_name, perms.entity_permissions_table_name)}
       (entity_id, actor_id, permissions_mask)
     VALUES ($1, $2, $3::bigint)
     ON CONFLICT (entity_id, actor_id) DO UPDATE
     SET permissions_mask = entity_permissions.permissions_mask | $3::bigint`,
    [entity_id, actor_id, mask]
  );
}
