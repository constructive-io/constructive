/**
 * Database Schema Source
 *
 * Loads GraphQL schema directly from a PostgreSQL database using PostGraphile
 * introspection and converts it to introspection format.
 * Also returns metadata captured from the same isolated schema build.
 */
import { buildSchemaArtifacts } from 'graphile-schema';
import { buildSchema, introspectionFromSchema } from 'graphql';
import type { PgConfig } from 'pg-env';

import type { IntrospectionQueryResponse } from '../../../types/introspection';
import { databaseForDisplay } from '../../sensitive-values';
import {
  createDatabasePool,
  type DatabasePoolFactory,
  resolveApiSchemas,
} from './api-schemas';
import type { MetaTableInfo, SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';

export interface DatabaseSchemaSourceOptions {
  /**
   * Complete, explicitly resolved PostgreSQL configuration.
   */
  pgConfig: PgConfig;

  /**
   * PostgreSQL schemas to include in introspection
   * Mutually exclusive with apiNames
   */
  schemas?: string[];

  /**
   * API names to resolve schemas from
   * Queries routing_public.api_schemas to get schema names
   * Mutually exclusive with schemas
   */
  apiNames?: string[];

  /** @internal Test seam for creating operation-scoped pools. */
  poolFactory?: DatabasePoolFactory;

  /** @internal Test seam for interleaving correlated schema builds. */
  _onMetaCollected?: () => Promise<void>;
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
    const { pgConfig, apiNames, poolFactory } = this.options;
    const pool = createDatabasePool(pgConfig, poolFactory);

    try {
      // Resolve schemas - either from explicit schemas option or from apiNames
      let schemas: string[];
      if (apiNames && apiNames.length > 0) {
        try {
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

      // The same operation-owned pool backs API resolution and schema building.
      let artifacts;
      try {
        artifacts = await buildSchemaArtifacts({
          pool,
          schemas,
          _onMetaCollected: this.options._onMetaCollected,
        });
      } catch (err) {
        throw new SchemaSourceError(
          `Failed to introspect database: ${err instanceof Error ? err.message : 'Unknown error'}`,
          this.describe(),
          err instanceof Error ? err : undefined
        );
      }

      const { sdl, tablesMeta } = artifacts;
      if (!sdl.trim()) {
        throw new SchemaSourceError(
          'Database introspection returned empty schema',
          this.describe()
        );
      }

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

      const introspection: IntrospectionQueryResponse = JSON.parse(
        JSON.stringify(introspectionResult)
      ) as IntrospectionQueryResponse;

      return {
        introspection,
        tablesMeta: tablesMeta as MetaTableInfo[],
      };
    } finally {
      await pool.end();
    }
  }

  describe(): string {
    const { pgConfig, schemas, apiNames } = this.options;
    const displayDatabase = databaseForDisplay(pgConfig.database);
    if (apiNames && apiNames.length > 0) {
      return `database: ${displayDatabase} (apiNames: ${apiNames.join(', ')})`;
    }
    return `database: ${displayDatabase} (schemas: ${(schemas ?? ['public']).join(', ')})`;
  }
}
