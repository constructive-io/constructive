/**
 * PostGraphile v5 Upload Plugin
 *
 * Provides file upload capabilities for PostGraphile v5 mutations.
 *
 * @example
 * ```typescript
 * import { UploadPlugin, UploadPreset } from 'graphile-upload-plugin';
 *
 * // Option 1: Use the preset (recommended)
 * const preset = {
 *   extends: [
 *     UploadPreset({
 *       uploadFieldDefinitions: [
 *         { tag: 'upload', resolve: myUploadResolver },
 *       ],
 *     }),
 *   ],
 * };
 *
 * // Option 2: Use the plugin directly
 * const plugin = UploadPlugin({
 *   uploadFieldDefinitions: [
 *     { tag: 'upload', resolve: myUploadResolver },
 *   ],
 * });
 * ```
 */

export { UploadPlugin, createUploadPlugin } from './plugin';
export { UploadPreset } from './preset';
export type {
  FileUpload,
  UploadFieldDefinition,
  UploadPluginInfo,
  UploadPluginOptions,
  UploadResolver
} from './types';
