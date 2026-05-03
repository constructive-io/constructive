import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Per-bucket configuration resolved from the storage_module tables.
 */
export interface BucketConfig {
  id: string;
  key: string;
  type: 'public' | 'private' | 'temp';
  is_public: boolean;
  owner_id: string | null;
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
  /** Schema name (e.g., "app_public") */
  schemaName: string;
  /** Buckets table name */
  bucketsTableName: string;
  /** Files table name */
  filesTableName: string;

  // --- Scope identity ---

  /** Membership type (NULL for app-level, non-NULL for entity-scoped) */
  membershipType: number | null;
  /** Entity table ID for entity-scoped storage (NULL for app-level) */
  entityTableId: string | null;
  /** Qualified entity table name for ownerId lookups (NULL for app-level) */
  entityQualifiedName: string | null;

  // --- S3 connection config (NULL in DB = use global env/plugin defaults) ---

  /** S3-compatible API endpoint URL (per-database override) */
  endpoint: string | null;
  /** Public URL prefix for generating download URLs (per-database override) */
  publicUrlPrefix: string | null;
  /** Storage provider type: 'minio', 's3', 'gcs', etc. (per-database override) */
  provider: string | null;
  /** CORS allowed origins (per-database override, NULL = use global fallback) */
  allowedOrigins: string[] | null;

  // --- Per-database configurable settings ---

  /** Presigned PUT URL expiry in seconds (default: 900 = 15 min) */
  uploadUrlExpirySeconds: number;
  /** Presigned GET URL expiry in seconds (default: 3600 = 1 hour) */
  downloadUrlExpirySeconds: number;
  /** Default max file size in bytes (default: 200MB). Bucket-level max_file_size overrides this. */
  defaultMaxFileSize: number;
  /** Max filename length in characters (default: 1024) */
  maxFilenameLength: number;
  /** Cache TTL in seconds for this config entry (default: 300 dev / 3600 prod) */
  cacheTtlSeconds: number;
}

/**
 * Input for the requestUploadUrl mutation.
 */
export interface RequestUploadUrlInput {
  /** Bucket key (e.g., "public", "private") */
  bucketKey: string;
  /**
   * Owner entity ID for entity-scoped uploads.
   * Omit for app-level (database-wide) storage.
   * When provided, resolves the storage module for the entity type
   * that owns this entity instance (e.g., a data room ID, team ID).
   */
  ownerId?: string;
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
 * S3 configuration or a lazy getter that returns it on first use.
 * When a function is provided, it will only be called when the first
 * mutation or resolver actually needs the S3 client — avoiding eager
 * env-var reads and S3Client creation at module import time.
 */
export type S3ConfigOrGetter = S3Config | (() => S3Config);

/**
 * Function to derive the actual S3 bucket name for a given database.
 *
 * When provided, the presigned URL plugin calls this on every request
 * to determine which S3 bucket to use — enabling per-database bucket
 * isolation. If not provided, falls back to `s3Config.bucket` (global).
 *
 * @param databaseId - The metaschema database UUID
 * @returns The S3 bucket name for this database
 */
export type BucketNameResolver = (databaseId: string) => string;

/**
 * Callback to lazily provision an S3 bucket on first use.
 *
 * Called by the presigned URL plugin before generating a presigned PUT URL
 * when the bucket has not been seen before (tracked in an in-memory cache).
 * The implementation should create and fully configure the S3 bucket
 * (privacy policies, CORS, lifecycle rules, etc.) — or no-op if the
 * bucket already exists.
 *
 * @param bucketName - The S3 bucket name to provision
 * @param accessType - The logical bucket type ('public', 'private', 'temp')
 * @param databaseId - The metaschema database UUID
 * @param allowedOrigins - Per-database CORS origins (from storage_module), or null to use global fallback
 */
export type EnsureBucketProvisioned = (
  bucketName: string,
  accessType: 'public' | 'private' | 'temp',
  databaseId: string,
  allowedOrigins: string[] | null,
) => Promise<void>;

/**
 * Plugin options for the presigned URL plugin.
 */
export interface PresignedUrlPluginOptions {
  /** S3 configuration (concrete or lazy getter) */
  s3: S3ConfigOrGetter;

  /**
   * Optional function to resolve S3 bucket name per-database.
   * When set, each database gets its own S3 bucket instead of sharing
   * the global `s3Config.bucket`. The S3 credentials (client) remain shared.
   */
  resolveBucketName?: BucketNameResolver;

  /**
   * Optional callback to lazily provision an S3 bucket on first upload.
   * When set, the plugin calls this before generating a presigned PUT URL
   * for any S3 bucket it hasn't seen yet (tracked in an in-memory cache).
   * This enables graceful bucket creation without requiring buckets to
   * exist at database provisioning time.
   */
  ensureBucketProvisioned?: EnsureBucketProvisioned;
}
