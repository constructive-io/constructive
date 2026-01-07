/**
 * Generate command - introspects endpoint and generates SDK
 *
 * This command:
 * 1. Fetches _meta query for table-based CRUD operations
 * 2. Fetches __schema introspection for ALL operations
 * 3. Filters out table operations from custom operations to avoid duplicates
 * 4. Generates hooks for both table CRUD and custom operations
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as prettier from 'prettier';

import type { GraphQLSDKConfig, ResolvedConfig } from '../../types/config';
import { resolveConfig } from '../../types/config';
import { fetchMeta, validateEndpoint } from '../introspect/fetch-meta';
import { fetchSchema } from '../introspect/fetch-schema';
import {
  transformMetaToCleanTables,
  filterTables,
} from '../introspect/transform';
import {
  transformSchemaToOperations,
  filterOperations,
  getTableOperationNames,
  getCustomOperations,
} from '../introspect/transform-schema';
import { findConfigFile, loadConfigFile } from './init';
import { generate } from '../codegen';

export interface GenerateOptions {
  /** Path to config file */
  config?: string;
  /** GraphQL endpoint URL (overrides config) */
  endpoint?: string;
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
  log(`  Endpoint: ${config.endpoint}`);
  log(`  Output: ${config.output}`);

  // 2. Validate endpoint
  const endpointValidation = validateEndpoint(config.endpoint);
  if (!endpointValidation.valid) {
    return {
      success: false,
      message: `Invalid endpoint: ${endpointValidation.error}`,
    };
  }

  // Build authorization header if provided
  const authHeader = options.authorization || config.headers['Authorization'];

  // 3. Fetch _meta for table-based operations
  log('Fetching schema metadata (_meta)...');

  const metaResult = await fetchMeta({
    endpoint: config.endpoint,
    authorization: authHeader,
    headers: config.headers,
    timeout: 30000,
  });

  if (!metaResult.success) {
    return {
      success: false,
      message: `Failed to fetch _meta: ${metaResult.error}`,
    };
  }

  // 4. Transform to CleanTable[]
  log('Transforming table schema...');
  let tables = transformMetaToCleanTables(metaResult.data!);
  log(`  Found ${tables.length} tables`);

  // 5. Filter tables
  tables = filterTables(
    tables,
    config.tables.include,
    config.tables.exclude
  );
  log(`  After filtering: ${tables.length} tables`);

  if (tables.length === 0) {
    return {
      success: false,
      message:
        'No tables found after filtering. Check your include/exclude patterns.',
    };
  }

  // Get table operation names for filtering custom operations
  const tableOperationNames = getTableOperationNames(tables);

  // 6. Fetch __schema for custom operations (unless skipped)
  let customQueries: string[] = [];
  let customMutations: string[] = [];
  let customOperationsData: {
    queries: ReturnType<typeof getCustomOperations>;
    mutations: ReturnType<typeof getCustomOperations>;
    typeRegistry: ReturnType<typeof transformSchemaToOperations>['typeRegistry'];
  } | undefined;

  if (!options.skipCustomOperations) {
    log('Fetching schema introspection (__schema)...');

    const schemaResult = await fetchSchema({
      endpoint: config.endpoint,
      authorization: authHeader,
      headers: config.headers,
      timeout: 30000,
    });

    if (schemaResult.success && schemaResult.data) {
      log('Transforming custom operations...');

      // Transform to CleanOperation[]
      const { queries: allQueries, mutations: allMutations, typeRegistry } =
        transformSchemaToOperations(schemaResult.data);

      log(`  Found ${allQueries.length} queries and ${allMutations.length} mutations total`);

      // Filter by config include/exclude
      const filteredQueries = filterOperations(
        allQueries,
        config.queries.include,
        config.queries.exclude
      );
      const filteredMutations = filterOperations(
        allMutations,
        config.mutations.include,
        config.mutations.exclude
      );

      log(`  After config filtering: ${filteredQueries.length} queries, ${filteredMutations.length} mutations`);

      // Remove table operations (already handled by table generators)
      const customQueriesOps = getCustomOperations(filteredQueries, tableOperationNames);
      const customMutationsOps = getCustomOperations(filteredMutations, tableOperationNames);

      log(`  Custom operations: ${customQueriesOps.length} queries, ${customMutationsOps.length} mutations`);

      customQueries = customQueriesOps.map((q) => q.name);
      customMutations = customMutationsOps.map((m) => m.name);

      customOperationsData = {
        queries: customQueriesOps,
        mutations: customMutationsOps,
        typeRegistry,
      };
    } else {
      log(`  Warning: Could not fetch __schema: ${schemaResult.error}`);
      log('  Continuing with table-only generation...');
    }
  }

  // 7. Generate code
  console.log('Generating code...');
  const { files: generatedFiles, stats } = generate({
    tables,
    customOperations: customOperationsData,
    config,
  });
  console.log(`Generated ${stats.totalFiles} files`);

  log(`  ${stats.queryHooks} table query hooks`);
  log(`  ${stats.mutationHooks} table mutation hooks`);
  log(`  ${stats.customQueryHooks} custom query hooks`);
  log(`  ${stats.customMutationHooks} custom mutation hooks`);

  if (options.dryRun) {
    return {
      success: true,
      message: `Dry run complete. Would generate ${generatedFiles.length} files for ${tables.length} tables and ${customQueries.length + customMutations.length} custom operations.`,
      tables: tables.map((t) => t.name),
      customQueries,
      customMutations,
      filesWritten: generatedFiles.map((f) => f.path),
    };
  }

  // 8. Write files
  log('Writing files...');
  const writeResult = await writeGeneratedFiles(
    generatedFiles,
    config.output,
    ['queries', 'mutations']
  );

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
    endpoint: options.endpoint || baseConfig.endpoint || '',
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

  if (!mergedConfig.endpoint) {
    return {
      success: false,
      error:
        'No endpoint specified. Use --endpoint or create a config file with "graphql-codegen init".',
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
        process.stdout.write(`\rWriting files: ${i + 1}/${total} (${progress}%)`);
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
