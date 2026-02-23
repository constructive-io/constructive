/**
 * PostGIS Connection Filter Plugin for PostGraphile v5
 *
 * Adds PostGIS spatial filter operators (ST_Contains, ST_Intersects, etc.)
 * to postgraphile-plugin-connection-filter.
 *
 * @example
 * ```typescript
 * import { PostgisConnectionFilterPreset } from 'graphile-plugin-connection-filter-postgis';
 *
 * const preset = {
 *   extends: [PostgisConnectionFilterPreset]
 * };
 * ```
 */

// Preset (recommended entry point)
export { PostgisConnectionFilterPreset } from './preset';

// Plugin
export { PgConnectionArgFilterPostgisOperatorsPlugin } from './plugin';

// Types
export type { PostgisFilterOperatorSpec, ResolvedFilterSpec } from './types';
