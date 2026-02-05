/**
 * PgConnectionArgFilterPlugin - Core filter type creation for PostGraphile v5
 *
 * This plugin is responsible for:
 * 1. Creating filter input types for each PostgreSQL table/resource (e.g., UserFilter)
 * 2. Creating operator types for each scalar type (e.g., StringFilter, IntFilter)
 * 3. Adding the `filter` argument to connection and list fields
 * 4. Computing operator digest information for each codec
 * 5. Providing utility functions like escapeLikeWildcards
 */

import type { PgCodec, PgSelectStep } from '@dataplan/pg';
import type { ConnectionStep } from 'grafast';
import { isInputType, isNamedType } from 'graphql';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import type { ConnectionFilterOperatorsDigest, OperatorsCategory } from './types';
import { makeAssertAllowed } from './utils';

// Augment GraphileBuild namespace to add our custom behaviors
declare global {
  namespace GraphileBuild {
    interface BehaviorStrings {
      filterProc: true;
      filter: true;
    }
  }
}

const version = '4.0.0';

/**
 * Checks if a codec is suitable for creating filter operators.
 * Excludes void, composite types (attributes), anonymous types, and polymorphic types.
 */
function isSuitableForFiltering(
  build: GraphileBuild.Build,
  codec: PgCodec<any, any, any, any, any, any, any>
): boolean {
  const { dataplanPg } = build;
  return (
    codec !== dataplanPg.TYPES.void &&
    !codec.attributes &&
    !codec.isAnonymous &&
    !codec.polymorphism &&
    (!codec.arrayOfCodec || isSuitableForFiltering(build, codec.arrayOfCodec)) &&
    (!codec.domainOfCodec || isSuitableForFiltering(build, codec.domainOfCodec))
  );
}

/**
 * PgConnectionArgFilterPlugin
 *
 * Core plugin that:
 * - Registers behavior for filter and filterProc
 * - Creates filter input types for tables
 * - Creates operator types (StringFilter, IntFilter, etc.)
 * - Adds `filter` argument to connection/list fields
 * - Provides connectionFilterOperatorsDigest and escapeLikeWildcards utilities
 */
