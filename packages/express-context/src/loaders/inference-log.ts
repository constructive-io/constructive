/**
 * Inference Log Module Loader
 *
 * Resolves per-database inference log config through the database's
 * login-only reader `function_resolution.inference_log_module_registrations`.
 * Returns the schema and table name for logging LLM inference usage.
 */

import type { InferenceLogConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const INFERENCE_LOG_MODULE_SQL = `
  SELECT public_schema AS schema, inference_log_table_name AS table_name
  FROM function_resolution.inference_log_module_registrations($1)
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface InferenceLogModuleRow {
  schema: string;
  table_name: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const inferenceLogLoader: ModuleLoader<InferenceLogConfig> = createModuleLoader<InferenceLogConfig>({
  name: 'inferenceLog',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const result = await tenantPool.query<InferenceLogModuleRow>(
      INFERENCE_LOG_MODULE_SQL,
      [databaseId],
    );
    const row = result.rows[0];
    if (!row?.schema || !row?.table_name) return undefined;

    return {
      schema: row.schema,
      tableName: row.table_name,
    };
  },
});
