import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import type { ConnectionFilterOperatorSpec } from '../types';
import { $$filters } from '../types';
import { makeApplyFromOperatorSpec } from './operatorApply';

const version = '1.0.0';

/**
 * ConnectionFilterCustomOperatorsPlugin
 *
 * Provides the `addConnectionFilterOperator` API on the build object.
 * Satellite plugins (PostGIS filter, search, pgvector, textsearch) call this
 * during the `init` hook to register custom filter operators.
 *
 * API contract (must be preserved for compatibility):
 *   build.addConnectionFilterOperator(
 *     typeNameOrNames: string | string[],
 *     filterName: string,
 *     spec: ConnectionFilterOperatorSpec
 *   )
 */
export const ConnectionFilterCustomOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterCustomOperatorsPlugin',
  version,
  description:
    'Provides the addConnectionFilterOperator API for custom operator registration',

  schema: {
    hooks: {
      build(build) {
        const { inflection } = build;

        // Initialize the filter registry
        build[$$filters] = new Map<
          string,
          Map<string, ConnectionFilterOperatorSpec>
        >();

        // The public API that satellite plugins call
        build.addConnectionFilterOperator = (
          typeNameOrNames: string | string[],
          filterName: string,
          spec: ConnectionFilterOperatorSpec
        ) => {
          if (
            !build.status.isBuildPhaseComplete ||
            build.status.isInitPhaseComplete
          ) {
            throw new Error(
              "addConnectionFilterOperator may only be called during the 'init' phase"
            );
          }

          const typeNames = Array.isArray(typeNameOrNames)
            ? typeNameOrNames
            : [typeNameOrNames];

          for (const typeName of typeNames) {
            const filterTypeName = inflection.filterFieldType(typeName);
            let operatorSpecByFilterName = build[$$filters].get(filterTypeName);
            if (!operatorSpecByFilterName) {
              operatorSpecByFilterName = new Map();
              build[$$filters].set(filterTypeName, operatorSpecByFilterName);
            }
            if (operatorSpecByFilterName.has(filterName)) {
              throw new Error(
                `Filter '${filterName}' already registered on '${filterTypeName}'`
              );
            }
            operatorSpecByFilterName.set(filterName, spec);
          }
        };

        return build;
      },

      /**
       * Applies custom operators to their respective filter types.
       * When a type like "StringFilter" has custom operators registered,
       * they are added as fields with apply functions.
       */
      GraphQLInputObjectType_fields(inFields, build, context) {
        let fields = inFields;

        const {
          scope: { pgConnectionFilterOperators },
          Self,
          fieldWithHooks,
        } = context;

        if (!pgConnectionFilterOperators) {
          return fields;
        }

        const operatorSpecByFilterName = build[$$filters].get(Self.name);
        if (!operatorSpecByFilterName) {
          return fields;
        }

        const { inputTypeName } = pgConnectionFilterOperators;
        const fieldInputType = build.getTypeByName(inputTypeName);
        if (!fieldInputType) {
          return fields;
        }

        for (const [filterName, spec] of operatorSpecByFilterName.entries()) {
          const { description, resolveInputCodec, resolveType } = spec;

          const firstCodec = pgConnectionFilterOperators.pgCodecs[0];
          const inputCodec = resolveInputCodec
            ? resolveInputCodec(firstCodec)
            : firstCodec;

          const codecGraphQLType = build.getGraphQLTypeByPgCodec(
            inputCodec,
            'input'
          );
          if (!codecGraphQLType) {
            continue;
          }

          const type = resolveType
            ? resolveType(codecGraphQLType)
            : codecGraphQLType;

          fields = build.extend(
            fields,
            {
              [filterName]: fieldWithHooks(
                {
                  fieldName: filterName,
                  isPgConnectionFilterOperator: true,
                },
                {
                  description,
                  type,
                  apply: makeApplyFromOperatorSpec(
                    build,
                    Self.name,
                    filterName,
                    spec,
                    type
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
