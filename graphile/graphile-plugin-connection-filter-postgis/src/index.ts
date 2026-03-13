/**
 * PostGIS Connection Filter Plugin for PostGraphile v5
 *
 * Adds PostGIS spatial filter operators (ST_Contains, ST_Intersects, etc.)
 * to graphile-connection-filter via the declarative operator factory API.
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

// Factory function (for advanced use — the preset is the recommended entry point)
export { createPostgisOperatorFactory } from './plugin';

// Types
export type { PostgisFilterOperatorSpec, ResolvedFilterSpec } from './types';
