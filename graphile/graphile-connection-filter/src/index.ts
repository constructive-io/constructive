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
 * For satellite plugins that need to register custom operators, declare them
 * as factories in the preset's `connectionFilterOperatorFactories` option:
 * ```typescript
 * import type { ConnectionFilterOperatorFactory } from 'graphile-connection-filter';
 *
 * const myOperatorFactory: ConnectionFilterOperatorFactory = (build) => [{
 *   typeNames: 'MyType',
 *   operatorName: 'myOperator',
 *   spec: {
 *     description: 'My custom operator',
 *     resolve: (sqlIdentifier, sqlValue) => build.sql`${sqlIdentifier} OP ${sqlValue}`,
 *   },
 * }];
 *
 * export const MyPreset = {
 *   schema: {
 *     connectionFilterOperatorFactories: [myOperatorFactory],
 *   },
 *   plugins: [MyPlugin],
 * };
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
  ConnectionFilterOperatorRegistration,
  ConnectionFilterOperatorFactory,
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
