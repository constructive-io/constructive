/**
 * Validation for a caller-supplied ("custom") object key.
 *
 * A custom key is the one place a client names an S3 object directly, so what is
 * enforced here is containment: the key must land inside the bucket's namespace
 * and mean the same thing to S3 as it does to the gateway that later serves it.
 */

const MAX_CUSTOM_KEY_LENGTH = 1024;

/**
 * The key alphabet. A leading underscore is legal — a static export puts its
 * hashed assets under `_next/static/**` — and containment is enforced by the
 * `..`, leading-slash and NUL checks below rather than by the first character.
 */
const CUSTOM_KEY_REGEX = /^[a-zA-Z0-9_][a-zA-Z0-9_.\-/]*$/;

/**
 * Returns an error string describing why `key` is unusable, or null if it is fine.
 */
export function validateCustomKey(key: string): string | null {
  if (key.length === 0 || key.length > MAX_CUSTOM_KEY_LENGTH) {
    return 'INVALID_KEY_LENGTH: must be 1-1024 characters';
  }
  if (key.includes('..')) {
    return 'INVALID_KEY: path traversal (..) not allowed';
  }
  if (key.startsWith('/')) {
    return 'INVALID_KEY: leading slash not allowed';
  }
  if (key.includes('\0')) {
    return 'INVALID_KEY: null bytes not allowed';
  }
  if (!CUSTOM_KEY_REGEX.test(key)) {
    return 'INVALID_KEY: must start with alphanumeric or underscore and contain only alphanumeric, dots, hyphens, underscores, and slashes';
  }
  return null;
}
