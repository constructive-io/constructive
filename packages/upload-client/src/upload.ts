/**
 * Core upload orchestrator.
 *
 * Coordinates the full presigned URL upload flow:
 *   hashFile → requestUploadUrl → PUT to S3
 *
 * Each step is a pure function — this module just wires them together.
 */

import { hashFile } from './hash';
import { putToPresignedUrl } from './put';
import { buildRequestUploadUrlQuery, DEFAULT_BUCKET_QUERY_FIELD } from './queries';
import type {
  RequestUploadUrlPayload,
  UploadFileOptions,
  UploadResult,
} from './types';
import { UploadError } from './types';

/**
 * Upload a file using the presigned URL pipeline.
 *
 * 1. Computes SHA-256 hash of the file content
 * 2. Calls `requestUploadUrl` mutation to get a presigned PUT URL
 * 3. If not deduplicated, PUTs the file bytes directly to S3
 *
 * @param options - Upload options (file, bucket, executor, etc.)
 * @returns Upload result with fileId, key, and status
 *
 * @example
 * ```typescript
 * const result = await uploadFile({
 *   file: selectedFile,
 *   bucketKey: 'avatars',
 *   execute: myGraphQLExecutor,
 *   onProgress: (pct) => console.log(`${pct}%`),
 * });
 *
 * // Link file to domain table
 * await execute(UPDATE_PROFILE, { avatar: result.fileId });
 * ```
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadResult> {
  const { file, bucketKey, execute, onProgress, signal, bucketQueryField } = options;

  // --- Validate input ---
  if (!file) {
    throw new UploadError('INVALID_FILE', 'No file provided');
  }
  if (file.size <= 0) {
    throw new UploadError('INVALID_FILE', 'File is empty');
  }
  if (!bucketKey) {
    throw new UploadError('INVALID_FILE', 'No bucketKey provided');
  }

  checkAborted(signal);

  // --- Step 1: Hash ---
  const contentHash = await hashFile(file);

  checkAborted(signal);

  // --- Step 2: Request presigned URL via per-table bucket field ---
  const queryField = bucketQueryField || DEFAULT_BUCKET_QUERY_FIELD;
  const requestPayload = await requestUploadUrl(execute, queryField, {
    bucketKey,
    contentHash,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    filename: file.name || undefined,
  });

  checkAborted(signal);

  // --- Step 3: PUT to S3 (skip if deduplicated) ---
  if (requestPayload.deduplicated) {
    return {
      fileId: requestPayload.fileId,
      key: requestPayload.key,
      deduplicated: true,
    };
  }

  if (!requestPayload.uploadUrl) {
    throw new UploadError(
      'REQUEST_UPLOAD_URL_FAILED',
      'Server returned deduplicated=false but no uploadUrl',
    );
  }

  await putToS3(requestPayload.uploadUrl, file, file.type || 'application/octet-stream', onProgress, signal);

  return {
    fileId: requestPayload.fileId,
    key: requestPayload.key,
    deduplicated: false,
  };
}

// --- Internal helpers ---

/**
 * Query the bucket by key and call requestUploadUrl on it.
 */
async function requestUploadUrl(
  execute: UploadFileOptions['execute'],
  bucketQueryField: string,
  input: {
    bucketKey: string;
    contentHash: string;
    contentType: string;
    size: number;
    filename?: string;
  },
): Promise<RequestUploadUrlPayload> {
  const query = buildRequestUploadUrlQuery(bucketQueryField);

  try {
    const data = await execute(query, {
      key: input.bucketKey,
      contentHash: input.contentHash,
      contentType: input.contentType,
      size: input.size,
      filename: input.filename,
    });

    // Extract from the nested bucket response: { bucketByKey: { requestUploadUrl: { ... } } }
    const bucketData = data[bucketQueryField] as Record<string, unknown> | undefined;
    if (!bucketData) {
      throw new UploadError('REQUEST_UPLOAD_URL_FAILED', `Bucket not found for query field "${bucketQueryField}"`);
    }
    const payload = bucketData.requestUploadUrl as RequestUploadUrlPayload | undefined;
    if (!payload) {
      throw new UploadError('REQUEST_UPLOAD_URL_FAILED', 'No data returned from requestUploadUrl');
    }
    return payload;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(
      'REQUEST_UPLOAD_URL_FAILED',
      `requestUploadUrl query failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * PUT file bytes to the presigned S3 URL.
 *
 * Uses XMLHttpRequest when available (for progress tracking),
 * falls back to putToPresignedUrl (fetch) otherwise.
 */
async function putToS3(
  url: string,
  file: UploadFileOptions['file'],
  contentType: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Use XMLHttpRequest for progress support if available
  if (typeof XMLHttpRequest !== 'undefined' && onProgress) {
    return putWithXHR(url, file, contentType, onProgress, signal);
  }

  const body = await file.arrayBuffer();
  await putToPresignedUrl(url, body, contentType, signal);
}

/**
 * PUT using XMLHttpRequest (supports progress events).
 */
function putWithXHR(
  url: string,
  file: UploadFileOptions['file'],
  contentType: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(
          new UploadError(
            'PUT_UPLOAD_FAILED',
            `S3 PUT failed with status ${xhr.status}: ${xhr.responseText}`,
          ),
        );
      }
    });

    xhr.addEventListener('error', () => {
      reject(new UploadError('PUT_UPLOAD_FAILED', 'S3 PUT network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new UploadError('ABORTED', 'Upload was cancelled'));
    });

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    // Read file and send
    file.arrayBuffer().then(
      (buffer) => xhr.send(buffer),
      (err) => reject(new UploadError('PUT_UPLOAD_FAILED', 'Failed to read file', err)),
    );
  });
}

/**
 * Check if an AbortSignal has been triggered.
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new UploadError('ABORTED', 'Upload was cancelled');
  }
}
