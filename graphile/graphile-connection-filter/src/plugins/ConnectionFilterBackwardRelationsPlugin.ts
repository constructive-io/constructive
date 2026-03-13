import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import type { PgCodecRelation, PgCodecWithAttributes, PgResource } from '@dataplan/pg';
import type { SQL } from 'pg-sql2';
import type { GraphQLInputObjectType } from 'graphql';
import { makeAssertAllowed } from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterBackwardRelationsPlugin
 *
 * Adds backward relation filter fields to table filter types.
 * A "backward" relation is one where another table has a FK referencing the current table.
 *
 * For unique backward relations (one-to-one), a single filter field is added:
 * ```graphql
 * allClients(filter: {
 *   profileByClientId: { bio: { includes: "engineer" } }
 * }) { ... }
 * ```
 *
 * For non-unique backward relations (one-to-many), a "many" filter type is added
 * with `some`, `every`, and `none` sub-fields:
 * ```graphql
 * allClients(filter: {
 *   ordersByClientId: { some: { total: { greaterThan: 1000 } } }
 * }) { ... }
 * ```
 *
 * The SQL generated uses EXISTS subqueries:
 * ```sql
 * WHERE EXISTS (
 *   SELECT 1 FROM orders
 *   WHERE orders.client_id = clients.id
 *   AND <nested filter conditions>
 * )
 * ```
 */
export const ConnectionFilterBackwardRelationsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterBackwardRelationsPlugin',
  version,
  description: 'Adds backward relation filter fields to connection filter types',

  inflection: {
    add: {
      filterManyType(_preset: any, table: any, foreignTable: any): string {
        return this.upperCamelCase(
          `${this.tableType(table)}-to-many-${this.tableType(
            foreignTable.codec
          )}-filter`
        );
      },
      filterBackwardSingleRelationExistsFieldName(
        _preset: any,
        relationFieldName: string
      ) {
        return `${relationFieldName}Exists`;
      },
      filterBackwardManyRelationExistsFieldName(
        _preset: any,
        relationFieldName: string
      ) {
        return `${relationFieldName}Exist`;
      },
      filterSingleRelationByKeysBackwardsFieldName(
        _preset: any,
        fieldName: string
      ) {
        return fieldName;
      },
      filterManyRelationByKeysFieldName(_preset: any, fieldName: string) {
        return fieldName;
      },
    },
  },

  schema: {
    behaviorRegistry: {
      add: {
        filterBy: {
          description: 'Whether a relation should be available as a filter field',
          entities: ['pgCodecRelation'],
        },
      },
    },

    entityBehavior: {
      pgCodecRelation: 'filterBy',
    },

    hooks: {
      init(_, build) {
        // Runtime check: only proceed if relation filters are enabled
        if (!build.options.connectionFilterRelations) {
          return _;
        }

        const { inflection } = build;

        // Register "many" filter types (e.g. ClientToManyOrderFilter)
        // These contain `some`, `every`, `none` fields.
        for (const source of Object.values(
          build.input.pgRegistry.pgResources
        ) as any[]) {
          if (
            source.parameters ||
            !source.codec.attributes ||
            source.isUnique
          ) {
            continue;
          }
          for (const [_relationName, relation] of Object.entries(
            source.getRelations() as {
              [relationName: string]: PgCodecRelation<any, any>;
            }
          )) {
            if (!relation.isReferencee) continue;
            if (relation.isUnique) continue;

            const foreignTable = relation.remoteResource;
            if (typeof foreignTable.from === 'function') continue;

            if (!build.behavior.pgCodecRelationMatches(relation, 'filterBy')) {
              continue;
            }

            const filterManyTypeName = inflection.filterManyType(
              source.codec,
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
                    description: `A filter to be used against many \`${foreignTableTypeName}\` object types. All fields are combined with a logical \u2018and.\u2019`,
                  }),
                  `ConnectionFilterBackwardRelationsPlugin: Adding '${filterManyTypeName}' type for ${foreignTable.name}`
                );
              });
            }
          }
        }
        return _;
      },

      GraphQLInputObjectType_fields(inFields, build, context) {
        let fields = inFields;

        // Runtime check: only proceed if relation filters are enabled
        if (!build.options.connectionFilterRelations) {
          return fields;
        }

        const {
          extend,
          inflection,
          sql,
          graphql: { GraphQLBoolean },
          EXPORTABLE,
        } = build;
        const {
          fieldWithHooks,
          scope: {
            pgCodec,
            isPgConnectionFilter,
            foreignTable: scopeForeignTable,
            isPgConnectionFilterMany,
          },
          Self,
        } = context;

        const assertAllowed = makeAssertAllowed(build);

        // ─── Part 1: Add backward relation fields to table filter types ───
        const source =
          pgCodec &&
          (Object.values(build.input.pgRegistry.pgResources).find(
            (s: any) => s.codec === pgCodec && !s.parameters
          ) as
            | PgResource<any, PgCodecWithAttributes, any, any, any>
            | undefined);

        if (isPgConnectionFilter && pgCodec && pgCodec.attributes && source) {
          const backwardRelations = Object.entries(
            source.getRelations() as {
              [relationName: string]: PgCodecRelation;
            }
          ).filter(
            ([_relationName, relation]) => relation.isReferencee
          );

          for (const [relationName, relation] of backwardRelations) {
            const foreignTable = relation.remoteResource;

            if (
              !build.behavior.pgCodecRelationMatches(relation, 'filterBy')
            ) {
              continue;
            }

            if (typeof foreignTable.from === 'function') {
              continue;
            }

            const isForeignKeyUnique = relation.isUnique;
            const foreignTableExpression = foreignTable.from as SQL;
            const localAttributes = relation.localAttributes as string[];
            const remoteAttributes = relation.remoteAttributes as string[];

            if (isForeignKeyUnique) {
              // One-to-one: add a single relation filter field
              const fieldName = inflection.singleRelationBackwards({
                registry: source.registry,
                codec: source.codec,
                relationName,
              });
              const filterFieldName =
                inflection.filterSingleRelationByKeysBackwardsFieldName(
                  fieldName
                );

              const foreignTableTypeName = inflection.tableType(
                foreignTable.codec
              );
              const foreignTableFilterTypeName =
                inflection.filterType(foreignTableTypeName);
              const ForeignTableFilterType = build.getTypeByName(
                foreignTableFilterTypeName
              ) as GraphQLInputObjectType;
              if (!ForeignTableFilterType) continue;

              fields = extend(
                fields,
                {
                  [filterFieldName]: fieldWithHooks(
                    {
                      fieldName: filterFieldName,
                      isPgConnectionFilterField: true,
                    },
                    () => ({
                      description: `Filter by the object\u2019s \`${fieldName}\` relation.`,
                      type: ForeignTableFilterType,
                      apply: EXPORTABLE(
                        (
                          assertAllowed: any,
                          foreignTable: any,
                          foreignTableExpression: any,
                          localAttributes: string[],
                          remoteAttributes: string[],
                          sql: any
                        ) =>
                          function (
                            $where: any,
                            value: object | null
                          ) {
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
                                  sql`${$where.alias}.${sql.identifier(
                                    localAttribute
                                  )} = ${$subQuery.alias}.${sql.identifier(
                                    remoteAttribute
                                  )}`
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
                `Adding connection filter backward single relation field from ${source.name} to ${foreignTable.name}`
              );

              // Add exists field
              const existsFieldName =
                inflection.filterBackwardSingleRelationExistsFieldName(
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
                      description: `A related \`${fieldName}\` exists.`,
                      type: GraphQLBoolean,
                      apply: EXPORTABLE(
                        (
                          assertAllowed: any,
                          foreignTable: any,
                          foreignTableExpression: any,
                          localAttributes: string[],
                          remoteAttributes: string[],
                          sql: any
                        ) =>
                          function (
                            $where: any,
                            value: boolean | null
                          ) {
                            assertAllowed(value, 'scalar' as any);
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
                                  sql`${$where.alias}.${sql.identifier(
                                    localAttribute
                                  )} = ${$subQuery.alias}.${sql.identifier(
                                    remoteAttribute
                                  )}`
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
                `Adding connection filter backward single relation exists field for ${fieldName}`
              );
            } else {
              // One-to-many: add a "many" filter field (e.g. ordersByClientId: ClientToManyOrderFilter)
              const fieldName = inflection._manyRelation({
                registry: source.registry,
                codec: source.codec,
                relationName,
              });
              const filterFieldName =
                inflection.filterManyRelationByKeysFieldName(fieldName);

              const filterManyTypeName = inflection.filterManyType(
                source.codec,
                foreignTable
              );
              const FilterManyType = build.getTypeByName(
                filterManyTypeName
              ) as GraphQLInputObjectType;
              if (!FilterManyType) continue;

              // The many relation field tags $where with relation info so that
              // some/every/none can create the appropriate EXISTS subquery.
              fields = extend(
                fields,
                {
                  [filterFieldName]: fieldWithHooks(
                    {
                      fieldName: filterFieldName,
                      isPgConnectionFilterField: true,
                      isPgConnectionFilterManyField: true,
                    },
                    () => ({
                      description: `Filter by the object\u2019s \`${fieldName}\` relation.`,
                      type: FilterManyType,
                      apply: EXPORTABLE(
                        (
                          assertAllowed: any,
                          foreignTable: any,
                          foreignTableExpression: any,
                          localAttributes: string[],
                          remoteAttributes: string[]
                        ) =>
                          function ($where: any, value: object | null) {
                            assertAllowed(value, 'object');
                            if (value == null) return;
                            // Tag $where with relation info for some/every/none
                            $where._manyRelation = {
                              foreignTable,
                              foreignTableExpression,
                              localAttributes,
                              remoteAttributes,
                            };
                            return $where;
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
                `Adding connection filter backward many relation field from ${source.name} to ${foreignTable.name}`
              );

              // Add exists field for many relations
              const existsFieldName =
                inflection.filterBackwardManyRelationExistsFieldName(fieldName);
              fields = extend(
                fields,
                {
                  [existsFieldName]: fieldWithHooks(
                    {
                      fieldName: existsFieldName,
                      isPgConnectionFilterField: true,
                    },
                    () => ({
                      description: `\`${fieldName}\` exist.`,
                      type: GraphQLBoolean,
                      apply: EXPORTABLE(
                        (
                          assertAllowed: any,
                          foreignTable: any,
                          foreignTableExpression: any,
                          localAttributes: string[],
                          remoteAttributes: string[],
                          sql: any
                        ) =>
                          function (
                            $where: any,
                            value: boolean | null
                          ) {
                            assertAllowed(value, 'scalar' as any);
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
                                  sql`${$where.alias}.${sql.identifier(
                                    localAttribute
                                  )} = ${$subQuery.alias}.${sql.identifier(
                                    remoteAttribute
                                  )}`
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
                `Adding connection filter backward many relation exists field for ${fieldName}`
              );
            }
          }
        }

        // ─── Part 2: Add some/every/none fields to "many" filter types ───
        if (isPgConnectionFilterMany && scopeForeignTable) {
          const foreignTableTypeName = inflection.tableType(
            scopeForeignTable.codec
          );
          const foreignTableFilterTypeName =
            inflection.filterType(foreignTableTypeName);
          const ForeignTableFilterType = build.getTypeByName(
            foreignTableFilterTypeName
          ) as GraphQLInputObjectType;
          if (!ForeignTableFilterType) return fields;

          fields = extend(
            fields,
            {
              // `some`: EXISTS (... WHERE join AND filter)
              some: fieldWithHooks(
                {
                  fieldName: 'some',
                  isPgConnectionFilterField: true,
                },
                () => ({
                  description: 'Filters to entities where at least one related entity matches.',
                  type: ForeignTableFilterType,
                  apply: EXPORTABLE(
                    (
                      assertAllowed: any,
                      sql: any
                    ) =>
                      function ($where: any, value: object | null) {
                        assertAllowed(value, 'object');
                        if (value == null) return;
                        const rel = $where._manyRelation;
                        if (!rel) return;
                        const $subQuery = $where.existsPlan({
                          tableExpression: rel.foreignTableExpression,
                          alias: rel.foreignTable.name,
                        });
                        rel.localAttributes.forEach(
                          (la: string, i: number) => {
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(
                                la
                              )} = ${$subQuery.alias}.${sql.identifier(
                                rel.remoteAttributes[i]
                              )}`
                            );
                          }
                        );
                        return $subQuery;
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),

              // `every`: NOT EXISTS (... WHERE join AND NOT(filter))
              every: fieldWithHooks(
                {
                  fieldName: 'every',
                  isPgConnectionFilterField: true,
                },
                () => ({
                  description: 'Filters to entities where every related entity matches.',
                  type: ForeignTableFilterType,
                  apply: EXPORTABLE(
                    (
                      assertAllowed: any,
                      sql: any
                    ) =>
                      function ($where: any, value: object | null) {
                        assertAllowed(value, 'object');
                        if (value == null) return;
                        const rel = $where._manyRelation;
                        if (!rel) return;
                        // NOT EXISTS (... WHERE join AND NOT(filter))
                        const $subQuery = $where.existsPlan({
                          tableExpression: rel.foreignTableExpression,
                          alias: rel.foreignTable.name,
                          equals: false,
                        });
                        rel.localAttributes.forEach(
                          (la: string, i: number) => {
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(
                                la
                              )} = ${$subQuery.alias}.${sql.identifier(
                                rel.remoteAttributes[i]
                              )}`
                            );
                          }
                        );
                        // Negate the inner filter conditions
                        const $not = $subQuery.notPlan();
                        return $not;
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),

              // `none`: NOT EXISTS (... WHERE join AND filter)
              none: fieldWithHooks(
                {
                  fieldName: 'none',
                  isPgConnectionFilterField: true,
                },
                () => ({
                  description: 'Filters to entities where no related entity matches.',
                  type: ForeignTableFilterType,
                  apply: EXPORTABLE(
                    (
                      assertAllowed: any,
                      sql: any
                    ) =>
                      function ($where: any, value: object | null) {
                        assertAllowed(value, 'object');
                        if (value == null) return;
                        const rel = $where._manyRelation;
                        if (!rel) return;
                        // NOT EXISTS (... WHERE join AND filter)
                        const $subQuery = $where.existsPlan({
                          tableExpression: rel.foreignTableExpression,
                          alias: rel.foreignTable.name,
                          equals: false,
                        });
                        rel.localAttributes.forEach(
                          (la: string, i: number) => {
                            $subQuery.where(
                              sql`${$where.alias}.${sql.identifier(
                                la
                              )} = ${$subQuery.alias}.${sql.identifier(
                                rel.remoteAttributes[i]
                              )}`
                            );
                          }
                        );
                        return $subQuery;
                      },
                    [assertAllowed, sql]
                  ),
                })
              ),
            },
            'Adding some/every/none fields to many filter type'
          );
        }

        return fields;
      },
    },
  },
};
