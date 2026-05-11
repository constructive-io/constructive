/**
 * File hashing utilities using @constructive-io/noble-hashes.
 *
 * Two strategies:
 * - `hashFile` — reads entire file into memory, fast for files up to ~200MB
 * - `hashFileChunked` — true incremental hashing via Blob.slice, suitable
 *   for arbitrarily large files (GB+). Only one chunk is in memory at a time.
 *
 * Both use @constructive-io/noble-hashes (pure JS, audited, 0 dependencies)
 * which supports incremental .update() — unlike Web Crypto API's one-shot digest().
 */

import { sha256 } from '@constructive-io/noble-hashes/sha2';
import { bytesToHex } from '@constructive-io/noble-hashes/utils';
import { UploadError } from './types';
import type { FileInput } from './types';

/** Default chunk size for chunked hashing: 2MB */
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * Hash a file using SHA-256.
 *
 * Reads the entire file into an ArrayBuffer, then computes the hash
 * in a single call. Fast and simple for files up to ~200MB.
 *
 * @param file - File to hash (browser File, Blob, or compatible FileInput)
 * @returns SHA-256 hex digest (64 lowercase hex chars)
 *
 * @example
 * ```typescript
 * const hash = await hashFile(myFile);
 * // "a1b2c3d4e5f6..."  (64 chars)
 * ```
 */
export async function hashFile(file: FileInput): Promise<string> {
  if (!file || file.size < 0) {
    throw new UploadError('INVALID_FILE', 'File is null or has invalid size');
  }

  try {
    const buffer = await file.arrayBuffer();
    return bytesToHex(sha256(new Uint8Array(buffer)));
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError('HASH_FAILED', 'Failed to compute SHA-256 hash', err);
  }
}

/**
 * Hash a file using SHA-256 in chunks (true incremental).
 *
 * Reads the file in fixed-size slices using `Blob.slice()`, feeding each
 * chunk into an incremental SHA-256 hasher. Only one chunk is held in
 * memory at a time — O(chunkSize) memory for any file size.
 *
 * @param file - File to hash
 * @param chunkSize - Size of each chunk in bytes (default: 2MB)
 * @param onProgress - Optional progress callback (0-100)
 * @returns SHA-256 hex digest (64 lowercase hex chars)
 *
 * @example
 * ```typescript
 * const hash = await hashFileChunked(largeFile, 4 * 1024 * 1024, (pct) => {
 *   console.log(`Hashing: ${pct}%`);
 * });
 * ```
 */
export async function hashFileChunked(
  file: FileInput,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!file || file.size < 0) {
    throw new UploadError('INVALID_FILE', 'File is null or has invalid size');
  }
  if (chunkSize <= 0) {
    throw new UploadError('INVALID_FILE', 'Chunk size must be positive');
  }

  try {
    const hasher = sha256.create();
    const totalSize = file.size;
    let bytesRead = 0;

    while (bytesRead < totalSize) {
      const end = Math.min(bytesRead + chunkSize, totalSize);
      const slice = file.slice(bytesRead, end);
      const buffer = await slice.arrayBuffer();
      hasher.update(new Uint8Array(buffer));
      bytesRead = end;

      if (onProgress) {
        onProgress(Math.round((bytesRead / totalSize) * 100));
      }
    }

    return bytesToHex(hasher.digest());
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError('HASH_FAILED', 'Failed to compute chunked SHA-256 hash', err);
  }
}
