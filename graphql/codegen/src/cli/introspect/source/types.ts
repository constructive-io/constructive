/**
 * Schema Source Types
 *
 * Defines the interface for schema sources, allowing the codegen pipeline
 * to work with both live GraphQL endpoints and static schema files.
 */
import type { IntrospectionQueryResponse } from '../../../types/introspection';

/**
 * Result from fetching a schema source
 */
export interface SchemaSourceResult {
  /**
   * The GraphQL introspection data
   */
  introspection: IntrospectionQueryResponse;
}

/**
 * Abstract interface for schema sources
 *
 * Implementations:
 * - EndpointSchemaSource: Fetches from a live GraphQL endpoint
 * - FileSchemaSource: Loads from a local .graphql schema file
 */
export interface SchemaSource {
  /**
   * Fetch or load the GraphQL introspection data
   * @throws SchemaSourceError if fetching fails
   */
  fetch(): Promise<SchemaSourceResult>;

  /**
   * Human-readable description of the source (for logging)
   * @example "endpoint: https://api.example.com/graphql"
   * @example "file: ./schema.graphql"
   */
  describe(): string;
}

/**
 * Error thrown when a schema source fails to fetch
 */
export class SchemaSourceError extends Error {
  constructor(
    message: string,
    /**
     * Description of the source that failed
     */
    public readonly source: string,
    /**
     * Original error that caused the failure
     */
    public readonly cause?: Error
  ) {
    super(`${message} (source: ${source})`);
    this.name = 'SchemaSourceError';

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, SchemaSourceError.prototype);
  }
}
