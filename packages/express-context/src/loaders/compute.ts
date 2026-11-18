/**
 * Compute Module Loader
 *
 * Resolves per-database compute (functions) config through the database's
 * login-only reader `function_resolution.compute_entry`.
 * Returns the schema and table names for function definitions, API bindings,
 * and invocations so REST routes can address the generated tables.
 *
 * Function modules are scoped: a database may provision one per scope, each
 * with its own schema and tables. All of them are returned — REST routes and
 * the GraphQL bindings plugin expose bindings from every module, and RLS on
 * the underlying tables governs access.
 */

import type { ComputeConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const COMPUTE_MODULE_SQL = `
  SELECT
    functions_schema_name,
    definitions_table_name,
    bindings_table_name,
    invocations_schema_name,
    invocations_table_name,
    invocations_entity_field
  FROM function_resolution.compute_entry($1)
  ORDER BY functions_schema_name, definitions_table_name
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ComputeModuleRow {
  functions_schema_name: string;
  definitions_table_name: string;
  bindings_table_name: string;
  invocations_schema_name: string;
  invocations_table_name: string;
  invocations_entity_field: string | null;
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
    if (result.rows.length === 0) return undefined;

    return {
      modules: result.rows.map((row) => ({
        schemaName: row.functions_schema_name,
        definitionsTableName: row.definitions_table_name,
        // Physical bindings table name, recorded by the metaschema generator
        // on the function_module config row — read as a fact, never derived
        // from the definitions table name.
        bindingsTableName: row.bindings_table_name,
        invocationsSchemaName: row.invocations_schema_name,
        invocationsTableName: row.invocations_table_name,
        // Scope-key column of the invocations table (entity_field), or NULL
        // for global scopes. Consumers set this column on inserts.
        invocationsEntityField: row.invocations_entity_field,
      })),
    };
  },
});
