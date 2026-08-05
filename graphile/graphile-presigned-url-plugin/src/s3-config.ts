import type {
  PresignedUrlPluginOptions,
  S3Config,
  StorageModuleConfig,
} from './types';
import type { StorageModuleCacheScope } from './storage-module-cache';

const s3ConfigsByBuild = new WeakMap<
  StorageModuleCacheScope,
  WeakMap<PresignedUrlPluginOptions, S3Config>
>();

/**
 * Resolve the current runtime's S3 configuration without mutating the shared
 * preset options. A preset may be reused by several Graphile builds, so
 * memoizing the first getter result here would bind later builds to it.
 */
export function resolveS3Config(
  options: PresignedUrlPluginOptions,
  cacheScope: StorageModuleCacheScope,
): S3Config {
  if (typeof options.s3 !== 'function') {
    return options.s3;
  }

  let configsForBuild = s3ConfigsByBuild.get(cacheScope);
  if (!configsForBuild) {
    configsForBuild = new WeakMap<PresignedUrlPluginOptions, S3Config>();
    s3ConfigsByBuild.set(cacheScope, configsForBuild);
  }

  const cached = configsForBuild.get(options);
  if (cached) {
    return cached;
  }

  const resolved = options.s3();
  configsForBuild.set(options, resolved);
  return resolved;
}

/**
 * Mint a physical bucket name for a bucket that has never been provisioned.
 *
 * This deliberately matches graphile-bucket-provisioner-plugin's resolver
 * contract: logical bucket key first, database ID second. Callers must persist
 * the result and use the stored physical_name for every later operation.
 */
export function mintPhysicalBucketName(
  options: PresignedUrlPluginOptions,
  bucketKey: string,
  databaseId: string,
  cacheScope: StorageModuleCacheScope,
): string {
  const base = resolveS3Config(options, cacheScope);
  return options.resolveBucketName
    ? options.resolveBucketName(bucketKey, databaseId)
    : base.bucket;
}

/**
 * Build an S3 config for a persisted physical coordinate.
 *
 * No naming resolver is consulted here: physical_name is authoritative once
 * recorded, even if naming policy or environment configuration later changes.
 */
export function resolveS3ConfigForPhysicalBucket(
  options: PresignedUrlPluginOptions,
  storageConfig: StorageModuleConfig,
  physicalBucketName: string,
  cacheScope: StorageModuleCacheScope,
): S3Config {
  const base = resolveS3Config(options, cacheScope);
  const publicUrlPrefix = storageConfig.publicUrlPrefix ?? base.publicUrlPrefix;

  if (physicalBucketName === base.bucket && publicUrlPrefix === base.publicUrlPrefix) {
    return base;
  }

  return {
    ...base,
    bucket: physicalBucketName,
    ...(publicUrlPrefix != null ? { publicUrlPrefix } : {}),
  };
}
