/**
 * Core upload orchestrator.
 *
 * Coordinates the full presigned URL upload flow:
 *   hashFile → requestUploadUrl → PUT to S3 → confirmUpload
 *
 * Each step is a pure function — this module just wires them together.
 */

import { hashFile } from './hash';
import { REQUEST_UPLOAD_URL_MUTATION, CONFIRM_UPLOAD_MUTATION } from './queries';
import { UploadError } from './types';
import type {
  UploadFileOptions,
  UploadResult,
  RequestUploadUrlPayload,
  ConfirmUploadPayload,
} from './types';

/**
 * Upload a file using the presigned URL pipeline.
 *
 * 1. Computes SHA-256 hash of the file content
 * 2. Calls `requestUploadUrl` mutation to get a presigned PUT URL
 * 3. If not deduplicated, PUTs the file bytes directly to S3
 * 4. Calls `confirmUpload` mutation to verify and transition status
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
  const { file, bucketKey, execute, onProgress, signal } = options;

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

  // --- Step 2: Request presigned URL ---
  const requestPayload = await requestUploadUrl(execute, {
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
      status: 'ready',
    };
  }

  if (!requestPayload.uploadUrl) {
    throw new UploadError(
      'REQUEST_UPLOAD_URL_FAILED',
      'Server returned deduplicated=false but no uploadUrl',
    );
  }

  await putToS3(
    requestPayload.uploadUrl,
    file,
    file.type || 'application/octet-stream',
    onProgress,
    signal,
  );

  checkAborted(signal);

  // --- Step 4: Confirm ---
  const confirmPayload = await confirmUpload(execute, requestPayload.fileId);

  return {
    fileId: confirmPayload.fileId,
    key: requestPayload.key,
    deduplicated: false,
    status: confirmPayload.status,
  };
}

// --- Internal helpers ---

/**
 * Call the requestUploadUrl GraphQL mutation.
 */
async function requestUploadUrl(
  execute: UploadFileOptions['execute'],
  input: {
    bucketKey: string;
    contentHash: string;
    contentType: string;
    size: number;
    filename?: string;
  },
): Promise<RequestUploadUrlPayload> {
  try {
    const data = await execute(REQUEST_UPLOAD_URL_MUTATION, { input });
    const payload = data.requestUploadUrl as RequestUploadUrlPayload | undefined;
    if (!payload) {
      throw new UploadError('REQUEST_UPLOAD_URL_FAILED', 'No data returned from requestUploadUrl');
    }
    return payload;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(
      'REQUEST_UPLOAD_URL_FAILED',
      `requestUploadUrl mutation failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * PUT file bytes to the presigned S3 URL.
 *
 * Uses XMLHttpRequest when available (for progress tracking),
 * falls back to fetch otherwise.
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

  // Fallback to fetch
  return putWithFetch(url, file, contentType, signal);
}

/**
 * PUT using fetch API.
 */
async function putWithFetch(
  url: string,
  file: UploadFileOptions['file'],
  contentType: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const body = await file.arrayBuffer();
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new UploadError(
        'PUT_UPLOAD_FAILED',
        `S3 PUT failed with status ${response.status}: ${text}`,
      );
    }
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
 * Call the confirmUpload GraphQL mutation.
 */
async function confirmUpload(
  execute: UploadFileOptions['execute'],
  fileId: string,
): Promise<ConfirmUploadPayload> {
  try {
    const data = await execute(CONFIRM_UPLOAD_MUTATION, { input: { fileId } });
    const payload = data.confirmUpload as ConfirmUploadPayload | undefined;
    if (!payload) {
      throw new UploadError('CONFIRM_UPLOAD_FAILED', 'No data returned from confirmUpload');
    }
    if (!payload.success) {
      throw new UploadError('CONFIRM_UPLOAD_FAILED', `confirmUpload returned success=false`);
    }
    return payload;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(
      'CONFIRM_UPLOAD_FAILED',
      `confirmUpload mutation failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Check if an AbortSignal has been triggered.
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new UploadError('ABORTED', 'Upload was cancelled');
  }
}
