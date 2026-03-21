/**
 * GraphQL Adapter for graphile-test
 *
 * Implements the ORM's GraphQLAdapter interface by wrapping
 * graphile-test's query() function. This allows generated ORM
 * models to execute queries against a real PostGraphile schema
 * running on a live PostgreSQL database.
 */
import type { GraphQLQueryFnObj } from 'graphile-test';
import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

export class GraphileTestAdapter implements GraphQLAdapter {
  constructor(private queryFn: GraphQLQueryFnObj) {}

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const result = await this.queryFn<T>({ query: document, variables });

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
