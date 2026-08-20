/**
 * API Schemas Resolution
 *
 * Utilities for resolving PostgreSQL schema names from API names
 * by querying the routing_public.api_schemas table.
 */
import { Pool } from 'pg';
import { getPgEnvOptions, type PgConfig } from 'pg-env';

export type DatabasePoolFactory = (config: PgConfig) => Pool;

export type ExplicitEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Result of validating routing schema requirements
 */
export interface RoutingSchemaValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate that the required routing schemas exist in the database
 *
 * Checks for:
 * - routing_public schema with apis and api_schemas tables
 * - metaschema_public schema with schema table
 *
 * @param pool - Database connection pool
 * @returns Validation result
 */
export async function validateRoutingSchemas(
  pool: Pool
): Promise<RoutingSchemaValidation> {
  try {
    // Check for routing_public.apis table
    const apisCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'routing_public' 
      AND table_name = 'apis'
    `);
    if (apisCheck.rows.length === 0) {
      return {
        valid: false,
        error:
          'routing_public.apis table not found. The database must have the routing schema deployed.',
      };
    }

    // Check for routing_public.api_schemas table
    const apiSchemasCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'routing_public' 
      AND table_name = 'api_schemas'
    `);
    if (apiSchemasCheck.rows.length === 0) {
      return {
        valid: false,
        error:
          'routing_public.api_schemas table not found. The database must have the routing schema deployed.',
      };
    }

    // Check for metaschema_public.schema table
    const metaschemaCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'metaschema_public' 
      AND table_name = 'schema'
    `);
    if (metaschemaCheck.rows.length === 0) {
      return {
        valid: false,
        error:
          'metaschema_public.schema table not found. The database must have the metaschema deployed.',
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to validate routing schemas: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Resolve schema names from API names by querying routing_public.api_schemas
 *
 * Joins routing_public.apis, routing_public.api_schemas, and metaschema_public.schema
 * to get the actual PostgreSQL schema names for the given API names.
 *
 * @param pool - Database connection pool
 * @param apiNames - Array of API names to resolve
 * @returns Array of PostgreSQL schema names
 * @throws Error if validation fails or no schemas found
 */
export async function resolveApiSchemas(
  pool: Pool,
  apiNames: string[]
): Promise<string[]> {
  // First validate that the required schemas exist
  const validation = await validateRoutingSchemas(pool);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Query to get schema names for the given API names
  const result = await pool.query<{ schema_name: string }>(
    `
    SELECT DISTINCT ms.schema_name
    FROM routing_public.api_schemas as_tbl
    JOIN routing_public.apis api ON api.id = as_tbl.api_id
    JOIN metaschema_public.schema ms ON ms.id = as_tbl.schema_id
    WHERE api.name = ANY($1)
    ORDER BY ms.schema_name
    `,
    [apiNames]
  );

  if (result.rows.length === 0) {
    throw new Error(
      `No schemas found for API names: ${apiNames.join(', ')}. ` +
        'Ensure the APIs exist and have schemas assigned in routing_public.api_schemas.'
    );
  }

  return result.rows.map((row) => row.schema_name);
}

/**
 * Resolve a complete PostgreSQL configuration from explicit inputs.
 *
 * Configuration values override the supplied environment. Ambient process
 * environment is deliberately never consulted by this reusable boundary.
 */
export function resolvePgConfig(
  overrides: Partial<PgConfig> = {},
  env: ExplicitEnvironment = {}
): PgConfig {
  const config = getPgEnvOptions(overrides, { ...env });
  const database = config.database;
  const isConnectionString =
    database.startsWith('postgres://') || database.startsWith('postgresql://');

  if (!isConnectionString) return config;

  const url = new URL(database);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  return {
    host: url.hostname,
    port: Number.parseInt(url.port || '5432', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: dbName,
  };
}

/** Create a caller-owned, operation-scoped PostgreSQL pool. */
export function createDatabasePool(
  config: PgConfig,
  factory: DatabasePoolFactory = (poolConfig) => new Pool(poolConfig)
): Pool {
  return factory(config);
}
