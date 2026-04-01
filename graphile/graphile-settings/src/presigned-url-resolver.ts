/**
 * Presigned URL resolver for the Constructive presigned URL plugin.
 *
 * Reads CDN/S3/MinIO configuration from environment variables (via getEnvOptions)
 * and lazily initializes an S3Client on first use to avoid requiring
 * env vars at module load time.
 *
 * Follows the same lazy-init pattern as upload-resolver.ts.
 *
 * ENV VARS (via CDNOptions):
 *   BUCKET_PROVIDER  - 'minio' | 's3' (default: 'minio')
 *   BUCKET_NAME      - bucket name (default: 'test-bucket')
 *   AWS_REGION       - AWS region (default: 'us-east-1')
 *   AWS_ACCESS_KEY   - access key (default: 'minioadmin')
 *   AWS_SECRET_KEY   - secret key (default: 'minioadmin')
 *   MINIO_ENDPOINT   - MinIO endpoint (default: 'http://localhost:9000')
 */

import { S3Client } from '@aws-sdk/client-s3';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import type { S3Config } from 'graphile-presigned-url-plugin';

const log = new Logger('presigned-url-resolver');

let s3Config: S3Config | null = null;

/**
 * Lazily initialize and return the S3Config for the presigned URL plugin.
 *
 * Reads CDN env vars on first call, creates an S3Client, and caches the
 * config for subsequent calls. Same env vars as upload-resolver.ts.
 *
 * For MinIO, constructs a publicUrlPrefix from the endpoint + bucket name
 * so that public file download URLs resolve correctly.
 */
export function getPresignedUrlS3Config(): S3Config {
  if (s3Config) return s3Config;

  const opts = getEnvOptions();
  const cdn = opts.cdn || {};

  const provider = cdn.provider || 'minio';
  const isMinio = provider === 'minio';
  const bucket = cdn.bucketName || 'test-bucket';
  const region = cdn.awsRegion || 'us-east-1';
  const accessKey = cdn.awsAccessKey || 'minioadmin';
  const secretKey = cdn.awsSecretKey || 'minioadmin';
  const endpoint = cdn.minioEndpoint || 'http://localhost:9000';

  if (process.env.NODE_ENV === 'production') {
    if (!cdn.awsAccessKey || !cdn.awsSecretKey) {
      log.warn('[presigned-url-resolver] WARNING: Using default credentials in production.');
    }
  }

  log.info(
    `[presigned-url-resolver] Initializing: provider=${provider} bucket=${bucket}`,
  );

  const client = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    ...(isMinio ? { endpoint, forcePathStyle: true } : {}),
  });

  // For MinIO (path-style), public URL prefix is endpoint/bucket.
  // For S3 (virtual-hosted), it's https://{bucket}.s3.{region}.amazonaws.com
  const publicUrlPrefix = isMinio
    ? `${endpoint}/${bucket}`
    : `https://${bucket}.s3.${region}.amazonaws.com`;

  s3Config = {
    client,
    bucket,
    region,
    publicUrlPrefix,
    ...(isMinio ? { endpoint, forcePathStyle: true } : {}),
  };

  return s3Config;
}
