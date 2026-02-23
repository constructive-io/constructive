import type { GraphileConfig } from 'graphile-config';
import { PgConnectionArgFilterPostgisOperatorsPlugin } from './plugin';

/**
 * PostGIS Connection Filter Preset
 *
 * Adds PostGIS spatial filter operators to postgraphile-plugin-connection-filter.
 * Requires graphile-postgis and postgraphile-plugin-connection-filter to be loaded.
 *
 * @example
 * ```typescript
 * import { GraphilePostgisPreset } from 'graphile-postgis';
 * import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
 * import { PostgisConnectionFilterPreset } from 'graphile-plugin-connection-filter-postgis';
 *
 * const preset = {
 *   extends: [
 *     GraphilePostgisPreset,
 *     PostGraphileConnectionFilterPreset,
 *     PostgisConnectionFilterPreset
 *   ]
 * };
 * ```
 */
export const PostgisConnectionFilterPreset: GraphileConfig.Preset = {
  plugins: [PgConnectionArgFilterPostgisOperatorsPlugin]
};
