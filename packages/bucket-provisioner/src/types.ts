/**
 * Types for the bucket provisioner library.
 *
 * Defines the configuration interfaces for S3-compatible storage providers,
 * bucket creation options, privacy policies, and CORS rules.
 */

// --- Provider configuration ---

/**
 * Supported storage provider identifiers.
 *
 * Used to select provider-specific behavior (e.g., path-style URLs for MinIO,
 * jurisdiction headers for R2).
 */
export type StorageProvider = 's3' | 'minio' | 'r2' | 'gcs' | 'spaces';

/**
 * Connection configuration for an S3-compatible storage backend.
 *
 * This is the input you provide to connect to your storage provider.
 * For AWS S3, only `region` and credentials are needed.
 * For MinIO/R2/etc., also provide `endpoint`.
 */
export interface StorageConnectionConfig {
  /** Storage provider type */
  provider: StorageProvider;
  /** S3 region (e.g., "us-east-1"). Required for AWS S3. */
  region: string;
  /** S3-compatible endpoint URL (e.g., "http://minio:9000"). Required for non-AWS providers. */
  endpoint?: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** Use path-style URLs (required for MinIO, optional for others) */
  forcePathStyle?: boolean;
}

// --- Bucket configuration ---

/**
 * Bucket access type, matching the database bucket `type` column.
 *
 * - `public`: Files served via CDN/public URL. Bucket policy allows public reads.
 * - `private`: Files served via presigned GET URLs only. No public access.
 * - `temp`: Staging area for uploads. Treated as private. Lifecycle rules may apply.
 */
export type BucketAccessType = 'public' | 'private' | 'temp';

/**
 * Options for creating or configuring an S3 bucket.
 */
export interface CreateBucketOptions {
  /** The S3 bucket name (globally unique for AWS, locally unique for MinIO) */
  bucketName: string;
  /** Bucket access type — determines which policies are applied */
  accessType: BucketAccessType;
  /** S3 region for bucket creation (defaults to connection config region) */
  region?: string;
  /** Whether to enable versioning (recommended for durability) */
  versioning?: boolean;
  /**
   * Public URL prefix for public buckets.
   * This is the CDN or public endpoint URL that serves files from the bucket.
   * Only meaningful for `accessType: 'public'`.
   * Example: "https://cdn.example.com/public"
   */
  publicUrlPrefix?: string;
  /**
   * Per-bucket CORS allowed origins override.
   * When provided, these origins are used instead of the provisioner's default allowedOrigins.
   * Use ['*'] for open/CDN mode (wildcard CORS, any origin can fetch).
   * NULL/undefined = use the provisioner's default allowedOrigins.
   */
  allowedOrigins?: string[];
}

/**
 * Options for updating CORS on an existing S3 bucket.
 */
export interface UpdateCorsOptions {
  /** The S3 bucket name */
  bucketName: string;
  /** Bucket access type — determines which CORS rule set to apply */
  accessType: BucketAccessType;
  /** The allowed origins to set. Use ['*'] for open/CDN mode. */
  allowedOrigins: string[];
}

// --- CORS configuration ---

/**
 * CORS rule for S3 bucket configuration.
 *
 * Required for browser-based presigned URL uploads.
 * The presigned PUT request is a cross-origin request from the client
 * to the S3 endpoint, so CORS must be configured on the bucket.
 */
export interface CorsRule {
  /** Allowed origin domains (e.g., ["https://app.example.com"]) */
  allowedOrigins: string[];
  /** Allowed HTTP methods */
  allowedMethods: ('GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE')[];
  /** Allowed request headers */
  allowedHeaders: string[];
  /** Headers exposed to the browser */
  exposedHeaders: string[];
  /** Preflight cache duration in seconds */
  maxAgeSeconds: number;
}

// --- Lifecycle configuration ---

/**
 * Lifecycle rule for automatic object expiration.
 *
 * Useful for temp buckets where uploads expire after a set period.
 */
export interface LifecycleRule {
  /** Rule ID (descriptive name) */
  id: string;
  /** S3 key prefix to apply the rule to (empty string = entire bucket) */
  prefix: string;
  /** Number of days after which objects expire */
  expirationDays: number;
  /** Whether the rule is enabled */
  enabled: boolean;
}

// --- Provisioning result ---

/**
 * Result of a bucket provisioning operation.
 *
 * Contains all the information needed to configure the `storage_module`
 * table and the presigned URL plugin.
 */
export interface ProvisionResult {
  /** The S3 bucket name */
  bucketName: string;
  /** Bucket access type */
  accessType: BucketAccessType;
  /** S3 endpoint URL (null for AWS S3 default) */
  endpoint: string | null;
  /** Storage provider type */
  provider: StorageProvider;
  /** S3 region */
  region: string;
  /**
   * Public URL prefix for download URLs.
   * For public buckets: the CDN/public endpoint.
   * For private buckets: null (presigned URLs only).
   */
  publicUrlPrefix: string | null;
  /** Whether Block Public Access is enabled */
  blockPublicAccess: boolean;
  /** Whether versioning is enabled */
  versioning: boolean;
  /** CORS rules applied */
  corsRules: CorsRule[];
  /** Lifecycle rules applied */
  lifecycleRules: LifecycleRule[];
}

// --- Error types ---

export type ProvisionerErrorCode =
  | 'CONNECTION_FAILED'
  | 'BUCKET_ALREADY_EXISTS'
  | 'BUCKET_NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'POLICY_FAILED'
  | 'CORS_FAILED'
  | 'LIFECYCLE_FAILED'
  | 'VERSIONING_FAILED'
  | 'ACCESS_DENIED'
  | 'PROVIDER_ERROR';

/**
 * Structured error thrown by the bucket provisioner.
 */
export class ProvisionerError extends Error {
  readonly code: ProvisionerErrorCode;
  readonly cause?: unknown;

  constructor(code: ProvisionerErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ProvisionerError';
    this.code = code;
    this.cause = cause;
  }
}
