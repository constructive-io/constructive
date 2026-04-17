import type { GraphileConfig } from 'graphile-config';
import { PostgisCodecPlugin } from './plugins/codec';
import { PostgisInflectionPlugin } from './plugins/inflection';
import { PostgisExtensionDetectionPlugin } from './plugins/detect-extension';
import { PostgisRegisterTypesPlugin } from './plugins/register-types';
import { PostgisGeometryFieldsPlugin } from './plugins/geometry-fields';
import { PostgisMeasurementFieldsPlugin } from './plugins/measurement-fields';
import { PostgisTransformationFieldsPlugin } from './plugins/transformation-functions';
import { PostgisAggregatePlugin } from './plugins/aggregate-functions';
import { PostgisSpatialRelationsPlugin } from './plugins/spatial-relations';
import { createPostgisOperatorFactory } from './plugins/connection-filter-operators';
import { createWithinDistanceOperatorFactory } from './plugins/within-distance-operator';

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
 * - Measurement fields (area, length, perimeter on geometry types)
 * - Transformation fields (centroid, bbox, numPoints on geometry types)
 * - Aggregate function definitions (ST_Extent, ST_Union, ST_Collect, ST_ConvexHull)
 * - Connection filter operators (26 spatial operators + withinDistance via declarative factory API)
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
    PostgisGeometryFieldsPlugin,
    PostgisMeasurementFieldsPlugin,
    PostgisTransformationFieldsPlugin,
    PostgisAggregatePlugin,
    PostgisSpatialRelationsPlugin,
  ],
  schema: {
    // connectionFilterOperatorFactories is augmented by graphile-connection-filter
    connectionFilterOperatorFactories: [
      createPostgisOperatorFactory(),
      createWithinDistanceOperatorFactory(),
    ],
  } as GraphileConfig.Preset['schema'] & Record<string, unknown>,
};

export default GraphilePostgisPreset;
