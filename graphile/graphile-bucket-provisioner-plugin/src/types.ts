/**
 * Types for the bucket provisioner plugin.
 *
 * Defines plugin options, connection configuration, and provisioning result
 * types used by the Graphile plugin to auto-provision S3 buckets when
 * bucket rows are created via GraphQL mutations.
 */

import type {
  StorageConnectionConfig,
  StorageProvider,
  BucketAccessType,
  ProvisionResult,
} from '@constructive-io/bucket-provisioner';

// Re-export types that consumers will need
export type { StorageConnectionConfig, StorageProvider, BucketAccessType, ProvisionResult };

/**
 * S3 connection configuration or a lazy getter that returns it on first use.
 *
 * When a function is provided, it will only be called when the first
 * provisioning operation actually needs the S3 client — avoiding eager
 * env-var reads and S3Client creation at module import time.
 */
export type ConnectionConfigOrGetter =
  | StorageConnectionConfig
  | (() => StorageConnectionConfig);

/**
 * Function to derive the actual S3 bucket name from a logical bucket key.
 *
 * @param bucketKey - The logical bucket key from the database (e.g., "public", "private")
 * @param databaseId - The metaschema database UUID
 * @returns The S3 bucket name to create/configure
 */
export type BucketNameResolver = (bucketKey: string, databaseId: string) => string;

/**
 * Plugin options for the bucket provisioner plugin.
 */
export interface BucketProvisionerPluginOptions {
  /**
   * S3 connection configuration (credentials, endpoint, provider).
   * Can be a concrete object or a lazy getter function.
   */
  connection: ConnectionConfigOrGetter;

  /**
   * Allowed origins for CORS rules on provisioned buckets.
   * These are the domains where your app runs (e.g., ["https://app.example.com"]).
   * Required for browser-based presigned URL uploads.
   */
  allowedOrigins: string[];

  /**
   * Optional prefix for S3 bucket names.
   * When set, the S3 bucket name becomes `{prefix}-{bucketKey}`.
   * Example: prefix "myapp" + key "public" → S3 bucket "myapp-public"
   */
  bucketNamePrefix?: string;

  /**
   * Optional custom function to derive S3 bucket names from logical bucket keys.
   * Takes precedence over `bucketNamePrefix` when provided.
   */
  resolveBucketName?: BucketNameResolver;

  /**
   * Whether to enable versioning on provisioned buckets.
   * Default: false
   */
  versioning?: boolean;

  /**
   * Whether to auto-provision S3 buckets when bucket rows are created
   * via GraphQL mutations. When true, the plugin wraps create mutations
   * on tables tagged with `@storageBuckets` to trigger provisioning
   * after the mutation succeeds.
   *
   * Default: true
   */
  autoProvision?: boolean;
}

/**
 * Input for the provisionBucket mutation.
 */
export interface ProvisionBucketInput {
  /** The logical bucket key (e.g., "public", "private") */
  bucketKey: string;
}

/**
 * Result of the provisionBucket mutation.
 */
export interface ProvisionBucketPayload {
  /** Whether provisioning succeeded */
  success: boolean;
  /** The S3 bucket name that was provisioned */
  bucketName: string;
  /** The access type applied */
  accessType: string;
  /** The storage provider used */
  provider: string;
  /** The S3 endpoint (null for AWS S3 default) */
  endpoint: string | null;
  /** Error message if provisioning failed */
  error: string | null;
}
