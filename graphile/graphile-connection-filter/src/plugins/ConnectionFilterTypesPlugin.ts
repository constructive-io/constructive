import '../augmentations';
import type { GraphileConfig } from 'graphile-config';

const version = '1.0.0';

/**
 * Determines if a codec is suitable for scalar/enum/domain/array filtering.
 * Excludes void, composite types, anonymous types, and polymorphic types.
 */
function isSuitableForFiltering(build: any, codec: any): boolean {
  return (
    codec !== build.dataplanPg.TYPES.void &&
    !codec.attributes &&
    !codec.isAnonymous &&
    !codec.polymorphism &&
    (!codec.arrayOfCodec || isSuitableForFiltering(build, codec.arrayOfCodec)) &&
    (!codec.domainOfCodec || isSuitableForFiltering(build, codec.domainOfCodec))
  );
}

/**
 * ConnectionFilterTypesPlugin
 *
 * Registers the filter types in the schema:
 * 1. Per-table filter types (e.g. UserFilter) - registered for every codec with attributes
 * 2. Per-scalar operator types (e.g. StringFilter, IntFilter) - registered for each scalar type
 *
 * Also adds `connectionFilterOperatorsDigest` and `escapeLikeWildcards` to the build object.
 */
export const ConnectionFilterTypesPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterTypesPlugin',
  version,
  description: 'Registers connection filter input types for tables and scalars',

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
        inferred(behavior: any, entity: any, build: any) {
          if (entity.parameters) {
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
          options: {
            connectionFilterAllowedFieldTypes,
            connectionFilterArrays,
          },
          EXPORTABLE,
        } = build;

        // Add connectionFilterOperatorsDigest to the build object
        build.connectionFilterOperatorsDigest = (codec: any) => {
          const finalBuild = build;
          const {
            dataplanPg: { getInnerCodec, TYPES, isEnumCodec },
          } = finalBuild;

          if (!isSuitableForFiltering(finalBuild, codec)) {
            return null;
          }

          // Unwrap to the simple type
          const pgSimpleCodec = getInnerCodec(codec);
          if (!pgSimpleCodec) return null;
          if (
            pgSimpleCodec.polymorphism ||
            pgSimpleCodec.attributes ||
            pgSimpleCodec.isAnonymous
          ) {
            return null;
          }

          // json type has no valid operators (use jsonb instead)
          if (pgSimpleCodec === TYPES.json) {
            return null;
          }

          const itemCodec = codec.arrayOfCodec ?? codec;
          const fieldTypeName = build.getGraphQLTypeNameByPgCodec(
            itemCodec,
            'output'
          );
          if (!fieldTypeName) return null;

          const fieldTypeMeta = build.getTypeMetaByName(fieldTypeName);
          if (!fieldTypeMeta) return null;

          const fieldInputTypeName = build.getGraphQLTypeNameByPgCodec(
            itemCodec,
            'input'
          );
          if (!fieldInputTypeName) return null;

          const fieldInputTypeMeta = build.getTypeMetaByName(fieldInputTypeName);
          if (!fieldInputTypeMeta) return null;

          // Skip unrecognized types that PostGraphile maps to String
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
            return null;
          }

          // Respect connectionFilterAllowedFieldTypes
          if (
            connectionFilterAllowedFieldTypes &&
            !connectionFilterAllowedFieldTypes.includes(namedTypeName)
          ) {
            return null;
          }

          // Respect connectionFilterArrays
          const isArray = !!codec.arrayOfCodec;
          if (isArray && !connectionFilterArrays) {
            return null;
          }

          const listType = !!(
            codec.arrayOfCodec ||
            codec.domainOfCodec?.arrayOfCodec ||
            codec.rangeOfCodec?.arrayOfCodec
          );

          const operatorsTypeName = listType
            ? inflection.filterFieldListType(namedTypeName)
            : inflection.filterFieldType(namedTypeName);

          const rangeElementInputTypeName =
            codec.rangeOfCodec && !codec.rangeOfCodec.arrayOfCodec
              ? build.getGraphQLTypeNameByPgCodec(codec.rangeOfCodec, 'input')
              : null;

          const domainBaseTypeName =
            codec.domainOfCodec && !codec.domainOfCodec.arrayOfCodec
              ? build.getGraphQLTypeNameByPgCodec(
                  codec.domainOfCodec,
                  'output'
                )
              : null;

          return {
            isList: listType,
            operatorsTypeName,
            relatedTypeName: namedTypeName,
            inputTypeName: fieldInputTypeName,
            rangeElementInputTypeName,
            domainBaseTypeName,
          };
        };

        // Add escapeLikeWildcards helper
        build.escapeLikeWildcards = EXPORTABLE(
          () =>
            function (input: unknown): string {
              if ('string' !== typeof input) {
                throw new Error(
                  'Non-string input was provided to escapeLikeWildcards'
                );
              }
              return input.split('%').join('\\%').split('_').join('\\_');
            },
          []
        );

        return build;
      },

      init: {
        after: ['PgCodecs'],
        callback(_, build) {
          const { inflection } = build;

          // Register per-table filter types (e.g. UserFilter)
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
              'ConnectionFilterTypesPlugin'
            );
          }

          // Register per-scalar operator types (e.g. StringFilter, IntFilter)
          const codecsByFilterTypeName: Record<
            string,
            {
              isList: boolean;
              relatedTypeName: string;
              pgCodecs: any[];
              inputTypeName: string;
              rangeElementInputTypeName: string | null;
              domainBaseTypeName: string | null;
            }
          > = {};

          for (const codec of build.allPgCodecs) {
            const digest = build.connectionFilterOperatorsDigest(codec);
            if (!digest) continue;

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
              // Validate consistency
              for (const key of [
                'isList',
                'relatedTypeName',
                'inputTypeName',
                'rangeElementInputTypeName',
              ] as const) {
                if (
                  (digest as any)[key] !==
                  (codecsByFilterTypeName[operatorsTypeName] as any)[key]
                ) {
                  throw new Error(
                    `${key} mismatch: existing codecs (${codecsByFilterTypeName[
                      operatorsTypeName
                    ].pgCodecs
                      .map((c: any) => c.name)
                      .join(', ')}) had ${key} = ${
                      (codecsByFilterTypeName[operatorsTypeName] as any)[key]
                    }, but ${codec.name} instead has ${key} = ${
                      (digest as any)[key]
                    }`
                  );
                }
              }
              codecsByFilterTypeName[operatorsTypeName].pgCodecs.push(codec);
            }
          }

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
                description: `A filter to be used against ${relatedTypeName}${
                  isList ? ' List' : ''
                } fields. All fields are combined with a logical 'and.'`,
              }),
              'ConnectionFilterTypesPlugin'
            );
          }

          return _;
        },
      },
    },
  },
};
