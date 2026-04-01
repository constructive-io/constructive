import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@pgpmjs/logger';
import type { S3Config } from './types';

const log = new Logger('graphile-presigned-url:s3');

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 *
 * The presigned URL is locked to the specific key, content-type, and
 * content-length via the signature. The client MUST use these exact values
 * when performing the PUT request.
 *
 * @param s3Config - S3 client and bucket configuration
 * @param key - S3 object key (content hash or UUID)
 * @param contentType - MIME type (locked into the signature)
 * @param contentLength - File size in bytes (locked into the signature)
 * @param expiresIn - URL expiry in seconds (default: 900 = 15 minutes)
 * @returns Presigned PUT URL
 */
export async function generatePresignedPutUrl(
  s3Config: S3Config,
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn: number = 900,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const url = await getSignedUrl(s3Config.client as any, command, { expiresIn });
  log.debug(`Generated presigned PUT URL for key=${key}, contentType=${contentType}, expires=${expiresIn}s`);
  return url;
}

/**
 * Generate a presigned GET URL for downloading a file from S3.
 *
 * Used for private files that shouldn't be served through a public CDN.
 * For public files, the downloadUrl field returns the public URL prefix + key.
 *
 * @param s3Config - S3 client and bucket configuration
 * @param key - S3 object key
 * @param expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
 * @param filename - Optional filename for Content-Disposition header
 * @returns Presigned GET URL
 */
export async function generatePresignedGetUrl(
  s3Config: S3Config,
  key: string,
  expiresIn: number = 3600,
  filename?: string,
): Promise<string> {
  const params: Record<string, unknown> = {
    Bucket: s3Config.bucket,
    Key: key,
  };

  if (filename) {
    const sanitized = filename.replace(/["\\\r\n]/g, '_');
    params.ResponseContentDisposition = `attachment; filename="${sanitized}"`;
  }

  const command = new GetObjectCommand(params as any);
  const url = await getSignedUrl(s3Config.client as any, command, { expiresIn });
  log.debug(`Generated presigned GET URL for key=${key}, expires=${expiresIn}s`);
  return url;
}

/**
 * Check if an object exists in S3 and optionally verify its content-type.
 *
 * Used by confirmUpload to verify the file was actually uploaded to S3
 * and that the content-type matches what was declared.
 *
 * @param s3Config - S3 client and bucket configuration
 * @param key - S3 object key
 * @param expectedContentType - Expected MIME type (optional)
 * @returns Object metadata if exists, null if not found
 */
export async function headObject(
  s3Config: S3Config,
  key: string,
  expectedContentType?: string,
): Promise<{ contentType?: string; contentLength?: number } | null> {
  try {
    const response = await s3Config.client.send(
      new HeadObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      }),
    );

    if (expectedContentType && response.ContentType !== expectedContentType) {
      log.warn(
        `Content-type mismatch for key=${key}: expected=${expectedContentType}, actual=${response.ContentType}`,
      );
    }

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
