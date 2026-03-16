import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import { makeAssertAllowed } from '../utils';

const version = '1.0.0';

/**
 * ConnectionFilterLogicalOperatorsPlugin
 *
 * Adds the `and`, `or`, and `not` logical operators to filter types.
 *
 * - `and`: [Filter!] - all conditions must match (uses $where.andPlan())
 * - `or`: [Filter!] - any condition must match (uses $where.orPlan())
 * - `not`: Filter - negates the condition (uses $where.notPlan())
 *
 * These are only added if the filter type has at least one other field
 * (to avoid creating useless logical-only filter types).
 */
export const ConnectionFilterLogicalOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterLogicalOperatorsPlugin',
  version,
  description: 'Adds and/or/not logical operators to connection filter types',

  schema: {
    hooks: {
      GraphQLInputObjectType_fields(fields, build, context) {
        const {
          extend,
          graphql: { GraphQLList, GraphQLNonNull },
          EXPORTABLE,
        } = build;
        const {
          fieldWithHooks,
          scope: { isPgConnectionFilter },
          Self,
        } = context;

        if (!isPgConnectionFilter) return fields;

        // Check runtime option — allows toggling without removing the plugin
        if (build.options.connectionFilterLogicalOperators === false) {
          return fields;
        }

        // Don't add logical operators if there are no other fields
        if (Object.keys(fields).length === 0) {
          return fields;
        }

        const assertAllowed = makeAssertAllowed(build);

        const logicalOperatorFields = {
          and: fieldWithHooks(
            {
              fieldName: 'and',
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: 'Checks for all expressions in this list.',
              type: new GraphQLList(new GraphQLNonNull(Self)),
              apply: EXPORTABLE(
                (assertAllowed: any) =>
                  function ($where: any, value: any) {
                    assertAllowed(value, 'list');
                    if (value == null) return;
                    const $and = $where.andPlan();
                    return $and;
                  },
                [assertAllowed]
              ),
            }
          ),
          or: fieldWithHooks(
            {
              fieldName: 'or',
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: 'Checks for any expressions in this list.',
              type: new GraphQLList(new GraphQLNonNull(Self)),
              apply: EXPORTABLE(
                (assertAllowed: any) =>
                  function ($where: any, value: any) {
                    assertAllowed(value, 'list');
                    if (value == null) return;
                    const $or = $where.orPlan();
                    // Each entry in the OR list should use AND internally
                    return () => $or.andPlan();
                  },
                [assertAllowed]
              ),
            }
          ),
          not: fieldWithHooks(
            {
              fieldName: 'not',
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: 'Negates the expression.',
              type: Self,
              apply: EXPORTABLE(
                (assertAllowed: any) =>
                  function ($where: any, value: any) {
                    assertAllowed(value, 'object');
                    if (value == null) return;
                    const $not = $where.notPlan();
                    const $and = $not.andPlan();
                    return $and;
                  },
                [assertAllowed]
              ),
            }
          ),
        };

        return extend(fields, logicalOperatorFields, '');
      },
    },
  },
};
