import * as fs from 'node:fs';
import * as path from 'node:path';

import { PgpmPackage } from '@pgpmjs/core';
import { createEphemeralDb, type EphemeralDbResult } from 'pgsql-client';
import { deployPgpm } from 'pgsql-seed';

import type { PgpmConfig } from '../types/config';
import { buildSchemaSDLFromDatabase } from './database';
import { resolveApiSchemas, validateServicesSchemas } from './introspect/source/api-schemas';

export interface ExportSchemaTarget {
  apiNames?: string[];
  schemas?: string[];
  output: string;
  filename?: string;
}

export interface ExportSchemaOptions {
  pgpm: PgpmConfig;
  targets: ExportSchemaTarget[];
  keepDb?: boolean;
  verbose?: boolean;
}

export interface ExportSchemaResult {
  success: boolean;
  message: string;
  files?: Array<{ target: string; path: string; schemas: string[] }>;
  errors?: string[];
}

function resolveModulePath(pgpm: PgpmConfig): string {
  if (pgpm.modulePath) return pgpm.modulePath;
  if (pgpm.workspacePath && pgpm.moduleName) {
    const workspace = new PgpmPackage(pgpm.workspacePath);
    const moduleProject = workspace.getModuleProject(pgpm.moduleName);
    const modulePath = moduleProject.getModulePath();
    if (!modulePath) {
      throw new Error(`Module "${pgpm.moduleName}" not found in workspace`);
    }
    return modulePath;
  }
  throw new Error(
    'Invalid PGPM config: requires modulePath or both workspacePath and moduleName',
  );
}

export async function exportSchema(
  options: ExportSchemaOptions,
): Promise<ExportSchemaResult> {
  const { pgpm, targets, keepDb = false, verbose = false } = options;

  if (targets.length === 0) {
    return {
      success: false,
      message: 'No export targets specified.',
    };
  }

  let modulePath: string;
  try {
    modulePath = resolveModulePath(pgpm);
  } catch (err) {
    return {
      success: false,
      message: `Failed to resolve module path: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  const pkg = new PgpmPackage(modulePath);
  if (!pkg.isInModule()) {
    return {
      success: false,
      message: `Not a valid PGPM module: ${modulePath}. Directory must contain pgpm.plan and .control files.`,
    };
  }

  let ephemeralDb: EphemeralDbResult;
  try {
    ephemeralDb = createEphemeralDb({
      prefix: 'codegen_export_',
      verbose,
    });
  } catch (err) {
    return {
      success: false,
      message: `Failed to create ephemeral database: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  const { config: dbConfig, teardown } = ephemeralDb;

  try {
    if (verbose) {
      console.log(`Deploying PGPM module: ${modulePath}`);
    }
    await deployPgpm(dbConfig, modulePath, false);

    const { getPgPool } = await import('pg-cache');
    const pool = getPgPool(dbConfig);

    const exportedFiles: Array<{
      target: string;
      path: string;
      schemas: string[];
    }> = [];
    const errors: string[] = [];

    for (const target of targets) {
      const targetName =
        target.apiNames?.join(',') || target.schemas?.join(',') || 'default';

      try {
        let schemas: string[];
        if (target.apiNames && target.apiNames.length > 0) {
          const validation = await validateServicesSchemas(pool);
          if (!validation.valid) {
            errors.push(`[${targetName}] ${validation.error}`);
            continue;
          }
          schemas = await resolveApiSchemas(pool, target.apiNames);
        } else if (target.schemas && target.schemas.length > 0) {
          schemas = target.schemas;
        } else {
          schemas = ['public'];
        }

        if (verbose) {
          console.log(
            `[${targetName}] Introspecting schemas: ${schemas.join(', ')}`,
          );
        }

        const sdl = await buildSchemaSDLFromDatabase({
          database: dbConfig.database,
          schemas,
        });

        if (!sdl.trim()) {
          errors.push(`[${targetName}] Introspection returned empty schema`);
          continue;
        }

        const outDir = path.resolve(target.output);
        await fs.promises.mkdir(outDir, { recursive: true });

        const filename = target.filename ?? 'schema.graphql';
        const filePath = path.join(outDir, filename);
        await fs.promises.writeFile(filePath, sdl, 'utf-8');

        exportedFiles.push({
          target: targetName,
          path: filePath,
          schemas,
        });

        if (verbose) {
          console.log(`[${targetName}] Wrote ${filePath}`);
        }
      } catch (err) {
        errors.push(
          `[${targetName}] ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    }

    if (exportedFiles.length === 0) {
      return {
        success: false,
        message: 'No schema files exported.',
        errors,
      };
    }

    return {
      success: true,
      message: `Exported ${exportedFiles.length} schema file(s) from PGPM module.`,
      files: exportedFiles,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to deploy PGPM module: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  } finally {
    teardown({ keepDb });
    if (keepDb) {
      console.log(`Kept ephemeral database: ${dbConfig.database}`);
    }
  }
}

export interface ExportSchemaSimpleOptions {
  pgpm: PgpmConfig;
  apiNames?: string[];
  schemas?: string[];
  output: string;
  filename?: string;
  keepDb?: boolean;
  verbose?: boolean;
}

export async function exportSchemaSimple(
  options: ExportSchemaSimpleOptions,
): Promise<ExportSchemaResult> {
  const { pgpm, apiNames, schemas, output, filename, keepDb, verbose } =
    options;

  return exportSchema({
    pgpm,
    targets: [{ apiNames, schemas, output, filename }],
    keepDb,
    verbose,
  });
}
