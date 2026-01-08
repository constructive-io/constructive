/**
 * Schema Source Module
 *
 * Provides a unified interface for loading GraphQL schemas from different sources:
 * - Live GraphQL endpoints (via introspection)
 * - Static .graphql schema files
 */
export * from './types';
export * from './endpoint';
export * from './file';

import type { SchemaSource } from './types';
import { EndpointSchemaSource } from './endpoint';
import { FileSchemaSource } from './file';

export interface CreateSchemaSourceOptions {
  /**
   * GraphQL endpoint URL (for live introspection)
   */
  endpoint?: string;

  /**
   * Path to GraphQL schema file (.graphql)
   */
  schema?: string;

  /**
   * Optional authorization header for endpoint requests
   */
  authorization?: string;

  /**
   * Optional additional headers for endpoint requests
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (for endpoint requests)
   */
  timeout?: number;
}

/**
 * Create a schema source based on configuration
 *
 * @param options - Source configuration
 * @returns Appropriate SchemaSource implementation
 * @throws Error if neither endpoint nor schema is provided
 */
export function createSchemaSource(
  options: CreateSchemaSourceOptions
): SchemaSource {
  if (options.schema) {
    return new FileSchemaSource({
      schemaPath: options.schema,
    });
  }

  if (options.endpoint) {
    return new EndpointSchemaSource({
      endpoint: options.endpoint,
      authorization: options.authorization,
      headers: options.headers,
      timeout: options.timeout,
    });
  }

  throw new Error(
    'Either endpoint or schema must be provided. ' +
      'Use --endpoint for live introspection or --schema for a local file.'
  );
}

/**
 * Validate that source options are valid (at least one source specified)
 */
export function validateSourceOptions(options: CreateSchemaSourceOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options.endpoint && !options.schema) {
    return {
      valid: false,
      error: 'Either endpoint or schema must be provided',
    };
  }

  if (options.endpoint && options.schema) {
    return {
      valid: false,
      error: 'Cannot use both endpoint and schema. Choose one source.',
    };
  }

  return { valid: true };
}
