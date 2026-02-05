/**
 * PgConnectionArgFilterComputedAttributesPlugin - Computed attribute filtering for PostGraphile v5
 *
 * This plugin adds filter fields for computed attributes (functions that take
 * a table row as the first argument and return a scalar value).
 *
 * In v5, "computed columns" are renamed to "computed attributes" and are
 * represented as PgResource entries with `isUnique: true` and a single
 * required parameter (the table row).
 */

import type { PgCodec, PgResource } from '@dataplan/pg';
import { isInputType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import {
  getComputedAttributeResources,
  isComputedScalarAttributeResource,
} from './utils';

// Augment GraphileBuild namespace to add our custom behaviors
declare global {
  namespace GraphileBuild {
    interface BehaviorStrings {
      filterBy: true;
    }
  }
}

const version = '4.0.0';

/**
 * PgConnectionArgFilterComputedAttributesPlugin
 *
 * Adds filter fields for computed attributes to filter input types.
 * Computed attributes are functions that:
 * - Take a table row as the first parameter
 * - Return a scalar value (not a table or set)
 * - Have no additional required parameters
 */
export const PgConnectionArgFilterComputedAttributesPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterComputedAttributesPlugin',
    version,

    schema: {
      behaviorRegistry: {
        add: {
          filterBy: {
            description:
              'Should this computed attribute be available for filtering?',
            entities: ['pgResource'],
          },
        },
      },

      entityBehavior: {
        pgResource: {
          inferred(behavior, entity, build) {
            // If connectionFilterComputedColumns is enabled and this is a computed
            // scalar attribute, add the filterBy behavior
            if (
              build.options.connectionFilterComputedColumns &&
              isComputedScalarAttributeResource(
                entity as PgResource<any, any, any, any>
              )
            ) {
              return [behavior, 'filterBy'];
            } else {
              return behavior;
            }
          },
        },
      },

      hooks: {
        GraphQLInputObjectType_fields(inFields, build, context) {
          let fields = inFields;

          const {
            inflection,
            connectionFilterOperatorsDigest,
            dataplanPg: { TYPES, PgCondition },
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: { pgCodec: codec, isPgConnectionFilter },
          } = context;

          // Only apply to filter input types for tables
          if (
            !isPgConnectionFilter ||
            !codec ||
            !codec.attributes ||
            codec.isAnonymous
          ) {
            return fields;
          }

          // Find the source (PgResource) for this codec
          // This is the table resource that computed attributes operate on
          const source = Object.values(
            build.input.pgRegistry.pgResources
          ).find(
            (s) =>
              (s as PgResource<any, any, any, any>).codec === codec &&
              !(s as PgResource<any, any, any, any>).parameters &&
              !(s as PgResource<any, any, any, any>).isUnique
          ) as PgResource<any, any, any, any> | undefined;

          if (!source) {
            return fields;
          }

          // Get all computed attributes for this table
          const computedAttributeResources = getComputedAttributeResources(
            build,
            source
          );

          for (const computedAttributeResource of computedAttributeResources) {
            // Must return a single value (not a set)
            if (!computedAttributeResource.isUnique) {
              continue;
            }

            // Must return a scalar (no attributes on the return codec)
            if (computedAttributeResource.codec.attributes) {
              continue;
            }

            // Must not return void
            if (computedAttributeResource.codec === TYPES.void) {
              continue;
            }

            // Get the operator digest for the return type
            const digest = connectionFilterOperatorsDigest(
              computedAttributeResource.codec
            );
            if (!digest) {
              continue;
            }

            // Get the operator type (e.g., StringFilter, IntFilter)
            const OperatorsType = build.getTypeByName(digest.operatorsTypeName);
            if (!OperatorsType || !isInputType(OperatorsType)) {
              continue;
            }

            // Check behavior - must have filterBy behavior
            if (
              !build.behavior.pgResourceMatches(
                computedAttributeResource,
                'filterBy'
              )
            ) {
              continue;
            }

            // Get argument details for parameters after the first (table row)
            const { argDetails } = build.pgGetArgDetailsFromParameters(
              computedAttributeResource,
              computedAttributeResource.parameters!.slice(1)
            );

            // Must have no required arguments (beyond the table row)
            if (argDetails.some((a: { required: boolean }) => a.required)) {
              continue;
            }

            // Determine the field name using the inflection
            const fieldName = inflection.computedAttributeField({
              resource: computedAttributeResource,
            });

            // Get the return codec for the computed attribute
            const functionResultCodec = computedAttributeResource.codec as PgCodec<
              any,
              any,
              any,
              any,
              any,
              any,
              any
            >;

            // Add the filter field
            fields = build.extend(
              fields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgConnectionFilterField: true,
                  },
                  {
                    description: `Filter by the object's \`${fieldName}\` field.`,
                    type: OperatorsType,
                    apply: EXPORTABLE(
                      (
                        PgCondition: typeof import('@dataplan/pg').PgCondition,
                        computedAttributeResource: PgResource<
                          any,
                          any,
                          any,
                          any
                        >,
                        fieldName: string,
                        functionResultCodec: PgCodec<
                          any,
                          any,
                          any,
                          any,
                          any,
                          any,
                          any
                        >
                      ) =>
                        function apply(
                          $where: InstanceType<
                            typeof import('@dataplan/pg').PgCondition
                          >,
                          value: unknown
                        ) {
                          if (
                            typeof computedAttributeResource.from !== 'function'
                          ) {
                            throw new Error(
                              `Computed attribute resource '${computedAttributeResource.name}' does not have a 'from' function`
                            );
                          }

                          // Skip null values
                          if (value == null) return;

                          // Build the SQL expression for the computed attribute
                          // The `from` function takes an object with a placeholder for the table alias
                          const expression = computedAttributeResource.from({
                            placeholder: $where.alias,
                          });

                          // Create a new condition for the filter operators to apply to
                          const $col = new PgCondition($where);
                          $col.extensions.pgFilterAttribute = {
                            fieldName,
                            codec: functionResultCodec,
                            expression,
                          };

                          return $col;
                        },
                      [
                        PgCondition,
                        computedAttributeResource,
                        fieldName,
                        functionResultCodec,
                      ]
                    ),
                  }
                ),
              },
              `Adding computed attribute filter field '${fieldName}' from PgConnectionArgFilterComputedAttributesPlugin`
            );
          }

          return fields;
        },
      },
    },
  };

export default PgConnectionArgFilterComputedAttributesPlugin;
