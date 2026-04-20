/**
 * Presigned URL Plugin for PostGraphile v5
 *
 * Provides presigned URL upload capabilities for PostGraphile v5:
 * - requestUploadUrl mutation (presigned PUT URL generation)
 * - confirmUpload mutation (upload verification + status transition)
 * - downloadUrl computed field (presigned GET URL / public URL)
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

export { PresignedUrlPlugin, createPresignedUrlPlugin } from './plugin';
export { createDownloadUrlPlugin } from './download-url-field';
export { PresignedUrlPreset } from './preset';
export { getStorageModuleConfig, getStorageModuleConfigForOwner, getBucketConfig, resolveStorageModuleByFileId, clearStorageModuleCache, clearBucketCache, isS3BucketProvisioned, markS3BucketProvisioned } from './storage-module-cache';
export { generatePresignedPutUrl, generatePresignedGetUrl, headObject } from './s3-signer';
export type {
  BucketConfig,
  StorageModuleConfig,
  RequestUploadUrlInput,
  RequestUploadUrlPayload,
  ConfirmUploadInput,
  ConfirmUploadPayload,
  S3Config,
  S3ConfigOrGetter,
  PresignedUrlPluginOptions,
  BucketNameResolver,
  EnsureBucketProvisioned,
} from './types';
