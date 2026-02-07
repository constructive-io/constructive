/**
 * GraphQL execution utilities
 */

import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

import { createError, type DataError,parseGraphQLError } from './error';
import { TypedDocumentString } from './typed-document';

// ============================================================================
// Types
// ============================================================================

type ExecutableDocument =
  | TypedDocumentString<unknown, unknown>
  | DocumentNode
  | string;

type ResultOf<TDocument> = TDocument extends TypedDocumentString<infer TResult, unknown>
  ? TResult
  : unknown;

type VariablesOf<TDocument> = TDocument extends TypedDocumentString<unknown, infer TVariables>
  ? TVariables
  : Record<string, unknown>;

export interface ExecuteOptions {
  /** Custom headers to include */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: { code?: string } & Record<string, unknown>;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

// ============================================================================
// Helpers
// ============================================================================

function documentToString(document: ExecutableDocument): string {
  if (typeof document === 'string') return document;
  if (document instanceof TypedDocumentString) return document.toString();
  // DocumentNode
  if (document && typeof document === 'object' && 'kind' in document) {
    return print(document);
  }
  throw createError.badRequest('Invalid GraphQL document');
}

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Execute a GraphQL operation against an endpoint
 */
export async function execute<TDocument extends ExecutableDocument>(
  endpoint: string,
  document: TDocument,
  variables?: VariablesOf<TDocument>,
  options: ExecuteOptions = {}
): Promise<ResultOf<TDocument>> {
  const { headers = {}, timeout = 30000, signal } = options;

  // Create timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine signals if provided
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/graphql-response+json, application/json',
        ...headers
      },
      body: JSON.stringify({
        query: documentToString(document),
        ...(variables !== undefined && { variables })
      }),
      signal: combinedSignal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await handleHttpError(response);
    }

    const result: GraphQLResponse<ResultOf<TDocument>> = await response.json();

    if (result.errors?.length) {
      throw parseGraphQLError(result.errors[0]);
    }

    return result.data as ResultOf<TDocument>;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw createError.timeout();
    }

    if (error instanceof Error && error.message.includes('fetch')) {
      throw createError.network(error);
    }

    throw parseGraphQLError(error);
  }
}

async function handleHttpError(response: Response): Promise<DataError> {
  const { status, statusText } = response;

  if (status === 401) {
    return createError.unauthorized('Authentication required');
  }

  if (status === 403) {
    return createError.forbidden('Access forbidden');
  }

  if (status === 404) {
    return createError.notFound('GraphQL endpoint not found');
  }

  // Try to extract error from response body
  try {
    const body = await response.json();
    if (body.errors?.length) {
      return parseGraphQLError(body.errors[0]);
    }
    if (body.message) {
      return createError.badRequest(body.message);
    }
  } catch {
    // Couldn't parse response
  }

  return createError.badRequest(`Request failed: ${status} ${statusText}`);
}

// ============================================================================
// GraphQL Client Factory
// ============================================================================

export interface GraphQLClientOptions {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Default headers to include with every request */
  headers?: Record<string, string>;
  /** Default timeout in milliseconds */
  timeout?: number;
}

/**
 * Create a GraphQL client instance
 */
export function createGraphQLClient(options: GraphQLClientOptions) {
  const { endpoint, headers: defaultHeaders = {}, timeout: defaultTimeout = 30000 } = options;

  return {
    /**
     * Execute a GraphQL operation
     */
    async execute<TDocument extends ExecutableDocument>(
      document: TDocument,
      variables?: VariablesOf<TDocument>,
      options: ExecuteOptions = {}
    ): Promise<ResultOf<TDocument>> {
      return execute(endpoint, document, variables, {
        headers: { ...defaultHeaders, ...options.headers },
        timeout: options.timeout ?? defaultTimeout,
        signal: options.signal
      });
    },

    /**
     * Get the endpoint URL
     */
    getEndpoint(): string {
      return endpoint;
    }
  };
}

export type GraphQLClient = ReturnType<typeof createGraphQLClient>;
