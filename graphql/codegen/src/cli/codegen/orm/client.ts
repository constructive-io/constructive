/**
 * ORM Client - Type stub for compile-time type checking
 *
 * This is a stub file that provides type definitions for query-builder.ts
 * during compilation. The actual client.ts is generated at codegen time
 * from the generateOrmClientFile() function in client-generator.ts.
 *
 * @internal This file is NOT part of the generated output
 */

export interface OrmClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
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

export type QueryResult<T> =
  | { ok: true; data: T; errors: undefined }
  | { ok: false; data: null; errors: GraphQLError[] };

export class OrmClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(config: OrmClientConfig) {
    this.endpoint = config.endpoint;
    this.headers = config.headers ?? {};
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
