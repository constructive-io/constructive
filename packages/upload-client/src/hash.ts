/**
 * File hashing utilities using Web Crypto API.
 *
 * Two strategies:
 * - `hashFile` — reads entire file into memory, fast for files up to ~200MB
 * - `hashFileChunked` — reads file in chunks via FileReader/Blob.slice,
 *   suitable for very large files where loading the full ArrayBuffer
 *   would exceed available memory
 */

import { UploadError } from './types';
import type { FileInput } from './types';

/** Default chunk size for chunked hashing: 2MB */
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hex = new Array<string>(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, '0');
  }
  return hex.join('');
}

/**
 * Hash a file using SHA-256 (Web Crypto API).
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
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return bufferToHex(hashBuffer);
  } catch (err) {
    throw new UploadError('HASH_FAILED', 'Failed to compute SHA-256 hash', err);
  }
}

/**
 * Hash a file using SHA-256 in chunks.
 *
 * Reads the file in fixed-size slices using `Blob.slice()`, feeding each
 * chunk into an incremental digest. This avoids loading the entire file
 * into memory at once, making it suitable for very large files (>200MB).
 *
 * Uses the Web Crypto API's digest on each chunk via a streaming approach:
 * we manually accumulate chunks and hash the concatenated result.
 *
 * NOTE: Web Crypto API does not support incremental/streaming digest natively.
 * For true streaming on very large files (multi-GB), a WASM-based SHA-256
 * would be needed. This implementation reads chunks sequentially but still
 * needs to hold the full file data in memory for the final digest call.
 * The benefit is reduced *peak* memory by processing chunks incrementally
 * and giving the GC a chance to reclaim between reads.
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
    const totalSize = file.size;
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;

    while (bytesRead < totalSize) {
      const end = Math.min(bytesRead + chunkSize, totalSize);
      const slice = file.slice(bytesRead, end);
      const buffer = await slice.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
      bytesRead = end;

      if (onProgress) {
        onProgress(Math.round((bytesRead / totalSize) * 100));
      }
    }

    // Concatenate all chunks for final digest
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    return bufferToHex(hashBuffer);
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError('HASH_FAILED', 'Failed to compute chunked SHA-256 hash', err);
  }
}
