import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import {
  isComputedScalarAttributeResource,
  getComputedAttributeResources,
} from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterComputedAttributesPlugin
 *
 * Adds filter fields for computed columns (PostgreSQL functions that take
 * a table row as their first argument and return a scalar).
 *
 * For example, given:
 *   CREATE FUNCTION person_full_name(person) RETURNS text AS $$ ... $$;
 *
 * This plugin adds a `fullName` filter field to `PersonFilter`, typed as `StringFilter`,
 * allowing queries like:
 *   { people(filter: { fullName: { startsWith: "John" } }) { ... } }
 *
 * Controlled by the `connectionFilterComputedColumns` schema option (default: true).
 * Requires the `filterBy` behavior on the pgResource to be enabled.
 */
export const ConnectionFilterComputedAttributesPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterComputedAttributesPlugin',
  version,
  description:
    'Adds filter fields for computed column functions (scalar-returning functions that take a table row)',

  schema: {
    behaviorRegistry: {
      add: {
        filterBy: {
          description:
            'Whether a computed attribute resource should be available as a filter field',
          entities: ['pgResource'],
        },
      },
    },

    entityBehavior: {
      pgResource: {
        inferred(behavior, entity, build) {
          if (
            build.options.connectionFilterComputedColumns &&
            isComputedScalarAttributeResource(entity)
          ) {
            return [behavior, 'filterBy'];
          }
          return behavior;
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

        // Only apply to table-level filter types (e.g. UserFilter)
        if (
          !isPgConnectionFilter ||
          !codec ||
          !(codec as any).attributes ||
          (codec as any).isAnonymous
        ) {
          return fields;
        }

        // Find the source resource for this codec
        const source = Object.values(
          build.input.pgRegistry.pgResources
        ).find(
          (s: any) =>
            s.codec === codec && !s.parameters && !s.isUnique
        );
        if (!source) {
          return fields;
        }

        const computedAttributeResources = getComputedAttributeResources(
          build,
          source
        );

        for (const computedAttributeResource of computedAttributeResources) {
          // Must return a scalar or an array (not a composite)
          if (!computedAttributeResource.isUnique) {
            continue;
          }
          if (computedAttributeResource.codec.attributes) {
            continue;
          }
          if (computedAttributeResource.codec === TYPES.void) {
            continue;
          }

          // Get the operator type for this codec
          const digest = connectionFilterOperatorsDigest(
            computedAttributeResource.codec
          );
          if (!digest) {
            continue;
          }

          const OperatorsType = build.getTypeByName(
            digest.operatorsTypeName
          );
          if (!OperatorsType) {
            continue;
          }

          // Check behavior
          if (
            !build.behavior.pgResourceMatches(
              computedAttributeResource,
              'filterBy'
            )
          ) {
            continue;
          }

          // Must have no required arguments beyond the first (the table row)
          const { argDetails } = build.pgGetArgDetailsFromParameters(
            computedAttributeResource,
            computedAttributeResource.parameters.slice(1)
          );
          if (argDetails.some((a: any) => a.required)) {
            continue;
          }

          // Derive the field name from the computed attribute function
          const fieldName = inflection.computedAttributeField({
            resource: computedAttributeResource,
          });

          const functionResultCodec = computedAttributeResource.codec;

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
                      PgCondition: any,
                      computedAttributeResource: any,
                      fieldName: string,
                      functionResultCodec: any
                    ) =>
                      function ($where: any, value: any) {
                        if (
                          typeof computedAttributeResource.from !==
                          'function'
                        ) {
                          throw new Error(`Unexpected...`);
                        }
                        if (value == null) return;

                        const expression =
                          computedAttributeResource.from({
                            placeholder: $where.alias,
                          });

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
            ''
          );
        }

        return fields;
      },
    },
  },
};
