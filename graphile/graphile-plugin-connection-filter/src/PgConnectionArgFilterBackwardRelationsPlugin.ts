/**
 * PgConnectionArgFilterBackwardRelationsPlugin for Graphile v5
 *
 * This plugin adds filter fields for backward relations (where the foreign key
 * is on the OTHER table pointing to this table). For example, filtering users
 * by their posts (where posts.user_id references users.id).
 *
 * For one-to-many relations, it provides:
 * - A filter field (e.g., `postsByUserId`) with `some`, `every`, `none` quantifiers
 * - An exists field (e.g., `postsByUserIdExist`) for simple existence checks
 *
 * For one-to-one backward relations (unique foreign key), it provides:
 * - A filter field for the single related record
 * - An exists field for existence check
 *
 * Quantifier patterns (SQL):
 * - `some`: EXISTS (SELECT 1 FROM related WHERE condition)
 * - `every`: NOT EXISTS (SELECT 1 FROM related WHERE NOT condition)
 * - `none`: NOT EXISTS (SELECT 1 FROM related WHERE condition)
 *
 * v5 Migration Notes:
 * - Uses `relation.isReferencee` to identify backward relations
 * - Uses `relation.isUnique` to distinguish one-to-one vs one-to-many
 * - Uses `PgCodecRelation` on codecs instead of introspection results
 * - Uses `GraphQLInputObjectType_fields` hook
 * - Uses `EXPORTABLE()` wrapper for tree-shaking support
 * - Uses `PgCondition` from `@dataplan/pg` with `existsPlan`, `notPlan`, `andPlan`
 */

import type { PgCodec, PgResource, PgCodecRelation } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { makeAssertAllowed } from './utils';

const version = '4.0.0';

/**
 * PgConnectionArgFilterBackwardRelationsPlugin
 *
 * Adds filter fields for backward relations (foreign keys pointing TO this table).
 */
