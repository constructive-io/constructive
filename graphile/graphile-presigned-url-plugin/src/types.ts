import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Per-bucket configuration resolved from the storage_module tables.
 */
export interface BucketConfig {
  id: string;
  key: string;
  type: 'public' | 'private' | 'temp';
  is_public: boolean;
  owner_id: string;
  allowed_mime_types: string[] | null;
  max_file_size: number | null;
}

/**
 * Storage module configuration resolved from metaschema for a given database.
 */
export interface StorageModuleConfig {
  /** The metaschema storage_module row ID */
  id: string;
  /** Resolved schema.table for buckets */
  bucketsQualifiedName: string;
  /** Resolved schema.table for files */
  filesQualifiedName: string;
  /** Resolved schema.table for upload_requests */
  uploadRequestsQualifiedName: string;
  /** Schema name (e.g., "app_public") */
  schemaName: string;
  /** Buckets table name */
  bucketsTableName: string;
  /** Files table name */
  filesTableName: string;
  /** Upload requests table name */
  uploadRequestsTableName: string;
}

/**
 * Input for the requestUploadUrl mutation.
 */
export interface RequestUploadUrlInput {
  /** Bucket key (e.g., "public", "private") */
  bucketKey: string;
  /** SHA-256 content hash computed by the client */
  contentHash: string;
  /** MIME type of the file */
  contentType: string;
  /** File size in bytes */
  size: number;
  /** Original filename (optional, for display/Content-Disposition) */
  filename?: string;
}

/**
 * Result of the requestUploadUrl mutation.
 */
export interface RequestUploadUrlPayload {
  /** Presigned PUT URL (null if deduplicated) */
  uploadUrl: string | null;
  /** The file ID (existing if dedup, new if fresh upload) */
  fileId: string;
  /** The S3 key */
  key: string;
  /** Whether this file was deduplicated (already exists with same hash) */
  deduplicated: boolean;
  /** Presigned URL expiry time (null if deduplicated) */
  expiresAt: string | null;
}

/**
 * Input for the confirmUpload mutation.
 */
export interface ConfirmUploadInput {
  /** The file ID returned by requestUploadUrl */
  fileId: string;
}

/**
 * Result of the confirmUpload mutation.
 */
export interface ConfirmUploadPayload {
  /** The confirmed file ID */
  fileId: string;
  /** New file status (should be 'ready') */
  status: string;
  /** Whether confirmation succeeded */
  success: boolean;
}

/**
 * S3 configuration for the presigned URL plugin.
 */
export interface S3Config {
  /** S3 client instance */
  client: S3Client;
  /** S3 bucket name (the actual S3 bucket, not the logical bucket key) */
  bucket: string;
  /** S3 endpoint URL (for MinIO/custom S3) */
  endpoint?: string;
  /** S3 region */
  region?: string;
  /** Whether to use path-style URLs (required for MinIO) */
  forcePathStyle?: boolean;
  /** Public URL prefix for generating download URLs */
  publicUrlPrefix?: string;
}

/**
 * Plugin options for the presigned URL plugin.
 */
export interface PresignedUrlPluginOptions {
  /** S3 configuration */
  s3: S3Config;
  /** Presigned URL expiry in seconds (default: 900 = 15 minutes) */
  urlExpirySeconds?: number;
  /** Maximum file size in bytes (default: 200MB) */
  maxFileSize?: number;
  /** Performance threshold for content hashing in bytes.
   *  Above this size, use UUID key instead of content hash. (default: 200MB) */
  hashThresholdBytes?: number;
}
