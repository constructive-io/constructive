/**
 * GraphQL Adapter Types
 *
 * These types define the interface for GraphQL execution adapters,
 * allowing different execution strategies (HTTP fetch, direct query, etc.)
 * to be used with the generated ORM client.
 */

/**
 * GraphQL error structure
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

/**
 * Discriminated union result type for GraphQL operations.
 * Either succeeds with data or fails with errors.
 */
export type QueryResult<T> =
  | { ok: true; data: T; errors: undefined }
  | { ok: false; data: null; errors: GraphQLError[] };

/**
 * Interface for GraphQL execution adapters.
 * Implement this interface to create custom execution strategies.
 *
 * @example
 * ```typescript
 * // HTTP adapter (default)
 * class FetchAdapter implements GraphQLAdapter {
 *   async execute<T>(document: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
 *     const response = await fetch(this.endpoint, { ... });
 *     // ...
 *   }
 * }
 *
 * // Test adapter
 * class TestAdapter implements GraphQLAdapter {
 *   async execute<T>(document: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
 *     const result = await this.queryFn(document, variables);
 *     // ...
 *   }
 * }
 * ```
 */
export interface GraphQLAdapter {
  /**
   * Execute a GraphQL operation
   */
  execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>>;

  /**
   * Set headers for the adapter (optional, primarily for HTTP adapters)
   */
  setHeaders?(headers: Record<string, string>): void;

  /**
   * Get the endpoint URL (optional, primarily for HTTP adapters)
   */
  getEndpoint?(): string;
}
