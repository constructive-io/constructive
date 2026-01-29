/**
 * GraphQL client configuration and execution (Browser-compatible)
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Uses native W3C fetch API for browser compatibility.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated clients.
 */

// ============================================================================
// Configuration
// ============================================================================

export interface GraphQLClientConfig {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Dynamic headers callback called on every request */
  getHeaders?: () => Record<string, string>;
}

let globalConfig: GraphQLClientConfig | null = null;

/**
 * Configure the GraphQL client
 *
 * @example
 * ```ts
 * import { configure } from './generated';
 *
 * configure({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: {
 *     Authorization: 'Bearer <token>',
 *   },
 * });
 * ```
 */
export function configure(config: GraphQLClientConfig): void {
  globalConfig = config;
}

/**
 * Get the current configuration
 * @throws Error if not configured
 */
export function getConfig(): GraphQLClientConfig {
  if (!globalConfig) {
    throw new Error(
      'GraphQL client not configured. Call configure() before making requests.'
    );
  }
  return globalConfig;
}

/**
 * Set a single header value
 * Useful for updating Authorization after login
 *
 * @example
 * ```ts
 * setHeader('Authorization', 'Bearer <new-token>');
 * ```
 */
export function setHeader(key: string, value: string): void {
  const config = getConfig();
  globalConfig = {
    ...config,
    headers: { ...config.headers, [key]: value },
  };
}

/**
 * Merge multiple headers into the current configuration
 *
 * @example
 * ```ts
 * setHeaders({ Authorization: 'Bearer <token>', 'X-Custom': 'value' });
 * ```
 */
export function setHeaders(headers: Record<string, string>): void {
  const config = getConfig();
  globalConfig = {
    ...config,
    headers: { ...config.headers, ...headers },
  };
}

// ============================================================================
// Error handling
// ============================================================================

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public errors: GraphQLError[],
    public response?: Response
  ) {
    super(message);
    this.name = 'GraphQLClientError';
  }
}

// ============================================================================
// Execution
// ============================================================================

export interface ExecuteOptions {
  /** Override headers for this request */
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Execute a GraphQL operation
 *
 * @example
 * ```ts
 * const result = await execute<CarsQueryResult, CarsQueryVariables>(
 *   carsQueryDocument,
 *   { first: 10 }
 * );
 * ```
 */
export async function execute<
  TData = unknown,
  TVariables = Record<string, unknown>,
>(
  document: string,
  variables?: TVariables,
  options?: ExecuteOptions
): Promise<TData> {
  const config = getConfig();
  const dynamicHeaders = config.getHeaders?.() ?? {};

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
      ...dynamicHeaders,
      ...options?.headers,
    },
    body: JSON.stringify({
      query: document,
      variables,
    }),
    signal: options?.signal,
  });

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new GraphQLClientError(
      json.errors[0].message || 'GraphQL request failed',
      json.errors,
      response
    );
  }

  return json.data as TData;
}

/**
 * Execute a GraphQL operation with full response (data + errors)
 * Useful when you want to handle partial data with errors
 */
export async function executeWithErrors<
  TData = unknown,
  TVariables = Record<string, unknown>,
>(
  document: string,
  variables?: TVariables,
  options?: ExecuteOptions
): Promise<{ data: TData | null; errors: GraphQLError[] | null }> {
  const config = getConfig();
  const dynamicHeaders = config.getHeaders?.() ?? {};

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
      ...dynamicHeaders,
      ...options?.headers,
    },
    body: JSON.stringify({
      query: document,
      variables,
    }),
    signal: options?.signal,
  });

  const json = await response.json();

  return {
    data: json.data ?? null,
    errors: json.errors ?? null,
  };
}

// ============================================================================
// QueryClient Factory
// ============================================================================

/**
 * Default QueryClient configuration optimized for GraphQL
 *
 * These defaults provide a good balance between freshness and performance:
 * - staleTime: 1 minute - data considered fresh, won't refetch
 * - gcTime: 5 minutes - unused data kept in cache
 * - refetchOnWindowFocus: false - don't refetch when tab becomes active
 * - retry: 1 - retry failed requests once
 */
export const defaultQueryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
};

/**
 * QueryClient options type for createQueryClient
 */
export interface CreateQueryClientOptions {
  defaultOptions?: {
    queries?: {
      staleTime?: number;
      gcTime?: number;
      refetchOnWindowFocus?: boolean;
      retry?: number | boolean;
      retryDelay?: number | ((attemptIndex: number) => number);
    };
    mutations?: {
      retry?: number | boolean;
      retryDelay?: number | ((attemptIndex: number) => number);
    };
  };
}

// Note: createQueryClient is available when using with @tanstack/react-query
// Import QueryClient from '@tanstack/react-query' and use these options:
//
// import { QueryClient } from '@tanstack/react-query';
// const queryClient = new QueryClient(defaultQueryClientOptions);
//
// Or merge with your own options:
// const queryClient = new QueryClient({
//   ...defaultQueryClientOptions,
//   defaultOptions: {
//     ...defaultQueryClientOptions.defaultOptions,
//     queries: {
//       ...defaultQueryClientOptions.defaultOptions.queries,
//       staleTime: 30000, // Override specific options
//     },
//   },
// });
