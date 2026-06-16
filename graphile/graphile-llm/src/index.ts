/**
 * graphile-llm — LLM Integration Plugin for PostGraphile v5
 *
 * Server-side text-to-vector embedding, text companion fields for pgvector
 * columns, and RAG (Retrieval-Augmented Generation) query support.
 *
 * Moves the embedding logic from the client (CLI --auto-embed) into the
 * Graphile server layer so clients work with text/prompts instead of raw
 * float vectors.
 *
 * @example
 * ```typescript
 * import { GraphileLlmPreset } from 'graphile-llm';
 *
 * const preset = {
 *   extends: [
 *     GraphileLlmPreset({
 *       defaultEmbedder: {
 *         provider: 'ollama',
 *         model: 'nomic-embed-text',
 *       },
 *       defaultChatCompleter: {
 *         provider: 'ollama',
 *         model: 'llama3',
 *       },
 *       enableRag: true,
 *     }),
 *   ],
 * };
 * ```
 */

// Environment configuration (re-exported from @constructive-io/llm-env)
export type { LlmEnvOptions, LlmProviderConfig, ResolvedLlmEnvOptions } from './env';
export { getEnvVars, getEnvOptions, getLlmEnvOptions, llmDefaults } from './env';

// Preset (recommended entry point)
export { GraphileLlmPreset } from './preset';

// Individual plugins (pure — no billing dependency)
export { createLlmModulePlugin } from './plugins/llm-module-plugin';
export { createLlmRagPlugin } from './plugins/rag-plugin';
export { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
export { createLlmTextSearchPlugin, embedTextInWhere } from './plugins/text-search-plugin';

// Metering plugin (opt-in billing integration)
export { createLlmMeteringPlugin } from './plugins/metering-plugin';

// Agent discovery (queries agent_chat_module config table at runtime)
export type { AgentDiscovery,AgentTableInfo } from './plugins/agent-discovery-plugin';
export { clearAgentDiscoveryCache,getAgentDiscovery } from './plugins/agent-discovery-plugin';

// Embedder utilities
export type { LlmConfigOverrides } from './embedder';
export {
  buildEmbedder,
  buildEmbedderFromEnv,
  buildEmbedderFromModule,
  llmConfigStore
} from './embedder';

// Chat completion utilities
export {
  buildChatCompleter,
  buildChatCompleterFromEnv,
  buildChatCompleterFromModule
} from './chat';

// Metering utilities (for custom integration)
export type { InferenceLogEntry,MeteringContext, MeteringOptions, MeterResult, WithPgClient } from './metering';
export { logInferenceUsage, meteredChat, meteredEmbed, QuotaExceededError } from './metering';

// Config cache (for custom integration)
export type { BillingConfig, InferenceLogConfig, LlmBillingCacheEntry, PgClient } from './config-cache';
export {
  getLlmBillingCacheStats,
  getLlmBillingConfig,
  invalidateLlmBillingConfig
} from './config-cache';

// Types
export type {
  ChatConfig,
  ChatFunction,
  ChatMessage,
  ChatOptions,
  ChatResult,
  ChunkTableInfo,
  EmbedderConfig,
  EmbedderFunction,
  EmbeddingResult,
  GraphileLlmOptions,
  LlmModuleData,
  LlmUsage,
  MeteringConfig,
  RagDefaults
} from './types';
