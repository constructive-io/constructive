/**
 * ORM Client - Runtime GraphQL executor
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides the core ORM client functionality for executing GraphQL operations.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

export type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

/**
 * Default adapter that uses fetch for HTTP requests.
 * This is used when no custom adapter is provided.
 */
export class FetchAdapter implements GraphQLAdapter {
  private headers: Record<string, string>;

  constructor(
    private endpoint: string,
    headers?: Record<string, string>,
  ) {
    this.headers = headers ?? {};
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        query: document,
        variables: variables ?? {},
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        errors: [
          { message: `HTTP ${response.status}: ${response.statusText}` },
        ],
      };
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: GraphQLError[];
    };

    if (json.errors && json.errors.length > 0) {
      return {
        ok: false,
        data: null,
        errors: json.errors,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      errors: undefined,
    };
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

/**
 * Configuration for creating an ORM client.
 * Either provide endpoint (and optional headers) for HTTP requests,
 * or provide a custom adapter for alternative execution strategies.
 */
export interface OrmClientConfig {
  /** GraphQL endpoint URL (required if adapter not provided) */
  endpoint?: string;
  /** Default headers for HTTP requests (only used with endpoint) */
  headers?: Record<string, string>;
  /** Custom adapter for GraphQL execution (overrides endpoint/headers) */
  adapter?: GraphQLAdapter;
}

/**
 * Error thrown when GraphQL request fails
 */
export class GraphQLRequestError extends Error {
  constructor(
    public readonly errors: GraphQLError[],
    public readonly data: unknown = null,
  ) {
    const messages = errors.map((e) => e.message).join('; ');
    super(`GraphQL Error: ${messages}`);
    this.name = 'GraphQLRequestError';
  }
}

export class OrmClient {
  private adapter: GraphQLAdapter;

  constructor(config: OrmClientConfig) {
    if (config.adapter) {
      this.adapter = config.adapter;
    } else if (config.endpoint) {
      this.adapter = new FetchAdapter(config.endpoint, config.headers);
    } else {
      throw new Error(
        'OrmClientConfig requires either an endpoint or a custom adapter',
      );
    }
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    return this.adapter.execute<T>(document, variables);
  }

  /**
   * Set headers for requests.
   * Only works if the adapter supports headers.
   */
  setHeaders(headers: Record<string, string>): void {
    if (this.adapter.setHeaders) {
      this.adapter.setHeaders(headers);
    }
  }

  /**
   * Get the endpoint URL.
   * Returns empty string if the adapter doesn't have an endpoint.
   */
  getEndpoint(): string {
    return this.adapter.getEndpoint?.() ?? '';
  }
}
