import { createFetch } from '@constructive-io/fetch';

/** The request never got an HTTP answer: refused, reset, no such host, a TLS failure. */
export class BackendUnreachableError extends Error {
  constructor(
    endpoint: string,
    readonly cause: unknown
  ) {
    super(`Could not reach the server at ${endpoint}. Check that it is running, or pick a different backend.`);
    this.name = 'BackendUnreachableError';
  }
}

/** A fetch for one endpoint that tags a request with no answer and records the HTTP status of the last answer. */
export function trackedFetch(endpoint: string): { fetch: typeof fetch; status(): number | undefined } {
  const base = createFetch();
  let status: number | undefined;
  const tracked = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    let response: Response;
    try {
      response = await base(input, init);
    } catch (err) {
      throw new BackendUnreachableError(endpoint, err);
    }
    status = response.status;
    return response;
  };
  return { fetch: tracked as typeof fetch, status: () => status };
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof BackendUnreachableError || err instanceof AuthTimeoutError;
}

/**
 * The `extensions.code` of every GraphQL error in a failed call, wherever the
 * client nested it. Message text is never read: the server may put backend
 * internals in it.
 */
export function errorCodes(err: unknown): string[] {
  const codes: string[] = [];
  const visited = new Set<object>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    const record = value as Record<string, unknown>;
    const code = (record.extensions as { code?: unknown } | undefined)?.code;
    if (typeof code === 'string') codes.push(code);
    if (Array.isArray(record.errors)) record.errors.forEach(visit);
    for (const key of ['cause', 'response', 'result', 'payload', 'data']) visit(record[key]);
  };
  visit(err);
  return [...new Set(codes)];
}

/** A failed auth call in our own words: why no answer came, else the server's codes, never its message text. */
export function describeAuthError(err: unknown): string {
  if (isNetworkError(err)) return (err as Error).message;
  const codes = errorCodes(err);
  return codes.length > 0 ? `the server answered ${codes.join(', ')}` : 'the server answered with no error code';
}

export const AUTH_TIMEOUT_MS = 10_000;

export class AuthTimeoutError extends Error {
  constructor(endpoint: string, ms: number) {
    super(`The server at ${endpoint} did not respond within ${Math.round(ms / 1000)}s. Check the backend settings and try again.`);
    this.name = 'AuthTimeoutError';
  }
}

export function withAuthTimeout<T>(
  promise: Promise<T>,
  endpoint: string,
  ms: number = AUTH_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AuthTimeoutError(endpoint, ms));
    }, ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export type SignInErrorKind =
  | 'invalid-input'
  | 'invalid-credentials'
  | 'second-factor-required'
  | 'refused'
  | 'backend-unreachable'
  | 'server-error';

/** A failed sign-in, by what the caller can do about it. `code` is the server's error code, when it gave one. */
export class SignInError extends Error {
  constructor(
    readonly kind: SignInErrorKind,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'SignInError';
  }
}

/** Codes the auth plane raises to refuse a sign-in that is otherwise well formed. */
const REFUSAL_CODES = new Set([
  'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
  'TOO_MANY_REQUESTS',
  'PASSWORD_SIGN_IN_DISABLED',
  'AUTH_METHOD_NOT_ALLOWED',
  'IDENTIFIER_UNVERIFIED_AMBIGUOUS',
  'CSRF_TOKEN_REQUIRED',
  'INVALID_CSRF_TOKEN'
]);

/**
 * The sign-in request failed before the server said who the user is. Classified
 * by facts only: no answer, the HTTP status (`status`), then `extensions.code`;
 * never by message text.
 */
export function signInFailure(err: unknown, endpoint: string, status: number | undefined): SignInError {
  if (isNetworkError(err)) return new SignInError('backend-unreachable', describeAuthError(err));
  if (status === 429) return new SignInError('refused', `The server at ${endpoint} refused the sign-in: too many requests (HTTP 429). Wait, then retry.`, 'HTTP_429');
  if (status !== undefined && (status < 200 || status >= 300)) {
    return new SignInError('server-error', `The server at ${endpoint} answered the sign-in with HTTP ${status}. Retry later, or check the backend logs.`, `HTTP_${status}`);
  }
  const refusal = errorCodes(err).find((code) => REFUSAL_CODES.has(code));
  if (refusal) return new SignInError('refused', `The server at ${endpoint} refused the sign-in (${refusal}). Wait, then retry, or sign in through the app.`, refusal);
  const code = errorCodes(err)[0];
  return new SignInError('server-error', `The server at ${endpoint} failed to answer the sign-in (${describeAuthError(err)}). Retry later, or check the backend logs.`, code);
}
