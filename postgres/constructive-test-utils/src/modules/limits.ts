import type { PgTestClient } from 'pgsql-test';
import { resolveSchemaName } from './resolve';

export interface LimitsModuleInfo {
  public_schema: string;
  default_table_name: string;
  limit_credits_table_name: string;
}

/**
 * Resolve limits_module schema + table names for a database.
 */
export async function resolveLimitsModule(
  client: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<LimitsModuleInfo> {
  const mod = await client.one<{
    schema_id: string;
    default_table_id: string;
    limit_credits_table_id: string;
  }>(
    `SELECT schema_id, default_table_id, limit_credits_table_id
     FROM metaschema_modules_public.limits_module
     WHERE database_id = $1 AND scope = $2`,
    [database_id, scope]
  );

  const [public_schema, dl_info, lc_info] = await Promise.all([
    resolveSchemaName(client, mod.schema_id),
    client.one<{ name: string }>(
      `SELECT name FROM metaschema_public.table WHERE id = $1`,
      [mod.default_table_id]
    ),
    client.one<{ name: string }>(
      `SELECT name FROM metaschema_public.table WHERE id = $1`,
      [mod.limit_credits_table_id]
    ),
  ]);

  return {
    public_schema,
    default_table_name: dl_info.name,
    limit_credits_table_name: lc_info.name,
  };
}

/**
 * Get limit_credits matching a reason pattern for an actor.
 */
export async function getLimitCredits(
  client: PgTestClient,
  limits: LimitsModuleInfo,
  actor_id: string,
  reason_like: string
): Promise<Record<string, unknown>[]> {
  return client.any(
    `SELECT * FROM "${limits.public_schema}"."${limits.limit_credits_table_name}"
     WHERE actor_id = $1 AND reason LIKE $2`,
    [actor_id, reason_like]
  );
}
