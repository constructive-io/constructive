const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET'
]);

function errorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const { code, cause } = err as { code?: unknown; cause?: unknown };
  if (typeof code === 'string') return code;
  if (cause && typeof cause === 'object') {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === 'string') return causeCode;
  }
  return undefined;
}

export function isNetworkError(err: unknown): boolean {
  const code = errorCode(err);
  if (code !== undefined) return NETWORK_ERROR_CODES.has(code);
  if (err instanceof AggregateError) return true;
  return err instanceof TypeError && /fetch failed/i.test(err.message);
}

function extractGraphqlMessages(err: unknown): string[] {
  const messages: string[] = [];
  const codes: string[] = [];
  const visited = new Set<object>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim() !== '') {
      const message = record.message.trim().replace(/^GraphQL Error:\s*/u, '');
      if (message.length > 0) messages.push(message);
    }
    const extensions =
      record.extensions && typeof record.extensions === 'object'
        ? (record.extensions as Record<string, unknown>)
        : undefined;
    if (typeof extensions?.code === 'string') codes.push(extensions.code);
    if (Array.isArray(record.errors)) record.errors.forEach(visit);
    if (record.cause) visit(record.cause);
    if (record.extensions) visit(record.extensions);
    if (record.detail) visit(record.detail);
    if (record.data) visit(record.data);
    if (record.response) visit(record.response);
    if (record.result) visit(record.result);
    if (record.payload) visit(record.payload);
  };
  visit(err);
  if (messages.length === 0) {
    for (const code of codes) {
      if (code === 'UNAUTHENTICATED') messages.push('Your session has expired. Sign in again.');
      if (code === 'FORBIDDEN') {
        messages.push('The server rejected this request. Check your account permissions.');
      }
    }
  }
  return [...new Set(messages)];
}

export function describeAuthError(err: unknown, endpoint: string): string {
  if (isNetworkError(err)) {
    return `Could not reach the server at ${endpoint}. Check that it is running, or pick a different backend.`;
  }
  const graphqlMessages = extractGraphqlMessages(err);
  if (graphqlMessages.length > 0) return graphqlMessages.join('; ');
  const message = err instanceof Error ? err.message : String(err);
  if (message.trim() !== '' && message !== '[object Object]') return message;
  const name = err instanceof Error ? err.name : typeof err;
  return `Authentication failed unexpectedly (${name}).`;
}

export const AUTH_TIMEOUT_MS = 10_000;

export function withAuthTimeout<T>(
  promise: Promise<T>,
  endpoint: string,
  ms: number = AUTH_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `The server at ${endpoint} did not respond within ${Math.round(ms / 1000)}s. Check the backend settings and try again.`
        )
      );
    }, ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });
}
