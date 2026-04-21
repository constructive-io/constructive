/**
 * Presigned URL helpers.
 *
 * Generates presigned PUT and GET URLs for S3-compatible storage.
 * Consumers import from @constructive-io/s3-utils instead of wiring
 * up @aws-sdk/s3-request-presigner directly.
 *
 * @example
 * ```typescript
 * import { createS3Client, presignGetUrl, presignPutUrl } from '@constructive-io/s3-utils';
 *
 * const client = createS3Client({ ... });
 *
 * const putUrl = await presignPutUrl(client, {
 *   bucket: 'my-bucket',
 *   key: 'uploads/photo.jpg',
 *   contentType: 'image/jpeg',
 *   contentLength: 102400,
 * });
 *
 * const getUrl = await presignGetUrl(client, {
 *   bucket: 'my-bucket',
 *   key: 'uploads/photo.jpg',
 * });
 * ```
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// --- Types ---

export interface PresignPutOptions {
  /** S3 bucket name */
  bucket: string;
  /** S3 object key */
  key: string;
  /** MIME type (locked into the signature) */
  contentType: string;
  /** File size in bytes (locked into the signature) */
  contentLength: number;
  /** URL expiry in seconds (default: 900 = 15 minutes) */
  expiresIn?: number;
}

export interface PresignGetOptions {
  /** S3 bucket name */
  bucket: string;
  /** S3 object key */
  key: string;
  /** URL expiry in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Optional filename for Content-Disposition header */
  filename?: string;
}

export interface HeadObjectResult {
  contentType?: string;
  contentLength?: number;
}

// --- Functions ---

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 *
 * The presigned URL is locked to the specific key, content-type, and
 * content-length via the signature. The client MUST use these exact values
 * when performing the PUT request.
 */
export async function presignPutUrl(
  client: S3Client,
  options: PresignPutOptions,
): Promise<string> {
  const { bucket, key, contentType, contentLength, expiresIn = 900 } = options;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  return getSignedUrl(client as any, command, { expiresIn });
}

/**
 * Generate a presigned GET URL for downloading a file from S3.
 *
 * Used for private files that shouldn't be served through a public CDN.
 */
export async function presignGetUrl(
  client: S3Client,
  options: PresignGetOptions,
): Promise<string> {
  const { bucket, key, expiresIn = 3600, filename } = options;

  const params: Record<string, unknown> = {
    Bucket: bucket,
    Key: key,
  };

  if (filename) {
    const sanitized = filename.replace(/["\\\r\n]/g, '_');
    params.ResponseContentDisposition = `attachment; filename="${sanitized}"`;
  }

  const command = new GetObjectCommand(params as any);
  return getSignedUrl(client as any, command, { expiresIn });
}

/**
 * Check if an object exists in S3 and return its metadata.
 *
 * Returns null if the object does not exist.
 */
export async function headObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<HeadObjectResult | null> {
  try {
    const response = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  } catch (e: any) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw e;
  }
}
