/**
 * Bucket Provisioner Plugin for PostGraphile v5
 *
 * Provides an explicit `provisionBucket` reconciliation enqueue mutation for
 * PostGraphile v5.
 */

export { BucketProvisionerPlugin, createBucketProvisionerPlugin } from './plugin';
export { BucketProvisionerPreset } from './preset';
export type {
  BucketProvisionerPluginOptions,
  ProvisionBucketInput,
  ProvisionBucketPayload,
} from './types';
