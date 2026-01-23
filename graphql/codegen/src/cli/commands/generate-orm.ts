/**
 * Generate ORM command - generates Prisma-like ORM client from GraphQL schema
 *
 * This is a thin CLI wrapper around the core generation functions.
 * All business logic is in the core modules.
 */
import type { ResolvedTargetConfig } from '../../types/config';
import {
  loadAndResolveConfig,
  type ConfigOverrideOptions,
} from '../../core/config';
import {
  createSchemaSource,
  validateSourceOptions,
} from '../../core/introspect';
import { runCodegenPipeline, validateTablesFound } from '../../core/pipeline';
import { generateOrm as generateOrmFiles } from '../../core/codegen/orm';
import { writeGeneratedFiles } from '../../core/output';

export interface GenerateOrmOptions extends ConfigOverrideOptions {
  /** Authorization header */
  authorization?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run - don't write files */
  dryRun?: boolean;
  /** Skip custom operations (only generate table CRUD) */
  skipCustomOperations?: boolean;
}

export interface GenerateOrmTargetResult {
  name: string;
  output: string;
  success: boolean;
  message: string;
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

export interface GenerateOrmResult {
  success: boolean;
  message: string;
  targets?: GenerateOrmTargetResult[];
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Execute the generate-orm command (generates ORM client)
 */
export async function generateOrm(
  options: GenerateOrmOptions = {}
): Promise<GenerateOrmResult> {
  if (options.verbose) {
    console.log('Loading configuration...');
  }

  const configResult = await loadAndResolveConfig(options);
  if (!configResult.success) {
    return {
      success: false,
      message: configResult.error!,
    };
  }

  const targets = configResult.targets ?? [];
  if (targets.length === 0) {
    return {
      success: false,
      message: 'No targets resolved from configuration.',
    };
  }

  const isMultiTarget = configResult.isMulti ?? targets.length > 1;
  const results: GenerateOrmTargetResult[] = [];

  for (const target of targets) {
    const result = await generateOrmForTarget(target, options, isMultiTarget);
    results.push(result);
  }

  if (!isMultiTarget) {
    const [result] = results;
    return {
      success: result.success,
      message: result.message,
      targets: results,
      tables: result.tables,
      customQueries: result.customQueries,
      customMutations: result.customMutations,
      filesWritten: result.filesWritten,
      errors: result.errors,
    };
  }

  const successCount = results.filter((result) => result.success).length;
  const failedCount = results.length - successCount;
  const summaryMessage =
    failedCount === 0
      ? `Generated ORM clients for ${results.length} targets.`
      : `Generated ORM clients for ${successCount} of ${results.length} targets.`;

  return {
    success: failedCount === 0,
    message: summaryMessage,
    targets: results,
    errors:
      failedCount > 0
        ? results.flatMap((result) => result.errors ?? [])
        : undefined,
  };
}

async function generateOrmForTarget(
  target: ResolvedTargetConfig,
  options: GenerateOrmOptions,
  isMultiTarget: boolean
): Promise<GenerateOrmTargetResult> {
  const config = target.config;
  const outputDir = options.output || config.orm.output;
  const prefix = isMultiTarget ? `[${target.name}] ` : '';
  const log = options.verbose
    ? (message: string) => console.log(`${prefix}${message}`)
    : () => {};
  const formatMessage = (message: string) =>
    isMultiTarget ? `Target "${target.name}": ${message}` : message;

  if (isMultiTarget) {
    console.log(`\nTarget "${target.name}"`);
    const sourceLabel = config.schema
      ? `schema: ${config.schema}`
      : `endpoint: ${config.endpoint}`;
    console.log(`  Source: ${sourceLabel}`);
    console.log(`  Output: ${outputDir}`);
  }

  // 1. Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
  });
  if (!sourceValidation.valid) {
    return {
      name: target.name,
      output: outputDir,
      success: false,
      message: formatMessage(sourceValidation.error!),
    };
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
    authorization: options.authorization || config.headers['Authorization'],
    headers: config.headers,
  });

  // 2. Run the codegen pipeline
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
      name: target.name,
      output: outputDir,
      success: false,
      message: formatMessage(
        `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`
      ),
    };
  }

  const { tables, customOperations, stats } = pipelineResult;

  // 3. Validate tables found
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      name: target.name,
      output: outputDir,
      success: false,
      message: formatMessage(tablesValidation.error!),
    };
  }

  // 4. Generate ORM code
  console.log(`${prefix}Generating code...`);
  const { files: generatedFiles, stats: genStats } = generateOrmFiles({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
  });
  console.log(`${prefix}Generated ${genStats.totalFiles} files`);

  log(`  ${genStats.tables} table models`);
  log(`  ${genStats.customQueries} custom query operations`);
  log(`  ${genStats.customMutations} custom mutation operations`);

  const customQueries = customOperations.queries.map((q) => q.name);
  const customMutations = customOperations.mutations.map((m) => m.name);

  if (options.dryRun) {
    return {
      name: target.name,
      output: outputDir,
      success: true,
      message: formatMessage(
        `Dry run complete. Would generate ${generatedFiles.length} files for ${tables.length} tables and ${stats.customQueries + stats.customMutations} custom operations.`
      ),
      tables: tables.map((t) => t.name),
      customQueries,
      customMutations,
      filesWritten: generatedFiles.map((f) => f.path),
    };
  }

  // 5. Write files
  log('Writing files...');
  const writeResult = await writeGeneratedFiles(generatedFiles, outputDir, [
    'models',
    'query',
    'mutation',
  ]);

  if (!writeResult.success) {
    return {
      name: target.name,
      output: outputDir,
      success: false,
      message: formatMessage(
        `Failed to write files: ${writeResult.errors?.join(', ')}`
      ),
      errors: writeResult.errors,
    };
  }

  const totalOps = customQueries.length + customMutations.length;
  const customOpsMsg = totalOps > 0 ? ` and ${totalOps} custom operations` : '';

  return {
    name: target.name,
    output: outputDir,
    success: true,
    message: formatMessage(
      `Generated ORM client for ${tables.length} tables${customOpsMsg}. Files written to ${outputDir}`
    ),
    tables: tables.map((t) => t.name),
    customQueries,
    customMutations,
    filesWritten: writeResult.filesWritten,
  };
}
