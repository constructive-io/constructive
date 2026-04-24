import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

import { fetch } from './fetch';

export interface NodeHttpExecuteOptions {
  /** Additional headers to include in this request only */
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * GraphQL adapter that uses Node's native HTTP for requests.
 *
 * Preserved for backwards compatibility. New code should prefer:
 *
 *   import { fetch } from '@constructive-io/node';
 *   auth.createClient({ endpoint, fetch });
 *
 * The adapter now delegates to that same `fetch` internally, so behaviour
 * (`*.localhost` rewriting, Host header preservation) matches exactly.
 */
export class NodeHttpAdapter implements GraphQLAdapter {
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
    options?: NodeHttpExecuteOptions,
  ): Promise<QueryResult<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.headers,
        ...options?.headers,
      },
      body: JSON.stringify({
        query: document,
        variables: variables ?? {},
      }),
      signal: options?.signal,
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
      return { ok: false, data: null, errors: json.errors };
    }

    return { ok: true, data: json.data as T, errors: undefined };
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}
