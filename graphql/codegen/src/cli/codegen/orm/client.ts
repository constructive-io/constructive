/**
 * ORM Client - Type stub for compile-time type checking
 *
 * This is a stub file that provides type definitions for query-builder.ts
 * during compilation. The actual client.ts is generated at codegen time
 * from the generateOrmClientFile() function in client-generator.ts.
 *
 * @internal This file is NOT part of the generated output
 */

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export type QueryResult<T> =
  | { ok: true; data: T; errors: undefined }
  | { ok: false; data: null; errors: GraphQLError[] };

/**
 * Pluggable adapter interface for GraphQL execution.
 * Implement this interface to provide custom execution logic (e.g., for testing).
 */
export interface GraphQLAdapter {
  execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>>;
}

/**
 * Default adapter that uses fetch for HTTP requests.
 */
export class FetchAdapter implements GraphQLAdapter {
  private headers: Record<string, string>;

  constructor(
    private endpoint: string,
    headers?: Record<string, string>
  ) {
    this.headers = headers ?? {};
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
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
        errors: [{ message: `HTTP ${response.status}: ${response.statusText}` }],
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
 */
export interface OrmClientConfig {
  /** GraphQL endpoint URL (required if adapter not provided) */
  endpoint?: string;
  /** Default headers for HTTP requests (only used with endpoint) */
  headers?: Record<string, string>;
  /** Custom adapter for GraphQL execution (overrides endpoint/headers) */
  adapter?: GraphQLAdapter;
}

export class GraphQLRequestError extends Error {
  constructor(
    public readonly errors: GraphQLError[],
    public readonly data: unknown = null
  ) {
    const messages = errors.map((e) => e.message).join('; ');
    super(`GraphQL Error: ${messages}`);
    this.name = 'GraphQLRequestError';
  }
}

export class OrmClient {
  private adapter: GraphQLAdapter;
  private fetchAdapter: FetchAdapter | null = null;

  constructor(config: OrmClientConfig) {
    if (config.adapter) {
      this.adapter = config.adapter;
    } else if (config.endpoint) {
      this.fetchAdapter = new FetchAdapter(config.endpoint, config.headers);
      this.adapter = this.fetchAdapter;
    } else {
      throw new Error(
        'OrmClientConfig requires either an endpoint or a custom adapter'
      );
    }
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    return this.adapter.execute<T>(document, variables);
  }

  setHeaders(headers: Record<string, string>): void {
    if (this.fetchAdapter) {
      this.fetchAdapter.setHeaders(headers);
    }
  }

  getEndpoint(): string {
    if (this.fetchAdapter) {
      return this.fetchAdapter.getEndpoint();
    }
    return '';
  }
}
