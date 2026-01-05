/**
 * Generate ORM command - generates Prisma-like ORM client
 *
 * This command:
 * 1. Fetches _meta query for table-based CRUD operations
 * 2. Fetches __schema introspection for custom operations
 * 3. Generates a Prisma-like ORM client with fluent API
 */

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
import { writeGeneratedFiles } from './generate';
import { generateOrm } from '../codegen/orm';

export interface GenerateOrmOptions {
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

  log(`  Endpoint: ${config.endpoint}`);
  log(`  Output: ${outputDir}`);

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
  tables = filterTables(tables, config.tables.include, config.tables.exclude);
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
  let customOperationsData:
    | {
        queries: ReturnType<typeof getCustomOperations>;
        mutations: ReturnType<typeof getCustomOperations>;
        typeRegistry: ReturnType<typeof transformSchemaToOperations>['typeRegistry'];
      }
    | undefined;

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

      log(
        `  Found ${allQueries.length} queries and ${allMutations.length} mutations total`
      );

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

      log(
        `  After config filtering: ${filteredQueries.length} queries, ${filteredMutations.length} mutations`
      );

      // Remove table operations (already handled by table generators)
      const customQueriesOps = getCustomOperations(
        filteredQueries,
        tableOperationNames
      );
      const customMutationsOps = getCustomOperations(
        filteredMutations,
        tableOperationNames
      );

      log(
        `  Custom operations: ${customQueriesOps.length} queries, ${customMutationsOps.length} mutations`
      );

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

  // 7. Generate ORM code
  log('Generating ORM client...');
  const { files: generatedFiles, stats } = generateOrm({
    tables,
    customOperations: customOperationsData,
    config,
  });

  log(`  Generated ${stats.tables} table models`);
  log(`  Generated ${stats.customQueries} custom query operations`);
  log(`  Generated ${stats.customMutations} custom mutation operations`);
  log(`  Total files: ${stats.totalFiles}`);

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
    outputDir,
    ['models', 'query', 'mutation']
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
    orm: baseConfig.orm,
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

