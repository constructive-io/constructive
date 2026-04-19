/**
 * graphile-llm — LLM Integration Plugin for PostGraphile v5
 *
 * Server-side text-to-vector embedding and text companion fields for
 * pgvector columns. Moves the embedding logic from the client (CLI --auto-embed)
 * into the Graphile server layer so clients work with text/prompts instead
 * of raw float vectors.
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

// Embedder utilities
export {
  buildEmbedder,
  buildEmbedderFromModule,
  buildEmbedderFromEnv,
} from './embedder';

// Types
export type {
  EmbedderFunction,
  EmbedderConfig,
  LlmModuleData,
  GraphileLlmOptions,
} from './types';
