/** GraphQL transport with deterministic timeout, cancellation, and failures. */

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export type GraphQLClientErrorCode =
  | 'GRAPHQL_HTTP_ERROR'
  | 'GRAPHQL_NETWORK_ERROR'
  | 'GRAPHQL_TIMEOUT'
  | 'GRAPHQL_CANCELLED'
  | 'GRAPHQL_RESPONSE_INVALID'
  | 'GRAPHQL_RESPONSE_ERROR';

export interface GraphQLClientError {
  code: GraphQLClientErrorCode;
  category:
    | 'http'
    | 'network'
    | 'timeout'
    | 'cancelled'
    | 'protocol'
    | 'graphql';
  message: string;
  retryable: boolean;
  status?: number;
  details?: Record<string, unknown>;
}

export interface QueryResult<T> {
  ok: boolean;
  /** Partial data is preserved when GraphQL returns both data and errors. */
  data: T | null;
  errors?: GraphQLError[];
  error?: GraphQLClientError;
  status?: number;
}

export type FetchImplementation = typeof fetch;

export interface ClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetch?: FetchImplementation;
}

export interface GraphQLRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  operationName?: string;
  fetch?: FetchImplementation;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function failed<T>(
  error: GraphQLClientError,
  options: { data?: T | null; errors?: GraphQLError[]; status?: number } = {}
): QueryResult<T> {
  return {
    ok: false,
    data: options.data ?? null,
    errors: options.errors,
    error,
    status: options.status,
  };
}

function parseGraphQLErrors(value: unknown): GraphQLError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const errors: GraphQLError[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as { message?: unknown }).message !== 'string'
    ) {
      return undefined;
    }
    errors.push(candidate as GraphQLError);
  }
  return errors;
}

function statusRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Execute a GraphQL request. Transport and protocol failures are returned as
 * typed values so a terminal adapter can map them without parsing prose.
 */
export async function executeGraphQL<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
  options: GraphQLRequestOptions = {}
): Promise<QueryResult<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return failed({
      code: 'GRAPHQL_RESPONSE_INVALID',
      category: 'protocol',
      message: 'GraphQL timeout must be a positive number of milliseconds.',
      retryable: false,
    });
  }

  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    controller.abort(options.signal.reason);
  } else {
    options.signal?.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('GraphQL request timed out.'));
  }, timeoutMs);

  try {
    const response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query,
        variables: variables ?? {},
        ...(options.operationName
          ? { operationName: options.operationName }
          : {}),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        return failed(
          {
            code: 'GRAPHQL_HTTP_ERROR',
            category: 'http',
            message: `GraphQL endpoint returned HTTP ${response.status}.`,
            retryable: statusRetryable(response.status),
            status: response.status,
            details: {
              contentType: response.headers.get('content-type') ?? undefined,
              responseWasJson: false,
            },
          },
          { status: response.status }
        );
      }
      return failed(
        {
          code: 'GRAPHQL_RESPONSE_INVALID',
          category: 'protocol',
          message: 'GraphQL endpoint returned a non-JSON response.',
          retryable: false,
          status: response.status,
          details: {
            contentType: response.headers.get('content-type') ?? undefined,
          },
        },
        { status: response.status }
      );
    }

    const record =
      typeof payload === 'object' && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : undefined;
    const graphQLErrors = record
      ? parseGraphQLErrors(record.errors)
      : undefined;
    const hasData = record
      ? Object.prototype.hasOwnProperty.call(record, 'data')
      : false;
    const data = hasData ? (record!.data as T | null) : null;

    if (!response.ok) {
      return failed(
        {
          code: 'GRAPHQL_HTTP_ERROR',
          category: 'http',
          message: `GraphQL endpoint returned HTTP ${response.status}.`,
          retryable: statusRetryable(response.status),
          status: response.status,
        },
        { data, errors: graphQLErrors, status: response.status }
      );
    }

    if (
      !record ||
      (!hasData && (!graphQLErrors || graphQLErrors.length === 0))
    ) {
      return failed(
        {
          code: 'GRAPHQL_RESPONSE_INVALID',
          category: 'protocol',
          message: 'GraphQL endpoint returned an invalid response envelope.',
          retryable: false,
          status: response.status,
        },
        { status: response.status }
      );
    }
    if (record.errors !== undefined && !graphQLErrors) {
      return failed(
        {
          code: 'GRAPHQL_RESPONSE_INVALID',
          category: 'protocol',
          message: 'GraphQL response errors field is malformed.',
          retryable: false,
          status: response.status,
        },
        { data, status: response.status }
      );
    }
    if (graphQLErrors && graphQLErrors.length > 0) {
      return failed(
        {
          code: 'GRAPHQL_RESPONSE_ERROR',
          category: 'graphql',
          message: 'GraphQL operation completed with errors.',
          retryable: false,
          status: response.status,
        },
        { data, errors: graphQLErrors, status: response.status }
      );
    }
    return { ok: true, data, status: response.status };
  } catch (cause) {
    if (timedOut) {
      return failed({
        code: 'GRAPHQL_TIMEOUT',
        category: 'timeout',
        message: `GraphQL request exceeded its ${timeoutMs}ms timeout.`,
        retryable: true,
        details: { timeoutMs },
      });
    }
    if (options.signal?.aborted || controller.signal.aborted) {
      return failed({
        code: 'GRAPHQL_CANCELLED',
        category: 'cancelled',
        message: 'GraphQL request was cancelled.',
        retryable: true,
      });
    }
    return failed({
      code: 'GRAPHQL_NETWORK_ERROR',
      category: 'network',
      message: 'Unable to reach the GraphQL endpoint.',
      retryable: true,
      details: {
        cause: cause instanceof Error ? cause.name : 'UnknownError',
      },
    });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

/** Create a configured endpoint client. */
export function createClient(config: ClientConfig) {
  return {
    execute: <T>(
      query: string,
      variables?: Record<string, unknown>,
      options: Omit<GraphQLRequestOptions, 'timeoutMs' | 'fetch'> = {}
    ): Promise<QueryResult<T>> =>
      executeGraphQL<T>(config.endpoint, query, variables, config.headers, {
        ...options,
        timeoutMs: config.timeoutMs,
        fetch: config.fetch,
      }),
    config,
  };
}
