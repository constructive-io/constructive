import '../augmentations';

import { pgSelectFromRecords } from '@dataplan/pg';
import { access } from 'grafast';
import type { GraphileConfig } from 'graphile-config';

const version = '0.1.0';

/**
 * Checks if a resource is suitable for bulk mutations:
 * - Must have attributes (is a table)
 * - Must not be polymorphic
 * - Must not be anonymous
 * - Must have at least one unique constraint (for ON CONFLICT)
 * - Must not have parameters (not a function)
 */
function isBulkMutationCandidate(resource: any): boolean {
  return (
    !resource.parameters &&
    !!resource.codec.attributes &&
    !resource.codec.polymorphism &&
    !resource.codec.isAnonymous &&
    !!resource.uniques?.length
  );
}

/**
 * BulkTypesPlugin
 *
 * Registers all shared types for bulk mutations:
 * 1. ConflictAction enum (IGNORE)
 * 2. Per-table unique constraint enums (e.g. UserUniqueConstraint)
 * 3. Per-table column enums (e.g. UserColumn)
 * 4. Per-table ON CONFLICT input types
 * 5. Per-table values item input types
 * 6. Per-table input types (wrapping values + onConflict)
 * 7. Per-table payload types (affectedCount + returning)
 *
 * Behavior: OFF by default. Tables must opt in via smart tags:
 *   @behavior +bulkInsert +bulkUpsert +bulkUpdate +bulkDelete
 */
