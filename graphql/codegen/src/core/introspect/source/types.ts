/**
 * Schema Source Types
 *
 * Defines the interface for schema sources, allowing the codegen pipeline
 * to work with both live GraphQL endpoints and static schema files.
 */
import type { IntrospectionQueryResponse } from '../../../types/introspection';

/**
 * Field-level type metadata from _meta.
 * Contains PostgreSQL-specific type info not available from GraphQL introspection.
 */
export interface MetaFieldType {
  pgType: string;
  gqlType: string;
  isArray: boolean;
}

/**
 * Field metadata from _meta.
 */
export interface MetaFieldInfo {
  name: string;
  type: MetaFieldType;
}

/**
 * Table metadata from the _meta query.
 * Provides field-level pgType info and M:N relation junction key details
 * that aren't available from standard GraphQL introspection alone.
 */
export interface MetaTableInfo {
  name: string;
  schemaName: string;
  fields?: MetaFieldInfo[];
  relations: {
    manyToMany: Array<{
      fieldName: string | null;
      type: string | null;
      junctionTable: { name: string };
      junctionLeftKeyAttributes: Array<{ name: string }>;
      junctionRightKeyAttributes: Array<{ name: string }>;
      leftKeyAttributes: Array<{ name: string }>;
      rightKeyAttributes: Array<{ name: string }>;
      rightTable: { name: string };
    }>;
  };
}

/**
 * Result from fetching a schema source
 */
export interface SchemaSourceResult {
  /**
   * The GraphQL introspection data
   */
  introspection: IntrospectionQueryResponse;

  /**
   * Optional table metadata from _meta query.
   * Provides field-level pgType info and M:N junction key details.
   * Present when the source supports _meta (database mode or endpoints with MetaSchemaPlugin),
   * or loaded from a metaFile JSON sidecar in file/schemaDir mode.
   */
  tablesMeta?: MetaTableInfo[];
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
    public readonly cause?: Error,
  ) {
    super(`${message} (source: ${source})`);
    this.name = 'SchemaSourceError';

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, SchemaSourceError.prototype);
  }
}
