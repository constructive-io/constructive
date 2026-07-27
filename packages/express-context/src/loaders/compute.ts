/**
 * Compute Module Loader
 *
 * Resolves per-database compute (functions) config from
 * metaschema_modules_public.function_module and function_invocation_module.
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
    fs.schema_name AS functions_schema_name,
    fm.definitions_table_name,
    COALESCE(
      to_jsonb(fm) ->> 'bindings_table_name',
      legacy_bindings.name
    ) AS bindings_table_name,
    ivs.schema_name AS invocations_schema_name,
    ivm.invocations_table_name,
    to_jsonb(ivm) ->> 'entity_field' AS invocations_entity_field
  FROM metaschema_modules_public.function_module fm
  JOIN metaschema_public.schema fs ON fs.id = fm.schema_id
  LEFT JOIN metaschema_public.table legacy_bindings
    ON legacy_bindings.schema_id = fm.schema_id
    AND legacy_bindings.name = regexp_replace(
      fm.definitions_table_name,
      '_definitions$',
      '_api_bindings'
    )
  JOIN metaschema_modules_public.function_invocation_module ivm
    ON ivm.database_id = fm.database_id AND ivm.scope = fm.scope
  JOIN metaschema_public.schema ivs ON ivs.id = ivm.schema_id
  WHERE fm.database_id = $1
  ORDER BY fs.schema_name
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ComputeModuleRow {
  functions_schema_name: string;
  definitions_table_name: string;
  bindings_table_name: string | null;
  invocations_schema_name: string;
  invocations_table_name: string;
  invocations_entity_field: string | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const computeLoader: ModuleLoader<ComputeConfig> =
  createModuleLoader<ComputeConfig>({
    name: 'compute',
    ttlMs: 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const result = await tenantPool.query<ComputeModuleRow>(
        COMPUTE_MODULE_SQL,
        [databaseId]
      );
      if (result.rows.length === 0) return undefined;

      return {
        modules: result.rows.map((row) => {
          if (!row.bindings_table_name) {
            throw new Error(
              `function bindings table missing for schema ${row.functions_schema_name}`
            );
          }

          return {
            schemaName: row.functions_schema_name,
            definitionsTableName: row.definitions_table_name,
            bindingsTableName: row.bindings_table_name,
            invocationsSchemaName: row.invocations_schema_name,
            invocationsTableName: row.invocations_table_name,
            // Scope-key column of the invocations table (entity_field), or NULL
            // for global scopes and DB revisions that predate this metadata.
            invocationsEntityField: row.invocations_entity_field,
          };
        }),
      };
    },
  });
