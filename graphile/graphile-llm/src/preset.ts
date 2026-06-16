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
 * - Optionally enables billing/metering via the LlmMeteringPlugin
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
 *         baseUrl: 'http://localhost:11434',
 *       },
 *     }),
 *   ],
 * };
 * ```
 *
 * @example With billing metering (opt-in, meter slug = model name by default):
 * ```typescript
 * GraphileLlmPreset({
 *   defaultEmbedder: { provider: 'openai', model: 'text-embedding-3-small' },
 *   metering: true,
 *   // → embedding calls metered under 'text-embedding-3-small' meter slug
 *   // → three-level waterfall: text-embedding-3-small → inference pool → universal
 * })
 * ```
 *
 * @example With strict quota enforcement (fail if embedding unavailable):
 * ```typescript
 * GraphileLlmPreset({
 *   defaultEmbedder: { provider: 'openai', model: 'text-embedding-3-small' },
 *   metering: true,
 *   onQuotaExceeded: 'throw',
 *   // → if billing quota is exceeded, queries with unifiedSearch throw an error
 *   // → without this, queries silently fall back to text-only search
 * })
 * ```
 *
 * @example With custom entity_id resolution (bill per-database):
 * ```typescript
 * GraphileLlmPreset({
 *   defaultEmbedder: { provider: 'openai', model: 'text-embedding-3-small' },
 *   metering: {
 *     resolveEntityId: (pgSettings) => pgSettings['jwt.claims.database_id'],
 *   },
 * })
 * ```
 */

import type { GraphileConfig } from 'graphile-config';

import { createLlmModulePlugin } from './plugins/llm-module-plugin';
import { createLlmMeteringPlugin } from './plugins/metering-plugin';
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
    ragDefaults,
    metering
  } = options;

  const plugins: GraphileConfig.Plugin[] = [
    createLlmModulePlugin(options)
  ];

  // Metering is opt-in: only loaded when metering is truthy
  // (true, or a MeteringConfig object)
  if (metering) {
    const meteringConfig = metering === true ? {} : metering;
    plugins.push(createLlmMeteringPlugin(meteringConfig));
  }

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
