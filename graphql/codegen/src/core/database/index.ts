/**
 * Database schema utilities
 *
 * Provides functions for building GraphQL schemas directly from PostgreSQL databases.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildSchemaSDL } from 'graphile-schema';
import type { PgConfig } from 'pg-env';

import {
  createDatabasePool,
  resolvePgConfig,
} from '../introspect/source/api-schemas';

export interface BuildSchemaFromDatabaseOptions {
  /** Database name */
  database: string;
  /** PostgreSQL schemas to include */
  schemas: string[];
  /** Output directory for the schema file */
  outDir: string;
  /** Optional filename (default: schema.graphql) */
  filename?: string;
  /** Explicit PostgreSQL values overriding `env`. */
  pg?: Partial<PgConfig>;
  /** Explicit environment used for omitted PostgreSQL values. */
  env?: Readonly<Record<string, string | undefined>>;
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
  options: BuildSchemaFromDatabaseOptions
): Promise<BuildSchemaFromDatabaseResult> {
  const {
    database,
    schemas,
    outDir,
    filename = 'schema.graphql',
    pg,
    env,
  } = options;

  // Ensure output directory exists
  await fs.promises.mkdir(outDir, { recursive: true });

  // Build schema SDL from database (PostGraphile v5 preset-driven settings)
  const pool = createDatabasePool(resolvePgConfig({ ...pg, database }, env));
  let sdl: string;
  try {
    sdl = await buildSchemaSDL({ pool, schemas });
  } finally {
    await pool.end();
  }

  // Write schema to file
  const schemaPath = path.join(outDir, filename);
  await fs.promises.writeFile(schemaPath, sdl, 'utf-8');

  return { schemaPath, sdl };
}
