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

// Preset (recommended entry point)
export { GraphileLlmPreset } from './preset';

// Individual plugins
export { createLlmModulePlugin } from './plugins/llm-module-plugin';
export { createLlmTextSearchPlugin } from './plugins/text-search-plugin';
export { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
export { createLlmRagPlugin } from './plugins/rag-plugin';

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
  RagDefaults,
  ChunkTableInfo,
} from './types';
