import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import type { PgCondition, PgCodecRelation, PgCodecWithAttributes, PgResource } from '@dataplan/pg';
import type { SQL } from 'pg-sql2';
import type { GraphQLInputObjectType } from 'graphql';
import { makeAssertAllowed } from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterForwardRelationsPlugin
 *
 * Adds forward relation filter fields to table filter types.
 * A "forward" relation is one where the current table has a FK referencing another table.
 *
 * For example, if `orders` has `client_id` referencing `clients`,
 * then `OrderFilter` gets a `clientByClientId` field of type `ClientFilter`,
 * allowing queries like:
 *
 * ```graphql
 * allOrders(filter: {
 *   clientByClientId: { name: { startsWith: "Acme" } }
 * }) { ... }
 * ```
 *
 * The SQL generated is an EXISTS subquery:
 * ```sql
 * WHERE EXISTS (
 *   SELECT 1 FROM clients
 *   WHERE clients.id = orders.client_id
 *   AND <nested filter conditions>
 * )
 * ```
 */
export const ConnectionFilterForwardRelationsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterForwardRelationsPlugin',
  version,
  description: 'Adds forward relation filter fields to connection filter types',

  inflection: {
    add: {
      filterForwardRelationExistsFieldName(_preset: any, relationFieldName: string) {
        return `${relationFieldName}Exists`;
      },
      filterSingleRelationFieldName(_preset: any, fieldName: string) {
        return fieldName;
      },
    },
  },

  schema: {
    entityBehavior: {
      pgCodecRelation: 'filterBy',
    },

    hooks: {
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
          scope: { pgCodec, isPgConnectionFilter },
        } = context;

        if (!isPgConnectionFilter || !pgCodec || !pgCodec.attributes) {
          return fields;
        }

        const assertAllowed = makeAssertAllowed(build);

        const source = Object.values(
          build.input.pgRegistry.pgResources
        ).find(
          (s: any) => s.codec === pgCodec && !s.parameters
        ) as PgResource<any, PgCodecWithAttributes, any, any, any> | undefined;

        if (!source) return fields;

        const relations = source.getRelations() as {
          [relationName: string]: PgCodecRelation;
        };

        const forwardRelations = Object.entries(relations).filter(
          ([_relationName, relation]) => !relation.isReferencee
        );

        for (const [relationName, relation] of forwardRelations) {
          const foreignTable = relation.remoteResource;

          if (!build.behavior.pgCodecRelationMatches(relation, 'filterBy')) {
            continue;
          }

          // Skip function-based sources
          if (typeof foreignTable.from === 'function') {
            continue;
          }

          const fieldName = inflection.singleRelation({
            registry: source.registry,
            codec: source.codec,
            relationName,
          });
          const filterFieldName =
            inflection.filterSingleRelationFieldName(fieldName);
          const foreignTableTypeName = inflection.tableType(
            foreignTable.codec
          );
          const foreignTableFilterTypeName =
            inflection.filterType(foreignTableTypeName);
          const ForeignTableFilterType = build.getTypeByName(
            foreignTableFilterTypeName
          ) as GraphQLInputObjectType;
          if (!ForeignTableFilterType) continue;

          const foreignTableExpression = foreignTable.from as SQL;
          const localAttributes = relation.localAttributes as string[];
          const remoteAttributes = relation.remoteAttributes as string[];

          // Add the relation filter field (e.g. clientByClientId: ClientFilter)
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
                      function ($where: any, value: object | null) {
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
            `Adding connection filter forward relation field from ${source.name} to ${foreignTable.name}`
          );

          // Add an "exists" field for nullable FKs (e.g. clientByClientIdExists: Boolean)
          const keyIsNullable = (relation.localAttributes as string[]).some(
            (col: string) =>
              !(source.codec.attributes[col] as any)?.notNull
          );
          if (keyIsNullable) {
            const existsFieldName =
              inflection.filterForwardRelationExistsFieldName(fieldName);
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
              `Adding connection filter forward relation exists field for ${fieldName}`
            );
          }
        }

        return fields;
      },
    },
  },
};
