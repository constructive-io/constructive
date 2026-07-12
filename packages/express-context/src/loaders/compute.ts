/**
 * Compute Module Loader
 *
 * Resolves per-database compute (functions) config from
 * metaschema_modules_public.function_module and function_invocation_module.
 * Returns the schema and table names for function definitions, API bindings,
 * and invocations so REST routes can address the generated tables.
 */

import type { ComputeConfig } from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const COMPUTE_MODULE_SQL = `
  SELECT
    fs.schema_name AS functions_schema_name,
    fm.definitions_table_name,
    ivs.schema_name AS invocations_schema_name,
    ivm.invocations_table_name
  FROM metaschema_modules_public.function_module fm
  JOIN metaschema_public.schema fs ON fs.id = fm.schema_id
  JOIN metaschema_modules_public.function_invocation_module ivm
    ON ivm.database_id = fm.database_id AND ivm.scope = fm.scope
  JOIN metaschema_public.schema ivs ON ivs.id = ivm.schema_id
  WHERE fm.database_id = $1
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ComputeModuleRow {
  functions_schema_name: string;
  definitions_table_name: string;
  invocations_schema_name: string;
  invocations_table_name: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const computeLoader: ModuleLoader<ComputeConfig> = createModuleLoader<ComputeConfig>({
  name: 'compute',
  ttlMs: 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const result = await tenantPool.query<ComputeModuleRow>(
      COMPUTE_MODULE_SQL,
      [databaseId],
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      schemaName: row.functions_schema_name,
      definitionsTableName: row.definitions_table_name,
      // The bindings table is generated alongside the definitions table
      // (see metaschema_generators.function_module).
      bindingsTableName: row.definitions_table_name.replace(/_definitions$/, '_api_bindings'),
      invocationsSchemaName: row.invocations_schema_name,
      invocationsTableName: row.invocations_table_name,
    };
  },
});
