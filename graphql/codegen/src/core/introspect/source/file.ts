/**
 * File Schema Source
 *
 * Loads GraphQL schema from a local .graphql SDL file and converts it
 * to introspection format using the graphql package.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildSchema, introspectionFromSchema } from 'graphql';

import type { IntrospectionQueryResponse } from '../../../types/introspection';
import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';

export interface FileSchemaSourceOptions {
  /**
   * Path to the GraphQL schema file (.graphql)
   * Can be absolute or relative to current working directory
   */
  schemaPath: string;
}

/**
 * Schema source that loads from a local GraphQL schema file
 *
 * Supports .graphql files containing SDL (Schema Definition Language).
 * The SDL is parsed using graphql-js and converted to introspection format.
 */
export class FileSchemaSource implements SchemaSource {
  private readonly options: FileSchemaSourceOptions;

  constructor(options: FileSchemaSourceOptions) {
    this.options = options;
  }

  async fetch(): Promise<SchemaSourceResult> {
    const absolutePath = path.isAbsolute(this.options.schemaPath)
      ? this.options.schemaPath
      : path.resolve(process.cwd(), this.options.schemaPath);

    // Check file exists
    if (!fs.existsSync(absolutePath)) {
      throw new SchemaSourceError(
        `Schema file not found: ${absolutePath}`,
        this.describe(),
      );
    }

    // Read file content
    let sdl: string;
    try {
      sdl = await fs.promises.readFile(absolutePath, 'utf-8');
    } catch (err) {
      throw new SchemaSourceError(
        `Failed to read schema file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined,
      );
    }

    // Validate non-empty
    if (!sdl.trim()) {
      throw new SchemaSourceError('Schema file is empty', this.describe());
    }

    // Parse SDL to GraphQL schema
    let schema;
    try {
      schema = buildSchema(sdl);
    } catch (err) {
      throw new SchemaSourceError(
        `Invalid GraphQL SDL: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined,
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
        err instanceof Error ? err : undefined,
      );
    }

    // Convert graphql-js introspection result to our mutable type
    // The graphql-js types are readonly, but our types are mutable
    const introspection: IntrospectionQueryResponse = JSON.parse(
      JSON.stringify(introspectionResult),
    ) as IntrospectionQueryResponse;

    return { introspection };
  }

  describe(): string {
    return `file: ${this.options.schemaPath}`;
  }
}
