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
 * - Logs token usage to console (metering integration deferred to billing system)
 *
 * This preset is standalone — it is NOT included in ConstructivePreset by default.
 * Projects that want LLM features opt in by adding it to their preset.
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
 *         baseUrl: 'http://localhost:11434',
 *       },
 *     }),
 *   ],
 * };
 * ```
 */

import type { GraphileConfig } from 'graphile-config';
import { createLlmModulePlugin } from './plugins/llm-module-plugin';
import { createLlmTextSearchPlugin } from './plugins/text-search-plugin';
import { createLlmTextMutationPlugin } from './plugins/text-mutation-plugin';
import { createLlmRagPlugin } from './plugins/rag-plugin';
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
    ragDefaults,
  } = options;

  const plugins: GraphileConfig.Plugin[] = [
    createLlmModulePlugin(options),
  ];

  if (enableTextSearch) {
    plugins.push(createLlmTextSearchPlugin());
  }

  if (enableTextMutations) {
    plugins.push(createLlmTextMutationPlugin());
  }

  if (enableRag) {
    plugins.push(createLlmRagPlugin(ragDefaults));
  }

  return {
    plugins,
  };
}

export default GraphileLlmPreset;
