/**
 * Unified Search Plugin Preset
 *
 * Convenience preset that bundles the unified search plugin with all 4 adapters
 * plus the codec plugins that teach PostGraphile about tsvector, bm25query,
 * and vector types.
 *
 * @example
 * ```typescript
 * import { UnifiedSearchPreset } from 'graphile-search';
 *
 * const preset = {
 *   extends: [
 *     UnifiedSearchPreset(),
 *   ],
 * };
 * ```
 */

import type { GraphileConfig } from 'graphile-config';
import { createUnifiedSearchPlugin } from './plugin';
import { createTsvectorAdapter } from './adapters/tsvector';
import { createBm25Adapter } from './adapters/bm25';
import { createTrgmAdapter } from './adapters/trgm';
import { createPgvectorAdapter } from './adapters/pgvector';
import { TsvectorCodecPlugin } from './codecs/tsvector-codec';
import { Bm25CodecPlugin } from './codecs/bm25-codec';
import { VectorCodecPlugin } from './codecs/vector-codec';
import { createMatchesOperatorFactory, createTrgmOperatorFactories } from './codecs/operator-factories';
import type { UnifiedSearchOptions } from './types';
import type { TsvectorAdapterOptions } from './adapters/tsvector';
import type { Bm25AdapterOptions } from './adapters/bm25';
import type { TrgmAdapterOptions } from './adapters/trgm';
import type { PgvectorAdapterOptions } from './adapters/pgvector';

/**
 * Options for configuring which adapters are enabled and their settings.
 */
export interface UnifiedSearchPresetOptions {
  /**
   * Enable tsvector adapter. Pass true for defaults, or an options object.
   * @default true
   */
  tsvector?: boolean | TsvectorAdapterOptions;

  /**
   * Enable BM25 adapter. Pass true for defaults, or an options object.
   * @default true
   */
  bm25?: boolean | Bm25AdapterOptions;

  /**
   * Enable pg_trgm adapter. Pass true for defaults, or an options object.
   * @default true
   */
  trgm?: boolean | TrgmAdapterOptions;

  /**
   * Enable pgvector adapter. Pass true for defaults, or an options object.
   * @default true
   */
  pgvector?: boolean | PgvectorAdapterOptions;

  /**
   * Whether to expose the composite `searchScore` field.
   * @default true
   */
  enableSearchScore?: boolean;

  /**
   * Whether to expose the composite `fullTextSearch` filter field.
   * @default true
   */
  enableFullTextSearch?: boolean;

  /**
   * Custom weights for the composite searchScore.
   * Keys are adapter names ('tsv', 'bm25', 'trgm', 'vector'),
   * values are relative weights.
   */
  searchScoreWeights?: Record<string, number>;

  /**
   * Name of the custom GraphQL scalar for tsvector columns.
   * @default 'FullText'
   */
  fullTextScalarName?: string;

  /**
   * PostgreSQL text search configuration.
   * @default 'english'
   */
  tsConfig?: string;
}

/**
 * Creates a preset that includes the unified search plugin with all enabled adapters.
 */
export function UnifiedSearchPreset(
  options: UnifiedSearchPresetOptions = {}
): GraphileConfig.Preset {
  const {
    tsvector = true,
    bm25 = true,
    trgm = true,
    pgvector = true,
    enableSearchScore = true,
    enableFullTextSearch = true,
    searchScoreWeights,
    fullTextScalarName = 'FullText',
    tsConfig = 'english',
  } = options;

  const adapters = [];

  if (tsvector) {
    const opts = typeof tsvector === 'object' ? tsvector : {};
    adapters.push(createTsvectorAdapter(opts));
  }

  if (bm25) {
    const opts = typeof bm25 === 'object' ? bm25 : {};
    adapters.push(createBm25Adapter(opts));
  }

  if (trgm) {
    const opts = typeof trgm === 'object' ? trgm : {};
    adapters.push(createTrgmAdapter(opts));
  }

  if (pgvector) {
    const opts = typeof pgvector === 'object' ? pgvector : {};
    adapters.push(createPgvectorAdapter(opts));
  }

  const pluginOptions: UnifiedSearchOptions = {
    adapters,
    enableSearchScore,
    enableFullTextSearch,
    searchScoreWeights,
  };

  // Collect codec plugins based on which adapters are enabled
  const codecPlugins: GraphileConfig.Plugin[] = [];
  if (tsvector) codecPlugins.push(TsvectorCodecPlugin);
  if (bm25) codecPlugins.push(Bm25CodecPlugin);
  if (pgvector) codecPlugins.push(VectorCodecPlugin);

  // Collect operator factories for connection filter integration
  const operatorFactories = [];
  if (tsvector) operatorFactories.push(createMatchesOperatorFactory(fullTextScalarName, tsConfig));
  if (trgm) operatorFactories.push(createTrgmOperatorFactories());

  return {
    plugins: [
      ...codecPlugins,
      createUnifiedSearchPlugin(pluginOptions),
    ],
    ...(operatorFactories.length > 0 ? {
      schema: {
        connectionFilterOperatorFactories: operatorFactories,
      },
    } : {}),
  };
}

export default UnifiedSearchPreset;
