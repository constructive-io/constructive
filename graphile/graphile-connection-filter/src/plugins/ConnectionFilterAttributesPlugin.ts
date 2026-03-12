import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import { isEmpty } from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterAttributesPlugin
 *
 * Adds per-column filter fields to the table filter types.
 * For example, on `UserFilter`, adds fields like `name` (type: StringFilter),
 * `age` (type: IntFilter), etc.
 *
 * Each field's `apply` function creates a new PgCondition with the
 * `pgFilterAttribute` extension set, so downstream operator fields know
 * which column they are operating on.
 */
export const ConnectionFilterAttributesPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterAttributesPlugin',
  version,
  description: 'Adds column-based filter fields to connection filter types',

  schema: {
    entityBehavior: {
      pgCodecAttribute: 'attribute:filterBy',
    },

    hooks: {
      GraphQLInputObjectType_fields(inFields, build, context) {
        let fields = inFields;

        const {
          inflection,
          connectionFilterOperatorsDigest,
          dataplanPg: { PgCondition },
          EXPORTABLE,
        } = build;
        const {
          fieldWithHooks,
          scope: { pgCodec: rawCodec, isPgConnectionFilter },
        } = context;

        if (!isPgConnectionFilter || !rawCodec || !rawCodec.attributes) {
          return fields;
        }

        const codec = rawCodec as any;

        for (const [attributeName, attribute] of Object.entries(
          codec.attributes as Record<string, any>
        )) {
          if (
            !build.behavior.pgCodecAttributeMatches(
              [codec, attributeName],
              'attribute:filterBy'
            )
          ) {
            continue;
          }

          const fieldName = inflection.attribute({ codec: codec as any, attributeName });
          const colSpec = { fieldName, attributeName, attribute };

          const digest = connectionFilterOperatorsDigest(attribute.codec);
          if (!digest) continue;

          const OperatorsType = build.getTypeByName(digest.operatorsTypeName);
          if (!OperatorsType) continue;

          const {
            connectionFilterAllowEmptyObjectInput,
            connectionFilterAllowNullInput,
          } = build.options;

          fields = build.extend(
            fields,
            {
              [fieldName]: fieldWithHooks(
                {
                  fieldName,
                  isPgConnectionFilterField: true,
                },
                () => ({
                  description: `Filter by the object\u2019s \`${fieldName}\` field.`,
                  type: OperatorsType,
                  apply: EXPORTABLE(
                    (
                      PgCondition: any,
                      colSpec: any,
                      connectionFilterAllowEmptyObjectInput: boolean,
                      connectionFilterAllowNullInput: boolean,
                      isEmpty: (o: unknown) => boolean
                    ) =>
                      function (queryBuilder: any, value: any) {
                        if (value === undefined) {
                          return;
                        }
                        if (
                          !connectionFilterAllowEmptyObjectInput &&
                          isEmpty(value)
                        ) {
                          throw Object.assign(
                            new Error(
                              'Empty objects are forbidden in filter argument input.'
                            ),
                            {}
                          );
                        }
                        if (
                          !connectionFilterAllowNullInput &&
                          value === null
                        ) {
                          throw Object.assign(
                            new Error(
                              'Null literals are forbidden in filter argument input.'
                            ),
                            {}
                          );
                        }
                        const condition = new PgCondition(queryBuilder);
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
            'Adding attribute-based filtering'
          );
        }

        return fields;
      },
    },
  },
};
