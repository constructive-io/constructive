/**
 * Database Schema Source
 *
 * Loads GraphQL schema directly from a PostgreSQL database using PostGraphile
 * introspection and converts it to introspection format.
 */
import { buildSchema, introspectionFromSchema } from 'graphql';

import type { IntrospectionQueryResponse } from '../../../types/introspection';
import { buildSchemaSDLFromDatabase } from '../../database';
import { createDatabasePool, resolveApiSchemas, validateServicesSchemas } from './api-schemas';
import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';

export interface DatabaseSchemaSourceOptions {
  /**
   * Database name or connection string
   * Can be a simple database name (uses PGHOST, PGPORT, PGUSER, PGPASSWORD env vars)
   * or a full connection string (postgres://user:pass@host:port/dbname)
   */
  database: string;

  /**
   * PostgreSQL schemas to include in introspection
   * Mutually exclusive with apiNames
   */
  schemas?: string[];

  /**
   * API names to resolve schemas from
   * Queries services_public.api_schemas to get schema names
   * Mutually exclusive with schemas
   */
  apiNames?: string[];
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
    const { database, apiNames } = this.options;

    // Resolve schemas - either from explicit schemas option or from apiNames
    let schemas: string[];
    if (apiNames && apiNames.length > 0) {
      // Validate services schemas exist at the beginning for database mode
      const pool = createDatabasePool(database);
      try {
        const validation = await validateServicesSchemas(pool);
        if (!validation.valid) {
          throw new SchemaSourceError(validation.error!, this.describe());
        }
        schemas = await resolveApiSchemas(pool, apiNames);
      } catch (err) {
        if (err instanceof SchemaSourceError) throw err;
        throw new SchemaSourceError(
          `Failed to resolve API schemas: ${err instanceof Error ? err.message : 'Unknown error'}`,
          this.describe(),
          err instanceof Error ? err : undefined
        );
      }
    } else {
      schemas = this.options.schemas ?? ['public'];
    }

    // Build SDL from database
    let sdl: string;
    try {
      sdl = await buildSchemaSDLFromDatabase({
        database,
        schemas
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
    const { database, schemas, apiNames } = this.options;
    if (apiNames && apiNames.length > 0) {
      return `database: ${database} (apiNames: ${apiNames.join(', ')})`;
    }
    return `database: ${database} (schemas: ${(schemas ?? ['public']).join(', ')})`;
  }
}
