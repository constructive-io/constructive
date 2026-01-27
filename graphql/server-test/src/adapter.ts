/**
 * SuperTest GraphQL Adapter
 *
 * Provides a GraphQLAdapter implementation for use with graphql-server-test,
 * allowing the generated ORM client to work with HTTP server testing
 * while maintaining cookies across requests.
 */

import type supertest from 'supertest';
import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

/**
 * GraphQL adapter that wraps a SuperTest agent for HTTP-based testing.
 * This implements the GraphQLAdapter interface, allowing the SDK
 * to work with the graphql-server-test infrastructure with full HTTP support.
 *
 * Key features:
 * - Maintains cookies across requests (via SuperTest's cookie jar)
 * - Supports custom headers (including CSRF tokens)
 * - Full HTTP request/response cycle for testing middleware
 *
 * @example
 * ```typescript
 * import { getConnections, SuperTestAdapter } from 'graphql-server-test';
 * import { createClient } from '@my-org/my-sdk';
 *
 * const { request, teardown } = await getConnections({ schemas: ['app_public'] });
 *
 * const sdk = createClient({ adapter: new SuperTestAdapter(request) });
 *
 * // Sign in - cookies are automatically stored
 * const signInResult = await sdk.mutation.signIn({
 *   input: { email: 'test@example.com', password: 'password123' }
 * }).execute();
 *
 * // Subsequent requests include cookies automatically
 * const currentUser = await sdk.user.findFirst({
 *   select: { id: true, email: true }
 * }).execute();
 * ```
 */
export class SuperTestAdapter implements GraphQLAdapter {
  private headers: Record<string, string> = {};

  constructor(private agent: supertest.Agent) {}

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    const response = await this.agent
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set(this.headers)
      .send({
        query: document,
        variables: variables ?? {},
      });

    const body = response.body as {
      data?: T;
      errors?: GraphQLError[];
    };

    if (body.errors && body.errors.length > 0) {
      return {
        ok: false,
        data: null,
        errors: body.errors,
      };
    }

    return {
      ok: true,
      data: body.data as T,
      errors: undefined,
    };
  }

  /**
   * Set headers to include in all subsequent requests.
   * Useful for setting CSRF tokens or other custom headers.
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Get the SuperTest agent for direct HTTP access.
   * Useful for non-GraphQL requests (e.g., REST endpoints, file uploads).
   */
  getAgent(): supertest.Agent {
    return this.agent;
  }
}
