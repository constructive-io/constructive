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
 * Condition field apply functions run during a deferred phase (SQL generation)
 * on a queryBuilder proxy — NOT on the real PgSelectStep. The score field plan
 * runs earlier, during Grafast's planning phase, on the real PgSelectStep.
 *
 * To bridge these two phases we use a module-level WeakMap keyed by the SQL
 * alias object (shared between proxy and PgSelectStep via reference identity).
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { Bm25SearchPluginOptions, Bm25IndexInfo } from './types';
import { bm25IndexStore, bm25ExtensionDetected } from './bm25-codec';

/**
 * WeakMap keyed by SQL alias object (shared reference between
 * the queryBuilder proxy and PgSelectStep).
 *
 * Stores per-query BM25 search state so the score field's lambda
 * can read the computed score value at execution time.
 */
interface Bm25ScoreSlot {
  /** Map of fieldName -> index into the select list */
  indices: Record<string, number>;
}
const bm25ScoreSlots = new WeakMap<object, Bm25ScoreSlot>();

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
 * Navigates from a PgSelectSingleStep up to the PgSelectStep.
 * Uses duck-typing to avoid dependency on exact class names across rc versions.
 */
function getPgSelectStep($someStep: any): any | null {
  let $step = $someStep;

  if ($step && typeof $step.getClassStep === 'function') {
    $step = $step.getClassStep();
  }

  if ($step && typeof $step.orderBy === 'function' && $step.id !== undefined) {
    return $step;
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
            sql,
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

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `BM25 relevance score when searching \`${baseFieldName}\`. Returns negative values (more negative = more relevant). Returns null when no BM25 search condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $select = getPgSelectStep($step);
                      if (!$select) return constant(null);

                      if (
                        typeof $select.setInliningForbidden === 'function'
                      ) {
                        $select.setInliningForbidden();
                      }

                      // Initialise the WeakMap slot for this query
                      const alias = $select.alias;
                      if (!bm25ScoreSlots.has(alias)) {
                        bm25ScoreSlots.set(alias, {
                          indices: Object.create(null),
                        });
                      }

                      const capturedField = baseFieldName;
                      const capturedAlias = alias;
                      return lambda(
                        $step,
                        (row: any) => {
                          if (row == null) return null;
                          const slot =
                            bm25ScoreSlots.get(capturedAlias);
                          if (
                            !slot ||
                            slot.indices[capturedField] === undefined
                          )
                            return null;
                          const rawValue =
                            row[slot.indices[capturedField]];
                          return rawValue == null
                            ? null
                            : parseFloat(rawValue);
                        },
                        true
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
                      const qualifiedIndexName = `"${bm25Index.schemaName}"."${bm25Index.indexName}"`;
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

                      // Add score to the SELECT list
                      const $parent =
                        $condition.dangerouslyGetParent();
                      if (
                        typeof $parent.selectAndReturnIndex ===
                        'function'
                      ) {
                        const wrappedScoreSql = sql`${sql.parens(scoreExpr)}::text`;
                        const scoreIndex =
                          $parent.selectAndReturnIndex(
                            wrappedScoreSql
                          );

                        // Store index in alias-keyed WeakMap
                        const slot = bm25ScoreSlots.get(
                          $condition.alias
                        );
                        if (slot) {
                          slot.indices[baseFieldName] =
                            scoreIndex;
                        }
                      }

                      // ORDER BY score: only add when the user
                      // explicitly requested score ordering via
                      // the BM25_<COLUMN>_SCORE_ASC/DESC enum values.
                      const metaKey = `bm25_order_${baseFieldName}`;
                      const explicitDir =
                        typeof $parent.getMetaRaw === 'function'
                          ? $parent.getMetaRaw(metaKey)
                          : undefined;
                      if (explicitDir) {
                        $parent.orderBy({
                          fragment: scoreExpr,
                          codec: TYPES.float,
                          direction: explicitDir,
                        });
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
