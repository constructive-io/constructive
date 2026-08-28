/**
 * PostGraphile v5 Bucket Provisioner Preset
 *
 * Provides a convenient preset for including bucket provisioning support
 * in PostGraphile. Wraps the main plugin with sensible defaults.
 */

import type { GraphileConfig } from 'graphile-config';

import { createBucketProvisionerPlugin } from './plugin';
import type { BucketProvisionerPluginOptions } from './types';

/**
 * Creates a preset that includes the bucket reconciliation plugin.
 */
export function BucketProvisionerPreset(
  options: BucketProvisionerPluginOptions = {},
): GraphileConfig.Preset {
  return {
    plugins: [createBucketProvisionerPlugin(options)],
  };
}

export default BucketProvisionerPreset;
