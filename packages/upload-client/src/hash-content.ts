/**
 * String content hashing.
 *
 * Complements `hashFile` (which accepts File/Blob) with a convenience
 * function for hashing plain strings.
 *
 * @example
 * ```typescript
 * import { hashContent } from '@constructive-io/upload-client';
 *
 * const hash = await hashContent('hello world');
 * // "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */

import { sha256 } from '@constructive-io/noble-hashes/sha2';
import { bytesToHex } from '@constructive-io/noble-hashes/utils';
import { UploadError } from './types';

/**
 * Compute the SHA-256 hex digest of a string.
 *
 * @param content - The string content to hash
 * @returns 64-character lowercase hex string
 */
export async function hashContent(content: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(content);
    return bytesToHex(sha256(data));
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError('HASH_FAILED', 'Failed to compute SHA-256 hash', err);
  }
}
