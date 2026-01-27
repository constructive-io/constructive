/**
 * Main generate function - orchestrates the entire codegen pipeline
 *
 * This is the primary entry point for programmatic usage.
 * The CLI is a thin wrapper around this function.
 */
import path from 'path';

import { createSchemaSource, validateSourceOptions } from './introspect';
import { runCodegenPipeline, validateTablesFound } from './pipeline';
import { generate as generateReactQueryFiles } from './codegen';
import { generateRootBarrel } from './codegen/barrel';
import { generateOrm as generateOrmFiles } from './codegen/orm';
import { generateSharedTypes } from './codegen/shared';
import { writeGeneratedFiles } from './output';
import type { GraphQLSDKConfigTarget } from '../types/config';
import { getConfigOptions } from '../types/config';

export interface GenerateOptions extends GraphQLSDKConfigTarget {
  authorization?: string;
  verbose?: boolean;
  dryRun?: boolean;
  skipCustomOperations?: boolean;
}

export interface GenerateResult {
  success: boolean;
  message: string;
  output?: string;
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Main generate function - takes a single config and generates code
 *
 * This is the primary entry point for programmatic usage.
 * For multiple configs, call this function in a loop.
 */
export async function generate(options: GenerateOptions = {}): Promise<GenerateResult> {
  // Apply defaults to get resolved config
  const config = getConfigOptions(options);
  const outputRoot = config.output;

  // Determine which generators to run
  const runReactQuery = config.reactQuery ?? false;
  const runOrm = config.orm ?? false;

  if (!runReactQuery && !runOrm) {
    return {
      success: false,
      message: 'No generators enabled. Use reactQuery: true or orm: true in your config.',
      output: outputRoot,
    };
  }

  // Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
  });
  if (!sourceValidation.valid) {
    return {
      success: false,
      message: sourceValidation.error!,
      output: outputRoot,
    };
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
    authorization: options.authorization || config.headers?.['Authorization'],
    headers: config.headers,
  });

  // Run pipeline
  let pipelineResult;
  try {
    console.log(`Fetching schema from ${source.describe()}...`);
    pipelineResult = await runCodegenPipeline({
      source,
      config,
      verbose: options.verbose,
      skipCustomOperations: options.skipCustomOperations,
    });
  } catch (err) {
    return {
      success: false,
      message: `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`,
      output: outputRoot,
    };
  }

  const { tables, customOperations } = pipelineResult;

  // Validate tables
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      success: false,
      message: tablesValidation.error!,
      output: outputRoot,
    };
  }

  const allFilesWritten: string[] = [];
  const bothEnabled = runReactQuery && runOrm;

  // Generate shared types when both are enabled
  if (bothEnabled) {
    console.log('Generating shared types...');
    const sharedResult = generateSharedTypes({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(sharedResult.files, outputRoot, []);
      if (!writeResult.success) {
        return {
          success: false,
          message: `Failed to write shared types: ${writeResult.errors?.join(', ')}`,
          output: outputRoot,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate React Query hooks
  if (runReactQuery) {
    const hooksDir = path.join(outputRoot, 'hooks');
    console.log('Generating React Query hooks...');
    const { files } = generateReactQueryFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
      sharedTypesPath: bothEnabled ? '..' : undefined,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(files, hooksDir, ['queries', 'mutations']);
      if (!writeResult.success) {
        return {
          success: false,
          message: `Failed to write React Query hooks: ${writeResult.errors?.join(', ')}`,
          output: outputRoot,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate ORM client
  if (runOrm) {
    const ormDir = path.join(outputRoot, 'orm');
    console.log('Generating ORM client...');
    const { files } = generateOrmFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
      sharedTypesPath: bothEnabled ? '..' : undefined,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(files, ormDir, ['models', 'query', 'mutation']);
      if (!writeResult.success) {
        return {
          success: false,
          message: `Failed to write ORM client: ${writeResult.errors?.join(', ')}`,
          output: outputRoot,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate barrel file at output root
  // This re-exports from the appropriate subdirectories based on which generators are enabled
  if (!options.dryRun) {
    const barrelContent = generateRootBarrel({
      hasTypes: bothEnabled,
      hasHooks: runReactQuery,
      hasOrm: runOrm,
    });
    await writeGeneratedFiles([{ path: 'index.ts', content: barrelContent }], outputRoot, []);
  }

  const generators = [runReactQuery && 'React Query', runOrm && 'ORM'].filter(Boolean).join(' and ');

  return {
    success: true,
    message: options.dryRun
      ? `Dry run complete. Would generate ${generators} for ${tables.length} tables.`
      : `Generated ${generators} for ${tables.length} tables. Files written to ${outputRoot}`,
    output: outputRoot,
    tables: tables.map((t) => t.name),
    filesWritten: allFilesWritten,
  };
}
