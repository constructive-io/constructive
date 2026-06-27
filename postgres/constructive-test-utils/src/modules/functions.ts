import type { PgTestClient } from 'pgsql-test';

export interface RegisterFunctionOptions {
  module_scope: string;
  category: string;
  name: string;
  task_identifier: string;
  is_invocable?: boolean;
  is_built_in?: boolean;
  description?: string;
  required_secrets?: Record<string, boolean>[];
  required_configs?: Record<string, boolean>[];
}

/**
 * Register a function definition via metaschema_private.register_function().
 *
 * module_scope: which tier to write to ('platform' | 'database' | 'app' | 'entity').
 * For non-platform scopes, JWT database context (jwt.claims.database_id) must be
 * set on the client before calling.
 */
export async function registerFunction(
  client: PgTestClient,
  opts: RegisterFunctionOptions
): Promise<void> {
  const {
    module_scope,
    category,
    name,
    task_identifier,
    is_invocable = false,
    is_built_in = true,
    description,
    required_secrets,
    required_configs,
  } = opts;

  const secrets_json = required_secrets
    ? JSON.stringify(required_secrets.map((s) => ({ name: Object.keys(s)[0], required: Object.values(s)[0] })))
    : null;

  const configs_json = required_configs
    ? JSON.stringify(required_configs.map((c) => ({ name: Object.keys(c)[0], required: Object.values(c)[0] })))
    : null;

  await client.query(
    `SELECT metaschema_private.register_function(
        $1, $2, $3, $4,
        is_invocable := $5,
        is_built_in := $6,
        description := $7,
        required_secrets := $8::jsonb,
        required_configs := $9::jsonb
     )`,
    [
      module_scope,
      category,
      name,
      task_identifier,
      is_invocable,
      is_built_in,
      description ?? null,
      secrets_json,
      configs_json,
    ]
  );
}

/**
 * Seed the minimal built-in functions needed for provisioning.
 * Ensures a platform-scope function_module exists for the given database,
 * then registers into the platform definitions table.
 */
export async function seedBuiltInFunctions(
  pg: PgTestClient,
  database_id: string
): Promise<void> {
  await pg.query(`SET constructive.allow_super_constructive = 'true'`);
  await pg.query(
    `INSERT INTO metaschema_modules_public.function_module (database_id, scope)
     VALUES ($1, 'platform') ON CONFLICT (database_id, scope, prefix) DO NOTHING`,
    [database_id]
  );
  await pg.query(`RESET constructive.allow_super_constructive`);

  await registerFunction(pg, {
    module_scope: 'platform',
    category: 'function',
    name: 'provision',
    task_identifier: 'function:provision',
    description: 'Internal: provision cloud function infrastructure',
  });
  await registerFunction(pg, {
    module_scope: 'platform',
    category: 'namespace',
    name: 'provision',
    task_identifier: 'namespace:provision',
    description: 'Internal: provision namespace infrastructure',
  });
}
