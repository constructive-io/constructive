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
 * the condition apply phase, the orderBy enum apply, and the output field
 * plan, following the pattern from Benjie's postgraphile-plugin-fulltext-filter.
 *
 * 1. Condition apply (runs first): adds ts_rank to the query builder's
 *    SELECT list via selectAndReturnIndex, stores { selectIndex, scoreFragment }
 *    in meta via qb.setMeta(key, { selectIndex, scoreFragment }).
 * 2. OrderBy enum apply (runs second): reads the scoreFragment from meta
 *    and calls qb.orderBy({ fragment, codec, direction }) directly.
 * 3. Output field plan (planning phase): calls $select.getMeta(key) which
 *    returns a Grafast Step that resolves at execution time.
 * 4. lambda([$details, $row]) reads the rank from row[details.selectIndex].
 */

import 'graphile-build';
import 'graphile-build-pg';
import 'graphile-connection-filter';
import { TYPES } from '@dataplan/pg';
import type { PgCodecWithAttributes, PgResource } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { SQL } from 'pg-sql2';
import type { PgSearchPluginOptions } from './types';

// ─── TypeScript Namespace Augmentations ──────────────────────────────────────
// Following Benjie's pattern for proper type safety across the plugin system.

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /** Name for the FullText scalar type */
      fullTextScalarTypeName(this: Inflection): string;
      /** Name for the rank field (e.g. "bodyRank") */
      pgTsvRank(this: Inflection, fieldName: string): string;
      /** Name for orderBy enum value for column rank */
      pgTsvOrderByColumnRankEnum(
        this: Inflection,
        codec: PgCodecWithAttributes,
        attributeName: string,
        ascending: boolean,
      ): string;
      /** Name for orderBy enum value for computed column rank */
      pgTsvOrderByComputedColumnRankEnum(
        this: Inflection,
        codec: PgCodecWithAttributes,
        resource: PgResource,
        ascending: boolean,
      ): string;
    }
    interface ScopeObjectFieldsField {
      isPgTSVRankField?: boolean;
    }
    interface BehaviorStrings {
      'attributeFtsRank:select': true;
      'procFtsRank:select': true;
      'attributeFtsRank:orderBy': true;
      'procFtsRank:orderBy': true;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      PgSearchPlugin: true;
    }
  }
}

/**
 * Interface for the meta value stored by the condition apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface FtsRankDetails {
  selectIndex: number;
  scoreFragment: SQL;
}

/**
 * Direction flag stored by the orderBy enum apply at planning time.
 *
 * PostGraphile processes orderBy enum applies at PLANNING time (receiving
 * PgSelectStep), but condition applies at EXECUTION time (receiving a runtime
 * proxy). The proxy's meta is initialized from PgSelectStep._meta, so data
 * stored at planning time IS available at execution time.
 *
 * Flow:
 * 1. Enum apply (planning): stores direction in PgSelectStep._meta
 * 2. PgSelectStep._meta gets copied to proxy's meta closure
 * 3. Condition apply (execution): reads direction from proxy, adds ORDER BY
 */
interface FtsOrderByRequest {
  direction: 'ASC' | 'DESC';
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

    // ─── Custom Inflection Methods ─────────────────────────────────────
    // Makes field naming configurable and overridable by downstream plugins.
    inflection: {
      add: {
        fullTextScalarTypeName() {
          return fullTextScalarName;
        },
        pgTsvRank(_preset, fieldName) {
          return this.camelCase(`${fieldName}-rank`);
        },
        pgTsvOrderByColumnRankEnum(_preset, codec, attributeName, ascending) {
          const columnName = this._attributeName({
            codec,
            attributeName,
            skipRowId: true,
          });
          return this.constantCase(
            `${columnName}_rank_${ascending ? 'asc' : 'desc'}`,
          );
        },
        pgTsvOrderByComputedColumnRankEnum(_preset, _codec, resource, ascending) {
          const columnName = this.computedAttributeField({
            resource,
          });
          return this.constantCase(
            `${columnName}_rank_${ascending ? 'asc' : 'desc'}`,
          );
        },
      },
    },

