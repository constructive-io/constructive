/**
 * API Schemas Resolution
 *
 * Utilities for resolving PostgreSQL schema names from API names
 * by querying the services_public.api_schemas table.
 */
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

/**
 * Result of validating services schema requirements
 */
export interface ServicesSchemaValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate that the required services schemas exist in the database
 *
 * Checks for:
 * - services_public schema with apis and api_schemas tables
 * - metaschema_public schema with schema table
 *
 * @param pool - Database connection pool
 * @returns Validation result
 */
export async function validateServicesSchemas(
  pool: Pool,
): Promise<ServicesSchemaValidation> {
  try {
    // Check for services_public.apis table
    const apisCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'services_public' 
      AND table_name = 'apis'
    `);
    if (apisCheck.rows.length === 0) {
      return {
        valid: false,
        error:
          'services_public.apis table not found. The database must have the services schema deployed.',
      };
    }

    // Check for services_public.api_schemas table
    const apiSchemasCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'services_public' 
      AND table_name = 'api_schemas'
    `);
    if (apiSchemasCheck.rows.length === 0) {
      return {
        valid: false,
        error:
          'services_public.api_schemas table not found. The database must have the services schema deployed.',
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
      error: `Failed to validate services schemas: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Resolve schema names from API names by querying services_public.api_schemas
 *
 * Joins services_public.apis, services_public.api_schemas, and metaschema_public.schema
 * to get the actual PostgreSQL schema names for the given API names.
 *
 * @param pool - Database connection pool
 * @param apiNames - Array of API names to resolve
 * @returns Array of PostgreSQL schema names
 * @throws Error if validation fails or no schemas found
 */
export async function resolveApiSchemas(
  pool: Pool,
  apiNames: string[],
): Promise<string[]> {
  // First validate that the required schemas exist
  const validation = await validateServicesSchemas(pool);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Query to get schema names for the given API names
  const result = await pool.query<{ schema_name: string }>(
    `
    SELECT DISTINCT ms.schema_name
    FROM services_public.api_schemas as_tbl
    JOIN services_public.apis api ON api.id = as_tbl.api_id
    JOIN metaschema_public.schema ms ON ms.id = as_tbl.schema_id
    WHERE api.name = ANY($1)
    ORDER BY ms.schema_name
    `,
    [apiNames],
  );

  if (result.rows.length === 0) {
    throw new Error(
      `No schemas found for API names: ${apiNames.join(', ')}. ` +
        'Ensure the APIs exist and have schemas assigned in services_public.api_schemas.',
    );
  }

  return result.rows.map((row) => row.schema_name);
}

/**
 * Create a database pool for the given database name or connection string
 *
 * @param database - Database name or connection string
 * @returns Database connection pool
 */
export function createDatabasePool(database: string): Pool {
  // Check if it's a connection string or just a database name
  const isConnectionString =
    database.startsWith('postgres://') || database.startsWith('postgresql://');

  if (isConnectionString) {
    // Parse connection string and extract database name
    // Format: postgres://user:password@host:port/database
    const url = new URL(database);
    const dbName = url.pathname.slice(1); // Remove leading slash
    return getPgPool({
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      user: url.username,
      password: url.password,
      database: dbName,
    });
  }

  // Use environment variables for connection, just override database name
  const config = getPgEnvOptions({ database });
  return getPgPool(config);
}
