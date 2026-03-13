/**
 * TrgmSearchPlugin
 *
 * Adds pg_trgm fuzzy text matching to the PostGraphile v5 filter system.
 *
 * For every text/varchar column (optionally restricted to those with GIN
 * trigram indexes), this plugin adds:
 *
 * 1. **`similarTo` / `wordSimilarTo` filter operators** on StringFilter
 *    via `addConnectionFilterOperator`
 *    - `similarTo: { value: "cenral prk", threshold: 0.3 }`
 *      → `WHERE similarity(col, $1) > $2`
 *    - `wordSimilarTo: { value: "cenral prk", threshold: 0.3 }`
 *      → `WHERE word_similarity($1, col) > $2`
 *
 * 2. **`<column>Similarity` computed fields** on output types
 *    - Returns the similarity score when a similarTo filter is active
 *    - Returns null when no trigram filter is active
 *
 * 3. **`SIMILARITY_<COLUMN>_ASC/DESC` orderBy enum values**
 *    - Sorts by trigram similarity score
 *
 * ARCHITECTURE NOTE:
 * Uses the same meta system (setMeta/getMeta) as BM25 and tsvector plugins
 * to pass data between the filter apply phase and the output field plan.
 */

import 'graphile-build';
import 'graphile-build-pg';
import 'graphile-connection-filter';
import { TYPES } from '@dataplan/pg';
import type { PgCodecWithAttributes } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { SQL } from 'pg-sql2';
import { getQueryBuilder } from 'graphile-connection-filter';
import type { TrgmSearchPluginOptions } from './types';

// ─── TypeScript Namespace Augmentations ──────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /** Name for the similarity score field (e.g. "nameSimilarity") */
      pgTrgmSimilarity(this: Inflection, fieldName: string): string;
      /** Name for orderBy enum value for similarity score */
      pgTrgmOrderBySimilarityEnum(
        this: Inflection,
        codec: PgCodecWithAttributes,
        attributeName: string,
        ascending: boolean,
      ): string;
    }
    interface ScopeObjectFieldsField {
      isPgTrgmSimilarityField?: boolean;
    }
    interface BehaviorStrings {
      'attributeTrgmSimilarity:select': true;
      'attributeTrgmSimilarity:orderBy': true;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      TrgmSearchPlugin: true;
    }
  }
}

/**
 * Interface for the meta value stored by the filter apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface TrgmScoreDetails {
  selectIndex: number;
}

/**
 * Checks if a codec is a text type (text, varchar, bpchar).
 */
function isTextCodec(codec: any): boolean {
  const name = codec?.name;
  return name === 'text' || name === 'varchar' || name === 'bpchar';
}

/**
 * Creates the pg_trgm search plugin with the given options.
 */
