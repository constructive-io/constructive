import type { GraphileConfig } from 'graphile-config';
import { PostgisCodecPlugin } from './plugins/codec';
import { PostgisInflectionPlugin } from './plugins/inflection';
import { PostgisExtensionDetectionPlugin } from './plugins/detect-extension';
import { PostgisRegisterTypesPlugin } from './plugins/register-types';
import { PostgisGeometryFieldsPlugin } from './plugins/geometry-fields';
import { createPostgisOperatorFactory } from './plugins/connection-filter-operators';

/**
 * GraphilePostgisPreset
 *
 * A preset that includes all PostGIS plugins for PostGraphile v5.
 * Use this as the recommended way to add PostGIS support.
 *
 * Includes:
 * - Geometry/geography type codecs and GeoJSON scalar
 * - PostGIS extension auto-detection
 * - PostGIS inflection (type names for subtypes, Z/M variants)
 * - Geometry field plugins (coordinates, GeoJSON output)
 * - Connection filter operators (26 spatial operators via declarative factory API)
 *
 * @example
 * ```typescript
 * import { GraphilePostgisPreset } from 'graphile-postgis';
 *
 * const preset = {
 *   extends: [GraphilePostgisPreset]
 * };
 * ```
 */
export const GraphilePostgisPreset: GraphileConfig.Preset = {
  plugins: [
    PostgisCodecPlugin,
    PostgisInflectionPlugin,
    PostgisExtensionDetectionPlugin,
    PostgisRegisterTypesPlugin,
    PostgisGeometryFieldsPlugin
  ],
  schema: {
    connectionFilterOperatorFactories: [
      createPostgisOperatorFactory(),
    ],
  },
};

export default GraphilePostgisPreset;
