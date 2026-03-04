/**
 * Bm25SearchPlugin
 *
 * Auto-discovers all text columns with BM25 indexes (from pg_textsearch)
 * and adds:
 *
 * 1. **`bm25<Column>` condition fields** on connection condition inputs
 *    - Accepts { query, threshold? } to perform BM25 ranked search
 *    - Uses `column <@> to_bm25query(query, indexName)` for scoring
 *    - Optionally filters by score threshold via WHERE clause
 *
 * 2. **`bm25<Column>Score` computed fields** on output types
 *    - Returns the negative BM25 score when a search condition is active
 *    - Returns null when no search condition is active
 *
 * 3. **`BM25_<COLUMN>_SCORE_ASC/DESC` orderBy enum values**
 *    - ASC = best matches first (most negative BM25 scores first)
 *    - DESC = worst matches first
 *
 * The plugin reads BM25 index info from the module-level bm25IndexStore
 * that is populated by Bm25CodecPlugin during the gather phase.
 *
 * ARCHITECTURE NOTE:
 * Uses the Grafast meta system (setMeta/getMeta) to pass data between
 * the condition apply phase and the output field plan, following the
 * pattern from Benjie's postgraphile-plugin-fulltext-filter reference.
 *
 * 1. Condition apply (deferred/SQL-gen phase): adds BM25 score to the query
 *    builder's SELECT list via selectAndReturnIndex, stores { selectIndex }
 *    in meta via qb.setMeta(key, { selectIndex }).
 * 2. Output field plan (planning phase): calls $select.getMeta(key) which
 *    returns a Grafast Step that resolves at execution time.
 * 3. lambda([$details, $row]) reads the score from row[details.selectIndex].
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { Bm25SearchPluginOptions, Bm25IndexInfo } from './types';
import { bm25IndexStore, bm25ExtensionDetected } from './bm25-codec';
import { QuoteUtils } from '@pgsql/quotes';

/**
 * Interface for the meta value stored by the condition apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface Bm25ScoreDetails {
  selectIndex: number;
}

/**
 * Checks if a given codec attribute has a BM25 index.
 * Uses the bm25IndexStore populated during gather phase.
 */
function getBm25IndexForAttribute(
  pgCodec: any,
  attributeName: string
): Bm25IndexInfo | undefined {
  // The codec has extensions.pg with schemaName and name (table name)
  const pg = pgCodec?.extensions?.pg;
  if (!pg) return undefined;

  const key = `${pg.schemaName}.${pg.name}.${attributeName}`;
  return bm25IndexStore.get(key);
}

/**
 * Checks if a codec attribute is a text column (text, varchar, etc.)
 */
function isTextCodec(codec: any): boolean {
  const name = codec?.name;
  return name === 'text' || name === 'varchar' || name === 'bpchar';
}

/**
 * Walks from a PgCondition up to the PgSelectQueryBuilder.
 * Uses the .parent property on PgCondition to traverse up the chain,
 * following Benjie's pattern from postgraphile-plugin-fulltext-filter.
 *
 * Returns the query builder if found, or null if the traversal fails.
 */
function getQueryBuilder(
  build: any,
  $condition: any
): any | null {
  const PgCondition = build.dataplanPg?.PgCondition;
  if (!PgCondition) return null;

  let current = $condition;
  const { alias } = current;

  // Walk up through nested PgConditions (e.g. and/or/not)
  while (
    current &&
    current instanceof PgCondition &&
    current.alias === alias
  ) {
    current = (current as any).parent;
  }

  // Verify we found a query builder with matching alias
  if (
    current &&
    typeof current.selectAndReturnIndex === 'function' &&
    current.alias === alias
  ) {
    return current;
  }

  return null;
}

/**
 * Creates the BM25 search plugin with the given options.
 */
