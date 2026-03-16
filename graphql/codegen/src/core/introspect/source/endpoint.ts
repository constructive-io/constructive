/**
 * Endpoint Schema Source
 *
 * Fetches GraphQL schema via introspection from a live endpoint.
 * Wraps the existing fetchSchema() function with the SchemaSource interface.
 * Also attempts to fetch _meta data for accurate relation detection.
 */
import { fetchSchema, fetchGraphqlQuery } from '../fetch-schema';
import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';
import type { TableMeta } from 'graphile-schema';

/**
 * _meta query for fetching table relation metadata from Constructive endpoints.
 * Falls back gracefully if the endpoint doesn't support _meta.
 */
/**
 * _meta query for fetching table relation metadata from Constructive endpoints.
 * Only requests the fields needed for relation enrichment — name and relations.
 */
const META_RELATIONS_QUERY = `
fragment F on MetaField { name type { pgType gqlType isArray } isNotNull hasDefault }
fragment FK on MetaForeignKeyConstraint {
  name fields { ...F } referencedTable referencedFields refFields { ...F } refTable { name }
}
{
  _meta {
    tables {
      name
      relations {
        belongsTo { fieldName isUnique type keys { ...F } references { name } }
        hasOne { fieldName isUnique type keys { ...F } referencedBy { name } }
        hasMany { fieldName isUnique type keys { ...F } referencedBy { name } }
        manyToMany {
          fieldName type
          junctionTable { name }
          junctionLeftConstraint { ...FK }
          junctionLeftKeyAttributes { ...F }
          junctionRightConstraint { ...FK }
          junctionRightKeyAttributes { ...F }
          leftKeyAttributes { ...F }
          rightKeyAttributes { ...F }
          rightTable { name }
        }
      }
    }
  }
}`;

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
    const sharedOpts = {
      endpoint: this.options.endpoint,
      authorization: this.options.authorization,
      headers: this.options.headers,
      timeout: this.options.timeout,
    };

    // Fire introspection and _meta requests in parallel.
    // _meta is optional — non-Constructive endpoints won't have it.
    const [result, metaResult] = await Promise.all([
      fetchSchema(sharedOpts),
      fetchGraphqlQuery({ ...sharedOpts, timeout: sharedOpts.timeout ?? 30000, query: META_RELATIONS_QUERY })
        .catch((): null => null),
    ]);

    if (!result.success) {
      throw new SchemaSourceError(
        result.error ?? 'Unknown error fetching schema',
        this.describe(),
      );
    }

    if (!result.data) {
      throw new SchemaSourceError(
        'No introspection data returned',
        this.describe(),
      );
    }

    // Extract _meta tables if the endpoint supports it
    let tablesMeta: TableMeta[] | undefined;
    if (metaResult?.success && metaResult.data) {
      const metaData = metaResult.data as { _meta?: { tables?: TableMeta[] } };
      if (metaData._meta?.tables) {
        tablesMeta = metaData._meta.tables;
      }
    }

    return {
      introspection: result.data,
      tablesMeta,
    };
  }

  describe(): string {
    return `endpoint: ${this.options.endpoint}`;
  }
}
