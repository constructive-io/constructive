// A GraphQL POST that keeps what the SDK's FetchAdapter throws away. That
// adapter turns any non-2xx into `HTTP 403: Forbidden` and drops the body, so
// a tenant API's `ACCESS_SUSPENDED` (a 403 with a JSON body, sent for a
// deleted or suspended database) reads the same as any other refusal. Here
// the body's errors keep their `extensions.code`, and every error carries the
// HTTP status it arrived with.

import { listed } from '@agentic-kit/harness';
import {
  createFetch,
  type GraphQLAdapter,
  type GraphQLError,
  type QueryResult,
} from '@constructive-io/graphql-query/runtime';

export type { GraphQLError };

export type HttpGraphQLResponse<T> = {
  /** The response status, or null when no response arrived. */
  httpStatus: number | null;
  data: T | null;
  /**
   * Body errors, each with `extensions.httpStatus` added. A non-2xx without
   * body errors becomes one `{ code: 'HTTP_ERROR', httpStatus }` error, and a
   * fetch that threw becomes one `{ code: 'NETWORK' }` error.
   */
  errors: GraphQLError[];
};

export type PostGraphQLArgs = {
  endpoint: string;
  headers?: Record<string, string>;
  query: string;
  variables?: Record<string, unknown>;
  /** The operation to run, when the document holds more than one. */
  operationName?: string;
  fetchFn?: typeof fetch;
};

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export async function postGraphQL<T>(args: PostGraphQLArgs): Promise<HttpGraphQLResponse<T>> {
  const fetchFn = (args.fetchFn ?? createFetch()).bind(globalThis) as typeof fetch;
  let response: Response;
  try {
    response = await fetchFn(args.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...args.headers,
      },
      body: JSON.stringify({
        query: args.query,
        variables: args.variables ?? {},
        ...(args.operationName === undefined ? {} : { operationName: args.operationName }),
      }),
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: unknown } } | null)?.cause?.code;
    return {
      httpStatus: null,
      data: null,
      errors: [
        {
          message: typeof cause === 'string' ? `${errorText(err)} (${cause})` : errorText(err),
          extensions: { code: 'NETWORK' },
        },
      ],
    };
  }

  const httpStatus = response.status;
  const retryAfter = retryAfterSeconds(response.headers?.get?.('Retry-After') ?? null);
  const waited = retryAfter === undefined ? {} : { retryAfterSeconds: retryAfter };
  let body: { data?: T | null; errors?: GraphQLError[] } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const bodyErrors = Array.isArray(body?.errors) ? body.errors : [];
  if (bodyErrors.length > 0) {
    return {
      httpStatus,
      data: body?.data ?? null,
      errors: bodyErrors.map((error) => ({
        ...error,
        message: error?.message ?? '',
        extensions: { ...error?.extensions, httpStatus, ...waited },
      })),
    };
  }
  if (!response.ok || !body) {
    const text = response.statusText ? `: ${response.statusText}` : '';
    return {
      httpStatus,
      data: null,
      errors: [
        {
          message: response.ok ? `HTTP ${httpStatus}${text} (the body was not JSON)` : `HTTP ${httpStatus}${text}`,
          extensions: { code: 'HTTP_ERROR', httpStatus, ...waited },
        },
      ],
    };
  }
  return { httpStatus, data: body.data ?? null, errors: [] };
}

/**
 * An ORM adapter over `postGraphQL`: the SDK clients take it in place of their
 * FetchAdapter, and their failures then carry the status and code.
 */
export function statusAdapter(
  endpoint: string,
  headers?: Record<string, string>,
  fetchFn?: typeof fetch,
): GraphQLAdapter {
  let current = { ...headers };
  return {
    async execute<T>(document: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
      const result = await postGraphQL<T>({ endpoint, headers: current, query: document, variables, fetchFn });
      return result.errors.length > 0
        ? { ok: false, data: null, errors: result.errors }
        : { ok: true, data: result.data as T, errors: undefined };
    },
    setHeaders(next: Record<string, string>) {
      current = { ...current, ...next };
    },
    getEndpoint: () => endpoint,
  };
}

export type BackendErrorKind = 'suspended' | 'auth' | 'forbidden' | 'rate-limited' | 'server' | 'network' | 'graphql';

// The backend's own codes for a request it limits (admission-control.ts), which it answers with 429.
const LIMITED = new Set(['RATE_LIMITED', 'CONCURRENCY_LIMIT_REACHED']);

/** Whether the backend limited the request (a 429, or its code): the step is to wait. */
export const isRateLimited = (error: GraphQLError): boolean => LIMITED.has(codeOf(error) ?? '') || statusOf(error) === 429;

/** The seconds the backend asked to wait (its Retry-After), when it said. */
export function retryAfterOf(errors: readonly GraphQLError[]): number | undefined {
  const seconds = (errors ?? []).map((error) => error?.extensions?.retryAfterSeconds).find((value) => typeof value === 'number');
  return seconds as number | undefined;
}

