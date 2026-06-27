import type { PgTestClient } from 'pgsql-test';
import { uniqueName, MODULE_PRESETS } from './helpers';

/**
 * Options for provisioning a database.
 */
export interface ProvisionDatabaseOptions {
  name?: string;
  owner_id: string;
  subdomain?: string;
  domain?: string;
  modules?: string;
  options?: string;
}

/**
 * Options for seeding a database user.
 */
export interface SeedDatabaseUserOptions {
  user_id: string;
  username: string;
  display_name?: string;
  type?: number;
}

/**
 * Options for seeding a user email.
 */
export interface SeedUserEmailOptions {
  owner_id: string;
  email: string;
  is_verified?: boolean;
  is_primary?: boolean;
}

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
 * Provision a database using metaschema_generators.provision_database.
 * Returns the database_id.
 */
export async function provisionDatabase(
  pg: PgTestClient,
  options: ProvisionDatabaseOptions
): Promise<string> {
  const {
    name = uniqueName('test_db'),
    owner_id,
    subdomain = uniqueName('test'),
    domain = 'example.com',
    modules = MODULE_PRESETS.MINIMAL,
    options: db_options = '{}',
  } = options;

  const result = await pg.one<{ database_id: string }>(
    `SELECT metaschema_generators.provision_database(
      v_database_name := $1,
      v_owner_id := $2,
      v_subdomain := $3,
      v_domain := $4,
      v_modules := $5::jsonb,
      v_options := $6::jsonb
    ) as database_id`,
    [name, owner_id, subdomain, domain, modules, db_options]
  );

  return result.database_id;
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
 * Seed a user into a provisioned database's users table.
 * Resolves the users table dynamically from metaschema.
 */
export async function seedDatabaseUser(
  pg: PgTestClient,
  database_id: string,
  options: SeedDatabaseUserOptions
): Promise<void> {
  const { user_id, username, display_name = username, type = 1 } = options;

  const table_info = await getModuleTableInfo(pg, database_id, 'users');

  await pg.query(
    `INSERT INTO "${table_info.schema_name}"."${table_info.table_name}" 
     (id, username, display_name, type) 
     VALUES ($1, $2, $3, $4)`,
    [user_id, username, display_name, type]
  );
}

/**
 * Seed an email for a user in a provisioned database.
 * Resolves the emails table dynamically from metaschema.
 */
export async function seedUserEmail(
  pg: PgTestClient,
  database_id: string,
  options: SeedUserEmailOptions
): Promise<void> {
  const { owner_id, email, is_verified = true, is_primary = true } = options;

  const table_info = await getModuleTableInfo(pg, database_id, 'emails');

  await pg.query(
    `INSERT INTO "${table_info.schema_name}"."${table_info.table_name}" 
     (owner_id, email, is_verified, is_primary) 
     VALUES ($1, $2, $3, $4)`,
    [owner_id, email, is_verified, is_primary]
  );
}

/**
 * Set a password for a user in a provisioned database.
 * Resolves the credentials table dynamically from metaschema.
 */
export async function setUserPassword(
  pg: PgTestClient,
  database_id: string,
  user_id: string,
  password: string
): Promise<void> {
  const table_info = await getModuleTableInfo(pg, database_id, 'config_secrets_user');

  await pg.query(
    `SELECT "${table_info.schema_name}".user_secrets_set($1, 'password_hash', $2, 'crypt')`,
    [user_id, password]
  );
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
