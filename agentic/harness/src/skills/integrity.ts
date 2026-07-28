import * as crypto from 'crypto';

/**
 * Verify an npm SRI `integrity` string (`sha512-<base64>`, `sha256-…`) or a
 * legacy hex `shasum` (sha1) against tarball bytes. Throws on mismatch.
 */
export function verifyIntegrity(
  data: Buffer,
  { integrity, shasum }: { integrity?: string; shasum?: string }
): void {
  if (integrity) {
    const dash = integrity.indexOf('-');
    if (dash === -1) {
      throw new Error(`Malformed integrity string: ${integrity}`);
    }
    const algorithm = integrity.slice(0, dash);
    const expected = integrity.slice(dash + 1);
    const actual = crypto.createHash(algorithm).update(data).digest('base64');
    if (actual !== expected) {
      throw new Error(`Integrity check failed (${algorithm}): expected ${expected}, got ${actual}`);
    }
    return;
  }
  if (shasum) {
    const actual = crypto.createHash('sha1').update(data).digest('hex');
    if (actual !== shasum) {
      throw new Error(`Integrity check failed (sha1): expected ${shasum}, got ${actual}`);
    }
    return;
  }
  throw new Error('Release has no integrity metadata to verify');
}
