/**
 * Client generator - generates client.ts with configure() and execute()
 */
import { getGeneratedFileHeader } from './utils';

/**
 * Generate client.ts content
 */
export function generateClientFile(): string {
  return `${getGeneratedFileHeader('GraphQL client configuration and execution')}

// ============================================================================
// Configuration
// ============================================================================

export interface GraphQLClientConfig {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
}

let globalConfig: GraphQLClientConfig | null = null;

/**
 * Configure the GraphQL client
 *
 * @example
 * \`\`\`ts
 * import { configure } from './generated';
 *
 * configure({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: {
 *     Authorization: 'Bearer <token>',
 *   },
 * });
 * \`\`\`
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
 * \`\`\`ts
 * setHeader('Authorization', 'Bearer <new-token>');
 * \`\`\`
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
 * \`\`\`ts
 * setHeaders({ Authorization: 'Bearer <token>', 'X-Custom': 'value' });
 * \`\`\`
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
 * \`\`\`ts
 * const result = await execute<CarsQueryResult, CarsQueryVariables>(
 *   carsQueryDocument,
 *   { first: 10 }
 * );
 * \`\`\`
 */
export async function execute<TData = unknown, TVariables = Record<string, unknown>>(
  document: string,
  variables?: TVariables,
  options?: ExecuteOptions
): Promise<TData> {
  const config = getConfig();

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
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
export async function executeWithErrors<TData = unknown, TVariables = Record<string, unknown>>(
  document: string,
  variables?: TVariables,
  options?: ExecuteOptions
): Promise<{ data: TData | null; errors: GraphQLError[] | null }> {
  const config = getConfig();

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
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
`;
}
