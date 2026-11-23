/**
 * The presigned PUT URL the server hands out is signed over an
 * `x-amz-checksum-sha256` header, so the object store only accepts bytes that
 * hash to the `contentHash` the upload was requested with. Clients already
 * compute that hex SHA-256; this turns it into the header the store expects.
 */

import { sha256 } from '@decryption/hashes/sha2';
import { bytesToHex, hexToBytes } from '@decryption/hashes/utils';

/** Header the presigned PUT is signed over. */
export const CHECKSUM_SHA256_HEADER = 'x-amz-checksum-sha256';

/** Hex SHA-256 → base64 of the raw 32-byte digest (the S3 checksum encoding). */
export function sha256HexToBase64(contentHash: string): string {
  if (!/^[0-9a-f]{64}$/i.test(contentHash)) {
    throw new Error(`Invalid SHA-256 hex content hash: ${contentHash}`);
  }
  const bytes = hexToBytes(contentHash.toLowerCase());
  if (typeof btoa === 'function') {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

/** Headers for a presigned PUT: `Content-Type` plus the signed checksum when known. */
export function presignedPutHeaders(contentType: string, contentHash?: string): Record<string, string> {
  return contentHash
    ? { 'Content-Type': contentType, [CHECKSUM_SHA256_HEADER]: sha256HexToBase64(contentHash) }
    : { 'Content-Type': contentType };
}

/**
 * Hex SHA-256 of a PUT body when it is fully in memory (string, ArrayBuffer,
 * typed array, or anything with `arrayBuffer()` such as a Blob/File).
 * Returns undefined for bodies that cannot be hashed up front (streams), in
 * which case the caller must supply the hash itself.
 */
export async function sha256HexOfBody(body: unknown): Promise<string | undefined> {
  if (typeof body === 'string') {
    return bytesToHex(sha256(new TextEncoder().encode(body)));
  }
  if (body instanceof ArrayBuffer) {
    return bytesToHex(sha256(new Uint8Array(body)));
  }
  if (ArrayBuffer.isView(body)) {
    return bytesToHex(sha256(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)));
  }
  if (body && typeof (body as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
    const buffer = await (body as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer();
    return bytesToHex(sha256(new Uint8Array(buffer)));
  }
  return undefined;
}
