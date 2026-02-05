/**
 * PgConnectionArgFilterRecordFunctionsPlugin for Graphile v5
 *
 * This plugin adds filter fields for functions that return anonymous record types
 * (i.e., functions with OUT/INOUT/TABLE parameters that return RECORD).
 *
 * In v5, record-returning functions are represented as PgResource entries where:
 * - The resource has `parameters` (it's a function)
 * - The resource's codec is `isAnonymous` (returns RECORD type)
 * - The codec has `attributes` representing the output columns
 *
 * v5 Migration Notes:
 * - Uses PgResource instead of PgProc for function representation
 * - Uses codec.isAnonymous to identify RECORD-returning functions
 * - Uses codec.attributes to access output columns (was argModes/argNames)
 * - Uses `GraphQLInputObjectType_fields` hook
 * - Uses `EXPORTABLE()` wrapper for tree-shaking support
 * - Uses `PgCondition` from `@dataplan/pg` for applying WHERE conditions
 *
 * Note: This plugin complements PgConnectionArgFilterAttributesPlugin by handling
 * the specific case of anonymous record codecs that have dynamically generated
 * attributes from function OUT parameters.
 */

import type { PgCodec, PgCodecAttribute, PgResource } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { isEmpty } from './utils';

type AnyPgResource = PgResource<any, any, any, any, any>;

const version = '4.0.0';

/**
 * PgConnectionArgFilterRecordFunctionsPlugin
 *
 * Adds filter fields for functions that return anonymous record types.
 * For each output column of the function, a filter field is created using
 * the appropriate operator type (e.g., IntFilter, StringFilter).
 */
export const PgConnectionArgFilterRecordFunctionsPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterRecordFunctionsPlugin',
    version,

    schema: {
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
              connectionFilterSetofFunctions,
            },
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: { pgCodec: rawCodec, isPgConnectionFilter },
          } = context;

          // Only process filter types
          if (!isPgConnectionFilter || !rawCodec) {
            return fields;
          }

          const codec = rawCodec as PgCodec<any, any, any, any, any, any, any>;

          // This plugin specifically handles anonymous record types
          // (functions with OUT parameters returning RECORD)
          if (!codec.isAnonymous || !codec.attributes) {
            return fields;
          }

          // Find the resource that uses this codec - must be a function resource
          const resource = (
            Object.values(build.input.pgRegistry.pgResources) as AnyPgResource[]
          ).find(
            (r: AnyPgResource) =>
              r.codec === codec &&
              r.parameters // Must be a function (has parameters)
          );

          if (!resource) {
            return fields;
          }

          // Check if filtering is enabled for this function
          // Either via @filterable tag or connectionFilterSetofFunctions option
          const tags = (resource.extensions?.tags ?? {}) as Record<
            string,
            boolean | string | undefined
          >;
          if (!tags.filterable && !connectionFilterSetofFunctions) {
            return fields;
          }

          // Check behavior for filterProc
          if (!build.behavior.pgResourceMatches(resource, 'filterProc')) {
            return fields;
          }

          // Iterate through each attribute (output column) of the record type
          for (const [attributeName, attribute] of Object.entries(
            codec.attributes as Record<string, PgCodecAttribute>
          )) {
            // Get the field name for this attribute using inflection
            // For anonymous record types, we use the attribute name directly
            // as there's no specific inflection for function output fields
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

            // Add the filter field for this output column
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
              `Adding record function filter field '${fieldName}' for output column '${attributeName}'`
            );
          }

          return fields;
        },
      },
    },
  };

export default PgConnectionArgFilterRecordFunctionsPlugin;
