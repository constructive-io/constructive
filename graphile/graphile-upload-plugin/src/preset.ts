/**
 * PostGraphile v5 Upload Preset
 *
 * Provides a convenient preset for including upload support in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { UploadPluginOptions } from './types';
import { createUploadPlugin } from './plugin';

/**
 * Creates a preset that includes the upload plugin with the given options.
 *
 * @example
 * ```typescript
 * import { UploadPreset } from 'graphile-upload-plugin';
 *
 * const preset = {
 *   extends: [
 *     UploadPreset({
 *       uploadFieldDefinitions: [
 *         {
 *           tag: 'upload',
 *           resolve: async (upload, args, context, info) => {
 *             // Process the upload and return the value to store in the column
 *             const stream = upload.createReadStream();
 *             const url = await uploadToStorage(stream, upload.filename);
 *             return url;
 *           },
 *         },
 *       ],
 *     }),
 *   ],
 * };
 * ```
 */
export function UploadPreset(
  options: UploadPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createUploadPlugin(options)]
  };
}

export default UploadPreset;
