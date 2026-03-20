/**
 * Endpoint Schema Source
 *
 * Fetches GraphQL schema via introspection from a live endpoint.
 * Optionally fetches _meta query in parallel for M:N junction key metadata.
 */
import { fetchSchema, fetchGraphqlQuery } from '../fetch-schema';
import type { MetaTableInfo, SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';

/**
 * _meta GraphQL query — fetches M:N junction key metadata.
 * Only the fields needed for enriching CleanManyToManyRelation are selected.
 */
const META_QUERY = `{
  _meta {
    tables {
      name
      schemaName
      relations {
        manyToMany {
          fieldName
          type
          junctionTable { name }
          junctionLeftKeyAttributes { name }
          junctionRightKeyAttributes { name }
          leftKeyAttributes { name }
          rightKeyAttributes { name }
          rightTable { name }
        }
      }
    }
  }
}`;

interface MetaQueryResponse {
  _meta: {
    tables: MetaTableInfo[];
  };
}

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
    const fetchOpts = {
      endpoint: this.options.endpoint,
      authorization: this.options.authorization,
      headers: this.options.headers,
      timeout: this.options.timeout,
    };

    // Run introspection and _meta query in parallel.
    // _meta is best-effort: if the endpoint doesn't expose it, we proceed without.
    const [introspectionResult, metaResult] = await Promise.all([
      fetchSchema(fetchOpts),
      fetchGraphqlQuery<MetaQueryResponse>({ ...fetchOpts, query: META_QUERY })
        .catch((): null => null),
    ]);

    if (!introspectionResult.success) {
      throw new SchemaSourceError(
        introspectionResult.error ?? 'Unknown error fetching schema',
        this.describe(),
      );
    }

    if (!introspectionResult.data) {
      throw new SchemaSourceError(
        'No introspection data returned',
        this.describe(),
      );
    }

    const result: SchemaSourceResult = {
      introspection: introspectionResult.data,
    };

    // Attach _meta data if available
    if (metaResult?.success && metaResult.data?._meta?.tables) {
      result.tablesMeta = metaResult.data._meta.tables;
    }

    return result;
  }

  describe(): string {
    return `endpoint: ${this.options.endpoint}`;
  }
}
