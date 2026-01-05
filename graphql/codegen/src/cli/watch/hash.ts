/**
 * Schema hashing utilities using Node.js crypto.subtle (Node 22+)
 */

import { webcrypto } from 'node:crypto';

/**
 * Compute SHA-256 hash of a string using Web Crypto API
 * Uses crypto.subtle available in Node.js 22+
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute hash of an object by JSON-stringifying it
 * Objects are sorted by keys for consistent hashing
 */
export async function hashObject(obj: unknown): Promise<string> {
  const json = JSON.stringify(obj, sortReplacer);
  return sha256(json);
}

/**
 * JSON.stringify replacer that sorts object keys for deterministic output
 */
function sortReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce(
        (sorted, key) => {
          sorted[key] = (value as Record<string, unknown>)[key];
          return sorted;
        },
        {} as Record<string, unknown>
      );
  }
  return value;
}

/**
 * Combine multiple hashes into a single hash
 */
export async function combineHashes(...hashes: string[]): Promise<string> {
  return sha256(hashes.join(':'));
}
