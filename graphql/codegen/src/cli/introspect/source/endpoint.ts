/**
 * Endpoint Schema Source
 *
 * Fetches GraphQL schema via introspection from a live endpoint.
 * Wraps the existing fetchSchema() function with the SchemaSource interface.
 */
import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';
import { fetchSchema } from '../fetch-schema';

export interface EndpointSchemaSourceOptions {
  /**
   * GraphQL endpoint URL
   */
  endpoint: string;

  /**
   * Optional authorization header value (e.g., "Bearer token")
   */
  authorization?: string;

  /**
   * Optional additional headers
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Schema source that fetches from a live GraphQL endpoint
 */
export class EndpointSchemaSource implements SchemaSource {
  private readonly options: EndpointSchemaSourceOptions;

  constructor(options: EndpointSchemaSourceOptions) {
    this.options = options;
  }

  async fetch(): Promise<SchemaSourceResult> {
    const result = await fetchSchema({
      endpoint: this.options.endpoint,
      authorization: this.options.authorization,
      headers: this.options.headers,
      timeout: this.options.timeout,
    });

    if (!result.success) {
      throw new SchemaSourceError(
        result.error ?? 'Unknown error fetching schema',
        this.describe()
      );
    }

    if (!result.data) {
      throw new SchemaSourceError(
        'No introspection data returned',
        this.describe()
      );
    }

    return {
      introspection: result.data,
    };
  }

  describe(): string {
    return `endpoint: ${this.options.endpoint}`;
  }
}
