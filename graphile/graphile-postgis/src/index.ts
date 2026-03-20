/**
 * PostGraphile v5 PostGIS Plugin
 *
 * Provides PostGIS geometry/geography type support for PostGraphile v5.
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

// Preset (recommended entry point)
export { GraphilePostgisPreset } from './preset';

// Individual plugins
export { PostgisCodecPlugin } from './plugins/codec';
export { PostgisInflectionPlugin } from './plugins/inflection';
export { PostgisExtensionDetectionPlugin } from './plugins/detect-extension';
export { PostgisRegisterTypesPlugin } from './plugins/register-types';
export { PostgisGeometryFieldsPlugin } from './plugins/geometry-fields';
export { PostgisMeasurementFieldsPlugin } from './plugins/measurement-fields';
export { PostgisTransformationFieldsPlugin } from './plugins/transformation-functions';
export { PostgisAggregatePlugin } from './plugins/aggregate-functions';

// Connection filter operator factories (spatial operators for graphile-connection-filter)
export { createPostgisOperatorFactory } from './plugins/connection-filter-operators';
export { createWithinDistanceOperatorFactory } from './plugins/within-distance-operator';

// Constants and utilities
export { GisSubtype, SUBTYPE_STRING_BY_SUBTYPE, GIS_SUBTYPE_NAME, CONCRETE_SUBTYPES } from './constants';
export { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from './utils';

// Types
export type { GisTypeDetails, GisFieldValue } from './types';
export type { PostgisExtensionInfo } from './plugins/detect-extension';
