/**
 * PgConnectionArgFilterLogicalOperatorsPlugin for Graphile v5
 *
 * This plugin adds logical operator fields (and, or, not) to filter input types.
 * These operators allow combining multiple filter conditions:
 *
 * - `and`: All conditions in the array must be true (AND)
 * - `or`: At least one condition in the array must be true (OR)
 * - `not`: The condition must be false (NOT)
 *
 * Example usage:
 * ```graphql
 * query {
 *   allUsers(filter: {
 *     and: [
 *       { firstName: { startsWith: "J" } },
 *       { or: [
 *         { age: { greaterThan: 18 } },
 *         { isVerified: { equalTo: true } }
 *       ]}
 *     ]
 *   }) {
 *     nodes { id firstName }
 *   }
 * }
 * ```
 *
 * v5 Migration Notes:
 * - Uses `GraphQLInputObjectType_fields` hook
 * - Uses `EXPORTABLE()` wrapper for tree-shaking support
 * - Uses `PgCondition` methods: `andPlan()`, `orPlan()`, `notPlan()`
 * - Logical operators are controlled by `connectionFilterLogicalOperators` option
 */

import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';

import { makeAssertAllowed } from './utils';

const version = '4.0.0';

/**
 * PgConnectionArgFilterLogicalOperatorsPlugin
 *
 * Adds `and`, `or`, and `not` logical operator fields to filter input types.
 */
export const PgConnectionArgFilterLogicalOperatorsPlugin: GraphileConfig.Plugin =
  {
    name: 'PgConnectionArgFilterLogicalOperatorsPlugin',
    version,

    schema: {
      hooks: {
        GraphQLInputObjectType_fields(fields, build, context) {
          const {
            extend,
            graphql: { GraphQLList, GraphQLNonNull },
            options: { connectionFilterLogicalOperators },
            EXPORTABLE,
          } = build;

          const {
            fieldWithHooks,
            scope: { isPgConnectionFilter },
            Self,
          } = context;

          // Only process filter types
          if (!isPgConnectionFilter) {
            return fields;
          }

          // Skip if logical operators are disabled
          if (!connectionFilterLogicalOperators) {
            return fields;
          }

          // Skip if this filter type has no fields yet
          // (logical operators alone would be meaningless)
          if (Object.keys(fields).length === 0) {
            return fields;
          }

          // Create the assertion function for validating input
          const assertAllowed = makeAssertAllowed(build);

          const logicalOperatorFields = {
            and: fieldWithHooks(
              {
                fieldName: 'and',
                isPgConnectionFilterOperatorLogical: true,
              },
              {
                description: `Checks for all expressions in this list.`,
                type: new GraphQLList(new GraphQLNonNull(Self)),
                apply: EXPORTABLE(
                  (assertAllowed) =>
                    function apply($where: any, value: unknown) {
                      assertAllowed(value, 'list');
                      if (value == null) {
                        return;
                      }
                      // Create an AND plan - all children will be ANDed together
                      const $and = $where.andPlan();
                      // Return the AND plan for nested filter processing
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
                description: `Checks for any expressions in this list.`,
                type: new GraphQLList(new GraphQLNonNull(Self)),
                apply: EXPORTABLE(
                  (assertAllowed) =>
                    function apply($where: any, value: unknown) {
                      assertAllowed(value, 'list');
                      if (value == null) {
                        return;
                      }
                      // Create an OR plan - entries will be ORed together
                      const $or = $where.orPlan();
                      // Return a function that creates an AND plan for each entry
                      // This ensures each entry in the OR list can have multiple conditions
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
                description: `Negates the expression.`,
                type: Self,
                apply: EXPORTABLE(
                  (assertAllowed) =>
                    function apply($where: any, value: unknown) {
                      assertAllowed(value, 'object');
                      if (value == null) {
                        return;
                      }
                      // Create a NOT plan, then AND for the conditions inside
                      const $not = $where.notPlan();
                      const $and = $not.andPlan();
                      return $and;
                    },
                  [assertAllowed]
                ),
              }
            ),
          };

          return extend(
            fields,
            logicalOperatorFields,
            'Adding logical operator fields (and, or, not)'
          );
        },
      },
    },
  };

export default PgConnectionArgFilterLogicalOperatorsPlugin;
