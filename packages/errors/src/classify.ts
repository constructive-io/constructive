import { getDefinition } from './registry';
import type { ErrorClass } from './types';

/**
 * Classify a code as `public` or `internal`.
 *
 * Unknown codes are classified `internal` on purpose: transports mask internal
 * errors, so an unregistered code is never leaked to end users by default.
 */
export function classify(code: string | null | undefined): ErrorClass {
  if (!code) return 'internal';
  return getDefinition(code)?.class ?? 'internal';
}

/** Whether a code is registered and classified `public`. */
export function isPublicCode(code: string | null | undefined): boolean {
  return classify(code) === 'public';
}