export function createBm25SearchPlugin(
  options: Bm25SearchPluginOptions = {}
): GraphileConfig.Plugin {
  const { conditionPrefix = 'bm25' } = options;

  return {
    name: 'Bm25SearchPlugin',
    version: '1.0.0',
    description:
      'Auto-discovers text columns with BM25 indexes and adds search conditions, score fields, and orderBy',
    after: [
      'Bm25CodecPlugin',
      'PgAttributesPlugin',
    ],

    schema: {
      hooks: {
        init(_, build) {
          const {
            graphql: { GraphQLString, GraphQLFloat },
          } = build;

          // Register the Bm25SearchInput type for condition fields
          build.registerInputObjectType(
            'Bm25SearchInput',
            {},
            () => ({
              description:
                'Input for BM25 ranked text search. Provide a search query string and optional score threshold.',
              fields: () => ({
                query: {
                  type: new build.graphql.GraphQLNonNull(GraphQLString),
                  description:
                    'The search query text. Uses pg_textsearch BM25 ranking.',
                },
                threshold: {
                  type: GraphQLFloat,
                  description:
                    'Maximum BM25 score threshold (negative values). Only rows with score <= threshold are returned. ' +
                    'More negative = more relevant. Example: -1.0 returns only docs scoring better than -1.0.',
                },
              }),
            }),
            'Bm25SearchPlugin registering Bm25SearchInput type'
          );

          return _;
        },

        /**
         * Extend the build object with BM25 index information so downstream
         * hooks can check which attributes have BM25 indexes.
         */
        build(build) {
          return build.extend(
            build,
            {
              pgBm25IndexStore: bm25IndexStore,
              pgBm25ExtensionDetected: bm25ExtensionDetected,
            },
            'Bm25SearchPlugin adding BM25 build state'
          );
        },

        /**
         * Add `bm25<Column>Score` computed fields to output types for tables
         * that have columns with BM25 indexes.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            inflection,
            graphql: { GraphQLFloat },
            grafast: { constant, lambda },
          } = build;
          const {
            scope: { isPgClassType, pgCodec },
            fieldWithHooks,
          } = context;

          if (!isPgClassType || !pgCodec?.attributes) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;

            const bm25Index = getBm25IndexForAttribute(pgCodec, attributeName);
            if (!bm25Index) continue;

            const baseFieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const fieldName = inflection.camelCase(`bm25-${baseFieldName}-score`);
            const metaKey = `__bm25_score_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `BM25 relevance score when searching \`${baseFieldName}\`. Returns negative values (more negative = more relevant). Returns null when no BM25 search condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return constant(null);

                      if (
                        typeof $select.setInliningForbidden === 'function'
                      ) {
                        $select.setInliningForbidden();
                      }

                      // Use the meta system to retrieve score details.
                      // getMeta returns a Grafast Step that resolves at
                      // execution time to the value set by setMeta in
                      // the condition apply phase.
                      const $details = $select.getMeta(metaKey);

                      return lambda(
                        [$details, $row],
                        ([details, row]: readonly [any, any]) => {
                          const d = details as Bm25ScoreDetails | null;
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
                            : parseFloat(rawValue);
                        }
                      );
                    },
                  })
                ),
              },
              `Bm25SearchPlugin adding score field '${fieldName}' for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },

        /**
         * Add orderBy enum values for BM25 score:
         * BM25_<COLUMN>_SCORE_ASC and BM25_<COLUMN>_SCORE_DESC
         */
        GraphQLEnumType_values(values, build, context) {
          const { inflection } = build;
          const {
            scope: { isPgRowSortEnum, pgCodec },
          } = context;

          if (!isPgRowSortEnum || !pgCodec?.attributes) {
            return values;
          }

          let newValues = values;

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;

            const bm25Index = getBm25IndexForAttribute(pgCodec, attributeName);
            if (!bm25Index) continue;

            const fieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const metaKey = `bm25_order_${fieldName}`;
            const makePlan =
              (direction: 'ASC' | 'DESC') => (step: any) => {
                if (typeof step.setMeta === 'function') {
                  step.setMeta(metaKey, direction);
                }
              };

            const ascName = inflection.constantCase(
              `bm25_${attributeName}_score_asc`
            );
            const descName = inflection.constantCase(
              `bm25_${attributeName}_score_desc`
            );

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
              `Bm25SearchPlugin adding score orderBy for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newValues;
        },

        /**
         * Add `bm25<Column>` condition fields on connection condition input types
         * for tables with BM25-indexed text columns.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const { inflection, sql } = build;
          const {
            scope: { isPgCondition, pgCodec },
            fieldWithHooks,
          } = context;

          if (
            !isPgCondition ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          // Find text attributes that have BM25 indexes
          const bm25Attributes: Array<[string, any, Bm25IndexInfo]> = [];
          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isTextCodec(attribute.codec)) continue;
            const bm25Index = getBm25IndexForAttribute(pgCodec, attributeName);
            if (!bm25Index) continue;
            bm25Attributes.push([attributeName, attribute, bm25Index]);
          }

          if (bm25Attributes.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName, _attribute, bm25Index] of bm25Attributes) {
            const fieldName = inflection.camelCase(
              `${conditionPrefix}_${attributeName}`
            );
            const baseFieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const scoreMetaKey = `__bm25_score_${baseFieldName}`;

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
                      `BM25 ranked text search on the \`${attributeName}\` column using pg_textsearch. ` +
                        `Provide a search query to filter and compute BM25 relevance scores. ` +
                        `Optionally specify a score threshold to filter by relevance.`,
                      'field'
                    ),
                    type: build.getTypeByName(
                      'Bm25SearchInput'
                    ) as any,
                    apply: function plan(
                      $condition: any,
                      val: any
                    ) {
                      if (val == null) return;

                      const { query, threshold } = val;
                      if (!query || typeof query !== 'string' || query.trim().length === 0)
                        return;

                      const columnExpr = sql`${$condition.alias}.${sql.identifier(attributeName)}`;
                      // Use to_bm25query with explicit index name for reliable scoring
                      const qualifiedIndexName = QuoteUtils.quoteQualifiedIdentifier(bm25Index.schemaName, bm25Index.indexName);
                      const bm25queryExpr = sql`to_bm25query(${sql.value(query)}, ${sql.value(qualifiedIndexName)})`;
                      const scoreExpr = sql`(${columnExpr} <@> ${bm25queryExpr})`;

                      // If a threshold is provided, add WHERE clause
                      // BM25 scores are negative; lower = more relevant
                      // threshold of -1.0 means: WHERE score < -1.0
                      if (
                        threshold !== undefined &&
                        threshold !== null
                      ) {
                        $condition.where(
                          sql`${scoreExpr} < ${sql.value(threshold)}`
                        );
                      }

                      // Get the query builder via meta-safe traversal
                      const qb = getQueryBuilder(build, $condition);
                      if (qb) {
                        // Add score to the SELECT list
                        const wrappedScoreSql = sql`${sql.parens(scoreExpr)}::text`;
                        const scoreIndex = qb.selectAndReturnIndex(
                          wrappedScoreSql
                        );

                        // Store the select index in meta (replaces WeakMap)
                        qb.setMeta(scoreMetaKey, {
                          selectIndex: scoreIndex,
                        } as Bm25ScoreDetails);
                      }

                      // ORDER BY score: only add when the user
                      // explicitly requested score ordering via
                      // the BM25_<COLUMN>_SCORE_ASC/DESC enum values.
                      if (qb && typeof qb.getMetaRaw === 'function') {
                        const orderMetaKey = `bm25_order_${baseFieldName}`;
                        const explicitDir = qb.getMetaRaw(orderMetaKey);
                        if (explicitDir) {
                          qb.orderBy({
                            fragment: scoreExpr,
                            codec: TYPES.float,
                            direction: explicitDir,
                          });
                        }
                      }
                    },
                  }
                ),
              },
              `Bm25SearchPlugin adding condition field '${fieldName}' for BM25 column '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },
      },
    },
  };
}

/**
 * Creates a Bm25SearchPlugin with the given options.
 * This is the main entry point for using the plugin.
 */
export const Bm25SearchPlugin = createBm25SearchPlugin;

export default Bm25SearchPlugin;