export const BulkTypesPlugin: GraphileConfig.Plugin = {
  name: 'BulkTypesPlugin',
  version,
  description: 'Registers bulk mutation types (enums, inputs, payloads)',
  after: ['PgMutationCreatePlugin', 'PgMutationUpdateDeletePlugin', 'BulkInflectionPlugin'],

  schema: {
    behaviorRegistry: {
      add: {
        bulkInsert: {
          description: 'Enable bulk insert mutation for this resource',
          entities: ['pgResource']
        },
        bulkUpsert: {
          description: 'Enable bulk upsert mutation for this resource',
          entities: ['pgResource']
        },
        bulkUpdate: {
          description: 'Enable bulk update mutation for this resource',
          entities: ['pgResource']
        },
        bulkDelete: {
          description: 'Enable bulk delete mutation for this resource',
          entities: ['pgResource']
        }
      }
    },

    // Default: OFF. Tables must explicitly opt in via smart tags.
    entityBehavior: {
      pgResource: {
        inferred(behavior: any) {
          return [behavior, '-bulkInsert -bulkUpsert -bulkUpdate -bulkDelete'];
        }
      }
    },

    hooks: {
      init(_, build) {
        const {
          inflection,
          options: {
            bulkInsert: enableInsert = true,
            bulkUpsert: enableUpsert = true,
            bulkUpdate: enableUpdate = true,
            bulkDelete: enableDelete = true
          }
        } = build;

        // Register the ConflictAction enum (shared across all tables)
        build.registerEnumType(
          'ConflictAction',
          {},
          () => ({
            description: 'Action to take when a conflict occurs during bulk insert.',
            values: {
              IGNORE: {
                value: 'IGNORE',
                description: 'Skip the conflicting row (ON CONFLICT DO NOTHING).'
              }
            }
          }),
          'ConflictAction enum for bulk mutations'
        );

        // Iterate over all resources to register per-table types
        const pgRegistry = build.input.pgRegistry;
        for (const [resourceName, resource] of Object.entries(
          pgRegistry.pgResources
        ) as [string, any][]) {
          if (!isBulkMutationCandidate(resource)) continue;

          const hasInsert =
            enableInsert &&
            build.behavior.pgResourceMatches(resource, 'bulkInsert');
          const hasUpsert =
            enableUpsert &&
            build.behavior.pgResourceMatches(resource, 'bulkUpsert');
          const hasUpdate =
            enableUpdate &&
            build.behavior.pgResourceMatches(resource, 'bulkUpdate');
          const hasDelete =
            enableDelete &&
            build.behavior.pgResourceMatches(resource, 'bulkDelete');

          if (!hasInsert && !hasUpsert && !hasUpdate && !hasDelete) continue;

          const typeName = inflection.tableType(resource.codec);

          // Per-table unique constraint enum
          if (hasInsert || hasUpsert) {
            const constraintEnumName =
              inflection.uniqueConstraintEnumType(typeName);
            const values: Record<
              string,
              { value: string; description: string }
            > = {};
            for (const unique of resource.uniques) {
              // Use column-based conflict targeting (ON CONFLICT (col1, col2))
              // rather than constraint names, since PgResourceUnique doesn't
              // store the actual PostgreSQL constraint name.
              const enumKey = unique.isPrimary
                ? `${resourceName}_pkey`
                : `${resourceName}_${unique.attributes.join('_')}_key`;
              const enumValue = inflection
                .constantCase(enumKey)
                .toUpperCase();
              // Store comma-separated column list as the enum value
              values[enumValue] = {
                value: unique.attributes.join(','),
                description: unique.isPrimary
                  ? `Primary key constraint on ${resourceName}`
                  : `Unique constraint on (${unique.attributes.join(', ')})`
              };
            }

            build.registerEnumType(
              constraintEnumName,
              { isBulkMutationConstraintEnum: true },
              () => ({
                description: `Unique constraints on ${typeName} for ON CONFLICT targeting.`,
                values
              }),
              `Unique constraint enum for ${typeName}`
            );
          }

          // Per-table column enum
          if (hasUpsert) {
            const columnEnumName = inflection.columnEnumType(typeName);
            const values: Record<
              string,
              { value: string; description: string }
            > = {};
            for (const [attrName, attr] of Object.entries(
              resource.codec.attributes
            ) as [string, any][]) {
              if (attr.extensions?.isInsertable === false) continue;
              const enumValue = inflection
                .constantCase(attrName)
                .toUpperCase();
              values[enumValue] = {
                value: attrName,
                description: `Column ${attrName}`
              };
            }

            build.registerEnumType(
              columnEnumName,
              { isBulkMutationColumnEnum: true },
              () => ({
                description: `Columns of ${typeName} available for upsert SET clause.`,
                values
              }),
              `Column enum for ${typeName}`
            );
          }

          // Per-table ON CONFLICT input for insert
          if (hasInsert) {
            const onConflictName =
              inflection.bulkInsertOnConflictInputType(typeName);
            const constraintEnumName =
              inflection.uniqueConstraintEnumType(typeName);

            build.registerInputObjectType(
              onConflictName,
              { isBulkMutationOnConflictInput: true },
              () => ({
                description: `ON CONFLICT options for bulk creating ${typeName}.`,
                fields: ({ fieldWithHooks }: any) => ({
                  constraint: fieldWithHooks(
                    { fieldName: 'constraint' },
                    () => ({
                      description:
                        'The unique constraint to use for conflict detection.',
                      type: build.getTypeByName(constraintEnumName)
                    })
                  ),
                  action: fieldWithHooks(
                    { fieldName: 'action' },
                    () => ({
                      description: 'The action to take on conflict.',
                      type: new build.graphql.GraphQLNonNull(
                        build.getTypeByName('ConflictAction')
                      )
                    })
                  )
                })
              }),
              `ON CONFLICT input for bulk insert ${typeName}`
            );
          }

          // Per-table ON CONFLICT input for upsert
          if (hasUpsert) {
            const onConflictName =
              inflection.bulkUpsertOnConflictInputType(typeName);
            const constraintEnumName =
              inflection.uniqueConstraintEnumType(typeName);
            const columnEnumName = inflection.columnEnumType(typeName);

            build.registerInputObjectType(
              onConflictName,
              { isBulkMutationOnConflictInput: true },
              () => ({
                description: `ON CONFLICT options for bulk upserting ${typeName}.`,
                fields: ({ fieldWithHooks }: any) => ({
                  constraint: fieldWithHooks(
                    { fieldName: 'constraint' },
                    () => ({
                      description:
                        'The unique constraint to use for conflict detection.',
                      type: new build.graphql.GraphQLNonNull(
                        build.getTypeByName(constraintEnumName)
                      )
                    })
                  ),
                  updateColumns: fieldWithHooks(
                    { fieldName: 'updateColumns' },
                    () => ({
                      description:
                        'Columns to update on conflict. If omitted, all non-key columns are updated.',
                      type: new build.graphql.GraphQLList(
                        new build.graphql.GraphQLNonNull(
                          build.getTypeByName(columnEnumName)
                        )
                      )
                    })
                  )
                })
              }),
              `ON CONFLICT input for bulk upsert ${typeName}`
            );
          }

          // Per-table values item input type (for insert)
          if (hasInsert || hasUpsert) {
            const itemTypeName = hasInsert
              ? inflection.bulkInsertValuesItemType(typeName)
              : inflection.bulkUpsertValuesItemType(typeName);

            build.registerInputObjectType(
              itemTypeName,
              {
                isBulkMutationValuesItem: true,
                bulkMutationResourceName: resourceName
              },
              () => ({
                description: `A single row to insert for ${typeName}.`,
                fields: () => {
                  const result: Record<string, any> = {};
                  for (const [attrName, attr] of Object.entries(
                    resource.codec.attributes
                  ) as [string, any][]) {
                    if (attr.extensions?.isInsertable === false) continue;

                    const fieldName = inflection.attribute({
                      attributeName: attrName,
                      codec: resource.codec
                    });
                    const inputType = build.getGraphQLTypeByPgCodec(
                      attr.codec,
                      'input'
                    );
                    if (!inputType) continue;

                    const isRequired =
                      !!attr.notNull && !attr.hasDefault;
                    result[fieldName] = {
                      description: `Value for ${attrName}`,
                      type: isRequired
                        ? new build.graphql.GraphQLNonNull(inputType)
                        : inputType
                    };
                  }
                  return result;
                }
              }),
              `Values item input for bulk insert ${typeName}`
            );

            // Register upsert item separately if both exist
            if (hasInsert && hasUpsert) {
              const upsertItemTypeName =
                inflection.bulkUpsertValuesItemType(typeName);

              build.registerInputObjectType(
                upsertItemTypeName,
                {
                  isBulkMutationValuesItem: true,
                  bulkMutationResourceName: resourceName
                },
                () => ({
                  description: `A single row to upsert for ${typeName}.`,
                  fields: () => {
                    const result: Record<string, any> = {};
                    for (const [attrName, attr] of Object.entries(
                      resource.codec.attributes
                    ) as [string, any][]) {
                      if (attr.extensions?.isInsertable === false) continue;

                      const fieldName = inflection.attribute({
                        attributeName: attrName,
                        codec: resource.codec
                      });
                      const inputType = build.getGraphQLTypeByPgCodec(
                        attr.codec,
                        'input'
                      );
                      if (!inputType) continue;

                      const isRequired =
                        !!attr.notNull && !attr.hasDefault;
                      result[fieldName] = {
                        description: `Value for ${attrName}`,
                        type: isRequired
                          ? new build.graphql.GraphQLNonNull(inputType)
                          : inputType
                      };
                    }
                    return result;
                  }
                }),
                `Values item input for bulk upsert ${typeName}`
              );
            }
          }

          // Per-table wrapper input types
          if (hasInsert) {
            const inputName = inflection.bulkInsertInputType(typeName);
            const itemTypeName =
              inflection.bulkInsertValuesItemType(typeName);
            const onConflictName =
              inflection.bulkInsertOnConflictInputType(typeName);

            build.registerInputObjectType(
              inputName,
              { isBulkMutationInput: true },
              () => ({
                description: `Input for bulk creating ${typeName} rows.`,
                fields: ({ fieldWithHooks }: any) => ({
                  values: fieldWithHooks(
                    { fieldName: 'values' },
                    () => ({
                      description: 'The rows to insert.',
                      type: new build.graphql.GraphQLNonNull(
                        new build.graphql.GraphQLList(
                          new build.graphql.GraphQLNonNull(
                            build.getTypeByName(itemTypeName)
                          )
                        )
                      )
                    })
                  ),
                  onConflict: fieldWithHooks(
                    { fieldName: 'onConflict' },
                    () => ({
                      description:
                        'Optional ON CONFLICT handling for duplicate keys.',
                      type: build.getTypeByName(onConflictName)
                    })
                  )
                })
              }),
              `Input for bulk insert ${typeName}`
            );
          }

          if (hasUpsert) {
            const inputName = inflection.bulkUpsertInputType(typeName);
            const itemTypeName =
              inflection.bulkUpsertValuesItemType(typeName);
            const onConflictName =
              inflection.bulkUpsertOnConflictInputType(typeName);

            build.registerInputObjectType(
              inputName,
              { isBulkMutationInput: true },
              () => ({
                description: `Input for bulk upserting ${typeName} rows.`,
                fields: ({ fieldWithHooks }: any) => ({
                  values: fieldWithHooks(
                    { fieldName: 'values' },
                    () => ({
                      description: 'The rows to upsert.',
                      type: new build.graphql.GraphQLNonNull(
                        new build.graphql.GraphQLList(
                          new build.graphql.GraphQLNonNull(
                            build.getTypeByName(itemTypeName)
                          )
                        )
                      )
                    })
                  ),
                  onConflict: fieldWithHooks(
                    { fieldName: 'onConflict' },
                    () => ({
                      description:
                        'The unique constraint to target and which columns to update.',
                      type: new build.graphql.GraphQLNonNull(
                        build.getTypeByName(onConflictName)
                      )
                    })
                  )
                })
              }),
              `Input for bulk upsert ${typeName}`
            );
          }

          if (hasUpdate) {
            const inputName = inflection.bulkUpdateInputType(typeName);
            const patchTypeName = inflection.patchType(typeName);

            build.registerInputObjectType(
              inputName,
              { isBulkMutationInput: true },
              () => ({
                description: `Input for bulk updating ${typeName} rows.`,
                fields: ({ fieldWithHooks }: any) => ({
                  where: fieldWithHooks(
                    { fieldName: 'where' },
                    () => {
                      // Try to use connection-filter type if available
                      const filterTypeName = `${typeName}Filter`;
                      const filterType = build.getTypeByName(filterTypeName);
                      // Fall back to PostGraphile's built-in condition type
                      const conditionTypeName = inflection.conditionType(
                        typeName
                      );
                      const conditionType =
                        build.getTypeByName(conditionTypeName);
                      const whereType = filterType || conditionType;
                      return {
                        description:
                          'Condition to select which rows to update.',
                        type: whereType
                          ? new build.graphql.GraphQLNonNull(whereType)
                          : build.graphql.GraphQLString
                      };
                    }
                  ),
                  patch: fieldWithHooks(
                    { fieldName: 'patch' },
                    () => ({
                      description: 'The fields to update.',
                      type: new build.graphql.GraphQLNonNull(
                        build.getTypeByName(patchTypeName)
                      )
                    })
                  )
                })
              }),
              `Input for bulk update ${typeName}`
            );
          }

          if (hasDelete) {
            const inputName = inflection.bulkDeleteInputType(typeName);

            build.registerInputObjectType(
              inputName,
              { isBulkMutationInput: true },
              () => ({
                description: `Input for bulk deleting ${typeName} rows.`,
                fields: ({ fieldWithHooks }: any) => ({
                  where: fieldWithHooks(
                    { fieldName: 'where' },
                    () => {
                      const filterTypeName = `${typeName}Filter`;
                      const filterType = build.getTypeByName(filterTypeName);
                      const conditionTypeName = inflection.conditionType(
                        typeName
                      );
                      const conditionType =
                        build.getTypeByName(conditionTypeName);
                      const whereType = filterType || conditionType;
                      return {
                        description:
                          'Condition to select which rows to delete.',
                        type: whereType
                          ? new build.graphql.GraphQLNonNull(whereType)
                          : build.graphql.GraphQLString
                      };
                    }
                  )
                })
              }),
              `Input for bulk delete ${typeName}`
            );
          }

          // Payload types
          const registerPayload = (
            payloadName: string,
            description: string,
            payloadResource: any
          ) => {
            build.registerObjectType(
              payloadName,
              { isBulkMutationPayload: true },
              () => ({
                description,
                fields: ({ fieldWithHooks }: any) => {
                  const outputType = build.getTypeByName(typeName);
                  const fields: Record<string, any> = {
                    clientMutationId: fieldWithHooks(
                      { fieldName: 'clientMutationId' },
                      () => ({
                        description:
                          'The exact same clientMutationId that was provided in the mutation input.',
                        type: build.graphql.GraphQLString
                      })
                    ),
                    affectedCount: fieldWithHooks(
                      {
                        fieldName: 'affectedCount',
                        isBulkMutationPayloadAffectedCountField: true
                      },
                      () => ({
                        description:
                          'The number of rows affected by the mutation.',
                        type: new build.graphql.GraphQLNonNull(
                          build.graphql.GraphQLInt
                        )
                      })
                    )
                  };

                  if (outputType) {
                    fields.returning = fieldWithHooks(
                      {
                        fieldName: 'returning',
                        isBulkMutationPayloadReturningField: true
                      },
                      () => ({
                        description: 'The rows affected by the mutation.',
                        type: new build.graphql.GraphQLNonNull(
                          new build.graphql.GraphQLList(
                            new build.graphql.GraphQLNonNull(outputType)
                          )
                        ),
                        plan($parent: any) {
                          const $records = access(
                            $parent,
                            'returning'
                          ) as any;
                          return pgSelectFromRecords(
                            payloadResource,
                            $records
                          );
                        }
                      })
                    );
                  }

                  fields.query = fieldWithHooks(
                    { fieldName: 'query' },
                    () => ({
                      description:
                        'Access the root query type. Useful for re-fetching data after a mutation.',
                      type: build.getTypeByName('Query')
                    })
                  );

                  return fields;
                }
              }),
              `${description} payload`
            );
          };

          if (hasInsert) {
            registerPayload(
              inflection.bulkInsertPayloadType(typeName),
              `The output of the bulk create ${typeName} mutation.`,
              resource
            );
          }
          if (hasUpsert) {
            registerPayload(
              inflection.bulkUpsertPayloadType(typeName),
              `The output of the bulk upsert ${typeName} mutation.`,
              resource
            );
          }
          if (hasUpdate) {
            registerPayload(
              inflection.bulkUpdatePayloadType(typeName),
              `The output of the bulk update ${typeName} mutation.`,
              resource
            );
          }
          if (hasDelete) {
            registerPayload(
              inflection.bulkDeletePayloadType(typeName),
              `The output of the bulk delete ${typeName} mutation.`,
              resource
            );
          }
        }

        return _;
      }
    }
  }
};
