/**
 * PostGraphile v5 Search Preset
 *
 * Provides a convenient preset for including search support in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { ConnectionFilterOperatorFactory } from 'graphile-connection-filter';
import type { SQL } from 'pg-sql2';
import type { PgSearchPluginOptions } from './types';
import { createPgSearchPlugin } from './plugin';
import { createTsvectorCodecPlugin } from './tsvector-codec';

/**
 * Creates the `matches` filter operator factory for full-text search.
 * Declared here in the preset so it's registered via the declarative
 * `connectionFilterOperatorFactories` API — the declarative replacement
 * for the old imperative operator registration pattern.
 */
export function createMatchesOperatorFactory(
  fullTextScalarName: string,
  tsConfig: string
): ConnectionFilterOperatorFactory {
  return (build) => {
    const { sql, graphql: { GraphQLString } } = build;
    const TYPES = build.dataplanPg?.TYPES;

    return [{
      typeNames: fullTextScalarName,
      operatorName: 'matches',
      spec: {
        description: 'Performs a full text search on the field.',
        resolveType: () => GraphQLString,
        resolveInputCodec: TYPES ? () => TYPES.text : undefined,
        resolve(
          sqlIdentifier: SQL,
          sqlValue: SQL,
          _input: unknown,
          _$where: any,
          _details: { fieldName: string | null; operatorName: string }
        ) {
          return sql`${sqlIdentifier} @@ websearch_to_tsquery(${sql.literal(tsConfig)}, ${sqlValue})`;
        },
      },
    }];
  };
}

/**
 * Creates a preset that includes the search plugin with the given options.
 *
 * @example
 * ```typescript
 * import { PgSearchPreset } from 'graphile-tsvector';
 *
 * const preset = {
 *   extends: [
 *     PgSearchPreset({
 *       pgSearchPrefix: 'fullText',
 *     }),
 *   ],
 * };
 * ```
 */
export function PgSearchPreset(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Preset {
  const { fullTextScalarName = 'FullText', tsConfig = 'english' } = options;

  return {
    plugins: [createTsvectorCodecPlugin(options), createPgSearchPlugin(options)],
    schema: {
      connectionFilterOperatorFactories: [
        createMatchesOperatorFactory(fullTextScalarName, tsConfig),
      ],
    },
  };
}

export default PgSearchPreset;
