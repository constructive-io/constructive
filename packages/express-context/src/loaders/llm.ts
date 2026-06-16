/**
 * LLM Module Loader
 *
 * Resolves per-database LLM provider config from metaschema_modules_public.llm_module.
 * Returns embedding and chat provider settings (model, base URL, dimensions, limits).
 *
 * When the llm_module table doesn't exist yet (pre-migration), the loader
 * gracefully returns undefined — callers fall back to env vars.
 */

import type { LlmConfig } from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const LLM_MODULE_SQL = `
  SELECT
    lm.embedding_provider,
    lm.embedding_model,
    lm.embedding_base_url,
    lm.embedding_dimensions,
    lm.chat_provider,
    lm.chat_model,
    lm.chat_base_url,
    lm.rate_limit_rpm,
    lm.max_tokens_per_request,
    lm.rag_context_limit
  FROM metaschema_modules_public.llm_module lm
  WHERE lm.database_id = $1
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface LlmModuleRow {
  embedding_provider: string;
  embedding_model: string;
  embedding_base_url: string;
  embedding_dimensions: number | null;
  chat_provider: string | null;
  chat_model: string | null;
  chat_base_url: string | null;
  rate_limit_rpm: number | null;
  max_tokens_per_request: number | null;
  rag_context_limit: number | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const llmLoader: ModuleLoader<LlmConfig> = createModuleLoader<LlmConfig>({
  name: 'llm',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const result = await tenantPool.query<LlmModuleRow>(
      LLM_MODULE_SQL,
      [databaseId],
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      embeddingProvider: row.embedding_provider,
      embeddingModel: row.embedding_model,
      embeddingBaseUrl: row.embedding_base_url,
      embeddingDimensions: row.embedding_dimensions,
      chatProvider: row.chat_provider,
      chatModel: row.chat_model,
      chatBaseUrl: row.chat_base_url,
      rateLimitRpm: row.rate_limit_rpm,
      maxTokensPerRequest: row.max_tokens_per_request,
      ragContextLimit: row.rag_context_limit,
    };
  },
});