export const PgConnectionArgFilterPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionArgFilterPlugin',
  version,
  // Ensure filters are applied before ordering (important for fulltext search)
  before: ['PgConnectionArgOrderByPlugin'],

  schema: {
    behaviorRegistry: {
      add: {
        filterProc: {
          description: 'Can this function be filtered?',
          entities: ['pgResource'],
        },
        filter: {
          description: 'Can this table be filtered?',
          entities: ['pgResource'],
        },
      },
    },

    entityBehavior: {
      pgCodec: 'filter',
      pgResource: {
        inferred(behavior, entity, build) {
          if (entity.parameters) {
            // Procedure sources aren't filterable by default (unless
            // connectionFilterSetofFunctions is set), but can be made filterable
            // by adding the `+filterProc` behavior.
            return [
              behavior,
              build.options.connectionFilterSetofFunctions
                ? 'filterProc'
                : '-filterProc',
            ];
          } else {
            return ['filter', behavior];
          }
        },
      },
    },

    hooks: {
      build(build) {
        const {
          inflection,
          options: { connectionFilterAllowedFieldTypes, connectionFilterArrays },
          EXPORTABLE,
        } = build;

        /**
         * Computes digest information for a codec to determine:
         * - The operator type name (e.g., "StringFilter")
         * - Whether it's a list type
         * - Input type names for range/domain types
         */
        build.connectionFilterOperatorsDigest = (
          codec: PgCodec<any, any, any, any, any, any, any>
        ): ConnectionFilterOperatorsDigest | null => {
          // Cast to full Build since we're called after build is complete
          const finalBuild = build as GraphileBuild.Build;
          const {
            dataplanPg: { getInnerCodec, TYPES, isEnumCodec },
          } = finalBuild;

          if (!isSuitableForFiltering(finalBuild, codec)) {
            return null;
          }

          // Get the simple type after removing array/range/domain wrappers
          const pgSimpleCodec = getInnerCodec(codec);
          if (!pgSimpleCodec) return null;
          if (
            pgSimpleCodec.polymorphism ||
            pgSimpleCodec.attributes ||
            pgSimpleCodec.isAnonymous
          ) {
            return null;
          }

          // The PG `json` type has no valid operators.
          // Skip filter type creation to allow the proper
          // operators to be exposed for PG `jsonb` types.
          if (pgSimpleCodec === TYPES.json) {
            return null;
          }

          // Establish field type and field input type
          const itemCodec = codec.arrayOfCodec ?? codec;
          const fieldTypeName = build.getGraphQLTypeNameByPgCodec(
            itemCodec,
            'output'
          );
          if (!fieldTypeName) {
            return null;
          }

          const fieldTypeMeta = build.getTypeMetaByName(fieldTypeName);
          if (!fieldTypeMeta) {
            return null;
          }

          const fieldInputTypeName = build.getGraphQLTypeNameByPgCodec(
            itemCodec,
            'input'
          );
          if (!fieldInputTypeName) return null;

          const fieldInputTypeMeta = build.getTypeMetaByName(fieldInputTypeName);
          if (!fieldInputTypeMeta) return null;

          // Avoid exposing filter operators on unrecognized types that
          // PostGraphile handles as Strings
          const namedTypeName = fieldTypeName;
          const namedInputTypeName = fieldInputTypeName;

          const actualStringCodecs = [
            TYPES.bpchar,
            TYPES.char,
            TYPES.name,
            TYPES.text,
            TYPES.varchar,
            TYPES.citext,
          ];

          if (
            namedInputTypeName === 'String' &&
            !actualStringCodecs.includes(pgSimpleCodec)
          ) {
            // Not a real string type? Skip.
            return null;
          }

          // Respect `connectionFilterAllowedFieldTypes` config option
          if (
            connectionFilterAllowedFieldTypes &&
            !connectionFilterAllowedFieldTypes.includes(namedTypeName)
          ) {
            return null;
          }

          // Determine the operator category
          const pgConnectionFilterOperatorsCategory: OperatorsCategory =
            codec.arrayOfCodec
              ? 'Array'
              : codec.rangeOfCodec
                ? 'Range'
                : isEnumCodec(codec)
                  ? 'Enum'
                  : codec.domainOfCodec
                    ? 'Domain'
                    : 'Scalar';

          // Respect `connectionFilterArrays` config option
          if (
            pgConnectionFilterOperatorsCategory === 'Array' &&
            !connectionFilterArrays
          ) {
            return null;
          }

          const rangeElementInputTypeName =
            codec.rangeOfCodec && !codec.rangeOfCodec.arrayOfCodec
              ? build.getGraphQLTypeNameByPgCodec(codec.rangeOfCodec, 'input')
              : null;

          const domainBaseTypeName =
            codec.domainOfCodec && !codec.domainOfCodec.arrayOfCodec
              ? build.getGraphQLTypeNameByPgCodec(codec.domainOfCodec, 'output')
              : null;

          const isList = !!(
            codec.arrayOfCodec ||
            codec.domainOfCodec?.arrayOfCodec ||
            codec.rangeOfCodec?.arrayOfCodec
          );

          const operatorsTypeName = isList
            ? inflection.filterFieldListType(namedTypeName)
            : inflection.filterFieldType(namedTypeName);

          return {
            isList,
            operatorsTypeName,
            relatedTypeName: namedTypeName,
            inputTypeName: fieldInputTypeName,
            rangeElementInputTypeName,
            domainBaseTypeName,
          };
        };

        /**
         * Escapes LIKE wildcards (% and _) in a string for safe use in LIKE patterns.
         */
        build.escapeLikeWildcards = EXPORTABLE(
          () =>
            function (input: unknown): string {
              if ('string' !== typeof input) {
                throw new Error(
                  'Non-string input was provided to escapeLikeWildcards'
                );
              } else {
                return input.split('%').join('\\%').split('_').join('\\_');
              }
            },
          []
        );

        return build;
      },

      init: {
        after: ['PgCodecs'],
        callback(_, build) {
          const { inflection } = build;

          // Create filter type for all column-having codecs (tables)
          for (const pgCodec of build.allPgCodecs) {
            if (!pgCodec.attributes) {
              continue;
            }

            const nodeTypeName = build.getGraphQLTypeNameByPgCodec(
              pgCodec,
              'output'
            );
            if (!nodeTypeName) {
              continue;
            }

            const filterTypeName = inflection.filterType(nodeTypeName);

            build.registerInputObjectType(
              filterTypeName,
              {
                pgCodec,
                isPgConnectionFilter: true,
              },
              () => ({
                description: `A filter to be used against \`${nodeTypeName}\` object types. All fields are combined with a logical 'and.'`,
              }),
              'PgConnectionArgFilterPlugin'
            );
          }

          // Create operator types (IntFilter, StringFilter, etc.)
          // Group codecs by their operator type name
          const codecsByFilterTypeName: Record<
            string,
            {
              isList: boolean;
              relatedTypeName: string;
              pgCodecs: PgCodec<any, any, any, any, any, any, any>[];
              inputTypeName: string;
              rangeElementInputTypeName: string | null;
              domainBaseTypeName: string | null;
            }
          > = {};

          for (const codec of build.allPgCodecs) {
            const digest = build.connectionFilterOperatorsDigest(codec);
            if (!digest) {
              continue;
            }

            const {
              isList,
              operatorsTypeName,
              relatedTypeName,
              inputTypeName,
              rangeElementInputTypeName,
              domainBaseTypeName,
            } = digest;

            if (!codecsByFilterTypeName[operatorsTypeName]) {
              codecsByFilterTypeName[operatorsTypeName] = {
                isList,
                relatedTypeName,
                pgCodecs: [codec],
                inputTypeName,
                rangeElementInputTypeName,
                domainBaseTypeName,
              };
            } else {
              // Validate consistency across codecs sharing the same operator type
              for (const key of [
                'isList',
                'relatedTypeName',
                'inputTypeName',
                'rangeElementInputTypeName',
              ] as const) {
                if (
                  digest[key] !== codecsByFilterTypeName[operatorsTypeName][key]
                ) {
                  throw new Error(
                    `${key} mismatch: existing codecs (${codecsByFilterTypeName[
                      operatorsTypeName
                    ].pgCodecs
                      .map((c) => c.name)
                      .join(', ')}) had ${key} = ${codecsByFilterTypeName[operatorsTypeName][key]}, but ${codec.name} instead has ${key} = ${digest[key]}`
                  );
                }
              }
              codecsByFilterTypeName[operatorsTypeName].pgCodecs.push(codec);
            }
          }

          // Register each operator type
          for (const [
            operatorsTypeName,
            {
              isList,
              relatedTypeName,
              pgCodecs,
              inputTypeName,
              rangeElementInputTypeName,
              domainBaseTypeName,
            },
          ] of Object.entries(codecsByFilterTypeName)) {
            build.registerInputObjectType(
              operatorsTypeName,
              {
                pgConnectionFilterOperators: {
                  isList,
                  pgCodecs,
                  inputTypeName,
                  rangeElementInputTypeName,
                  domainBaseTypeName,
                },
              },
              () => ({
                name: operatorsTypeName,
                description: `A filter to be used against ${relatedTypeName}${isList ? ' List' : ''} fields. All fields are combined with a logical 'and.'`,
              }),
              'PgConnectionArgFilterPlugin'
            );
          }

          return _;
        },
      },

      // Add `filter` input argument to connection and simple collection types
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

        const shouldAddFilter = isPgFieldConnection || isPgFieldSimpleCollection;
        if (!shouldAddFilter) return args;

        const codec = (pgFieldCodec ?? resource?.codec) as PgCodec<
          any,
          any,
          any,
          any,
          any,
          any,
          any
        > | null;
        if (!codec) return args;

        // Procedures get their own special behavior
        const desiredBehavior = resource?.parameters ? 'filterProc' : 'filter';

        if (
          resource
            ? !build.behavior.pgResourceMatches(resource, desiredBehavior)
            : !build.behavior.pgCodecMatches(codec, desiredBehavior)
        ) {
          return args;
        }

        const returnCodec = codec;
        const nodeType = build.getGraphQLTypeByPgCodec(returnCodec, 'output');
        if (!nodeType || !isNamedType(nodeType)) {
          return args;
        }

        const nodeTypeName = nodeType.name;
        const filterTypeName = inflection.filterType(nodeTypeName);
        const FilterType = build.getTypeByName(filterTypeName);
        if (!FilterType || !isInputType(FilterType)) {
          return args;
        }

        const assertAllowed = makeAssertAllowed(build);

        // For record-returning functions without attributes, use the codec directly
        const attributeCodec =
          resource?.parameters && !resource?.codec.attributes
            ? resource.codec
            : null;

        return extend(
          args,
          {
            filter: {
              description:
                'A filter to be used in determining which values should be returned by the collection.',
              type: FilterType,
              ...(isPgFieldConnection
                ? {
                    applyPlan: EXPORTABLE(
                      (
                        PgCondition: typeof import('@dataplan/pg').PgCondition,
                        assertAllowed: ReturnType<typeof makeAssertAllowed>,
                        attributeCodec: PgCodec<
                          any,
                          any,
                          any,
                          any,
                          any,
                          any,
                          any
                        > | null
                      ) =>
                        function (
                          _: any,
                          $connection: ConnectionStep<
                            any,
                            any,
                            PgSelectStep,
                            any
                          >,
                          fieldArg: any
                        ) {
                          const $pgSelect = $connection.getSubplan();
                          fieldArg.apply(
                            $pgSelect,
                            (queryBuilder: any, value: unknown) => {
                              assertAllowed(value, 'object');
                              if (value == null) return;
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
                      [PgCondition, assertAllowed, attributeCodec]
                    ),
                  }
                : {
                    applyPlan: EXPORTABLE(
                      (
                        PgCondition: typeof import('@dataplan/pg').PgCondition,
                        assertAllowed: ReturnType<typeof makeAssertAllowed>,
                        attributeCodec: PgCodec<
                          any,
                          any,
                          any,
                          any,
                          any,
                          any,
                          any
                        > | null
                      ) =>
                        function (
                          _: any,
                          $pgSelect: PgSelectStep,
                          fieldArg: any
                        ) {
                          fieldArg.apply(
                            $pgSelect,
                            (queryBuilder: any, value: unknown) => {
                              assertAllowed(value, 'object');
                              if (value == null) return;
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
                      [PgCondition, assertAllowed, attributeCodec]
                    ),
                  }),
            },
          },
          `Adding connection filter arg to field '${fieldName}' of '${Self.name}'`
        );
      },
    },
  },
};

export default PgConnectionArgFilterPlugin;
