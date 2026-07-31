/**
 * Inference Log Module Loader
 *
 * Resolves per-database inference log config from metaschema_modules_public.inference_log_module.
 * Returns the schema and table name for logging LLM inference usage.
 */

import type { InferenceLogConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const INFERENCE_LOG_MODULE_SQL = `
  SELECT
    s.schema_name AS schema,
    ilm.inference_log_table_name AS table_name
  FROM metaschema_modules_public.inference_log_module ilm
  JOIN metaschema_public.schema s ON ilm.schema_id = s.id
  WHERE ilm.database_id = $1
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
