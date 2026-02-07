/**
 * PostGraphile v5 Search Plugin
 *
 * Generates search condition fields for tsvector columns. When a search term
 * is provided via the condition input, this plugin applies a
 * `column @@ websearch_to_tsquery('english', $value)` WHERE clause.
 *
 * Uses the graphile-build hooks API to extend condition input types with
 * search fields for each tsvector column found on a table's codec.
 *
 * MIGRATION NOTE (V4 -> V5):
 * - V4 used `addArgDataGenerator` to inject WHERE and ORDER BY clauses.
 *   This API was removed in V5.
 * - V5 uses the `GraphQLInputObjectType_fields` hook with an `apply` function
 *   on condition fields, following the same pattern as PgConditionCustomFieldsPlugin
 *   in graphile-build-pg.
 * - ORDER BY ts_rank relevance is NOT automatically injected in V5. The condition
 *   system only supports WHERE clause injection. To get relevance ordering, use a
 *   custom orderBy enum value or a dedicated search query field.
 */

import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { PgSearchPluginOptions } from './types';

/**
 * Creates the search plugin with the given options.
 *
 * @param options - Plugin configuration
 * @returns GraphileConfig.Plugin
 *
 * @example
 * ```typescript
 * import { createPgSearchPlugin } from 'graphile-search-plugin';
 *
 * const plugin = createPgSearchPlugin({ pgSearchPrefix: 'fullText' });
 * ```
 */
export function createPgSearchPlugin(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const { pgSearchPrefix = 'tsv' } = options;

  return {
    name: 'PgSearchPlugin',
    version: '2.0.0',
    description:
      'Generates search conditions for tsvector columns in PostGraphile v5',
    after: ['PgAttributesPlugin'],

    schema: {
      hooks: {
        GraphQLInputObjectType_fields(fields, build, context) {
          const {
            inflection,
            sql,
            graphql: { GraphQLString },
          } = build;
          const {
            scope: { isPgCondition, pgCodec },
            fieldWithHooks,
          } = context;

          // Only operate on condition input types for codecs (tables) with attributes
          if (
            !isPgCondition ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          // Find all tsvector attributes on the codec
          const tsvectorAttributes = Object.entries(
            pgCodec.attributes as Record<string, any>
          ).filter(
            ([_name, attr]: [string, any]) => attr.codec?.name === 'tsvector'
          );

          if (tsvectorAttributes.length === 0) {
            return fields;
          }

          // Add a search condition field for each tsvector column
          let newFields = fields;

          for (const [attributeName] of tsvectorAttributes) {
            const fieldName = inflection.camelCase(
              `${pgSearchPrefix}_${attributeName}`
            );

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgConnectionConditionInputField: true,
                  },
                  {
                    description: build.wrapDescription(
                      `Full-text search on the \`${attributeName}\` tsvector column using \`websearch_to_tsquery\`.`,
                      'field'
                    ),
                    type: GraphQLString,
                    apply: function plan($condition: any, val: any) {
                      if (val == null) return;
                      // Build: table_alias.column @@ websearch_to_tsquery('english', $val)
                      $condition.where(
                        sql`${$condition.alias}.${sql.identifier(
                          attributeName
                        )} @@ websearch_to_tsquery('english', ${sql.value(
                          val
                        )})`
                      );
                    },
                  }
                ),
              },
              `PgSearchPlugin adding condition field '${fieldName}' for tsvector column '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },
      },
    },
  };
}

/**
 * Creates a PgSearchPlugin with the given options.
 * This is the main entry point for using the plugin.
 */
export const PgSearchPlugin = createPgSearchPlugin;

export default PgSearchPlugin;
