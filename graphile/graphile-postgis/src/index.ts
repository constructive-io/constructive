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

// Constants and utilities
export { GisSubtype, SUBTYPE_STRING_BY_SUBTYPE, GIS_SUBTYPE_NAME, CONCRETE_SUBTYPES } from './constants';
export { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from './utils';

// Types
export type { GisTypeDetails, GisFieldValue, PostgisCodecInfo } from './types';
export type { PostgisExtensionInfo } from './plugins/detect-extension';
