import { createLogger } from '@pgpmjs/logger';
import type { Pool } from 'pg';

import type { ModuleInfo } from './types';

const logger = createLogger('invoke-function:schema-resolver');

/**
 * Resolves the schema + table names for function_module tables.
 *
 * The function_module stores schema_id (UUID) which maps to a
 * metaschema_public.schema row. The schema can be public (e.g.
 * "infra_public", "dataroom_public") or private (e.g. "infra_private").
 *
 * This function queries the module config to resolve the actual
 * PostgreSQL schema name where function_definitions and
 * function_invocations tables live.
 */
export async function resolveModuleSchema(
  pool: Pool,
  databaseId: string
): Promise<ModuleInfo[]> {
  const query = `
    SELECT
      s.name AS schema_name,
      fm.definitions_table_name,
      fm.invocations_table_name
    FROM metaschema_modules_public.function_module fm
    JOIN metaschema_public.schema s ON s.id = fm.schema_id
    WHERE fm.database_id = $1
    ORDER BY fm.membership_type NULLS FIRST
  `;

  const result = await pool.query(query, [databaseId]);

  if (result.rows.length === 0) {
    logger.warn('No function_module found for database', { databaseId });
    return [];
  }

  return result.rows.map((row) => ({
    schema_name: row.schema_name,
    definitions_table_name: row.definitions_table_name,
    invocations_table_name: row.invocations_table_name
  }));
}

/**
 * Resolves module info for a specific invocation by scanning all
 * function_module entries for this database and finding which one
 * contains the matching invocations table.
 *
 * Falls back to the first module if schema/table are provided
 * in the payload directly.
 */
export async function resolveModuleForInvocation(
  pool: Pool,
  databaseId: string,
  schemaHint?: string,
  tableHint?: string
): Promise<ModuleInfo | null> {
  const modules = await resolveModuleSchema(pool, databaseId);

  if (modules.length === 0) {
    return null;
  }

  if (schemaHint && tableHint) {
    const match = modules.find(
      (m) => m.schema_name === schemaHint && m.invocations_table_name === tableHint
    );
    if (match) return match;
  }

  if (schemaHint) {
    const match = modules.find((m) => m.schema_name === schemaHint);
    if (match) return match;
  }

  return modules[0];
}