export function createTrgmSearchPlugin(
  options: TrgmSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const { connectionFilterTrgmRequireIndex = false } = options;

  return {
    name: 'TrgmSearchPlugin',
    version: '1.0.0',
    description:
      'Adds pg_trgm fuzzy text matching operators (similarTo, wordSimilarTo) to the filter system with similarity score fields and orderBy',
    after: [
      'PgAttributesPlugin',
      'PgConnectionArgFilterPlugin',
      'PgConnectionArgFilterAttributesPlugin',
      'PgConnectionArgFilterOperatorsPlugin',
      'AddConnectionFilterOperatorPlugin',
    ],

    // ─── Custom Inflection Methods ─────────────────────────────────────
    inflection: {
      add: {
        pgTrgmSimilarity(_preset, fieldName) {
          return this.camelCase(`${fieldName}-similarity`);
        },
        pgTrgmOrderBySimilarityEnum(_preset, codec, attributeName, ascending) {
          const columnName = this._attributeName({
            codec,
            attributeName,
            skipRowId: true,
          });
          return this.constantCase(
            `similarity_${columnName}_${ascending ? 'asc' : 'desc'}`,
          );
        },
      },
    },

    schema: {
      // ─── Behavior Registry ─────────────────────────────────────────────
      behaviorRegistry: {
        add: {
          'attributeTrgmSimilarity:select': {
            description:
              'Should the trigram similarity score be exposed for this attribute',
            entities: ['pgCodecAttribute'],
          },
          'attributeTrgmSimilarity:orderBy': {
            description:
              'Should you be able to order by the trigram similarity score for this attribute',
            entities: ['pgCodecAttribute'],
          },
        },
      },
      entityBehavior: {
        pgCodecAttribute: {
          inferred: {
            provides: ['default'],
            before: ['inferred', 'override', 'PgAttributesPlugin'],
            callback(behavior, [codec, attributeName], _build) {
              const attr = codec.attributes[attributeName];
              if (isTextCodec(attr.codec)) {
                return [
                  'attributeTrgmSimilarity:orderBy',
                  'attributeTrgmSimilarity:select',
                  behavior,
                ];
              }
              return behavior;
            },
          },
        },
      },

      hooks: {
        init(_, build) {
          const {
            sql,
            graphql: { GraphQLString, GraphQLFloat, GraphQLNonNull },
          } = build;

          // Register the TrgmSearchInput type for filter operators
          build.registerInputObjectType(
            'TrgmSearchInput',
            {},
            () => ({
              description:
                'Input for pg_trgm fuzzy text matching. Provide a search value and optional similarity threshold.',
              fields: () => ({
                value: {
                  type: new GraphQLNonNull(GraphQLString),
                  description:
                    'The text to fuzzy-match against. Typos and misspellings are tolerated.',
                },
                threshold: {
                  type: GraphQLFloat,
                  description:
                    'Minimum similarity threshold (0.0 to 1.0). Higher = stricter matching. ' +
                    'Default is 0.3 (pg_trgm default). Example: 0.5 requires at least 50% trigram overlap.',
                },
              }),
            }),
            'TrgmSearchPlugin registering TrgmSearchInput type'
          );

          // Register `similarTo` operator on all String filter types
          if (typeof build.addConnectionFilterOperator === 'function') {
            build.addConnectionFilterOperator('String', 'similarTo', {
              description:
                'Fuzzy matches using pg_trgm trigram similarity. Tolerates typos and misspellings.',
              resolveType: () =>
                build.getTypeByName('TrgmSearchInput') as any,
              resolve(
                sqlIdentifier: SQL,
                _sqlValue: SQL,
                input: any,
                $where: any,
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
            });

            // Register `wordSimilarTo` operator on all String filter types
            build.addConnectionFilterOperator('String', 'wordSimilarTo', {
              description:
                'Fuzzy matches using pg_trgm word_similarity. Finds the best matching substring within the column value.',
              resolveType: () =>
                build.getTypeByName('TrgmSearchInput') as any,
              resolve(
                sqlIdentifier: SQL,
                _sqlValue: SQL,
                input: any,
                $where: any,
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
            });
          }

          return _;
        },

        /**
         * Add `<column>Similarity` computed fields to output types for tables
         * with text columns.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            inflection,
            graphql: { GraphQLFloat },
            grafast: { lambda },
          } = build;
          const {
            scope: { isPgClassType, pgCodec: rawPgCodec },
            fieldWithHooks,
          } = context;

          if (!isPgClassType || !rawPgCodec?.attributes) {
            return fields;
          }

          const codec = rawPgCodec as PgCodecWithAttributes;
          const behavior = build.behavior;

          let newFields = fields;

          for (const [attributeName, attribute] of Object.entries(
            codec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;

            // Check behavior registry — skip if user opted out
            if (
              behavior &&
              typeof behavior.pgCodecAttributeMatches === 'function' &&
              !behavior.pgCodecAttributeMatches(
                [codec, attributeName],
                'attributeTrgmSimilarity:select',
              )
            ) {
              continue;
            }

            const baseFieldName = inflection.attribute({
              codec: codec as any,
              attributeName,
            });
            const fieldName = inflection.pgTrgmSimilarity(baseFieldName);
            const metaKey = `__trgm_score_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgTrgmSimilarityField: true,
                  } as any,
                  () => ({
                    description: `Trigram similarity score when filtering \`${baseFieldName}\` with \`similarTo\`. Returns a value between 0 and 1 (1 = exact match). Returns null when no trigram filter is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return build.grafast.constant(null);

                      if (
                        typeof $select.setInliningForbidden === 'function'
                      ) {
                        $select.setInliningForbidden();
                      }

                      const $details = $select.getMeta(metaKey);

                      return lambda(
                        [$details, $row],
                        ([details, row]: readonly [any, any]) => {
                          const d = details as TrgmScoreDetails | null;
                          if (
                            d == null ||
                            row == null ||
                            d.selectIndex == null
                          ) {
                            return null;
                          }
                          const rawValue = row[d.selectIndex];
                          return rawValue == null
                            ? null
                            : TYPES.float.fromPg(rawValue as string);
                        }
                      );
                    },
                  })
                ),
              },
              `TrgmSearchPlugin adding similarity field '${fieldName}' for '${attributeName}' on '${codec.name}'`
            );
          }

          return newFields;
        },

        /**
         * Add orderBy enum values for similarity score:
         * SIMILARITY_<COLUMN>_ASC and SIMILARITY_<COLUMN>_DESC
         */
        GraphQLEnumType_values(values, build, context) {
          const { inflection } = build;
          const {
            scope: { isPgRowSortEnum, pgCodec: rawPgCodec },
          } = context;

          if (!isPgRowSortEnum || !rawPgCodec?.attributes) {
            return values;
          }

          const codec = rawPgCodec as PgCodecWithAttributes;
          const behavior = build.behavior;

          let newValues = values;

          for (const [attributeName, attribute] of Object.entries(
            codec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;

            // Check behavior registry
            if (
              behavior &&
              typeof behavior.pgCodecAttributeMatches === 'function' &&
              !behavior.pgCodecAttributeMatches(
                [codec, attributeName],
                'attributeTrgmSimilarity:orderBy',
              )
            ) {
              continue;
            }

            const fieldName = inflection.attribute({
              codec: codec as any,
              attributeName,
            });
            const metaKey = `trgm_order_${fieldName}`;
            const makePlan =
              (direction: 'ASC' | 'DESC') => (step: any) => {
                if (typeof step.setMeta === 'function') {
                  step.setMeta(metaKey, direction);
                }
              };

            const ascName = inflection.pgTrgmOrderBySimilarityEnum(codec, attributeName, true);
            const descName = inflection.pgTrgmOrderBySimilarityEnum(codec, attributeName, false);

            newValues = build.extend(
              newValues,
              {
                [ascName]: {
                  extensions: {
                    grafast: {
                      apply: makePlan('ASC'),
                    },
                  },
                },
                [descName]: {
                  extensions: {
                    grafast: {
                      apply: makePlan('DESC'),
                    },
                  },
                },
              },
              `TrgmSearchPlugin adding similarity orderBy for '${attributeName}' on '${codec.name}'`
            );
          }

          return newValues;
        },

        /**
         * Add `<column>SimilarTo` filter fields on connection filter input types
         * for tables with text columns. These fields accept TrgmSearchInput
         * and inject similarity score into the SELECT list for computed score fields.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const { inflection, sql } = build;
          const {
            scope: { isPgConnectionFilter, pgCodec } = {},
            fieldWithHooks,
          } = context;

          if (
            !isPgConnectionFilter ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          // Find text attributes
          const textAttributes: Array<[string, any]> = [];
          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;
            textAttributes.push([attributeName, attribute]);
          }

          if (textAttributes.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName] of textAttributes) {
            const baseFieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const fieldName = inflection.camelCase(
              `trgm_${attributeName}`
            );
            const scoreMetaKey = `__trgm_score_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgConnectionFilterField: true,
                  } as any,
                  {
                    description: build.wrapDescription(
                      `Trigram fuzzy search on the \`${attributeName}\` column using pg_trgm. ` +
                        `Provide a search value and optional similarity threshold (0-1). ` +
                        `Tolerates typos and misspellings.`,
                      'field'
                    ),
                    type: build.getTypeByName(
                      'TrgmSearchInput'
                    ) as any,
                    apply: function plan(
                      $condition: any,
                      val: any
                    ) {
                      if (val == null) return;

                      const { value, threshold } = val;
                      if (!value || typeof value !== 'string' || value.trim().length === 0)
                        return;

                      const th = threshold != null ? threshold : 0.3;
                      const columnExpr = sql`${$condition.alias}.${sql.identifier(attributeName)}`;
                      const similarityExpr = sql`similarity(${columnExpr}, ${sql.value(value)})`;

                      // Filter: similarity > threshold
                      $condition.where(
                        sql`${similarityExpr} > ${sql.value(th)}`
                      );

                      // Get the query builder via meta-safe traversal
                      const qb = getQueryBuilder(build, $condition);

                      // Only inject SELECT expressions when in "normal" mode
                      if (qb && qb.mode === 'normal') {
                        // Add similarity score to the SELECT list
                        const wrappedScoreSql = sql`${sql.parens(similarityExpr)}::text`;
                        const scoreIndex = qb.selectAndReturnIndex(
                          wrappedScoreSql
                        );

                        // Store the select index in meta
                        qb.setMeta(scoreMetaKey, {
                          selectIndex: scoreIndex,
                        } as TrgmScoreDetails);
                      }

                      // ORDER BY similarity: only add when the user
                      // explicitly requested similarity ordering via
                      // the SIMILARITY_<COLUMN>_ASC/DESC enum values.
                      if (qb && typeof qb.getMetaRaw === 'function') {
                        const orderMetaKey = `trgm_order_${baseFieldName}`;
                        const explicitDir = qb.getMetaRaw(orderMetaKey);
                        if (explicitDir) {
                          qb.orderBy({
                            fragment: similarityExpr,
                            codec: TYPES.float,
                            direction: explicitDir,
                          });
                        }
                      }
                    },
                  }
                ),
              },
              `TrgmSearchPlugin adding filter field '${fieldName}' for trgm column '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },
      },
    },
  };
}

/**
 * Creates a TrgmSearchPlugin with the given options.
 * This is the main entry point for using the plugin.
 */
export const TrgmSearchPlugin = createTrgmSearchPlugin;

export default TrgmSearchPlugin;
