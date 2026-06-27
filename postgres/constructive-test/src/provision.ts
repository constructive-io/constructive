import type { PgTestClient } from 'pgsql-test';

/**
 * Module table info returned by getModuleTableInfo().
 */
export interface ModuleTableInfo {
  schema_name: string;
  table_name: string;
}

const MODULE_TABLE_MAP: Record<string, string> = {
  config_secrets: 'config_secrets_module',
  config_secrets_user: 'user_credentials_module',
  config_secrets_org: 'config_secrets_module',
};

const MODULE_SCOPE_MAP: Record<string, string> = {
  config_secrets_org: 'org',
};

function resolveModuleTable(module_name: string): string {
  return MODULE_TABLE_MAP[module_name] ?? `${module_name}_module`;
}

/**
 * Get the module table info for seeding data into module-backed tables.
 * Resolves schema and table names dynamically from metaschema.
 */
export async function getModuleTableInfo(
  pg: PgTestClient,
  database_id: string,
  module_name: string
): Promise<ModuleTableInfo> {
  const module_table = resolveModuleTable(module_name);
  const scope = MODULE_SCOPE_MAP[module_name];

  let query = `SELECT s.schema_name, m.table_name
     FROM metaschema_modules_public.${module_table} m
     JOIN metaschema_public.schema s ON s.id = m.schema_id
     WHERE m.database_id = $1`;
  const params: unknown[] = [database_id];

  if (scope !== undefined) {
    query += ` AND m.scope = $2`;
    params.push(scope);
  }

  return pg.one<ModuleTableInfo>(query, params);
}

/**
 * Check if a module is installed for a database.
 */
export async function isModuleInstalled(
  pg: PgTestClient,
  database_id: string,
  module_name: string,
  scope?: string
): Promise<boolean> {
  const table_name = resolveModuleTable(module_name);

  let query = `SELECT 1 FROM metaschema_modules_public.${table_name} WHERE database_id = $1`;
  const params: unknown[] = [database_id];

  if (scope !== undefined) {
    query += ` AND scope = $2`;
    params.push(scope);
  }

  query += ` LIMIT 1`;

  const result = await pg.oneOrNone(query, params);
  return result !== null;
}
