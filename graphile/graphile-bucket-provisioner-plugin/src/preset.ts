/**
 * PostGraphile v5 Bucket Provisioner Preset
 *
 * Provides a convenient preset for including bucket provisioning support
 * in PostGraphile. Wraps the main plugin with sensible defaults.
 */

import type { GraphileConfig } from 'graphile-config';

import { createBucketProvisionerPlugin } from './plugin';

/**
 * Creates a preset that includes the bucket reconciliation plugin.
 */
export function BucketProvisionerPreset(): GraphileConfig.Preset {
  return {
    plugins: [createBucketProvisionerPlugin()],
  };
}

export default BucketProvisionerPreset;
