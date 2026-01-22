/**
 * GraphQL Test Adapter
 *
 * Provides a GraphQLAdapter implementation for use with graphile-test,
 * allowing the generated ORM client to work with the test infrastructure
 * without needing an HTTP server.
 */

import type { GraphQLQueryFn } from 'graphile-test';
import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

/**
 * GraphQL adapter that wraps the graphile-test query function.
 * This implements the GraphQLAdapter interface, allowing the SDK
 * to work with the graphile-test infrastructure without an HTTP server.
 *
 * @example
 * ```typescript
 * import { getConnections } from '@constructive-io/graphql-test';
 * import { GraphQLTestAdapter } from '@constructive-io/graphql-test';
 * import { createClient } from '@my-org/my-sdk';
 *
 * const db = getConnections({ ... });
 * const { query } = db;
 *
 * const sdk = createClient({ adapter: new GraphQLTestAdapter(query) });
 * const result = await sdk.user.findMany({ select: { id: true } }).execute();
 * ```
 */
export class GraphQLTestAdapter implements GraphQLAdapter {
  constructor(private queryFn: GraphQLQueryFn) {}

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    const result = await this.queryFn(document, variables);

    if (result.errors && result.errors.length > 0) {
      return {
        ok: false,
        data: null,
        errors: result.errors as unknown as GraphQLError[],
      };
    }

    return {
      ok: true,
      data: result.data as T,
      errors: undefined,
    };
  }
}
