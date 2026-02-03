/**
 * PgConnectionArgFilterCompositeTypeAttributesPlugin for Graphile v5
 *
 * This plugin adds filter fields for composite type attributes.
 *
 * Composite types are codecs with `attributes` but no corresponding resource
 * (i.e., they are not tables). For each attribute of a composite type that
 * itself has a codec with attributes (nested composite types), this plugin
 * adds a filter field that allows nested filtering.
 *
 * Example:
 * Given a table `posts` with a column `metadata` of composite type `post_metadata`,
 * where `post_metadata` has a nested composite type column `author_info`:
 *
 * ```graphql
 * query {
 *   allPosts(filter: {
 *     metadata: {
 *       authorInfo: { ... }  # This nested filter is added by this plugin
 *     }
 *   }) {
 *     ...
 *   }
 * }
 * ```
 */

import type { PgCodec, PgCondition } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { isEmpty } from './utils';

const version = '4.0.0';

/**
 * PgConnectionArgFilterCompositeTypeAttributesPlugin
 *
 * Adds filter fields for attributes that are composite types (have attributes themselves).
 * This enables nested filtering on composite type columns.
 */
export const PgConnectionArgFilterCompositeTypeAttributesPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterCompositeTypeAttributesPlugin',
    version,

    schema: {
      hooks: {
        GraphQLInputObjectType_fields(inFields, build, context) {
          let fields = inFields;

          const {
            extend,
            inflection,
            graphql: { isNamedType },
            dataplanPg: { PgCondition },
            options: {
              connectionFilterAllowedFieldTypes,
              connectionFilterAllowEmptyObjectInput,
              connectionFilterAllowNullInput,
            },
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: { pgCodec: rawCodec, isPgConnectionFilter },
          } = context;

          // Only process filter types for codecs with attributes
          if (
            !isPgConnectionFilter ||
            !rawCodec ||
            !rawCodec.attributes ||
            rawCodec.isAnonymous
          ) {
            return fields;
          }

          const codec = rawCodec as PgCodec<any, any, any, any, any, any, any>;

          // Iterate over all attributes of the codec
          for (const [attributeName, rawAttribute] of Object.entries(
            codec.attributes
          )) {
            // Type assertion for the attribute
            const attribute = rawAttribute as { codec: PgCodec<any, any, any, any, any, any, any> };

            // Check if this attribute has the filter behavior
            if (
              !build.behavior.pgCodecAttributeMatches(
                [codec, attributeName],
                'attribute:filterBy'
              )
            ) {
              continue;
            }

            // Only process attributes that are composite types (have attributes themselves)
            // This is the key difference from PgConnectionArgFilterAttributesPlugin
            if (!attribute.codec.attributes) {
              continue;
            }

            const fieldName = inflection.attribute({
              codec,
              attributeName,
            });

            // Get the GraphQL type for this attribute's codec
            const NodeType = build.getGraphQLTypeByPgCodec(
              attribute.codec,
              'output'
            );
            if (!NodeType || !isNamedType(NodeType)) {
              continue;
            }

            const nodeTypeName = NodeType.name;

            // Respect `connectionFilterAllowedFieldTypes` config option
            if (
              connectionFilterAllowedFieldTypes &&
              !connectionFilterAllowedFieldTypes.includes(nodeTypeName)
            ) {
              continue;
            }

            // Get the filter type for this composite type
            const filterTypeName = inflection.filterType(nodeTypeName);
            const CompositeFilterType = build.getTypeByName(filterTypeName);

            if (!CompositeFilterType || !isInputType(CompositeFilterType)) {
              continue;
            }

            // Store attribute info for use in apply function
            const colSpec = {
              fieldName,
              attributeName,
              attribute,
            };

            fields = extend(
              fields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgConnectionFilterField: true,
                  },
                  () => ({
                    description: `Filter by the object's \`${fieldName}\` field.`,
                    type: CompositeFilterType,
                    apply: EXPORTABLE(
                      (
                        PgCondition: typeof import('@dataplan/pg').PgCondition,
                        colSpec: {
                          fieldName: string;
                          attributeName: string;
                          attribute: any;
                        },
                        connectionFilterAllowEmptyObjectInput:
                          | boolean
                          | undefined,
                        connectionFilterAllowNullInput: boolean | undefined,
                        isEmpty: typeof import('./utils').isEmpty
                      ) =>
                        function (
                          $where: PgCondition,
                          value: unknown
                        ): PgCondition | undefined {
                          if (value === undefined) {
                            return;
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

                          // Create a new condition for this nested composite type
                          const condition = new PgCondition($where);
                          condition.extensions.pgFilterAttribute = colSpec;
                          return condition;
                        },
                      [
                        PgCondition,
                        colSpec,
                        connectionFilterAllowEmptyObjectInput,
                        connectionFilterAllowNullInput,
                        isEmpty,
                      ]
                    ),
                  })
                ),
              },
              `Adding composite type attribute filter for '${fieldName}'`
            );
          }

          return fields;
        },
      },
    },
  };

export default PgConnectionArgFilterCompositeTypeAttributesPlugin;
