import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import type { ConnectionFilterOperatorSpec } from '../types';
import { $$filters } from '../types';
import { makeApplyFromOperatorSpec } from './operatorApply';

const version = '1.0.0';

/**
 * ConnectionFilterCustomOperatorsPlugin
 *
 * Processes declarative operator factories from the preset configuration.
 * Satellite plugins (PostGIS filter, search, pg_trgm, etc.) declare their
 * operators via `connectionFilterOperatorFactories` in their preset's schema
 * options. This plugin processes all factories during its own init hook,
 * populating the filter registry used at schema build time.
 *
 * This declarative approach replaces the previous imperative
 * `build.addConnectionFilterOperator()` API, eliminating timing/ordering
 * dependencies between plugins.
 *
 * @example
 * ```typescript
 * // In a satellite plugin's preset:
 * const MyPreset = {
 *   schema: {
 *     connectionFilterOperatorFactories: [
 *       (build) => [{
 *         typeNames: 'String',
 *         operatorName: 'myOp',
 *         spec: {
 *           description: 'My operator',
 *           resolve: (i, v) => build.sql`${i} OP ${v}`,
 *         },
 *       }],
 *     ],
 *   },
 * };
 * ```
 */
export const ConnectionFilterCustomOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterCustomOperatorsPlugin',
  version,
  description:
    'Processes declarative operator factories for custom filter operator registration',

  schema: {
    hooks: {
      build(build) {
        // Initialize the filter registry
        build[$$filters] = new Map<
          string,
          Map<string, ConnectionFilterOperatorSpec>
        >();

        return build;
      },

      init(_, build) {
        const { inflection } = build;
        const factories = build.options.connectionFilterOperatorFactories;

        if (!factories || !Array.isArray(factories) || factories.length === 0) {
          return _;
        }

        // Process each factory: call it with build, register all returned operators
        for (const factory of factories) {
          const registrations = factory(build);
          if (!registrations || !Array.isArray(registrations)) {
            continue;
          }

          for (const registration of registrations) {
            const { typeNames: typeNameOrNames, operatorName, spec } = registration;
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
              if (operatorSpecByFilterName.has(operatorName)) {
                throw new Error(
                  `Filter '${operatorName}' already registered on '${filterTypeName}'`
                );
              }
              operatorSpecByFilterName.set(operatorName, spec);
            }
          }
        }

        return _;
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
