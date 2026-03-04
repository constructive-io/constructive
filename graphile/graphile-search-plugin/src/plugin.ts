/**
 * PostGraphile v5 Search Plugin
 *
 * Generates search condition fields for tsvector columns. When a search term
 * is provided via the condition input, this plugin applies a
 * `column @@ websearch_to_tsquery('english', $value)` WHERE clause.
 * Results are ordered by `ts_rank` only when explicitly requested via
 * the `FULL_TEXT_RANK_ASC/DESC` orderBy enum values (not automatically),
 * ensuring cursor pagination digests remain stable across pages.
 *
 * Additionally provides:
 * - `matches` filter operator for postgraphile-plugin-connection-filter
 * - `fullTextRank` computed fields on output types (null when no search active)
 * - `FULL_TEXT_RANK_ASC/DESC` orderBy enum values
 *
 * Uses the graphile-build hooks API to extend condition input types with
 * search fields for each tsvector column found on a table's codec.
 *
 * ARCHITECTURE NOTE:
 * Uses the Grafast meta system (setMeta/getMeta) to pass data between
 * the condition apply phase and the output field plan, following the
 * pattern from Benjie's postgraphile-plugin-fulltext-filter reference.
 *
 * 1. Condition apply (deferred/SQL-gen phase): adds ts_rank to the query
 *    builder's SELECT list via selectAndReturnIndex, stores { selectIndex }
 *    in meta via qb.setMeta(key, { selectIndex }).
 * 2. Output field plan (planning phase): calls $select.getMeta(key) which
 *    returns a Grafast Step that resolves at execution time.
 * 3. lambda([$details, $row]) reads the rank from row[details.selectIndex].
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { SQL } from 'pg-sql2';
import type { PgSearchPluginOptions } from './types';

/**
 * Interface for the meta value stored by the condition apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface FtsRankDetails {
  selectIndex: number;
}

function isTsvectorCodec(codec: any): boolean {
  return (
    codec?.extensions?.pg?.schemaName === 'pg_catalog' &&
    codec?.extensions?.pg?.name === 'tsvector'
  );
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
 * Creates the search plugin with the given options.
 */
