/**
 * Shared interfaces and symbols for graphile-plugin-connection-filter v5
 *
 * This file contains runtime values (symbols) and types that need to be
 * shared across multiple plugin files.
 */

/**
 * Categories of filter operators based on PostgreSQL type characteristics.
 *
 * - "Array": For PostgreSQL array types (e.g., integer[], text[])
 * - "Range": For PostgreSQL range types (e.g., int4range, tsrange)
 * - "Enum": For PostgreSQL enum types
 * - "Domain": For PostgreSQL domain types
 * - "Scalar": For basic scalar types (e.g., integer, text, boolean)
 */
export type OperatorsCategory = 'Array' | 'Range' | 'Enum' | 'Domain' | 'Scalar';

/**
 * Symbol used to store filter operator specifications on the build object.
 *
 * This symbol is used as a key in `build[$$filters]` to store a Map of
 * filter type names to their operator specifications. This allows plugins
 * to register custom operators that will be added to filter types.
 *
 * @example
 * ```ts
 * // In a plugin's build hook:
 * build[$$filters] = new Map();
 *
 * // Later, in init phase:
 * build.addConnectionFilterOperator('String', 'customOp', {
 *   description: 'Custom operator',
 *   resolve: (i, v) => sql`custom_fn(${i}, ${v})`,
 * });
 * ```
 */
export const $$filters: unique symbol = Symbol('filters');
