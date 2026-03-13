/**
 * graphile-connection-filter
 *
 * A PostGraphile v5 native connection filter plugin.
 * Adds advanced filtering capabilities to connection and list fields.
 *
 * @example
 * ```typescript
 * import { ConnectionFilterPreset } from 'graphile-connection-filter';
 *
 * const preset = {
 *   extends: [
 *     ConnectionFilterPreset(),
 *   ],
 * };
 * ```
 *
 * For satellite plugins that need to register custom operators:
 * ```typescript
 * // In your plugin's init hook:
 * if (typeof build.addConnectionFilterOperator === 'function') {
 *   build.addConnectionFilterOperator('MyType', 'myOperator', {
 *     description: 'My custom operator',
 *     resolve: (sqlIdentifier, sqlValue) => sql`${sqlIdentifier} OP ${sqlValue}`,
 *   });
 * }
 * ```
 *
 * For satellite plugins that need to access the query builder from a filter apply:
 * ```typescript
 * import { getQueryBuilder } from 'graphile-connection-filter';
 * // In your filter field's apply callback:
 * const qb = getQueryBuilder(build, $condition);
 * if (qb) {
 *   const idx = qb.selectAndReturnIndex(sql`...`);
 *   qb.setMeta('key', { selectIndex: idx });
 * }
 * ```
 */

export { ConnectionFilterPreset } from './preset';

// Re-export all plugins for granular use
export {
  ConnectionFilterInflectionPlugin,
  ConnectionFilterTypesPlugin,
  ConnectionFilterArgPlugin,
  ConnectionFilterAttributesPlugin,
  ConnectionFilterOperatorsPlugin,
  ConnectionFilterCustomOperatorsPlugin,
  ConnectionFilterLogicalOperatorsPlugin,
  ConnectionFilterComputedAttributesPlugin,
  ConnectionFilterForwardRelationsPlugin,
  ConnectionFilterBackwardRelationsPlugin,
  makeApplyFromOperatorSpec,
} from './plugins';

// Re-export types
export type {
  ConnectionFilterOperatorSpec,
  ConnectionFilterOptions,
  ConnectionFilterOperatorsDigest,
  PgConnectionFilterOperatorsScope,
} from './types';
export { $$filters } from './types';

// Re-export utilities
export {
  isEmpty,
  makeAssertAllowed,
  getQueryBuilder,
  isComputedScalarAttributeResource,
  getComputedAttributeResources,
} from './utils';
