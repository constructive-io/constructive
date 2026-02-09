/**
 * PostGraphile v5 Search Plugin
 *
 * Generates search condition fields for tsvector columns. When a search term
 * is provided via the condition input, this plugin applies a
 * `column @@ websearch_to_tsquery('english', $value)` WHERE clause and
 * automatically orders results by `ts_rank` (descending) for relevance.
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
 * Condition field apply functions run during a deferred phase (SQL generation)
 * on a queryBuilder proxy — NOT on the real PgSelectStep. The rank field plan
 * runs earlier, during Grafast's planning phase, on the real PgSelectStep.
 *
 * To bridge these two phases we use a module-level WeakMap keyed by the SQL
 * alias object (shared between proxy and PgSelectStep via reference identity).
 *
 * The rank field plan creates a `lambda` step that reads the row tuple at a
 * dynamically-determined index. The condition apply adds `ts_rank(...)` to
 * the SQL SELECT list via `proxy.selectAndReturnIndex()` and stores the
 * resulting index in the WeakMap slot. At execution time the lambda reads
 * the rank value from that index.
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { SQL } from 'pg-sql2';
import type { PgSearchPluginOptions } from './types';

/**
 * Module-level WeakMap keyed by SQL alias object (shared reference between
 * the queryBuilder proxy and PgSelectStep via buildTheQueryCore).
 *
 * 1. Rank field plan (planning phase): initialises the slot keyed by alias.
 * 2. OrderBy enum apply (planning phase): stores direction in PgSelectStep meta.
 * 3. Condition apply (deferred/SQL-gen phase): adds ts_rank to the proxy's
 *    select list via selectAndReturnIndex, stores the index in `indices`.
 *    Also reads direction from meta and adds ORDER BY ts_rank.
 * 4. Rank field lambda (execute phase): reads row[indices[field]] for the value.
 */
interface FtsRankSlot {
  /** Map of fieldName → index into info.selects (set during condition apply) */
  indices: Record<string, number>;
}
const ftsRankSlots = new WeakMap<object, FtsRankSlot>();

function isTsvectorCodec(codec: any): boolean {
  return (
    codec?.extensions?.pg?.schemaName === 'pg_catalog' &&
    codec?.extensions?.pg?.name === 'tsvector'
  );
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
 * Creates the search plugin with the given options.
 */
export function createPgSearchPlugin(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const { pgSearchPrefix = 'tsv', fullTextScalarName = 'FullText' } = options;

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
                return sql`${sqlIdentifier} @@ to_tsquery(${sqlValue})`;
              },
            });
          }

          return _;
        },

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
            if (!isTsvectorCodec(attribute.codec)) continue;

            const baseFieldName = inflection.attribute({ codec: pgCodec as any, attributeName });
            const fieldName = inflection.camelCase(`${baseFieldName}-rank`);

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `Full-text search ranking when filtered by \`${baseFieldName}\`. Returns null when no search condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $select = getPgSelectStep($step);
                      if (!$select) return constant(null);

                      if (typeof $select.setInliningForbidden === 'function') {
                        $select.setInliningForbidden();
                      }

                      // Initialise the WeakMap slot for this query, keyed by the
                      // SQL alias (same object ref on PgSelectStep and the proxy).
                      const alias = $select.alias;
                      if (!ftsRankSlots.has(alias)) {
                        ftsRankSlots.set(alias, {
                          indices: Object.create(null),
                        });
                      }

                      // Return a lambda that reads the rank value from the result
                      // row at a dynamically-determined index. The index is set
                      // by the condition apply (deferred phase) via the proxy's
                      // selectAndReturnIndex, and stored in the WeakMap slot.
                      const capturedField = baseFieldName;
                      const capturedAlias = alias;
                      return lambda($step, (row: any) => {
                        if (row == null) return null;
                        const slot = ftsRankSlots.get(capturedAlias);
                        if (!slot || slot.indices[capturedField] === undefined) return null;
                        const rawValue = row[slot.indices[capturedField]];
                        return rawValue == null ? null : parseFloat(rawValue);
                      }, true);
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
            ([_name, attr]: [string, any]) => attr.codec?.name === 'tsvector'
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
                      const tsquery = sql`websearch_to_tsquery('english', ${sql.value(val)})`;
                      const columnExpr = sql`${$condition.alias}.${sql.identifier(attributeName)}`;

                      // WHERE: column @@ tsquery
                      $condition.where(sql`${columnExpr} @@ ${tsquery}`);

                      // Add ts_rank to the SELECT list via the proxy's
                      // selectAndReturnIndex. This runs during the deferred
                      // SQL-generation phase, so the expression goes into
                      // info.selects (the live array used for SQL generation).
                      const $parent = $condition.dangerouslyGetParent();
                      if (typeof $parent.selectAndReturnIndex === 'function') {
                        const rankSql = sql`ts_rank(${columnExpr}, ${tsquery})`;
                        const wrappedRankSql = sql`${sql.parens(rankSql)}::text`;
                        const rankIndex = $parent.selectAndReturnIndex(wrappedRankSql);

                        // Store the index in the alias-keyed WeakMap slot so
                        // the rank field's lambda can read it at execute time.
                        const slot = ftsRankSlots.get($condition.alias);
                        if (slot) {
                          slot.indices[baseFieldName] = rankIndex;
                        }
                      }

                      // ORDER BY ts_rank: check if the user provided an
                      // explicit rank orderBy enum (stored in meta during
                      // planning). If so, use their direction. Otherwise add
                      // automatic DESC ordering for relevance.
                      const metaKey = `fts_order_${baseFieldName}`;
                      const explicitDir = typeof $parent.getMetaRaw === 'function'
                        ? $parent.getMetaRaw(metaKey)
                        : undefined;
                      const orderDirection = explicitDir ?? 'DESC';
                      $parent.orderBy({
                        fragment: sql`ts_rank(${columnExpr}, ${tsquery})`,
                        codec: TYPES.float4,
                        direction: orderDirection,
                      });
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
