/**
 * Presigned URL PUT/GET helpers.
 *
 * Thin wrappers around fetch for uploading to and downloading from
 * presigned S3 URLs. These are the client-side counterparts to the
 * server-side presigned URL generation in @constructive-io/s3-utils.
 *
 * @example
 * ```typescript
 * import { putToPresignedUrl, fetchFromUrl } from '@constructive-io/upload-client';
 *
 * // Upload bytes to a presigned PUT URL
 * await putToPresignedUrl(uploadUrl, fileContent, 'image/png');
 *
 * // Download from a presigned GET or CDN URL
 * const response = await fetchFromUrl(downloadUrl);
 * const text = await response.text();
 * ```
 */

import { createFetch } from '@constructive-io/fetch';

import { UploadError } from './types';

const fetch = createFetch();

/**
 * PUT content to a presigned S3 URL.
 *
 * Accepts any fetch-compatible body (string, ArrayBuffer, Blob, etc.)
 * — works in both browser and Node.js environments.
 *
 * @param url - Presigned PUT URL
 * @param body - Content to upload
 * @param contentType - MIME type (must match the presigned URL's content-type constraint)
 * @param signal - Optional AbortSignal for cancellation
 * @returns The fetch Response (already verified as ok)
 * @throws {UploadError} If the PUT fails or is aborted
 */
export async function putToPresignedUrl(
  url: string,
  body: BodyInit | string,
  contentType: string,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: body as BodyInit,
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new UploadError(
        'PUT_UPLOAD_FAILED',
        `S3 PUT failed with status ${response.status}: ${text}`,
      );
    }

    return response;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    if (signal?.aborted) {
      throw new UploadError('ABORTED', 'Upload was cancelled');
    }
    throw new UploadError(
      'PUT_UPLOAD_FAILED',
      `S3 PUT failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Fetch content from a presigned GET or CDN URL.
 *
 * Thin wrapper that throws a structured UploadError on failure.
 *
 * @param url - Presigned GET URL or public CDN URL
 * @param signal - Optional AbortSignal for cancellation
 * @returns The fetch Response (already verified as ok)
 * @throws {UploadError} If the fetch fails or is aborted
 */
export async function fetchFromUrl(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new UploadError(
        'PUT_UPLOAD_FAILED',
        `Fetch failed with status ${response.status}: ${text}`,
      );
    }

    return response;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    if (signal?.aborted) {
      throw new UploadError('ABORTED', 'Fetch was cancelled');
    }
    throw new UploadError(
      'PUT_UPLOAD_FAILED',
      `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}
