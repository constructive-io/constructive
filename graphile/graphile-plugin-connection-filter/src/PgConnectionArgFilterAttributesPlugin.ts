/**
 * PgConnectionArgFilterAttributesPlugin for Graphile v5
 *
 * This plugin adds filter fields for each table attribute (column) to the
 * corresponding filter input type. For example, if a User table has columns
 * `id`, `name`, and `email`, this plugin adds `id`, `name`, and `email` fields
 * to the `UserFilter` type.
 *
 * Each attribute field's type is the appropriate operator type (e.g., IntFilter,
 * StringFilter) based on the attribute's codec.
 *
 * v5 Migration Notes:
 * - Renamed from PgConnectionArgFilterColumnsPlugin (v4) to PgConnectionArgFilterAttributesPlugin (v5)
 * - "Columns" renamed to "Attributes" in v5 terminology
 * - Uses `PgCodec` for attribute codecs instead of `PgType`
 * - Uses `resource.codec.attributes` to access attributes
 * - Uses `GraphQLInputObjectType_fields` hook
 * - Uses `EXPORTABLE()` wrapper for tree-shaking support
 * - Uses `PgCondition` from `@dataplan/pg` for applying WHERE conditions
 */

import type { PgCodec, PgCodecAttribute } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { isEmpty } from './utils';

const version = '4.0.0';

/**
 * PgConnectionArgFilterAttributesPlugin
 *
 * Adds filter fields for table attributes (columns) to filter input types.
 */
export const PgConnectionArgFilterAttributesPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionArgFilterAttributesPlugin',
  version,

  schema: {
    entityBehavior: {
      pgCodecAttribute: 'attribute:filterBy',
    },

    hooks: {
      GraphQLInputObjectType_fields(inFields, build, context) {
        let fields = inFields;

        const {
          extend,
          inflection,
          connectionFilterOperatorsDigest,
          dataplanPg: { PgCondition },
          options: {
            connectionFilterAllowEmptyObjectInput,
            connectionFilterAllowNullInput,
          },
          EXPORTABLE,
        } = build;

        const {
          fieldWithHooks,
          scope: { pgCodec: rawCodec, isPgConnectionFilter },
        } = context;

        // Only process filter types for codecs with attributes (tables)
        if (!isPgConnectionFilter || !rawCodec || !rawCodec.attributes) {
          return fields;
        }

        const codec = rawCodec as PgCodec<any, any, any, any, any, any, any>;

        // Iterate through each attribute (column) of the codec
        for (const [attributeName, attribute] of Object.entries(
          codec.attributes as Record<string, PgCodecAttribute>
        )) {
          // Check if this attribute should be filterable based on behavior
          if (
            !build.behavior.pgCodecAttributeMatches(
              [codec, attributeName],
              'attribute:filterBy'
            )
          ) {
            continue;
          }

          // Get the field name for this attribute using inflection
          const fieldName = inflection.attribute({ codec, attributeName });

          // Create column spec for the apply function
          const colSpec = {
            fieldName,
            attributeName,
            attribute,
          };

          // Get the operator digest for this attribute's codec
          const digest = connectionFilterOperatorsDigest(attribute.codec);
          if (!digest) {
            continue;
          }

          // Get the operator type (e.g., IntFilter, StringFilter)
          const OperatorsType = build.getTypeByName(digest.operatorsTypeName);
          if (!OperatorsType || !isInputType(OperatorsType)) {
            continue;
          }

          // Add the filter field for this attribute
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
                  type: OperatorsType,
                  apply: EXPORTABLE(
                    (
                      PgCondition,
                      colSpec,
                      connectionFilterAllowEmptyObjectInput,
                      connectionFilterAllowNullInput,
                      isEmpty
                    ) =>
                      function apply(queryBuilder: any, value: unknown) {
                        // Skip undefined values
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

                        // Create a new PgCondition for this attribute
                        const condition = new PgCondition(queryBuilder);

                        // Store the attribute info on the condition extensions
                        // This is used by operator plugins to generate SQL
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
            `Adding attribute filter field '${fieldName}' for '${attributeName}'`
          );
        }

        return fields;
      },
    },
  },
};

export default PgConnectionArgFilterAttributesPlugin;
