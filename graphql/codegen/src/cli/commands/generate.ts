/**
 * Generate command - generates SDK from GraphQL schema
 *
 * This command:
 * 1. Fetches schema from endpoint or loads from file
 * 2. Infers table metadata from introspection (replaces _meta)
 * 3. Generates hooks for both table CRUD and custom operations
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as prettier from 'prettier';

import type { GraphQLSDKConfig, ResolvedConfig } from '../../types/config';
import { resolveConfig } from '../../types/config';
import {
  createSchemaSource,
  validateSourceOptions,
} from '../introspect/source';
import { runCodegenPipeline, validateTablesFound } from './shared';
import { findConfigFile, loadConfigFile } from './init';
import { generate } from '../codegen';

export interface GenerateOptions {
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

export interface GenerateResult {
  success: boolean;
  message: string;
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Execute the generate command
 */
export async function generateCommand(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
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

  // Log source
  if (config.schema) {
    log(`  Schema: ${config.schema}`);
  } else {
    log(`  Endpoint: ${config.endpoint}`);
  }
  log(`  Output: ${config.output}`);

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

  // 5. Generate code
  console.log('Generating code...');
  const { files: generatedFiles, stats: genStats } = generate({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
  });
  console.log(`Generated ${genStats.totalFiles} files`);

  log(`  ${genStats.queryHooks} table query hooks`);
  log(`  ${genStats.mutationHooks} table mutation hooks`);
  log(`  ${genStats.customQueryHooks} custom query hooks`);
  log(`  ${genStats.customMutationHooks} custom mutation hooks`);

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
  const writeResult = await writeGeneratedFiles(generatedFiles, config.output, [
    'queries',
    'mutations',
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
    message: `Generated SDK for ${tables.length} tables${customOpsMsg}. Files written to ${config.output}`,
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

async function loadConfig(options: GenerateOptions): Promise<LoadConfigResult> {
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

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface WriteResult {
  success: boolean;
  filesWritten?: string[];
  errors?: string[];
}

export interface WriteOptions {
  showProgress?: boolean;
}

export async function writeGeneratedFiles(
  files: GeneratedFile[],
  outputDir: string,
  subdirs: string[],
  options: WriteOptions = {}
): Promise<WriteResult> {
  const { showProgress = true } = options;
  const errors: string[] = [];
  const written: string[] = [];
  const total = files.length;
  const isTTY = process.stdout.isTTY;

  // Ensure output directory exists
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      errors: [`Failed to create output directory: ${message}`],
    };
  }

  // Create subdirectories
  for (const subdir of subdirs) {
    const subdirPath = path.join(outputDir, subdir);
    try {
      fs.mkdirSync(subdirPath, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to create directory ${subdirPath}: ${message}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(outputDir, file.path);

    // Show progress
    if (showProgress) {
      const progress = Math.round(((i + 1) / total) * 100);
      if (isTTY) {
        process.stdout.write(
          `\rWriting files: ${i + 1}/${total} (${progress}%)`
        );
      } else if (i % 100 === 0 || i === total - 1) {
        // Non-TTY: periodic updates for CI/CD
        console.log(`Writing files: ${i + 1}/${total}`);
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    try {
      fs.mkdirSync(parentDir, { recursive: true });
    } catch {
      // Ignore if already exists
    }

    try {
      // Format with prettier
      const formattedContent = await formatCode(file.content);
      fs.writeFileSync(filePath, formattedContent, 'utf-8');
      written.push(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to write ${filePath}: ${message}`);
    }
  }

  // Clear progress line
  if (showProgress && isTTY) {
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
  }

  return {
    success: errors.length === 0,
    filesWritten: written,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function formatCode(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
    });
  } catch {
    // If prettier fails, return unformatted code
    return code;
  }
}
