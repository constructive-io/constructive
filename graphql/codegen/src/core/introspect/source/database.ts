/**
 * Database Schema Source
 *
 * Loads GraphQL schema directly from a PostgreSQL database using PostGraphile
 * introspection and converts it to introspection format.
 */
import { buildSchema, introspectionFromSchema } from 'graphql';
import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';
import type { IntrospectionQueryResponse } from '../../../types/introspection';
import { buildSchemaSDLFromDatabase } from '../../database';

export interface DatabaseSchemaSourceOptions {
  /**
   * Database name or connection string
   * Can be a simple database name (uses PGHOST, PGPORT, PGUSER, PGPASSWORD env vars)
   * or a full connection string (postgres://user:pass@host:port/dbname)
   */
  database: string;

  /**
   * PostgreSQL schemas to include in introspection
   * @default ['public']
   */
  schemas?: string[];
}

/**
 * Schema source that loads from a PostgreSQL database
 *
 * Uses PostGraphile to introspect the database and generate a GraphQL schema.
 * The schema is built in-memory without writing to disk.
 */
export class DatabaseSchemaSource implements SchemaSource {
  private readonly options: DatabaseSchemaSourceOptions;

  constructor(options: DatabaseSchemaSourceOptions) {
    this.options = options;
  }

  async fetch(): Promise<SchemaSourceResult> {
    const { database, schemas = ['public'] } = this.options;

    // Build SDL from database
    let sdl: string;
    try {
      sdl = await buildSchemaSDLFromDatabase({
        database,
        schemas,
      });
    } catch (err) {
      throw new SchemaSourceError(
        `Failed to introspect database: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined
      );
    }

    // Validate non-empty
    if (!sdl.trim()) {
      throw new SchemaSourceError(
        'Database introspection returned empty schema',
        this.describe()
      );
    }

    // Parse SDL to GraphQL schema
    let schema;
    try {
      schema = buildSchema(sdl);
    } catch (err) {
      throw new SchemaSourceError(
        `Invalid GraphQL SDL from database: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined
      );
    }

    // Convert to introspection format
    let introspectionResult;
    try {
      introspectionResult = introspectionFromSchema(schema);
    } catch (err) {
      throw new SchemaSourceError(
        `Failed to generate introspection: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined
      );
    }

    // Convert graphql-js introspection result to our mutable type
    const introspection: IntrospectionQueryResponse = JSON.parse(
      JSON.stringify(introspectionResult)
    ) as IntrospectionQueryResponse;

    return { introspection };
  }

  describe(): string {
    const { database, schemas = ['public'] } = this.options;
    return `database: ${database} (schemas: ${schemas.join(', ')})`;
  }
}
