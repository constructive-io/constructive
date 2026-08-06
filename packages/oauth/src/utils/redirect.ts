import { errors } from '@constructive-io/errors';

/** Resolve a browser return target and reduce it to a same-origin relative path. */
export function resolveSameOriginReturnPath(
  target: string | null | undefined,
  origin: string
): string {
  if (!target) return '/';
  try {
    const trustedOrigin = new URL(origin).origin;
    const resolved = new URL(target, `${trustedOrigin}/`);
    if (
      resolved.origin !== trustedOrigin ||
      resolved.username ||
      resolved.password
    ) {
      throw errors.INVALID_OAUTH_REDIRECT();
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch (cause) {
    if (
      cause instanceof Error &&
      'code' in cause &&
      cause.code === 'INVALID_OAUTH_REDIRECT'
    ) {
      throw cause;
    }
    throw errors.INVALID_OAUTH_REDIRECT(undefined, undefined, cause);
  }
}
