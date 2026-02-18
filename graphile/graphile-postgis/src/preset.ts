import type { GraphileConfig } from 'graphile-config';
import { PostgisCodecPlugin } from './plugins/codec';
import { PostgisInflectionPlugin } from './plugins/inflection';
import { PostgisExtensionDetectionPlugin } from './plugins/detect-extension';
import { PostgisRegisterTypesPlugin } from './plugins/register-types';
import { PostgisGeometryFieldsPlugin } from './plugins/geometry-fields';

/**
 * GraphilePostgisPreset
 *
 * A preset that includes all PostGIS plugins for PostGraphile v5.
 * Use this as the recommended way to add PostGIS support.
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
  ]
};

export default GraphilePostgisPreset;
