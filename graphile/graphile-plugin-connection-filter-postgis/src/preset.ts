import type { GraphileConfig } from 'graphile-config';
import { createPostgisOperatorFactory } from './plugin';

/**
 * PostGIS Connection Filter Preset
 *
 * Adds PostGIS spatial filter operators to graphile-connection-filter.
 * Requires graphile-postgis and graphile-connection-filter to be loaded.
 *
 * Operators are registered via the declarative `connectionFilterOperatorFactories`
 * API — no plugin with an `init` hook is needed. The factory dynamically
 * discovers PostGIS geometry/geography types at build time and generates
 * ST_ function-based and SQL operator-based filter operators.
 *
 * @example
 * ```typescript
 * import { GraphilePostgisPreset } from 'graphile-postgis';
 * import { ConnectionFilterPreset } from 'graphile-connection-filter';
 * import { PostgisConnectionFilterPreset } from 'graphile-plugin-connection-filter-postgis';
 *
 * const preset = {
 *   extends: [
 *     GraphilePostgisPreset,
 *     ConnectionFilterPreset(),
 *     PostgisConnectionFilterPreset
 *   ]
 * };
 * ```
 */
export const PostgisConnectionFilterPreset: GraphileConfig.Preset = {
  schema: {
    connectionFilterOperatorFactories: [
      createPostgisOperatorFactory(),
    ],
  },
};
