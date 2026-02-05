/**
 * PgConnectionArgFilterForwardRelationsPlugin for Graphile v5
 *
 * This plugin adds filter fields for forward relations (many-to-one) to the
 * corresponding filter input types. For example, if a Post table has a foreign
 * key pointing to User (author), this plugin adds an `author` field to the
 * `PostFilter` type that accepts a `UserFilter`.
 *
 * Forward relations are identified by `!relation.isReferencee` - meaning this
 * table has a foreign key pointing TO another table.
 *
 * Key features:
 * - Adds relation filter field (e.g., `author: UserFilter`)
 * - Adds `*Exists` boolean field when the FK is nullable
 * - Uses EXISTS subquery for filtering
 *
 * v5 Migration Notes:
 * - Relations are accessed via `source.getRelations()` from PgResource
 * - Forward relations: `!relation.isReferencee`
 * - Uses `PgCodecRelation` for relation metadata
 * - Uses `GraphQLInputObjectType_fields` hook
 * - Uses `EXPORTABLE()` wrapper for tree-shaking support
 * - Uses `$where.existsPlan()` for subquery generation
 * - Uses `behaviorRegistry` to register `filterBy` behavior for pgCodecRelation
 */

import type { PgCodec, PgCodecRelation, PgResource } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { isEmpty } from './utils';

const version = '4.0.0';

/**
 * PgConnectionArgFilterForwardRelationsPlugin
 *
 * Adds filter fields for forward relations (many-to-one) to filter input types.
 */
export const PgConnectionArgFilterForwardRelationsPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterForwardRelationsPlugin',
    version,

    schema: {
      behaviorRegistry: {
        add: {
          filterBy: {
            description: 'Can we filter by the results of this relation?',
            entities: ['pgCodecRelation'],
          },
        },
      },

      entityBehavior: {
        pgCodecRelation: 'filterBy',
      },

      hooks: {
        GraphQLInputObjectType_fields(inFields, build, context) {
          let fields = inFields;

          const {
            extend,
            inflection,
            graphql: { GraphQLBoolean },
            sql,
            options: {
              connectionFilterRelations,
              connectionFilterAllowEmptyObjectInput,
              connectionFilterAllowNullInput,
              pgIgnoreReferentialIntegrity,
            },
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: { pgCodec: rawCodec, isPgConnectionFilter },
          } = context;

          // Skip if relations filtering is disabled
          if (!connectionFilterRelations) {
            return fields;
          }

          // Only process filter types for codecs with attributes (tables)
          if (!isPgConnectionFilter || !rawCodec || !rawCodec.attributes) {
            return fields;
          }

          const codec = rawCodec as PgCodec<any, any, any, any, any, any, any>;

          // Find the source (PgResource) for this codec
          const source = Object.values(
            build.input.pgRegistry.pgResources
          ).find(
            (s) =>
              (s as PgResource<any, any, any, any>).codec === codec &&
              !(s as PgResource<any, any, any, any>).parameters
          ) as PgResource<any, any, any, any> | undefined;

          if (!source) {
            return fields;
          }

          // Get all relations for this source
          const relations = source.getRelations();

          // Filter to forward relations only (this table references another table)
          // Forward relations: !relation.isReferencee
          const forwardRelations = Object.entries(relations).filter(
            ([_relationName, relation]) => {
              return !(relation as PgCodecRelation<any, any>).isReferencee;
            }
          ) as [string, PgCodecRelation<any, any>][];

          for (const [relationName, relation] of forwardRelations) {
            const foreignResource = relation.remoteResource as PgResource<
              any,
              any,
              any,
              any
            >;

            // Check if this relation should be filterable based on behavior
            if (
              !build.behavior.pgCodecRelationMatches(relation, 'filterBy')
            ) {
              continue;
            }

            // Get field name using v5 inflection
            const fieldName = inflection.singleRelation({
              registry: source.registry,
              codec: source.codec,
              relationName,
            });

            // Use the relation field name as the filter field name
            const filterFieldName = fieldName;

            // Get the foreign table's filter type
            const foreignTableTypeName = inflection.tableType(
              foreignResource.codec
            );
            const foreignTableFilterTypeName =
              inflection.filterType(foreignTableTypeName);
            const ForeignTableFilterType = build.getTypeByName(
              foreignTableFilterTypeName
            );

            if (!ForeignTableFilterType || !isInputType(ForeignTableFilterType)) {
              continue;
            }

            // Skip if the foreign table has a dynamic `from` function
            if (typeof foreignResource.from === 'function') {
              continue;
            }

            const foreignTableExpression = foreignResource.from;
            const localAttributes = relation.localAttributes as string[];
            const remoteAttributes = relation.remoteAttributes as string[];

            // Add the relation filter field
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
                        connectionFilterAllowEmptyObjectInput,
                        connectionFilterAllowNullInput,
                        foreignResource,
                        foreignTableExpression,
                        isEmpty,
                        localAttributes,
                        remoteAttributes,
                        sql
                      ) =>
                        function apply($where: any, value: unknown) {
                          // Validate null input
                          if (
                            !connectionFilterAllowNullInput &&
                            value === null
                          ) {
                            throw Object.assign(
                              new Error(
                                'Null literals are forbidden in filter argument input.'
                              ),
                              { extensions: { isSafeError: true } }
                            );
                          }

                          // Validate empty object input
                          if (
                            !connectionFilterAllowEmptyObjectInput &&
                            isEmpty(value)
                          ) {
                            throw Object.assign(
                              new Error(
                                'Empty objects are forbidden in filter argument input.'
                              ),
                              { extensions: { isSafeError: true } }
                            );
                          }

                          if (value == null) {
                            return;
                          }

                          // Create EXISTS subquery for the related table
                          const $subQuery = $where.existsPlan({
                            tableExpression: foreignTableExpression,
                            alias: foreignResource.name,
                          });

                          // Add WHERE conditions to match the FK columns
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
                        connectionFilterAllowEmptyObjectInput,
                        connectionFilterAllowNullInput,
                        foreignResource,
                        foreignTableExpression,
                        isEmpty,
                        localAttributes,
                        remoteAttributes,
                        sql,
                      ]
                    ),
                  })
                ),
              },
              `Adding connection filter forward relation field from ${source.name} to ${foreignResource.name}`
            );

            // Check if the FK columns are nullable
            const keyIsNullable = localAttributes.some(
              (col: string) => !source.codec.attributes[col]?.notNull
            );

            // Add *Exists field if FK is nullable or if referential integrity is ignored
            if (keyIsNullable || pgIgnoreReferentialIntegrity) {
              const existsFieldName = `${fieldName}Exists`;

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
                          connectionFilterAllowNullInput,
                          foreignResource,
                          foreignTableExpression,
                          localAttributes,
                          remoteAttributes,
                          sql
                        ) =>
                          function apply($where: any, value: unknown) {
                            // Validate null input
                            if (
                              !connectionFilterAllowNullInput &&
                              value === null
                            ) {
                              throw Object.assign(
                                new Error(
                                  'Null literals are forbidden in filter argument input.'
                                ),
                                { extensions: { isSafeError: true } }
                              );
                            }

                            if (value == null) {
                              return;
                            }

                            // Create EXISTS subquery with equals option for boolean check
                            const $subQuery = $where.existsPlan({
                              tableExpression: foreignTableExpression,
                              alias: foreignResource.name,
                              equals: value,
                            });

                            // Add WHERE conditions to match the FK columns
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
                          connectionFilterAllowNullInput,
                          foreignResource,
                          foreignTableExpression,
                          localAttributes,
                          remoteAttributes,
                          sql,
                        ]
                      ),
                    })
                  ),
                },
                `Adding connection filter forward relation exists field from ${source.name} to ${foreignResource.name}`
              );
            }
          }

          return fields;
        },
      },
    },
  };

export default PgConnectionArgFilterForwardRelationsPlugin;