export function createPgSearchPlugin(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const { pgSearchPrefix = 'tsv', fullTextScalarName = 'FullText', tsConfig = 'english' } = options;

  return {
    name: 'PgSearchPlugin',
    version: '2.0.0',
    description:
      'Generates search conditions for tsvector columns in PostGraphile v5',
    after: ['PgAttributesPlugin', 'PgConnectionArgFilterPlugin', 'PgConnectionArgFilterOperatorsPlugin', 'AddConnectionFilterOperatorPlugin'],

    schema: {
      hooks: {
        init(_, build) {
          const {
            sql,
            graphql: { GraphQLString },
          } = build;

          // Register the `matches` filter operator for the FullText scalar.
          // Requires postgraphile-plugin-connection-filter; skip if not loaded.
          const addConnectionFilterOperator = (build as any)
            .addConnectionFilterOperator;
          if (typeof addConnectionFilterOperator === 'function') {
            const TYPES = (build as any).dataplanPg?.TYPES;
            addConnectionFilterOperator(fullTextScalarName, 'matches', {
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
            });
          }

          return _;
        },

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
            if (!isTsvectorCodec(attribute.codec)) continue;

            const baseFieldName = inflection.attribute({ codec: pgCodec as any, attributeName });
            const fieldName = inflection.camelCase(`${baseFieldName}-rank`);
            const metaKey = `__fts_ranks_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `Full-text search ranking when filtered by \`${baseFieldName}\`. Returns null when no search condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return constant(null);

                      if (typeof $select.setInliningForbidden === 'function') {
                        $select.setInliningForbidden();
                      }

                      // Use the meta system to retrieve rank details.
                      // getMeta returns a Grafast Step that resolves at
                      // execution time to the value set by setMeta in
                      // the condition apply phase.
                      const $details = $select.getMeta(metaKey);

                      return lambda(
                        [$details, $row],
                        ([details, row]: readonly [any, any]) => {
                          const d = details as FtsRankDetails | null;
                          if (
                            d == null ||
                            row == null ||
                            d.selectIndex == null
                          ) {
                            return null;
                          }
                          const rawValue = row[d.selectIndex];
                          return rawValue == null ? null : parseFloat(rawValue);
                        }
                      );
                    },
                  })
                ),
              },
              `PgSearchPlugin adding rank field '${fieldName}' for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },

        GraphQLEnumType_values(values, build, context) {
          const {
            sql,
            inflection,
          } = build;

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
            if (!isTsvectorCodec(attribute.codec)) continue;

            const fieldName = inflection.attribute({ codec: pgCodec as any, attributeName });
            const metaKey = `fts_order_${fieldName}`;
            const makePlan = (direction: 'ASC' | 'DESC') =>
              (step: any) => {
                // The enum apply runs during the PLANNING phase on PgSelectStep.
                // Store the requested direction in PgSelectStep._meta so that
                // the condition apply (deferred phase) can read it via the
                // proxy's getMetaRaw and add the actual ORDER BY clause.
                if (typeof step.setMeta === 'function') {
                  step.setMeta(metaKey, direction);
                }
              };

            const ascName = inflection.constantCase(`${attributeName}_rank_asc`);
            const descName = inflection.constantCase(`${attributeName}_rank_desc`);

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
              `PgSearchPlugin adding rank orderBy for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newValues;
        },

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

          if (
            !isPgCondition ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          const tsvectorAttributes = Object.entries(
            pgCodec.attributes as Record<string, any>
          ).filter(
            ([_name, attr]: [string, any]) => isTsvectorCodec(attr.codec)
          );

          if (tsvectorAttributes.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName] of tsvectorAttributes) {
            const fieldName = inflection.camelCase(
              `${pgSearchPrefix}_${attributeName}`
            );
            const baseFieldName = inflection.attribute({ codec: pgCodec as any, attributeName });
            const rankMetaKey = `__fts_ranks_${baseFieldName}`;

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
                      const tsquery = sql`websearch_to_tsquery(${sql.literal(tsConfig)}, ${sql.value(val)})`;
                      const columnExpr = sql`${$condition.alias}.${sql.identifier(attributeName)}`;

                      // WHERE: column @@ tsquery
                      $condition.where(sql`${columnExpr} @@ ${tsquery}`);

                      // Get the query builder via meta-safe traversal
                      const qb = getQueryBuilder(build, $condition);
                      if (qb) {
                        // Add ts_rank to the SELECT list
                        const rankSql = sql`ts_rank(${columnExpr}, ${tsquery})`;
                        const wrappedRankSql = sql`${sql.parens(rankSql)}::text`;
                        const rankIndex = qb.selectAndReturnIndex(wrappedRankSql);

                        // Store the select index in meta (replaces WeakMap)
                        qb.setMeta(rankMetaKey, {
                          selectIndex: rankIndex,
                        } as FtsRankDetails);
                      }

                      // ORDER BY ts_rank: only add when the user explicitly
                      // requested rank ordering via the FULL_TEXT_RANK_ASC/DESC
                      // enum values. The enum's apply stores direction in meta
                      // during planning; if no meta is set, skip the orderBy
                      // entirely so cursors remain stable across pages.
                      if (qb && typeof qb.getMetaRaw === 'function') {
                        const orderMetaKey = `fts_order_${baseFieldName}`;
                        const explicitDir = qb.getMetaRaw(orderMetaKey);
                        if (explicitDir) {
                          qb.orderBy({
                            fragment: sql`ts_rank(${columnExpr}, ${tsquery})`,
                            codec: TYPES.float4,
                            direction: explicitDir,
                          });
                        }
                      }
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