    schema: {
      // ─── Behavior Registry ─────────────────────────────────────────────
      // Declarative control over which columns get FTS features.
      // Users can opt out per-column via `@behavior -attributeFtsRank:select`.
      behaviorRegistry: {
        add: {
          'attributeFtsRank:select': {
            description:
              'Should the full text search rank be exposed for this attribute',
            entities: ['pgCodecAttribute'],
          },
          'procFtsRank:select': {
            description:
              'Should the full text search rank be exposed for this computed column function',
            entities: ['pgResource'],
          },
          'attributeFtsRank:orderBy': {
            description:
              'Should you be able to order by the FTS rank for this attribute',
            entities: ['pgCodecAttribute'],
          },
          'procFtsRank:orderBy': {
            description:
              'Should you be able to order by the FTS rank for this computed column function',
            entities: ['pgResource'],
          },
        },
      },
      entityBehavior: {
        pgCodecAttribute: {
          override: {
            provides: ['PgSearchPlugin'],
            after: ['inferred'],
            before: ['override'],
            callback(behavior, [codec, attributeName]) {
              const attr = codec.attributes[attributeName];
              if (isTsvectorCodec(attr.codec)) {
                return [
                  behavior,
                  'attributeFtsRank:orderBy',
                  'attributeFtsRank:select',
                ];
              }
              return behavior;
            },
          },
        },
        pgResource: {
          override: {
            provides: ['PgSearchPlugin'],
            after: ['inferred'],
            before: ['override'],
            callback(behavior, resource) {
              if (!(resource as any).parameters) {
                return behavior;
              }
              if (!isTsvectorCodec((resource as any).codec)) {
                return behavior;
              }
              return [behavior, 'procFtsRank:orderBy', 'procFtsRank:select'];
            },
          },
        },
      },

      hooks: {
        init(_, build) {
          const {
            sql,
            graphql: { GraphQLString },
          } = build;

          // Register the `matches` filter operator for the FullText scalar.
          // Requires graphile-connection-filter; skip if not loaded.
          if (typeof build.addConnectionFilterOperator === 'function') {
            const TYPES = (build as any).dataplanPg?.TYPES;
            build.addConnectionFilterOperator(fullTextScalarName, 'matches', {
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
          const behavior = (build as any).behavior;
          const pgRegistry = (build as any).input?.pgRegistry;

          // Helper to add a rank field for a given base field name
          function addTsvField(
            baseFieldName: string,
            fieldName: string,
            origin: string,
          ) {
            const metaKey = `__fts_ranks_${baseFieldName}`;
            fields = build.extend(
              fields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgTSVRankField: true,
                  } as any,
                  () => ({
                    description: `Full-text search ranking when filtered by \`${baseFieldName}\`. Returns null when no search condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return build.grafast.constant(null);

                      if (typeof $select.setInliningForbidden === 'function') {
                        $select.setInliningForbidden();
                      }

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
                          return rawValue == null
                            ? null
                            : TYPES.float.fromPg(rawValue as string);
                        }
                      );
                    },
                  })
                ),
              },
              origin
            );
          }

          // ── Direct tsvector columns ──
          for (const [attributeName, attribute] of Object.entries(
            codec.attributes as Record<string, any>
          )) {
            if (!isTsvectorCodec(attribute.codec)) continue;

            // Check behavior registry — skip if user opted out
            if (
              behavior &&
              typeof behavior.pgCodecAttributeMatches === 'function' &&
              !behavior.pgCodecAttributeMatches(
                [codec, attributeName],
                'attributeFtsRank:select',
              )
            ) {
              continue;
            }

            const baseFieldName = inflection.attribute({ codec: codec as any, attributeName });
            const fieldName = inflection.pgTsvRank(baseFieldName);
            addTsvField(
              baseFieldName,
              fieldName,
              `PgSearchPlugin adding rank field for ${attributeName}`,
            );
          }

          // ── Computed columns (functions returning tsvector) ──
          if (pgRegistry) {
            const tsvProcs = Object.values(pgRegistry.pgResources).filter(
              (r: any): boolean => {
                if (r.codec !== (build as any).dataplanPg?.TYPES?.tsvector) return false;
                if (!r.parameters) return false;
                if (!r.parameters[0]) return false;
                if (r.parameters[0].codec !== codec) return false;
                if (
                  behavior &&
                  typeof behavior.pgResourceMatches === 'function'
                ) {
                  if (!behavior.pgResourceMatches(r, 'typeField')) return false;
                  if (!behavior.pgResourceMatches(r, 'procFtsRank:select'))
                    return false;
                }
                if (typeof r.from !== 'function') return false;
                return true;
              },
            );

            for (const resource of tsvProcs) {
              const baseFieldName = inflection.computedAttributeField({ resource: resource as any });
              const fieldName = inflection.pgTsvRank(baseFieldName);
              addTsvField(
                baseFieldName,
                fieldName,
                `PgSearchPlugin adding rank field for computed column ${(resource as any).name} on ${(context as any).Self.name}`,
              );
            }
          }

          return fields;
        },

        GraphQLEnumType_values(values, build, context) {
          const {
            sql,
            inflection,
            dataplanPg: { TYPES: DP_TYPES },
          } = build;

          const {
            scope: { isPgRowSortEnum, pgCodec: rawPgCodec },
          } = context;

          if (!isPgRowSortEnum || !rawPgCodec?.attributes) {
            return values;
          }

          const codec = rawPgCodec as PgCodecWithAttributes;
          const behavior = (build as any).behavior;
          const pgRegistry = (build as any).input?.pgRegistry;

          let newValues = values;

          // The enum apply runs at PLANNING time (receives PgSelectStep).
          // It stores a direction flag in meta. The condition apply runs at
          // EXECUTION time (receives proxy whose meta was copied from
          // PgSelectStep._meta). The condition apply reads this flag and
          // adds the ORDER BY with the scoreFragment it computes.
          const makeApply =
            (fieldName: string, direction: 'ASC' | 'DESC') =>
            (queryBuilder: any) => {
              const orderMetaKey = `__fts_orderBy_${fieldName}`;
              queryBuilder.setMeta(orderMetaKey, {
                direction,
              } as FtsOrderByRequest);
            };

          const makeSpec = (fieldName: string, direction: 'ASC' | 'DESC') => ({
            extensions: {
              grafast: {
                apply: makeApply(fieldName, direction),
              },
            },
          });

          // ── Direct tsvector columns ──
          for (const [attributeName, attribute] of Object.entries(
            codec.attributes as Record<string, any>
          )) {
            if (!isTsvectorCodec(attribute.codec)) continue;

            // Check behavior registry
            if (
              behavior &&
              typeof behavior.pgCodecAttributeMatches === 'function' &&
              !behavior.pgCodecAttributeMatches(
                [codec, attributeName],
                'attributeFtsRank:orderBy',
              )
            ) {
              continue;
            }

            const fieldName = inflection.attribute({ codec: codec as any, attributeName });
            const ascName = inflection.pgTsvOrderByColumnRankEnum(codec as any, attributeName, true);
            const descName = inflection.pgTsvOrderByColumnRankEnum(codec as any, attributeName, false);

            newValues = build.extend(
              newValues,
              {
                [ascName]: makeSpec(fieldName, 'ASC'),
                [descName]: makeSpec(fieldName, 'DESC'),
              },
              `PgSearchPlugin adding rank orderBy for '${attributeName}' on '${codec.name}'`
            );
          }

          // ── Computed columns returning tsvector ──
          if (pgRegistry) {
            const tsvProcs = Object.values(pgRegistry.pgResources).filter(
              (r: any): boolean => {
                if (r.codec !== (build as any).dataplanPg?.TYPES?.tsvector) return false;
                if (!r.parameters) return false;
                if (!r.parameters[0]) return false;
                if (r.parameters[0].codec !== codec) return false;
                if (
                  behavior &&
                  typeof behavior.pgResourceMatches === 'function'
                ) {
                  if (!behavior.pgResourceMatches(r, 'typeField')) return false;
                  if (!behavior.pgResourceMatches(r, 'procFtsRank:orderBy'))
                    return false;
                }
                if (typeof r.from !== 'function') return false;
                return true;
              },
            );

            for (const resource of tsvProcs) {
              const fieldName = inflection.computedAttributeField({ resource: resource as any });
              const ascName = inflection.pgTsvOrderByComputedColumnRankEnum(codec, resource as any, true);
              const descName = inflection.pgTsvOrderByComputedColumnRankEnum(codec, resource as any, false);

              newValues = build.extend(
                newValues,
                {
                  [ascName]: makeSpec(fieldName, 'ASC'),
                  [descName]: makeSpec(fieldName, 'DESC'),
                },
                `PgSearchPlugin adding rank orderBy for computed column '${(resource as any).name}' on '${codec.name}'`
              );
            }
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
            scope: { isPgConnectionFilter, pgCodec } = {} as any,
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
                    isPgConnectionFilterField: true,
                  } as any,
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

                      // Get the query builder (execution-time proxy) via
                      // meta-safe traversal.
                      const qb = getQueryBuilder(build, $condition);
                      if (qb) {
                        // Add ts_rank to the SELECT list
                        const scoreFragment = sql`ts_rank(${columnExpr}, ${tsquery})`;
                        const wrappedRankSql = sql`${sql.parens(scoreFragment)}::text`;
                        const rankIndex = qb.selectAndReturnIndex(wrappedRankSql);

                        const rankDetails: FtsRankDetails = {
                          selectIndex: rankIndex,
                          scoreFragment,
                        };

                        // Store via qb.setMeta for the output field plan.
                        // ($select.getMeta() creates a deferred Step that works
                        // across the proxy/step boundary at execution time.)
                        qb.setMeta(rankMetaKey, rankDetails);

                        // Check if the orderBy enum stored a direction flag
                        // at planning time. The flag was set on PgSelectStep._meta
                        // and copied into this proxy's meta closure.
                        const orderMetaKey = `__fts_orderBy_${baseFieldName}`;
                        const orderRequest = qb.getMetaRaw(orderMetaKey) as FtsOrderByRequest | undefined;
                        if (orderRequest) {
                          qb.orderBy({
                            codec: (build as any).dataplanPg?.TYPES?.float,
                            fragment: scoreFragment,
                            direction: orderRequest.direction,
                          });
                        }
                      }
                    },
                  }
                ),
              },
              `PgSearchPlugin adding filter field '${fieldName}' for tsvector column '${attributeName}' on '${pgCodec.name}'`
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
