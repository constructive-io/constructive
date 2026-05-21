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

// Environment configuration (single source of truth for LLM defaults)
export { getLlmEnvOptions } from './env';
export type { LlmEnvOptions, LlmProviderConfig } from './env';

// Preset (recommended entry point)
export { GraphileLlmPreset } from './preset';

// Individual plugins (pure — no billing dependency)
export { createLlmModulePlugin } from './plugins/llm-module-plugin';
export { createLlmTextSearchPlugin } from './plugins/text-search-plugin';
export { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
export { createLlmRagPlugin } from './plugins/rag-plugin';

// Metering plugin (opt-in billing integration)
export { createLlmMeteringPlugin } from './plugins/metering-plugin';

// Agent discovery (queries agent_chat_module config table at runtime)
export { getAgentDiscovery, clearAgentDiscoveryCache } from './plugins/agent-discovery-plugin';
export type { AgentTableInfo, AgentDiscovery } from './plugins/agent-discovery-plugin';

// Embedder utilities
export {
  buildEmbedder,
  buildEmbedderFromModule,
  buildEmbedderFromEnv,
} from './embedder';

// Chat completion utilities
export {
  buildChatCompleter,
  buildChatCompleterFromModule,
  buildChatCompleterFromEnv,
} from './chat';

// Metering utilities (for custom integration)
export { meteredEmbed, meteredChat, logInferenceUsage, QuotaExceededError } from './metering';
export type { MeteringContext, MeteringOptions, MeterResult, WithPgClient, InferenceLogEntry } from './metering';

// Config cache (for custom integration)
export {
  getLlmBillingConfig,
  invalidateLlmBillingConfig,
  getLlmBillingCacheStats,
} from './config-cache';
export type { BillingConfig, LlmBillingCacheEntry, InferenceLogConfig, PgClient } from './config-cache';

// Types
export type {
  EmbedderFunction,
  EmbedderConfig,
  ChatFunction,
  ChatConfig,
  ChatMessage,
  ChatOptions,
  LlmModuleData,
  GraphileLlmOptions,
  MeteringConfig,
  RagDefaults,
  ChunkTableInfo,
} from './types';
