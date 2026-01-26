/**
 * GraphQL client for the CNC execution engine
 * Re-exports and wraps the graphql-codegen client utilities
 */

import {
  execute,
  type ExecuteOptions,
  DataError,
  DataErrorType,
  parseGraphQLError,
  isDataError,
} from '@constructive-io/graphql-codegen';

export {
  DataError,
  DataErrorType,
  parseGraphQLError,
  isDataError,
};

export type { ExecuteOptions };

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface QueryResult<T> {
  ok: boolean;
  data: T | null;
  errors?: GraphQLError[];
}

export interface ClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

/**
 * Create a client that returns QueryResult instead of throwing
 */
export function createClient(config: ClientConfig) {
  return {
    async execute<T>(
      document: string,
      variables?: Record<string, unknown>
    ): Promise<QueryResult<T>> {
      try {
        const data = await execute(config.endpoint, document, variables, {
          headers: config.headers,
        });
        return {
          ok: true,
          data: data as T,
        };
      } catch (error) {
        const dataError = parseGraphQLError(error);
        return {
          ok: false,
          data: null,
          errors: [
            {
              message: dataError.message,
              extensions: dataError.context,
            },
          ],
        };
      }
    },
    config,
    getEndpoint: () => config.endpoint,
  };
}
