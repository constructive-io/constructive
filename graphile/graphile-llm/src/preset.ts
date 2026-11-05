/**
 * GraphileLlmPreset
 *
 * A preset that bundles all LLM plugins for PostGraphile v5.
 * This is the recommended entry point — add it to your preset's `extends` array.
 *
 * When enabled, this preset:
 * - Resolves an embedder from configuration (llm_module, env vars, or preset options)
 * - Adds a `text: String` field to `VectorNearbyInput` for text-based vector search
 * - Adds `{column}Text: String` companion fields on mutation inputs for vector columns
 *
 * Included in ConstructivePreset when `enableLlm` is true (the default).
 * Can also be used standalone by adding it directly to your preset's `extends` array.
 *
 * @example
 * ```typescript
 * import { GraphileLlmPreset } from 'graphile-llm';
 *
 * const preset = {
 *   extends: [
 *     ConstructivePreset,
 *     GraphileLlmPreset(),
 *   ],
 * };
 * ```
 *
 * @example With explicit embedder configuration:
 * ```typescript
 * import { GraphileLlmPreset } from 'graphile-llm';
 *
 * const preset = {
 *   extends: [
 *     ConstructivePreset,
 *     GraphileLlmPreset({
 *       defaultEmbedder: {
 *         provider: 'ollama',
 *         model: 'nomic-embed-text',
 *       },
 *     }),
 *   ],
 * };
 * ```
 *
 * @example Fail instead of degrading when the embedder is unavailable:
 * ```typescript
 * GraphileLlmPreset({
 *   defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' },
 *   onQuotaExceeded: 'throw',
 *   // → a unifiedSearch whose text cannot be embedded throws
 *   // → without this, it falls back to text-only search
 * })
 * ```
 */

import type { GraphileConfig } from 'graphile-config';

import { createLlmModulePlugin } from './plugins/llm-module-plugin';
import { createLlmRagPlugin } from './plugins/rag-plugin';
import { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
import { createLlmTextSearchPlugin } from './plugins/text-search-plugin';
import type { GraphileLlmOptions } from './types';

/**
 * Creates a preset that includes all LLM plugins.
 *
 * @param options - Configuration options for the LLM plugin
 * @returns A GraphileConfig.Preset to add to your extends array
 */
export function GraphileLlmPreset(
  options: GraphileLlmOptions = {}
): GraphileConfig.Preset {
  const {
    enableTextSearch = true,
    enableTextMutations = true,
    enableRag = false,
    onQuotaExceeded,
    ragDefaults
  } = options;

  const plugins: GraphileConfig.Plugin[] = [
    createLlmModulePlugin(options)
  ];

  if (enableTextSearch) {
    plugins.push(createLlmTextSearchPlugin({ onQuotaExceeded }));
  }

  if (enableTextMutations) {
    plugins.push(createLlmTextMutationPlugin());
  }

  if (enableRag) {
    plugins.push(createLlmRagPlugin(ragDefaults));
  }

  return {
    plugins
  };
}

export default GraphileLlmPreset;
