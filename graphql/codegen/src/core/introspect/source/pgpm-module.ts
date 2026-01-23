/**
 * PGPM Module Schema Source
 *
 * Loads GraphQL schema from a PGPM module by:
 * 1. Creating an ephemeral database
 * 2. Deploying the module to the database
 * 3. Introspecting the database with PostGraphile
 * 4. Cleaning up the ephemeral database (unless keepDb is true)
 */
import { buildSchema, introspectionFromSchema } from 'graphql';
import { PgpmPackage } from '@pgpmjs/core';
import { createEphemeralDb, type EphemeralDbResult } from 'pgsql-client';
import { deployPgpm } from 'pgsql-seed';

import type { SchemaSource, SchemaSourceResult } from './types';
import { SchemaSourceError } from './types';
import type { IntrospectionQueryResponse } from '../../../types/introspection';
import { buildSchemaSDLFromDatabase } from '../../database';

/**
 * Options for PGPM module schema source using direct module path
 */
export interface PgpmModulePathOptions {
  /**
   * Path to the PGPM module directory
   * The directory should contain a pgpm.plan file and .control file
   */
  pgpmModulePath: string;

  /**
   * PostgreSQL schemas to include in introspection
   * @default ['public']
   */
  schemas?: string[];

  /**
   * If true, keeps the ephemeral database after introspection (useful for debugging)
   * @default false
   */
  keepDb?: boolean;
}

/**
 * Options for PGPM module schema source using workspace + module name
 */
export interface PgpmWorkspaceOptions {
  /**
   * Path to the PGPM workspace directory
   * The directory should contain a pgpm.config.yaml or similar workspace config
   */
  pgpmWorkspacePath: string;

  /**
   * Name of the module within the workspace
   */
  pgpmModuleName: string;

  /**
   * PostgreSQL schemas to include in introspection
   * @default ['public']
   */
  schemas?: string[];

  /**
   * If true, keeps the ephemeral database after introspection (useful for debugging)
   * @default false
   */
  keepDb?: boolean;
}

export type PgpmModuleSchemaSourceOptions = PgpmModulePathOptions | PgpmWorkspaceOptions;

/**
 * Type guard to check if options use direct module path
 */
export function isPgpmModulePathOptions(
  options: PgpmModuleSchemaSourceOptions
): options is PgpmModulePathOptions {
  return 'pgpmModulePath' in options;
}

/**
 * Type guard to check if options use workspace + module name
 */
export function isPgpmWorkspaceOptions(
  options: PgpmModuleSchemaSourceOptions
): options is PgpmWorkspaceOptions {
  return 'pgpmWorkspacePath' in options && 'pgpmModuleName' in options;
}

/**
 * Schema source that loads from a PGPM module
 *
 * Creates an ephemeral database, deploys the module, introspects the schema,
 * and cleans up. Supports both direct module path and workspace + module name modes.
 */
export class PgpmModuleSchemaSource implements SchemaSource {
  private readonly options: PgpmModuleSchemaSourceOptions;
  private ephemeralDb: EphemeralDbResult | null = null;

  constructor(options: PgpmModuleSchemaSourceOptions) {
    this.options = options;
  }

  async fetch(): Promise<SchemaSourceResult> {
    const schemas = this.getSchemas();
    const keepDb = this.getKeepDb();

    // Resolve the module path
    let modulePath: string;
    try {
      modulePath = this.resolveModulePath();
    } catch (err) {
      throw new SchemaSourceError(
        `Failed to resolve module path: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined
      );
    }

    // Validate the module exists
    const pkg = new PgpmPackage(modulePath);
    if (!pkg.isInModule()) {
      throw new SchemaSourceError(
        `Not a valid PGPM module: ${modulePath}. Directory must contain pgpm.plan and .control files.`,
        this.describe()
      );
    }

    // Create ephemeral database
    try {
      this.ephemeralDb = createEphemeralDb({
        prefix: 'codegen_pgpm_',
        verbose: false,
      });
    } catch (err) {
      throw new SchemaSourceError(
        `Failed to create ephemeral database: ${err instanceof Error ? err.message : 'Unknown error'}`,
        this.describe(),
        err instanceof Error ? err : undefined
      );
    }

    const { config: dbConfig, teardown } = this.ephemeralDb;

    try {
      // Deploy the module to the ephemeral database
      try {
        await deployPgpm(dbConfig, modulePath, false);
      } catch (err) {
        throw new SchemaSourceError(
          `Failed to deploy PGPM module: ${err instanceof Error ? err.message : 'Unknown error'}`,
          this.describe(),
          err instanceof Error ? err : undefined
        );
      }

      // Build SDL from the deployed database
      let sdl: string;
      try {
        sdl = await buildSchemaSDLFromDatabase({
          database: dbConfig.database,
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
    } finally {
      // Clean up the ephemeral database
      teardown({ keepDb });

      if (keepDb) {
        console.log(`[pgpm-module] Kept ephemeral database: ${dbConfig.database}`);
      }
    }
  }

  describe(): string {
    if (isPgpmModulePathOptions(this.options)) {
      const schemas = this.options.schemas ?? ['public'];
      return `pgpm module: ${this.options.pgpmModulePath} (schemas: ${schemas.join(', ')})`;
    } else {
      const schemas = this.options.schemas ?? ['public'];
      return `pgpm workspace: ${this.options.pgpmWorkspacePath}, module: ${this.options.pgpmModuleName} (schemas: ${schemas.join(', ')})`;
    }
  }

  private resolveModulePath(): string {
    if (isPgpmModulePathOptions(this.options)) {
      return this.options.pgpmModulePath;
    }

    // Workspace + module name mode
    const { pgpmWorkspacePath, pgpmModuleName } = this.options;
    const workspace = new PgpmPackage(pgpmWorkspacePath);

    if (!workspace.workspacePath) {
      throw new Error(`Not a valid PGPM workspace: ${pgpmWorkspacePath}`);
    }

    // Get the module from the workspace
    const moduleProject = workspace.getModuleProject(pgpmModuleName);
    const modulePath = moduleProject.getModulePath();

    if (!modulePath) {
      throw new Error(`Module "${pgpmModuleName}" not found in workspace`);
    }

    return modulePath;
  }

  private getSchemas(): string[] {
    if (isPgpmModulePathOptions(this.options)) {
      return this.options.schemas ?? ['public'];
    }
    return this.options.schemas ?? ['public'];
  }

  private getKeepDb(): boolean {
    if (isPgpmModulePathOptions(this.options)) {
      return this.options.keepDb ?? false;
    }
    return this.options.keepDb ?? false;
  }
}
