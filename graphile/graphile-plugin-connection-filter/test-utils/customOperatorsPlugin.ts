/**
 * Custom operators plugin for v5 testing
 *
 * This plugin tests the `addConnectionFilterOperator` API by adding
 * custom filter operators for InternetAddress types.
 *
 * In v5, custom operators are registered during the 'init' phase using
 * `build.addConnectionFilterOperator(typeName, filterName, spec)` where
 * spec follows the OperatorSpec interface.
 */

import type { GraphileConfig } from 'graphile-build';
import type { SQL } from 'pg-sql2';

import type { OperatorSpec } from '../src/types';

const version = '1.0.0';

/**
 * CustomOperatorsPlugin
 *
 * Registers three custom filter operators for InternetAddress:
 *
 * 1. familyEqualTo - Tests basic custom operator with SQL function wrapping
 *    SQL: family(column) = value
 *
 * 2. familyNotEqualTo - Tests resolveSqlIdentifier option
 *    Uses resolveSqlIdentifier to wrap the column with family() function
 *    SQL: family(column) <> value
 *
 * 3. isV4 - Tests resolveInput option
 *    Transforms boolean input to 4 (true=IPv4) or 6 (false=IPv6)
 *    SQL: family(column) = 4 or family(column) = 6
 */
const CustomOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'CustomOperatorsPlugin',
  version,
  schema: {
    hooks: {
      init(_, build) {
        const {
          sql,
          addConnectionFilterOperator,
          dataplanPg: { TYPES },
        } = build;

        // familyEqualTo: Apply family() function in the resolve
        const familyEqualToSpec: OperatorSpec = {
          description: 'Address family equal to specified value.',
          resolveInputCodec: () => TYPES.int,
          resolve: (sqlIdentifier: SQL, sqlValue: SQL) =>
            sql`family(${sqlIdentifier}) = ${sqlValue}`,
        };
        addConnectionFilterOperator(
          'InternetAddress',
          'familyEqualTo',
          familyEqualToSpec
        );

        // familyNotEqualTo: Use resolveSqlIdentifier to wrap the column
        const familyNotEqualToSpec: OperatorSpec = {
          description: 'Address family not equal to specified value.',
          resolveInputCodec: () => TYPES.int,
          resolveSqlIdentifier: (sqlIdentifier: SQL, codec) => [
            sql`family(${sqlIdentifier})`,
            TYPES.int,
          ],
          resolve: (sqlIdentifier: SQL, sqlValue: SQL) =>
            sql`${sqlIdentifier} <> ${sqlValue}`,
        };
        addConnectionFilterOperator(
          'InternetAddress',
          'familyNotEqualTo',
          familyNotEqualToSpec
        );

        // isV4: Use resolveInput to transform boolean to family number
        const isV4Spec: OperatorSpec = {
          description:
            'Is IPv4 address (true) or IPv6 address (false).',
          resolveInputCodec: () => TYPES.boolean,
          resolveInput: (input: unknown) => (input === true ? 4 : 6),
          resolve: (sqlIdentifier: SQL, sqlValue: SQL) =>
            sql`family(${sqlIdentifier}) = ${sqlValue}`,
        };
        addConnectionFilterOperator('InternetAddress', 'isV4', isV4Spec);

        return _;
      },
    },
  },
};

export default CustomOperatorsPlugin;
