/**
 * Generate ORM command - generates Prisma-like ORM client from GraphQL schema
 *
 * This command:
 * 1. Fetches schema from endpoint or loads from file
 * 2. Infers table metadata from introspection (replaces _meta)
 * 3. Generates a Prisma-like ORM client with fluent API
 */

import type { GraphQLSDKConfig, ResolvedConfig } from '../../types/config';
import { resolveConfig } from '../../types/config';
import {
  createSchemaSource,
  validateSourceOptions,
} from '../introspect/source';
import { runCodegenPipeline, validateTablesFound } from './shared';
import { findConfigFile, loadConfigFile } from './init';
import { writeGeneratedFiles } from './generate';
import { generateOrm } from '../codegen/orm';

export interface GenerateOrmOptions {
  /** Path to config file */
  config?: string;
  /** GraphQL endpoint URL (overrides config) */
  endpoint?: string;
  /** Path to GraphQL schema file (.graphql) */
  schema?: string;
  /** Output directory (overrides config) */
  output?: string;
  /** Authorization header */
  authorization?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run - don't write files */
  dryRun?: boolean;
  /** Skip custom operations (only generate table CRUD) */
  skipCustomOperations?: boolean;
}

export interface GenerateOrmResult {
  success: boolean;
  message: string;
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Execute the generate-orm command
 */
export async function generateOrmCommand(
  options: GenerateOrmOptions = {}
): Promise<GenerateOrmResult> {
  const log = options.verbose ? console.log : () => {};

  // 1. Load config
  log('Loading configuration...');
  const configResult = await loadConfig(options);
  if (!configResult.success) {
    return {
      success: false,
      message: configResult.error!,
    };
  }

  const config = configResult.config!;

  // Use ORM output directory if specified, otherwise default
  const outputDir = options.output || config.orm?.output || './generated/orm';

  // Log source
  if (config.schema) {
    log(`  Schema: ${config.schema}`);
  } else {
    log(`  Endpoint: ${config.endpoint}`);
  }
  log(`  Output: ${outputDir}`);

  // 2. Create schema source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
  });
  if (!sourceValidation.valid) {
    return {
      success: false,
      message: sourceValidation.error!,
    };
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
    authorization: options.authorization || config.headers['Authorization'],
    headers: config.headers,
  });

  // 3. Run the codegen pipeline
  let pipelineResult;
  try {
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
    };
  }

  const { tables, customOperations, stats } = pipelineResult;

  // 4. Validate tables found
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      success: false,
      message: tablesValidation.error!,
    };
  }

  // 5. Generate ORM code
  console.log('Generating code...');
  const { files: generatedFiles, stats: genStats } = generateOrm({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
  });
  console.log(`Generated ${genStats.totalFiles} files`);

  log(`  ${genStats.tables} table models`);
  log(`  ${genStats.customQueries} custom query operations`);
  log(`  ${genStats.customMutations} custom mutation operations`);

  const customQueries = customOperations.queries.map((q) => q.name);
  const customMutations = customOperations.mutations.map((m) => m.name);

  if (options.dryRun) {
    return {
      success: true,
      message: `Dry run complete. Would generate ${generatedFiles.length} files for ${tables.length} tables and ${stats.customQueries + stats.customMutations} custom operations.`,
      tables: tables.map((t) => t.name),
      customQueries,
      customMutations,
      filesWritten: generatedFiles.map((f) => f.path),
    };
  }

  // 6. Write files
  log('Writing files...');
  const writeResult = await writeGeneratedFiles(generatedFiles, outputDir, [
    'models',
    'query',
    'mutation',
  ]);

  if (!writeResult.success) {
    return {
      success: false,
      message: `Failed to write files: ${writeResult.errors?.join(', ')}`,
      errors: writeResult.errors,
    };
  }

  const totalOps = customQueries.length + customMutations.length;
  const customOpsMsg = totalOps > 0 ? ` and ${totalOps} custom operations` : '';

  return {
    success: true,
    message: `Generated ORM client for ${tables.length} tables${customOpsMsg}. Files written to ${outputDir}`,
    tables: tables.map((t) => t.name),
    customQueries,
    customMutations,
    filesWritten: writeResult.filesWritten,
  };
}

interface LoadConfigResult {
  success: boolean;
  config?: ResolvedConfig;
  error?: string;
}

async function loadConfig(
  options: GenerateOrmOptions
): Promise<LoadConfigResult> {
  // Find config file
  let configPath = options.config;
  if (!configPath) {
    configPath = findConfigFile() ?? undefined;
  }

  let baseConfig: Partial<GraphQLSDKConfig> = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    baseConfig = loadResult.config;
  }

  // Override with CLI options
  const mergedConfig: GraphQLSDKConfig = {
    endpoint: options.endpoint || baseConfig.endpoint,
    schema: options.schema || baseConfig.schema,
    output: options.output || baseConfig.output,
    headers: baseConfig.headers,
    tables: baseConfig.tables,
    queries: baseConfig.queries,
    mutations: baseConfig.mutations,
    excludeFields: baseConfig.excludeFields,
    hooks: baseConfig.hooks,
    postgraphile: baseConfig.postgraphile,
    codegen: baseConfig.codegen,
    orm: baseConfig.orm,
  };

  // Validate at least one source is provided
  if (!mergedConfig.endpoint && !mergedConfig.schema) {
    return {
      success: false,
      error:
        'No source specified. Use --endpoint or --schema, or create a config file with "graphql-codegen init".',
    };
  }

  // Resolve with defaults
  const config = resolveConfig(mergedConfig);

  return { success: true, config };
}
