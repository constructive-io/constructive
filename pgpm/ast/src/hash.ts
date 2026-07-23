import { createHash } from 'crypto';

/**
 * Generate a SHA256 hash (hex) of a string. Pure content-addressing primitive
 * shared by the bundle layer and core; kept here so the artifact layer has a
 * dependency-free hash without reaching into core.
 */
export function hashString(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
