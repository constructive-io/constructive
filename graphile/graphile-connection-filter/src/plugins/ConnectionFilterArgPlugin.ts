import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import { isEmpty } from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterArgPlugin
 *
 * Adds the `where` argument (name configurable via
 * `connectionFilterArgumentName`, default `'where'`) to connection and
 * simple collection fields. Uses `applyPlan` to create a PgCondition
 * that child filter fields can add WHERE clauses to.
 *
 * This runs before PgConnectionArgOrderByPlugin so that filters are applied
 * before ordering (important for e.g. full-text search rank ordering).
 */
export const ConnectionFilterArgPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterArgPlugin',
  version,
  description: 'Adds the `where` argument to connection and list fields',
  before: ['PgConnectionArgOrderByPlugin'],

  schema: {
    hooks: {
      GraphQLObjectType_fields_field_args(args, build, context) {
        const {
          extend,
          inflection,
          EXPORTABLE,
          dataplanPg: { PgCondition },
        } = build;
        const {
          scope: {
            isPgFieldConnection,
            isPgFieldSimpleCollection,
            pgFieldResource: resource,
            pgFieldCodec,
            fieldName,
          },
          Self,
        } = context;

        const shouldAddFilter =
          isPgFieldConnection || isPgFieldSimpleCollection;
        if (!shouldAddFilter) return args;

        const codec = pgFieldCodec ?? resource?.codec;
        if (!codec) return args;

        // Check behavior: procedures use "filterProc", tables use "filter"
        const desiredBehavior = resource?.parameters
          ? 'filterProc'
          : 'filter';
        if (
          resource
            ? !build.behavior.pgResourceMatches(resource, desiredBehavior)
            : !build.behavior.pgCodecMatches(codec, desiredBehavior)
        ) {
          return args;
        }

        const returnCodec = codec;
        const nodeType = build.getGraphQLTypeByPgCodec(
          returnCodec,
          'output'
        );
        if (!nodeType) return args;

        const nodeTypeName = nodeType.name;
        const filterTypeName = inflection.filterType(nodeTypeName);
        const FilterType = build.getTypeByName(filterTypeName);
        if (!FilterType) return args;

        // For setof functions returning scalars, track the codec
        const attributeCodec =
          resource?.parameters && !resource?.codec.attributes
            ? resource.codec
            : null;

        const argName =
          (build.options.connectionFilterArgumentName as string) || 'where';

        return extend(
          args,
          {
            [argName]: {
              description:
                'A filter to be used in determining which values should be returned by the collection.',
              type: FilterType,
              ...(isPgFieldConnection
                ? {
                    applyPlan: EXPORTABLE(
                      (
                        PgCondition: any,
                        isEmpty: any,
                        attributeCodec: any
                      ) =>
                        function (_: any, $connection: any, fieldArg: any) {
                          const $pgSelect = $connection.getSubplan();
                          fieldArg.apply(
                            $pgSelect,
                            (queryBuilder: any, value: any) => {
                              // If where is null/undefined or empty {}, treat as "no filter" — skip
                              if (value == null || isEmpty(value)) return;
                              const condition = new PgCondition(queryBuilder);
                              if (attributeCodec) {
                                condition.extensions.pgFilterAttribute = {
                                  codec: attributeCodec,
                                };
                              }
                              return condition;
                            }
                          );
                        },
                      [PgCondition, isEmpty, attributeCodec]
                    ),
                  }
                : {
                    applyPlan: EXPORTABLE(
                      (
                        PgCondition: any,
                        isEmpty: any,
                        attributeCodec: any
                      ) =>
                        function (_: any, $pgSelect: any, fieldArg: any) {
                          fieldArg.apply(
                            $pgSelect,
                            (queryBuilder: any, value: any) => {
                              // If where is null/undefined or empty {}, treat as "no filter" — skip
                              if (value == null || isEmpty(value)) return;
                              const condition = new PgCondition(queryBuilder);
                              if (attributeCodec) {
                                condition.extensions.pgFilterAttribute = {
                                  codec: attributeCodec,
                                };
                              }
                              return condition;
                            }
                          );
                        },
                      [PgCondition, isEmpty, attributeCodec]
                    ),
                  }),
            },
          },
          `Adding connection where arg '${argName}' to field '${fieldName}' of '${Self.name}'`
        );
      },
    },
  },
};
