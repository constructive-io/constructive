import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@pgpmjs/logger';

import { s3FailureError } from './s3-failure';
import type { S3Config } from './types';

const log = new Logger('graphile-presigned-url:s3');

/** The header a checksum-bound presigned PUT must carry (RFC 4648 base64 of the raw digest). */
export const CHECKSUM_SHA256_HEADER = 'x-amz-checksum-sha256';

/**
 * Convert a hex-encoded SHA-256 (the `content_hash` clients send) to the
 * base64-of-raw-digest form S3 expects in `x-amz-checksum-sha256`.
 */
export function checksumSha256Base64(contentHashHex: string): string {
  if (!/^[0-9a-f]{64}$/i.test(contentHashHex)) {
    throw new Error('INVALID_CONTENT_HASH_FORMAT: must be a 64-char hex SHA-256');
  }
  return Buffer.from(contentHashHex, 'hex').toString('base64');
}

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 *
 * The presigned URL is locked to the specific key, content-type, and
 * content-length via the signature. The client MUST use these exact values
 * when performing the PUT request.
 *
 * When `contentHash` is given, the SHA-256 is signed into the request as the
 * `x-amz-checksum-sha256` header (kept out of the query string, where stores
 * ignore it). The store then rejects any body that does not hash to it
 * (`BadDigest`), and a PUT without the header fails the signature. This is
 * what makes a content-addressed key actually hold the content it names.
 *
 * @param s3Config - S3 client and bucket configuration
 * @param key - S3 object key (content hash or UUID)
 * @param contentType - MIME type (locked into the signature)
 * @param contentLength - File size in bytes (locked into the signature)
 * @param expiresIn - URL expiry in seconds (default: 900 = 15 minutes)
 * @param contentHash - Hex SHA-256 the uploaded bytes must hash to
 * @returns Presigned PUT URL
 */
export async function generatePresignedPutUrl(
  s3Config: S3Config,
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn: number = 900,
  contentHash?: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
    ...(contentHash ? { ChecksumSHA256: checksumSha256Base64(contentHash) } : {}),
  });

  let url: string;
  try {
    url = await getSignedUrl(s3Config.client as any, command, {
      expiresIn,
      ...(contentHash ? { unhoistableHeaders: new Set([CHECKSUM_SHA256_HEADER]) } : {}),
    });
  } catch (err) {
    throw s3FailureError(
      'PRESIGN_PUT_FAILED',
      { endpoint: s3Config.endpoint, bucket: s3Config.bucket, key, contentType },
      err,
    );
  }
  log.debug(
    `Generated presigned PUT URL for key=${key}, contentType=${contentType}, checksum=${contentHash ? 'sha256' : 'none'}, expires=${expiresIn}s`,
  );
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
  let url: string;
  try {
    url = await getSignedUrl(s3Config.client as any, command, { expiresIn });
  } catch (err) {
    throw s3FailureError('PRESIGN_GET_FAILED', { endpoint: s3Config.endpoint, bucket: s3Config.bucket, key }, err);
  }
  log.debug(`Generated presigned GET URL for key=${key}, expires=${expiresIn}s`);
  return url;
}

/**
 * Delete an object from S3.
 *
 * Idempotent — deleting a non-existent key is a no-op (S3 returns 204).
 *
 * @param s3Config - S3 client and bucket configuration
 * @param key - S3 object key to delete
 */
export async function deleteS3Object(
  s3Config: S3Config,
  key: string,
): Promise<void> {
  await s3Config.client.send(
    new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    }),
  );
  log.debug(`Deleted S3 object: bucket=${s3Config.bucket}, key=${key}`);
}

/**
 * Copy an object within the same physical bucket, preserving its content type.
 *
 * Used to promote a staged upload to its content-addressed key: the bytes are
 * hashed as they stream in, so the final key is only known once the stream ends.
 * Server-side copy keeps that promotion off the application's wire.
 *
 * @param s3Config - S3 client and bucket configuration
 * @param sourceKey - The staged key the bytes were written to
 * @param destinationKey - The final key (the content hash)
 * @param contentType - MIME type to record on the destination object
 */
export async function copyS3Object(
  s3Config: S3Config,
  sourceKey: string,
  destinationKey: string,
  contentType: string,
): Promise<void> {
  await s3Config.client.send(
    new CopyObjectCommand({
      Bucket: s3Config.bucket,
      Key: destinationKey,
      CopySource: `${s3Config.bucket}/${sourceKey}`,
      ContentType: contentType,
      MetadataDirective: 'REPLACE',
    }),
  );
  log.debug(`Copied S3 object: bucket=${s3Config.bucket}, ${sourceKey} → ${destinationKey}`);
}

/**
 * Check if an object exists in S3 and optionally verify its content-type.
 *
 * Asks the store for the object's checksum (`ChecksumMode: ENABLED`); it is
 * returned as `checksumSha256` (base64 of the raw digest) when the object was
 * written through a checksum-bound PUT, so callers can verify the bytes
 * behind a key still hash to the content hash it names.
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
): Promise<{ contentType?: string; contentLength?: number; checksumSha256?: string } | null> {
  try {
    const response = await s3Config.client.send(
      new HeadObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        ChecksumMode: 'ENABLED',
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
      ...(response.ChecksumSHA256 ? { checksumSha256: response.ChecksumSHA256 } : {}),
    };
  } catch (e: any) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw e;
  }
}
