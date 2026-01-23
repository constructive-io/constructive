/**
 * Main generate function - orchestrates the entire codegen pipeline
 *
 * This is the primary entry point for programmatic usage.
 * The CLI is a thin wrapper around this function.
 */
import path from 'path';

import { loadAndResolveConfig } from './config';
import { createSchemaSource, validateSourceOptions } from './introspect';
import { runCodegenPipeline, validateTablesFound } from './pipeline';
import { generate as generateReactQueryFiles } from './codegen';
import { generateOrm as generateOrmFiles } from './codegen/orm';
import { generateSharedTypes } from './codegen/shared';
import { writeGeneratedFiles } from './output';
import type { GraphQLSDKConfigTarget, TargetConfig } from '../types/config';

export interface GenerateOptions extends GraphQLSDKConfigTarget {
  config?: string;
  target?: string;
  authorization?: string;
  verbose?: boolean;
  dryRun?: boolean;
  skipCustomOperations?: boolean;
}

export interface GenerateTargetResult {
  name: string;
  output: string;
  success: boolean;
  message: string;
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

export interface GenerateResult {
  success: boolean;
  message: string;
  targets?: GenerateTargetResult[];
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Main generate function - orchestrates the entire codegen pipeline
 */
export async function generate(options: GenerateOptions = {}): Promise<GenerateResult> {
  if (options.verbose) {
    console.log('Loading configuration...');
  }

  const configResult = await loadAndResolveConfig(options);
  if (!configResult.success) {
    return { success: false, message: configResult.error! };
  }

  const targets = configResult.targets ?? [];
  if (targets.length === 0) {
    return { success: false, message: 'No targets resolved from configuration.' };
  }

  const results: GenerateTargetResult[] = [];

  for (const target of targets) {
    const runReactQuery = options.reactQuery ?? target.config.reactQuery;
    const runOrm = options.orm ?? target.config.orm;

    if (!runReactQuery && !runOrm) {
      results.push({
        name: target.name,
        output: target.config.output,
        success: false,
        message: `Target "${target.name}": No generators enabled. Use --react-query or --orm.`,
      });
      continue;
    }

    const result = await generateForTarget(target, options, runReactQuery, runOrm);
    results.push(result);
  }

  if (results.length === 1) {
    const [result] = results;
    return {
      success: result.success,
      message: result.message,
      targets: results,
      tables: result.tables,
      filesWritten: result.filesWritten,
      errors: result.errors,
    };
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  return {
    success: failedCount === 0,
    message: failedCount === 0
      ? `Generated ${results.length} outputs successfully.`
      : `Generated ${successCount} of ${results.length} outputs.`,
    targets: results,
    errors: failedCount > 0 ? results.flatMap((r) => r.errors ?? []) : undefined,
  };
}

async function generateForTarget(
  target: TargetConfig,
  options: GenerateOptions,
  runReactQuery: boolean,
  runOrm: boolean
): Promise<GenerateTargetResult> {
  const config = target.config;
  const outputRoot = config.output;

  // Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
  });
  if (!sourceValidation.valid) {
    return {
      name: target.name,
      output: outputRoot,
      success: false,
      message: sourceValidation.error!,
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
      name: target.name,
      output: outputRoot,
      success: false,
      message: `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  const { tables, customOperations } = pipelineResult;

  // Validate tables
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      name: target.name,
      output: outputRoot,
      success: false,
      message: tablesValidation.error!,
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
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write shared types: ${writeResult.errors?.join(', ')}`,
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
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write React Query hooks: ${writeResult.errors?.join(', ')}`,
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
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write ORM client: ${writeResult.errors?.join(', ')}`,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate unified barrel when both are enabled
  if (bothEnabled && !options.dryRun) {
    const barrelContent = `/**
 * Generated SDK - auto-generated, do not edit
 * @generated by @constructive-io/graphql-codegen
 */
export * from './types';
export * from './hooks';
export * from './orm';
`;
    await writeGeneratedFiles([{ path: 'index.ts', content: barrelContent }], outputRoot, []);
  }

  const generators = [runReactQuery && 'React Query', runOrm && 'ORM'].filter(Boolean).join(' and ');

  return {
    name: target.name,
    output: outputRoot,
    success: true,
    message: options.dryRun
      ? `Dry run complete. Would generate ${generators} for ${tables.length} tables.`
      : `Generated ${generators} for ${tables.length} tables. Files written to ${outputRoot}`,
    tables: tables.map((t) => t.name),
    filesWritten: allFilesWritten,
  };
}
