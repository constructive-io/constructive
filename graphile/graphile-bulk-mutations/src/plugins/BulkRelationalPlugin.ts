import '../augmentations';

import type { GraphileConfig } from 'graphile-config';

import { discoverNestedRelations } from '../utils/relations';

const version = '0.1.0';

/**
 * BulkRelationalPlugin
 *
 * Adds relational/nested insert support to bulk mutations. When enabled
 * via `bulkRelational: true`, parent values item input types gain optional
 * fields for each "has many" relation, allowing creation of parent and
 * child rows in a single mutation.
 *
 * Example:
 *   mutation {
 *     bulkCreateCategories(input: {
 *       values: [{
 *         name: "Electronics"
 *         products: [
 *           { name: "Laptop", price: "999.99" }
 *         ]
 *       }]
 *     }) { affectedCount }
 *   }
 *
 * The FK column on the child table (e.g. category_id) is automatically
 * populated from the parent's returned primary key. Nested input types
 * exclude FK columns so the user does not need to provide them.
 *
 * Limitations:
 * - ON CONFLICT cannot be used with nested inserts (throws an error)
 * - Only one level of nesting is supported in the initial implementation
 */
export const BulkRelationalPlugin: GraphileConfig.Plugin = {
  name: 'BulkRelationalPlugin',
  version,
  description: 'Adds relational/nested insert support to bulk mutations',
  after: ['BulkTypesPlugin', 'BulkInsertPlugin'],

  schema: {
    hooks: {
      init(_, build) {
        const {
          inflection,
          sql,
          options: { bulkRelational: enableRelational = false }
        } = build;

        if (!enableRelational) return _;

        const pgRegistry = build.input.pgRegistry;

        for (const [_resourceName, resource] of Object.entries(
          pgRegistry.pgResources
        ) as [string, any][]) {
          if (resource.parameters) continue;
          if (!resource.codec.attributes) continue;
          if (resource.codec.polymorphism) continue;
          if (resource.codec.isAnonymous) continue;
          if (!resource.uniques?.length) continue;
          if (!build.behavior.pgResourceMatches(resource, 'bulkInsert'))
            continue;

          const parentTypeName = inflection.tableType(resource.codec);
          const nestedRelations = discoverNestedRelations(
            resource,
            pgRegistry,
            inflection,
            sql
          );

          for (const rel of nestedRelations) {
            const childTypeName = inflection.tableType(
              rel.remoteResource.codec
            );
            const nestedInputTypeName =
              inflection.bulkNestedValuesItemType(
                parentTypeName,
                childTypeName
              );

            // FK columns to exclude from nested input type
            const fkAttrSet = new Set(rel.remoteAttributes);

            build.registerInputObjectType(
              nestedInputTypeName,
              { isBulkRelationalNestedInput: true },
              () => ({
                description: `A row to nest-create for ${childTypeName} when bulk creating ${parentTypeName}. FK columns are auto-populated from the parent.`,
                fields: () => {
                  const result: Record<string, any> = {};
                  for (const [attrName, attr] of Object.entries(
                    rel.remoteResource.codec.attributes
                  ) as [string, any][]) {
                    if (attr.extensions?.isInsertable === false) continue;
                    // Exclude FK columns — they are auto-filled from parent PK
                    if (fkAttrSet.has(attrName)) continue;

                    const fieldName = inflection.attribute({
                      attributeName: attrName,
                      codec: rel.remoteResource.codec
                    });
                    const inputType = build.getGraphQLTypeByPgCodec(
                      attr.codec,
                      'input'
                    );
                    if (!inputType) continue;

                    const isRequired = !!attr.notNull && !attr.hasDefault;
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
              `Nested input for ${childTypeName} in ${parentTypeName}`
            );
          }
        }

        return _;
      },

      // Add nested relation fields to existing values item input types
      GraphQLInputObjectType_fields(fields, build, context) {
        const {
          scope: { isBulkMutationValuesItem, bulkMutationResourceName }
        } = context;

        if (!isBulkMutationValuesItem || !bulkMutationResourceName)
          return fields;

        const {
          inflection,
          sql,
          options: { bulkRelational: enableRelational = false }
        } = build;

        if (!enableRelational) return fields;

        const pgRegistry = build.input.pgRegistry;
        const resource = (pgRegistry.pgResources as any)[
          bulkMutationResourceName
        ];
        if (!resource) return fields;

        const parentTypeName = inflection.tableType(resource.codec);
        const nestedRelations = discoverNestedRelations(
          resource,
          pgRegistry,
          inflection,
          sql
        );

        for (const rel of nestedRelations) {
          const childTypeName = inflection.tableType(
            rel.remoteResource.codec
          );
          const nestedInputTypeName =
            inflection.bulkNestedValuesItemType(
              parentTypeName,
              childTypeName
            );
          const nestedInputType = build.getTypeByName(nestedInputTypeName);
          if (!nestedInputType) continue;

          fields = build.extend(
            fields,
            {
              [rel.fieldName]: {
                description: `Nested ${childTypeName} rows to create for this ${parentTypeName}.`,
                type: new build.graphql.GraphQLList(
                  new build.graphql.GraphQLNonNull(nestedInputType)
                )
              }
            },
            `Adding nested field ${rel.fieldName} to ${parentTypeName} values item`
          );
        }

        return fields;
      }
    }
  }
};
