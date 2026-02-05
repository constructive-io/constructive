/**
 * PostGraphile v5 pgvector Preset
 *
 * Provides a convenient preset for including pgvector support in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { PgVectorPluginOptions } from './types';
import { createPgVectorPlugin } from './plugin';

/**
 * Creates a preset that includes the pgvector plugin with the given options.
 *
 * @example
 * ```typescript
 * import { PgVectorPreset } from 'postgraphile-plugin-pgvector';
 *
 * const preset = {
 *   extends: [
 *     PgVectorPreset({
 *       collections: [{
 *         schema: 'public',
 *         table: 'documents',
 *         embeddingColumn: 'embedding',
 *       }],
 *       defaultMetric: 'COSINE',
 *       maxLimit: 100,
 *     }),
 *   ],
 * };
 * ```
 */
export function PgVectorPreset(options: PgVectorPluginOptions): GraphileConfig.Preset {
  return {
    plugins: [createPgVectorPlugin(options)],
  };
}

export default PgVectorPreset;
