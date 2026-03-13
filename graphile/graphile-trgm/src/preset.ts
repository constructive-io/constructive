/**
 * PostGraphile v5 pg_trgm (Trigram Fuzzy Matching) Preset
 *
 * Provides a convenient preset for including trigram fuzzy search in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { ConnectionFilterOperatorFactory } from 'graphile-connection-filter';
import type { SQL } from 'pg-sql2';
import type { TrgmSearchPluginOptions } from './types';
import { createTrgmSearchPlugin } from './trgm-search';

/**
 * Creates the `similarTo` and `wordSimilarTo` filter operator factories
 * for pg_trgm fuzzy text matching. Declared here in the preset so they're
 * registered via the declarative `connectionFilterOperatorFactories` API.
 */
export function createTrgmOperatorFactories(): ConnectionFilterOperatorFactory {
  return (build) => {
    const { sql } = build;

    return [
      {
        typeNames: 'String',
        operatorName: 'similarTo',
        spec: {
          description:
            'Fuzzy matches using pg_trgm trigram similarity. Tolerates typos and misspellings.',
          resolveType: () =>
            build.getTypeByName('TrgmSearchInput') as any,
          resolve(
            sqlIdentifier: SQL,
            _sqlValue: SQL,
            input: any,
            _$where: any,
            _details: { fieldName: string | null; operatorName: string }
          ) {
            if (input == null) return null;
            const { value, threshold } = input;
            if (!value || typeof value !== 'string' || value.trim().length === 0) {
              return null;
            }
            const th = threshold != null ? threshold : 0.3;
            return sql`similarity(${sqlIdentifier}, ${sql.value(value)}) > ${sql.value(th)}`;
          },
        },
      },
      {
        typeNames: 'String',
        operatorName: 'wordSimilarTo',
        spec: {
          description:
            'Fuzzy matches using pg_trgm word_similarity. Finds the best matching substring within the column value.',
          resolveType: () =>
            build.getTypeByName('TrgmSearchInput') as any,
          resolve(
            sqlIdentifier: SQL,
            _sqlValue: SQL,
            input: any,
            _$where: any,
            _details: { fieldName: string | null; operatorName: string }
          ) {
            if (input == null) return null;
            const { value, threshold } = input;
            if (!value || typeof value !== 'string' || value.trim().length === 0) {
              return null;
            }
            const th = threshold != null ? threshold : 0.3;
            return sql`word_similarity(${sql.value(value)}, ${sqlIdentifier}) > ${sql.value(th)}`;
          },
        },
      },
    ];
  };
}

/**
 * Creates a preset that includes the pg_trgm search plugin with the given options.
 *
 * @example
 * ```typescript
 * import { TrgmSearchPreset } from 'graphile-trgm';
 *
 * const preset = {
 *   extends: [
 *     TrgmSearchPreset(),
 *   ],
 * };
 * ```
 */
export function TrgmSearchPreset(
  options: TrgmSearchPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createTrgmSearchPlugin(options)],
    schema: {
      connectionFilterOperatorFactories: [
        createTrgmOperatorFactories(),
      ],
    },
  };
}

export default TrgmSearchPreset;