// Retry-After is seconds, or an HTTP date.
function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim());
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

// The code of a public error. An internal error may keep a public-looking
// code (FORBIDDEN) over a masked message, so its code means nothing.
const codeOf = (error: GraphQLError): string | undefined => {
  const code = error?.extensions?.code;
  return typeof code === 'string' && error?.extensions?.class !== 'internal' ? code : undefined;
};

/**
 * The HTTP status of one error: the one the server put inside it
 * (`extensions.http`, since it answers every GraphQL request with HTTP 200),
 * else the response's own (`extensions.httpStatus`, added by `postGraphQL`),
 * else the one in the SDK FetchAdapter's "HTTP 503: …" message, which drops
 * the body.
 */
export function statusOf(error: GraphQLError): number | undefined {
  for (const status of [error?.extensions?.http, error?.extensions?.httpStatus]) {
    if (typeof status === 'number') return status;
  }
  const match = /^HTTP (\d{3})\b/.exec(error?.message ?? '');
  return match ? Number(match[1]) : undefined;
}

/**
 * What a failed backend answer says, by its code and status, first match
 * wins: the database is suspended or gone (`ACCESS_SUSPENDED`), no response,
 * the backend limiting requests (429), the backend failing (5xx), a rejected credential (401,
 * `UNAUTHENTICATED`), a refusal (403, `FORBIDDEN`), or anything else.
 */
const SIGNED_OUT_CODES = new Set(['UNAUTHENTICATED', 'NOT_AUTHENTICATED', 'USER_NOT_AUTHENTICATED']);

/** Whether a public code says the request's sign-in has ended or is missing (packages/errors registry). */
export const isSignedOutCode = (code: string | undefined): boolean => SIGNED_OUT_CODES.has(code ?? '');

/** Whether an error says the backend did not accept the request's credential: one of those codes, or a 401. */
export const isSignedOut = (error: GraphQLError): boolean => statusOf(error) === 401 || isSignedOutCode(codeOf(error));

/** Whether a thrown SDK error carries an answer that says so. */
export const answersSignedOut = (err: unknown): boolean => {
  const errors = (err as { errors?: unknown } | null)?.errors;
  return Array.isArray(errors) && (errors as GraphQLError[]).some(isSignedOut);
};

export function classifyBackendErrors(errors: readonly GraphQLError[]): BackendErrorKind {
  const list = errors ?? [];
  const some = (test: (error: GraphQLError) => boolean) => list.some((error) => test(error));
  if (some((e) => codeOf(e) === 'ACCESS_SUSPENDED')) return 'suspended';
  if (some((e) => codeOf(e) === 'NETWORK')) return 'network';
  if (some(isRateLimited)) return 'rate-limited';
  if (
    some((e) => {
      const status = statusOf(e);
      return status !== undefined && status >= 500;
    })
  ) {
    return 'server';
  }
  if (some(isSignedOut)) return 'auth';
  if (some((e) => statusOf(e) === 403 || codeOf(e) === 'FORBIDDEN')) return 'forbidden';
  return 'graphql';
}

// A code a server means for its caller is a word in capitals (FORBIDDEN, UNIQUE_VIOLATION). A database error's own
// code has a digit in its first word, so it is never named.
const PUBLIC_CODE = /^[A-Z]+(?:_[A-Z0-9]+)*$/;

// One error in fixed words: a logged error by its id, else its public code, else its HTTP status.
function errorWords(error: GraphQLError): string {
  const id = error?.extensions?.errorId;
  if (typeof id === 'string') return `an internal error (error id ${id})`;
  const code = codeOf(error);
  if (code && PUBLIC_CODE.test(code)) return `the code ${code}`;
  const status = statusOf(error);
  return status === undefined || status === 200 ? 'an error without a public code' : `HTTP ${status}`;
}

/**
 * What a failed answer was, in fixed words: each error's public code, HTTP status or error id. The text a server writes
 * is never in them, since a server can pass the database's own text through, with internal table names and error
 * codes. Only a request that got no answer keeps its text, which postGraphQL made from the local fetch failure.
 */
export function answerText(errors: readonly GraphQLError[]): string {
  const list = errors ?? [];
  const unanswered = list.find((error) => codeOf(error) === 'NETWORK' && error?.extensions?.httpStatus === undefined);
  if (unanswered) return `the backend did not answer (${unanswered.message || 'no response'})`;
  const words = [...new Set(list.map(errorWords))];
  return `the backend answered with ${words.length ? listed(words) : 'an error without a public code'}`;
}

/** A thrown error in words that hold no server text: an SDK error by its GraphQL errors, any other by its own message. */
export function thrownText(err: unknown): string {
  const errors = (err as { errors?: unknown } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) return answerText(errors as GraphQLError[]);
  return err instanceof Error ? err.message : String(err);
}
