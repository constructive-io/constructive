/**
 * Database schema utilities
 *
 * Provides functions for building GraphQL schemas directly from PostgreSQL databases.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildSchemaSDL } from '@constructive-io/graphql-server';

export interface BuildSchemaFromDatabaseOptions {
  /** Database name */
  database: string;
  /** PostgreSQL schemas to include */
  schemas: string[];
  /** Output directory for the schema file */
  outDir: string;
  /** Optional filename (default: schema.graphql) */
  filename?: string;
}

export interface BuildSchemaFromDatabaseResult {
  /** Path to the generated schema file */
  schemaPath: string;
  /** The SDL content */
  sdl: string;
}

/**
 * Build a GraphQL schema from a PostgreSQL database and write it to a file.
 *
 * This function introspects the database using PostGraphile and generates
 * a GraphQL SDL file that can be used for code generation.
 *
 * @param options - Configuration options
 * @returns The path to the generated schema file and the SDL content
 */
export async function buildSchemaFromDatabase(
  options: BuildSchemaFromDatabaseOptions,
): Promise<BuildSchemaFromDatabaseResult> {
  const { database, schemas, outDir, filename = 'schema.graphql' } = options;

  // Ensure output directory exists
  await fs.promises.mkdir(outDir, { recursive: true });

  // Build schema SDL from database
  const sdl = await buildSchemaSDL({
    database,
    schemas,
    graphile: { pgSettings: async () => ({ role: 'administrator' }) },
  });

  // Write schema to file
  const schemaPath = path.join(outDir, filename);
  await fs.promises.writeFile(schemaPath, sdl, 'utf-8');

  return { schemaPath, sdl };
}

/**
 * Build a GraphQL schema SDL string from a PostgreSQL database without writing to file.
 *
 * This is a convenience wrapper around buildSchemaSDL from graphql-server.
 *
 * @param options - Configuration options
 * @returns The SDL content as a string
 */
export async function buildSchemaSDLFromDatabase(options: {
  database: string;
  schemas: string[];
}): Promise<string> {
  const { database, schemas } = options;

  return buildSchemaSDL({
    database,
    schemas,
    graphile: { pgSettings: async () => ({ role: 'administrator' }) },
  });
}
