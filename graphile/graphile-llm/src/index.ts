/**
 * graphile-llm — LLM Integration Plugin for PostGraphile v5
 *
 * Server-side text-to-vector embedding, text companion fields for pgvector
 * columns, and RAG (Retrieval-Augmented Generation) query support.
 *
 * Moves the embedding logic from the client (CLI --auto-embed) into the
 * Graphile server layer so clients work with text/prompts instead of raw
 * float vectors. Every model call goes through the metered gateway at
 * `AGENTIC_SERVER_URL`, under the identity the request's claims carry.
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
export { getEnvOptions, getEnvVars, getLlmEnvOptions, llmDefaults } from './env';

// Preset (recommended entry point)
export { GraphileLlmPreset } from './preset';

// Individual plugins (pure — no billing dependency)
export { createLlmModulePlugin } from './plugins/llm-module-plugin';
export { createLlmRagPlugin } from './plugins/rag-plugin';
export { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
export { createLlmTextSearchPlugin, embedTextInWhere } from './plugins/text-search-plugin';

// Plan-time embedding of tagged input fields
export type { EmbedRule } from './embed-inputs';
export { embedField, planTimeEmbedding } from './embed-inputs';

// Agent discovery (queries agent_chat_module config table at runtime)
export type { AgentDiscovery,AgentTableInfo } from './plugins/agent-discovery-plugin';
export { clearAgentDiscoveryCache,getAgentDiscovery } from './plugins/agent-discovery-plugin';

// Embedder utilities
export type { LlmRequestScope } from './embedder';
export {
  buildEmbedder,
  buildEmbedderFromEnv,
  createGatewayEmbedder,
  identityFromClaims,
  llmConfigStore,
  resolveRequestScope
} from './embedder';

// Chat completion utilities
export {
  buildChatCompleter,
  buildChatCompleterFromEnv,
  createGatewayChatCompleter
} from './chat';

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
  RagDefaults
} from './types';
