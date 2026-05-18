import { Logger } from '@pgpmjs/logger';

const log = new Logger('infra-secrets');

export type PgClientLike = {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
};

export interface ResolvedSecret {
  name: string;
  value: string | null;
  source: 'database' | 'global' | null;
}

export interface ResolveOptions {
  /**
   * If true, throws when a required (non-optional) secret cannot be resolved.
   * Default: true
   */
  strict?: boolean;
}

/**
 * Resolves all secrets required by a function definition.
 *
 * Resolution cascade:
 *   1. Look up in app_secrets with namespace = database_id (org-scoped)
 *   2. Fall back to app_secrets with namespace = 'default' (global/platform)
 *   3. If neither found and secret is not optional, throw (strict mode)
 *
 * @param client - A pg client or pool with a query method
 * @param function_id - UUID of the function definition (default or scoped)
 * @param database_id - UUID of the database (org context for scoped lookup)
 * @param secrets_schema - Schema where app_secrets lives (default: constructive_store_private)
 * @param options - Resolution options
 * @returns Array of resolved secrets with name, value, and source
 */
export async function resolveSecrets(
  client: PgClientLike,
  function_id: string,
  database_id: string,
  secrets_schema: string = 'constructive_store_private',
  options: ResolveOptions = {}
): Promise<ResolvedSecret[]> {
  const { strict = true } = options;

  // Get the list of required secret names for this function
  const requirements = await getSecretRequirements(client, function_id);

  if (requirements.length === 0) {
    log.debug('No secret requirements for function', { function_id });
    return [];
  }

  log.debug('Resolving secrets', {
    function_id,
    database_id,
    count: requirements.length
  });

  const resolved: ResolvedSecret[] = [];

  for (const req of requirements) {
    const result = await resolveOne(
      client,
      req.secret_name,
      database_id,
      secrets_schema
    );

    if (result.value === null && !req.is_optional && strict) {
      throw new SecretResolutionError(
        `Required secret "${req.secret_name}" not found for function ${function_id} ` +
        `(checked namespace "${database_id}" and "default" in ${secrets_schema}.app_secrets)`
      );
    }

    resolved.push(result);
  }

  log.info('Secrets resolved', {
    function_id,
    total: resolved.length,
    found: resolved.filter(r => r.value !== null).length,
    missing: resolved.filter(r => r.value === null).length
  });

  return resolved;
}

/**
 * Resolves secrets and returns a flat key-value map (secret_name → value).
 * Missing optional secrets are omitted from the map.
 */
export async function resolveSecretsMap(
  client: PgClientLike,
  function_id: string,
  database_id: string,
  secrets_schema?: string,
  options?: ResolveOptions
): Promise<Record<string, string>> {
  const resolved = await resolveSecrets(
    client,
    function_id,
    database_id,
    secrets_schema,
    options
  );

  const map: Record<string, string> = {};
  for (const r of resolved) {
    if (r.value !== null) {
      map[r.name] = r.value;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SecretRequirement {
  secret_name: string;
  is_optional: boolean;
}

async function getSecretRequirements(
  client: PgClientLike,
  function_id: string
): Promise<SecretRequirement[]> {
  const { rows } = await client.query<SecretRequirement>(
    `SELECT sd.name AS secret_name, fsr.is_optional
     FROM infra_public.function_secret_requirements fsr
     JOIN infra_public.secret_definitions sd ON sd.id = fsr.secret_definition_id
     WHERE fsr.default_function_id = $1
        OR fsr.function_id = $1`,
    [function_id]
  );
  return rows;
}

async function resolveOne(
  client: PgClientLike,
  secret_name: string,
  database_id: string,
  secrets_schema: string
): Promise<ResolvedSecret> {
  // Try org-scoped first (namespace = database_id)
  const org_result = await client.query<{ val: string }>(
    `SELECT ${secrets_schema}.app_secrets_get($1, NULL, $2) AS val`,
    [secret_name, database_id]
  );

  const org_val = org_result.rows[0]?.val;
  if (org_val !== null && org_val !== undefined) {
    return { name: secret_name, value: org_val, source: 'database' };
  }

  // Fall back to global (namespace = 'default')
  const global_result = await client.query<{ val: string }>(
    `SELECT ${secrets_schema}.app_secrets_get($1, NULL, 'default') AS val`,
    [secret_name]
  );

  const global_val = global_result.rows[0]?.val;
  if (global_val !== null && global_val !== undefined) {
    return { name: secret_name, value: global_val, source: 'global' };
  }

  return { name: secret_name, value: null, source: null };
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class SecretResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretResolutionError';
  }
}
