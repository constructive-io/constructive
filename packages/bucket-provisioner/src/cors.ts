/**
 * CORS configuration builders.
 *
 * Generates CORS rules for S3 buckets to allow browser-based
 * presigned URL uploads. Without CORS, the browser will block
 * the cross-origin PUT request to the S3 endpoint.
 */

import type { CorsRule } from './types';

/**
 * Build the default CORS rules for presigned URL uploads.
 *
 * This allows:
 * - PUT: for presigned uploads from the browser
 * - GET: for presigned downloads and public file access
 * - HEAD: for confirmUpload verification and cache headers
 *
 * @param allowedOrigins - Domains allowed to make cross-origin requests.
 *                          Use specific domains in production (e.g., ["https://app.example.com"]).
 *                          Never use ["*"] in production.
 * @param maxAgeSeconds - Preflight cache duration (default: 3600 = 1 hour)
 */
export function buildUploadCorsRules(
  allowedOrigins: string[],
  maxAgeSeconds: number = 3600,
): CorsRule[] {
  if (allowedOrigins.length === 0) {
    throw new Error('allowedOrigins must contain at least one origin');
  }

  return [
    {
      allowedOrigins,
      allowedMethods: ['PUT', 'GET', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Content-Length',
        'Content-MD5',
        'x-amz-content-sha256',
        'x-amz-date',
        'x-amz-security-token',
        'Authorization',
      ],
      exposedHeaders: [
        'ETag',
        'Content-Length',
        'Content-Type',
        'x-amz-request-id',
        'x-amz-id-2',
      ],
      maxAgeSeconds,
    },
  ];
}

/**
 * Build restrictive CORS rules for private-only buckets.
 *
 * Similar to upload CORS but without GET (private files use
 * presigned URLs which include auth in the query string,
 * so CORS is less of a concern for downloads).
 *
 * @param allowedOrigins - Domains allowed to make cross-origin requests.
 * @param maxAgeSeconds - Preflight cache duration (default: 3600 = 1 hour)
 */
export function buildPrivateCorsRules(
  allowedOrigins: string[],
  maxAgeSeconds: number = 3600,
): CorsRule[] {
  if (allowedOrigins.length === 0) {
    throw new Error('allowedOrigins must contain at least one origin');
  }

  return [
    {
      allowedOrigins,
      allowedMethods: ['PUT', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Content-Length',
        'Content-MD5',
        'x-amz-content-sha256',
        'x-amz-date',
        'x-amz-security-token',
        'Authorization',
      ],
      exposedHeaders: [
        'ETag',
        'Content-Length',
        'x-amz-request-id',
      ],
      maxAgeSeconds,
    },
  ];
}
