/**
 * Presigned URL Plugin for PostGraphile v5
 *
 * Provides per-table S3 storage middleware for PostGraphile v5:
 * - Upload fields on @storageBuckets types (requestUploadUrl, requestBulkUploadUrls)
 * - Delete middleware on @storageFiles tables (S3 cleanup on delete)
 * - downloadUrl computed field on @storageFiles types
 *
 * @example
 * ```typescript
 * import { PresignedUrlPreset } from 'graphile-presigned-url-plugin';
 * import { S3Client } from '@aws-sdk/client-s3';
 *
 * const s3Client = new S3Client({ region: 'us-east-1' });
 *
 * const preset = {
 *   extends: [
 *     PresignedUrlPreset({
 *       s3: {
 *         client: s3Client,
 *         bucket: 'my-uploads',
 *         publicUrlPrefix: 'https://cdn.example.com',
 *       },
 *     }),
 *   ],
 * };
 * ```
 */

export { createDownloadUrlPlugin } from './download-url-field';
export { createPresignedUrlPlugin,PresignedUrlPlugin } from './plugin';
export { PresignedUrlPreset } from './preset';
export { deleteS3Object, generatePresignedGetUrl, generatePresignedPutUrl, headObject } from './s3-signer';
export { clearBucketCache, clearStorageModuleCache, getBucketConfig, getStorageModuleConfig, getStorageModuleConfigForOwner, isS3BucketProvisioned, loadAllStorageModules, markS3BucketProvisioned,resolveStorageConfigFromCodec, resolveStorageModuleByFileId } from './storage-module-cache';
export type {
  BucketConfig,
  BucketNameResolver,
  EnsureBucketProvisioned,
  PresignedUrlPluginOptions,
  RequestUploadUrlInput,
  RequestUploadUrlPayload,
  S3Config,
  S3ConfigOrGetter,
  StorageModuleConfig,
} from './types';
