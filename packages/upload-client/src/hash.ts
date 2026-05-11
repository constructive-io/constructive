/**
 * File hashing utilities.
 *
 * Two strategies:
 * - `hashFile` — reads entire file into memory, fast for files up to ~200MB
 * - `hashFileChunked` — true incremental hashing via Blob.slice, suitable
 *   for arbitrarily large files (GB+). Only one chunk is in memory at a time.
 *
 * Uses Node.js `crypto` when available (CJS/Node), falling back to
 * @noble/hashes (pure JS, audited, 0 deps) in browser/ESM environments.
 * This avoids the "Must use import to load ES Module" error that occurs
 * when CJS code `require()`s the ESM-only @noble/hashes package.
 */

import { UploadError } from './types';
import type { FileInput } from './types';

interface Sha256Hasher {
  update(data: Uint8Array): Sha256Hasher;
  digest(): Uint8Array;
}

interface HashImpl {
  sha256(data: Uint8Array): Uint8Array;
  sha256create(): Sha256Hasher;
  bytesToHex(bytes: Uint8Array): string;
}

let _impl: HashImpl | undefined;

async function getImpl(): Promise<HashImpl> {
  if (_impl) return _impl;
  try {
    // Node.js: use built-in crypto (works in CJS and ESM)
    const crypto = require('crypto');
    _impl = {
      sha256: (data: Uint8Array) => new Uint8Array(crypto.createHash('sha256').update(data).digest()),
      sha256create: () => {
        const h = crypto.createHash('sha256');
        const wrapper: Sha256Hasher = {
          update(data: Uint8Array) { h.update(data); return wrapper; },
          digest() { return new Uint8Array(h.digest()); },
        };
        return wrapper;
      },
      bytesToHex: (bytes: Uint8Array) => Buffer.from(bytes).toString('hex'),
    };
  } catch {
    // Browser/non-Node: use @noble/hashes (ESM import works here)
    const [noble, utils] = await Promise.all([
      import('@noble/hashes/sha2.js'),
      import('@noble/hashes/utils.js'),
    ]);
    _impl = {
      sha256: noble.sha256,
      sha256create: () => noble.sha256.create(),
      bytesToHex: utils.bytesToHex,
    };
  }
  return _impl;
}

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
    const impl = await getImpl();
    const buffer = await file.arrayBuffer();
    return impl.bytesToHex(impl.sha256(new Uint8Array(buffer)));
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
    const impl = await getImpl();
    const hasher = impl.sha256create();
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

    return impl.bytesToHex(hasher.digest());
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError('HASH_FAILED', 'Failed to compute chunked SHA-256 hash', err);
  }
}