export const PgConnectionArgFilterBackwardRelationsPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterBackwardRelationsPlugin',
    version,

    inflection: {
      add: {
        filterManyType(
          _preset,
          table: PgCodec<any, any, any, any, any, any, any>,
          foreignTable: PgResource<any, any, any, any>
        ) {
          return this.upperCamelCase(
            `${this.tableType(table)}-to-many-${this.tableType(foreignTable.codec)}-filter`
          );
        },
        filterBackwardSingleRelationExistsFieldName(
          _preset,
          relationFieldName: string
        ) {
          return `${relationFieldName}Exists`;
        },
        filterBackwardManyRelationExistsFieldName(
          _preset,
          relationFieldName: string
        ) {
          return `${relationFieldName}Exist`;
        },
        filterSingleRelationByKeysBackwardsFieldName(
          _preset,
          fieldName: string
        ) {
          return fieldName;
        },
        filterManyRelationByKeysFieldName(_preset, fieldName: string) {
          return fieldName;
        },
      },
    },

    schema: {
      entityBehavior: {
        pgCodecRelation: 'filterBy',
      },

      hooks: {
        // Register the "to-many" filter types during init phase
        init(_, build) {
          const { inflection } = build;

          for (const source of Object.values(
            build.input.pgRegistry.pgResources
          )) {
            // Skip functions (have parameters), non-table codecs (no attributes), and unique resources
            if (
              (source as PgResource<any, any, any, any>).parameters ||
              !(source as PgResource<any, any, any, any>).codec.attributes ||
              (source as PgResource<any, any, any, any>).isUnique
            ) {
              continue;
            }

            const typedSource = source as PgResource<any, any, any, any>;

            // Get backward relations (where this table is referenced by others)
            const relations = typedSource.getRelations();
            for (const [_relationName, relation] of Object.entries(relations)) {
              const typedRelation = relation as PgCodecRelation<any, any>;

              // Skip forward relations
              if (!typedRelation.isReferencee) {
                continue;
              }

              // Skip unique backward relations (one-to-one)
              if (typedRelation.isUnique) {
                continue;
              }

              const foreignTable = typedRelation.remoteResource;
              const filterManyTypeName = inflection.filterManyType(
                typedSource.codec,
                foreignTable
              );
              const foreignTableTypeName = inflection.tableType(
                foreignTable.codec
              );

              if (!build.getTypeMetaByName(filterManyTypeName)) {
                build.recoverable(null, () => {
                  build.registerInputObjectType(
                    filterManyTypeName,
                    {
                      foreignTable,
                      isPgConnectionFilterMany: true,
                    },
                    () => ({
                      name: filterManyTypeName,
                      description: `A filter to be used against many \`${foreignTableTypeName}\` object types. All fields are combined with a logical 'and.'`,
                    }),
                    `PgConnectionArgFilterBackwardRelationsPlugin: Adding '${filterManyTypeName}' type for ${foreignTable.name}`
                  );
                });
              }
            }
          }

          return _;
        },

        GraphQLInputObjectType_fields(inFields, build, context) {
          let fields = inFields;

          const {
            extend,
            inflection,
            graphql: { GraphQLBoolean },
            sql,
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: {
              // For filter types
              pgCodec,
              isPgConnectionFilter,
              // For many filter types
              foreignTable: scopeForeignTable,
              isPgConnectionFilterMany,
            },
          } = context;

          const assertAllowed = makeAssertAllowed(build);

          // Find the source for this codec
          const source =
            pgCodec &&
            (Object.values(build.input.pgRegistry.pgResources).find(
              (s) =>
                (s as PgResource<any, any, any, any>).codec === pgCodec &&
                !(s as PgResource<any, any, any, any>).parameters
            ) as PgResource<any, any, any, any> | undefined);

          // ===================================================================
          // Part 1: Add backward relation fields to filter types
          // ===================================================================
          if (isPgConnectionFilter && pgCodec && pgCodec.attributes && source) {
            // Get backward relations (where this table is referenced by others)
            const backwardRelations = Object.entries(
              source.getRelations()
            ).filter(([_relationName, relation]) => {
              return (relation as PgCodecRelation<any, any>).isReferencee;
            });

            for (const [relationName, relation] of backwardRelations) {
              const typedRelation = relation as PgCodecRelation<any, any>;
              const foreignTable = typedRelation.remoteResource;

              // Check behavior
              if (
                !build.behavior.pgCodecRelationMatches(
                  typedRelation,
                  'filterBy'
                )
              ) {
                continue;
              }

              const foreignTableTypeName = inflection.tableType(
                foreignTable.codec
              );
              const foreignTableFilterTypeName =
                inflection.filterType(foreignTableTypeName);
              const ForeignTableFilterType = build.getTypeByName(
                foreignTableFilterTypeName
              );
              if (!ForeignTableFilterType || !isInputType(ForeignTableFilterType)) continue;

              // Skip function-based resources
              if (typeof foreignTable.from === 'function') {
                continue;
              }

              const foreignTableExpression = foreignTable.from;
              const localAttributes = typedRelation.localAttributes;
              const remoteAttributes = typedRelation.remoteAttributes;

              const isOneToMany = !typedRelation.isUnique;

              if (isOneToMany) {
                // Check if relation has list or connection behavior
                if (
                  !build.behavior.pgCodecRelationMatches(
                    typedRelation,
                    'list'
                  ) &&
                  !build.behavior.pgCodecRelationMatches(
                    typedRelation,
                    'connection'
                  )
                ) {
                  continue;
                }

                const filterManyTypeName = inflection.filterManyType(
                  source.codec,
                  foreignTable
                );
                const FilterManyType =
                  build.getTypeByName(filterManyTypeName);
                if (!FilterManyType || !isInputType(FilterManyType)) {
                  continue;
                }

                // Use the _manyRelation inflector for field naming
                const fieldName = inflection._manyRelation({
                  registry: source.registry,
                  codec: source.codec,
                  relationName,
                });
                const filterFieldName =
                  inflection.filterManyRelationByKeysFieldName(fieldName);

                // Add the many filter field
                fields = extend(
                  fields,
                  {
                    [filterFieldName]: fieldWithHooks(
                      {
                        fieldName: filterFieldName,
                        isPgConnectionFilterField: true,
                      },
                      () => ({
                        description: `Filter by the object's \`${fieldName}\` relation.`,
                        type: FilterManyType,
                        apply: EXPORTABLE(
                          (
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes
                          ) =>
                            function ($where: any, value: unknown) {
                              assertAllowed(value, 'object');
                              if (value == null) return;

                              // Create a condition that stores relation info for quantifiers
                              const $rel = $where.andPlan();
                              $rel.extensions.pgFilterRelation = {
                                tableExpression: foreignTableExpression,
                                alias: foreignTable.name,
                                localAttributes,
                                remoteAttributes,
                              };
                              return $rel;
                            },
                          [
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                          ]
                        ),
                      })
                    ),
                  },
                  `Adding connection filter backward relation field from ${source.name} to ${foreignTable.name}`
                );

                // Add exists field for many relation
                const existsFieldName =
                  inflection.filterBackwardManyRelationExistsFieldName(
                    fieldName
                  );
                fields = extend(
                  fields,
                  {
                    [existsFieldName]: fieldWithHooks(
                      {
                        fieldName: existsFieldName,
                        isPgConnectionFilterField: true,
                      },
                      () => ({
                        description: `Some related \`${fieldName}\` exist.`,
                        type: GraphQLBoolean,
                        apply: EXPORTABLE(
                          (
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql
                          ) =>
                            function ($where: any, value: unknown) {
                              assertAllowed(value, 'scalar');
                              if (value == null) return;

                              const $subQuery = $where.existsPlan({
                                tableExpression: foreignTableExpression,
                                alias: foreignTable.name,
                                equals: value,
                              });

                              localAttributes.forEach(
                                (localAttribute: string, i: number) => {
                                  const remoteAttribute = remoteAttributes[i];
                                  $subQuery.where(
                                    sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                                  );
                                }
                              );
                            },
                          [
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql,
                          ]
                        ),
                      })
                    ),
                  },
                  `Adding connection filter backward relation exists field from ${source.name} to ${foreignTable.name}`
                );
              } else {
                // One-to-one backward relation (unique foreign key)
                const fieldName = inflection.singleRelationBackwards({
                  registry: source.registry,
                  codec: source.codec,
                  relationName,
                });
                const filterFieldName =
                  inflection.filterSingleRelationByKeysBackwardsFieldName(
                    fieldName
                  );

                // Add the single backward relation filter field
                fields = extend(
                  fields,
                  {
                    [filterFieldName]: fieldWithHooks(
                      {
                        fieldName: filterFieldName,
                        isPgConnectionFilterField: true,
                      },
                      () => ({
                        description: `Filter by the object's \`${fieldName}\` relation.`,
                        type: ForeignTableFilterType,
                        apply: EXPORTABLE(
                          (
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql
                          ) =>
                            function ($where: any, value: unknown) {
                              assertAllowed(value, 'object');
                              if (value == null) return;

                              const $subQuery = $where.existsPlan({
                                tableExpression: foreignTableExpression,
                                alias: foreignTable.name,
                              });

                              localAttributes.forEach(
                                (localAttribute: string, i: number) => {
                                  const remoteAttribute = remoteAttributes[i];
                                  $subQuery.where(
                                    sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                                  );
                                }
                              );

                              return $subQuery;
                            },
                          [
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql,
                          ]
                        ),
                      })
                    ),
                  },
                  `Adding connection filter backward relation field from ${source.name} to ${foreignTable.name}`
                );

                // Add exists field for single backward relation
                const existsFieldName =
                  inflection.filterBackwardSingleRelationExistsFieldName(
                    fieldName
                  );
                fields = build.recoverable(fields, () =>
                  extend(
                    fields,
                    {
                      [existsFieldName]: fieldWithHooks(
                        {
                          fieldName: existsFieldName,
                          isPgConnectionFilterField: true,
                        },
                        () => ({
                          description: `A related \`${fieldName}\` exists.`,
                          type: GraphQLBoolean,
                          apply: EXPORTABLE(
                            (
                              assertAllowed,
                              foreignTable,
                              foreignTableExpression,
                              localAttributes,
                              remoteAttributes,
                              sql
                            ) =>
                              function ($where: any, value: unknown) {
                                assertAllowed(value, 'scalar');
                                if (value == null) return;

                                const $subQuery = $where.existsPlan({
                                  tableExpression: foreignTableExpression,
                                  alias: foreignTable.name,
                                  equals: value,
                                });

                                localAttributes.forEach(
                                  (localAttribute: string, i: number) => {
                                    const remoteAttribute = remoteAttributes[i];
                                    $subQuery.where(
                                      sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                                    );
                                  }
                                );
                              },
                            [
                              assertAllowed,
                              foreignTable,
                              foreignTableExpression,
                              localAttributes,
                              remoteAttributes,
                              sql,
                            ]
                          ),
                        })
                      ),
                    },
                    `Adding connection filter backward relation exists field from ${source.name} to ${foreignTable.name}`
                  )
                );
              }
            }
          }

          // ===================================================================
          // Part 2: Add quantifier fields (some, every, none) to many filter types
          // ===================================================================
          if (isPgConnectionFilterMany && scopeForeignTable) {
            const foreignTable = scopeForeignTable as PgResource<
              any,
              any,
              any,
              any
            >;
            const foreignTableTypeName = inflection.tableType(
              foreignTable.codec
            );
            const foreignTableFilterTypeName =
              inflection.filterType(foreignTableTypeName);
            const FilterType = build.getTypeByName(foreignTableFilterTypeName);

            if (!FilterType || !isInputType(FilterType)) {
              throw new Error(
                `Failed to load type ${foreignTableFilterTypeName}`
              );
            }

            const manyFields = {
              // `every`: NOT EXISTS (SELECT 1 FROM related WHERE NOT condition)
              every: fieldWithHooks(
                {
                  fieldName: 'every',
                  isPgConnectionFilterManyField: true,
                },
                () => ({
                  description: `Every related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical 'and.'`,
                  type: FilterType,
                  apply: EXPORTABLE(
                    (assertAllowed, sql) =>
                      function ($where: any, value: unknown) {
                        assertAllowed(value, 'object');
                        if (value == null) return;

                        if (!$where.extensions.pgFilterRelation) {
                          throw new Error(
                            `Invalid use of filter, 'pgFilterRelation' expected`
                          );
                        }

                        const {
                          localAttributes,
                          remoteAttributes,
                          tableExpression,
                          alias,
                        } = $where.extensions.pgFilterRelation;

                        // NOT EXISTS (SELECT ... WHERE NOT condition)
                        const $subQuery = $where.notPlan().existsPlan({
                          tableExpression,
                          alias,
                        });

                        localAttributes.forEach(
                          (localAttribute: string, i: number) => {
                            const remoteAttribute = remoteAttributes[i];
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                            );
                          }
                        );

                        // Return NOT of the inner condition
                        return $subQuery.notPlan().andPlan();
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),

              // `some`: EXISTS (SELECT 1 FROM related WHERE condition)
              some: fieldWithHooks(
                {
                  fieldName: 'some',
                  isPgConnectionFilterManyField: true,
                },
                () => ({
                  description: `Some related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical 'and.'`,
                  type: FilterType,
                  apply: EXPORTABLE(
                    (assertAllowed, sql) =>
                      function ($where: any, value: unknown) {
                        assertAllowed(value, 'object');
                        if (value == null) return;

                        if (!$where.extensions.pgFilterRelation) {
                          throw new Error(
                            `Invalid use of filter, 'pgFilterRelation' expected`
                          );
                        }

                        const {
                          localAttributes,
                          remoteAttributes,
                          tableExpression,
                          alias,
                        } = $where.extensions.pgFilterRelation;

                        // EXISTS (SELECT ... WHERE condition)
                        const $subQuery = $where.existsPlan({
                          tableExpression,
                          alias,
                        });

                        localAttributes.forEach(
                          (localAttribute: string, i: number) => {
                            const remoteAttribute = remoteAttributes[i];
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                            );
                          }
                        );

                        return $subQuery;
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),

              // `none`: NOT EXISTS (SELECT 1 FROM related WHERE condition)
              none: fieldWithHooks(
                {
                  fieldName: 'none',
                  isPgConnectionFilterManyField: true,
                },
                () => ({
                  description: `No related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical 'and.'`,
                  type: FilterType,
                  apply: EXPORTABLE(
                    (assertAllowed, sql) =>
                      function ($where: any, value: unknown) {
                        assertAllowed(value, 'object');
                        if (value == null) return;

                        if (!$where.extensions.pgFilterRelation) {
                          throw new Error(
                            `Invalid use of filter, 'pgFilterRelation' expected`
                          );
                        }

                        const {
                          localAttributes,
                          remoteAttributes,
                          tableExpression,
                          alias,
                        } = $where.extensions.pgFilterRelation;

                        // NOT EXISTS (SELECT ... WHERE condition)
                        const $subQuery = $where.notPlan().existsPlan({
                          tableExpression,
                          alias,
                        });

                        localAttributes.forEach(
                          (localAttribute: string, i: number) => {
                            const remoteAttribute = remoteAttributes[i];
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`
                            );
                          }
                        );

                        return $subQuery;
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),
            };

            fields = extend(
              fields,
              manyFields,
              `Adding quantifier fields (some, every, none) for ${foreignTableTypeName}`
            );
          }

          return fields;
        },
      },
    },
  };

export default PgConnectionArgFilterBackwardRelationsPlugin;
