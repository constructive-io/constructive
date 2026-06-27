import type { PgTestClient } from 'pgsql-test';
import { resolveSchemaName } from './resolve';

export interface InvitesModuleInfo {
  schema: string;
  claimed_invites_table_name: string;
}

/**
 * Resolve invites_module schema + table names for a database.
 */
export async function resolveInvitesModule(
  client: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<InvitesModuleInfo> {
  const mod = await client.one<{
    schema_id: string;
    claimed_invites_table_name: string;
  }>(
    `SELECT schema_id, claimed_invites_table_name
     FROM metaschema_modules_public.invites_module
     WHERE database_id = $1 AND scope = $2`,
    [database_id, scope]
  );

  const schema = await resolveSchemaName(client, mod.schema_id);

  return {
    schema,
    claimed_invites_table_name: mod.claimed_invites_table_name,
  };
}
