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
export { PostgisAggregatePlugin } from './plugins/aggregate-functions';
export { PostgisCodecPlugin } from './plugins/codec';
export { PostgisExtensionDetectionPlugin } from './plugins/detect-extension';
export { PostgisGeometryFieldsPlugin } from './plugins/geometry-fields';
export { PostgisInflectionPlugin } from './plugins/inflection';
export { PostgisMeasurementFieldsPlugin } from './plugins/measurement-fields';
export { PostgisRegisterTypesPlugin } from './plugins/register-types';
export type {
  SpatialOperatorRegistration,
  SpatialRelationInfo,
} from './plugins/spatial-relations';
export {
  collectSpatialRelations,
  OPERATOR_REGISTRY,
  parseSpatialRelationTag,
  PostgisSpatialRelationsPlugin,
} from './plugins/spatial-relations';
export { PostgisTransformationFieldsPlugin } from './plugins/transformation-functions';

// Connection filter operator factories (spatial operators for graphile-connection-filter)
export { createPostgisOperatorFactory } from './plugins/connection-filter-operators';
export { createWithinDistanceOperatorFactory } from './plugins/within-distance-operator';

// Constants and utilities
export { CONCRETE_SUBTYPES,GIS_SUBTYPE_NAME, GisSubtype, SUBTYPE_STRING_BY_SUBTYPE } from './constants';
export { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from './utils';

// Types
export type { PostgisExtensionInfo } from './plugins/detect-extension';
export type { GisFieldValue,GisTypeDetails } from './types';
