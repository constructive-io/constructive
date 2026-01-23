/**
 * Unified generate command - generates SDK from GraphQL schema
 *
 * This module provides a single public generate() function that:
 * 1. Runs introspection ONCE per target
 * 2. Generates shared types ONCE (when both React Query and ORM are enabled)
 * 3. Generates React Query SDK and/or ORM client based on config
 *
 * The internal generator functions are not exported from the package.
 */
import path from 'path';
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
import { generate as generateReactQueryFiles } from '../../core/codegen';
import { generateOrm as generateOrmFiles } from '../../core/codegen/orm';
import { generateSharedTypes } from '../../core/codegen/shared';
import { writeGeneratedFiles } from '../../core/output';
import type { CleanTable, CleanOperation, TypeRegistry } from '../../types/schema';

export type GeneratorType = 'react-query' | 'orm' | 'shared';

export interface GenerateOptions extends ConfigOverrideOptions {
  /** Authorization header */
  authorization?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run - don't write files */
  dryRun?: boolean;
  /** Skip custom operations (only generate table CRUD) */
  skipCustomOperations?: boolean;
  /** Override: generate React Query SDK regardless of config */
  reactQuery?: boolean;
  /** Override: generate ORM client regardless of config */
  orm?: boolean;
}

export interface GenerateTargetResult {
  name: string;
  output: string;
  generatorType: GeneratorType;
  success: boolean;
  message: string;
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

export interface GenerateResult {
  success: boolean;
  message: string;
  targets?: GenerateTargetResult[];
  tables?: string[];
  customQueries?: string[];
  customMutations?: string[];
  filesWritten?: string[];
  errors?: string[];
}

interface PipelineResult {
  tables: CleanTable[];
  customOperations: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
    typeRegistry: TypeRegistry;
  };
  stats: {
    customQueries: number;
    customMutations: number;
  };
}

/**
 * Unified generate function that respects config.reactQuery.enabled and config.orm.enabled
 *
 * Can generate React Query SDK, ORM client, or both based on configuration.
 * Use the `reactQuery` and `orm` options to override config flags.
 */
export async function generate(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
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
  const results: GenerateTargetResult[] = [];

  for (const target of targets) {
    // Determine which generators to run based on config and options
    const runReactQuery = options.reactQuery ?? target.config.reactQuery.enabled;
    const runOrm = options.orm ?? target.config.orm.enabled;

    if (!runReactQuery && !runOrm) {
      results.push({
        name: target.name,
        output: target.config.output,
        generatorType: 'react-query',
        success: false,
        message: `Target "${target.name}": No generators enabled. Set reactQuery.enabled or orm.enabled in config, or use --reactquery or --orm flags.`,
      });
      continue;
    }

    // Run pipeline once per target (shared between generators)
    const pipelineResult = await runPipelineForTarget(target, options, isMultiTarget);
    if (!pipelineResult.success) {
      results.push({
        name: target.name,
        output: target.config.output,
        generatorType: 'react-query',
        success: false,
        message: pipelineResult.error!,
      });
      continue;
    }

    const bothEnabled = runReactQuery && runOrm;

    // When both are enabled, use unified output structure with shared types
    if (bothEnabled) {
      const unifiedResults = await generateUnifiedOutput(
        target,
        pipelineResult.data!,
        options,
        isMultiTarget
      );
      results.push(...unifiedResults);
    } else {
      // Single generator mode - use existing behavior
      if (runReactQuery) {
        const result = await generateReactQueryForTarget(
          target,
          pipelineResult.data!,
          options,
          isMultiTarget,
          undefined // no shared types path
        );
        results.push(result);
      }

      if (runOrm) {
        const result = await generateOrmForTarget(
          target,
          pipelineResult.data!,
          options,
          isMultiTarget,
          undefined // no shared types path
        );
        results.push(result);
      }
    }
  }

  // Build summary
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  if (results.length === 1) {
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

  const summaryMessage =
    failedCount === 0
      ? `Generated ${results.length} outputs successfully.`
      : `Generated ${successCount} of ${results.length} outputs.`;

  return {
    success: failedCount === 0,
    message: summaryMessage,
    targets: results,
    errors:
      failedCount > 0
        ? results.flatMap((r) => r.errors ?? [])
        : undefined,
  };
}

/**
 * Generate React Query SDK only (convenience wrapper)
 */
export async function generateReactQuery(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  return generate({ ...options, reactQuery: true, orm: false });
}

/**
 * Generate ORM client only (convenience wrapper)
 */
export async function generateOrm(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  return generate({ ...options, reactQuery: false, orm: true });
}

// ============================================================================
// Internal helpers
// ============================================================================

interface PipelineRunResult {
  success: boolean;
  error?: string;
  data?: PipelineResult;
}

async function runPipelineForTarget(
  target: ResolvedTargetConfig,
  options: GenerateOptions,
  isMultiTarget: boolean
): Promise<PipelineRunResult> {
  const config = target.config;
  const prefix = isMultiTarget ? `[${target.name}] ` : '';
  const formatMessage = (message: string) =>
    isMultiTarget ? `Target "${target.name}": ${message}` : message;

  // Extract extended options if present (attached by config resolver)
  const database = (config as any).database as string | undefined;
  const schemas = (config as any).schemas as string[] | undefined;
  const apiNames = (config as any).apiNames as string[] | undefined;
  const pgpmModulePath = (config as any).pgpmModulePath as string | undefined;
  const pgpmWorkspacePath = (config as any).pgpmWorkspacePath as string | undefined;
  const pgpmModuleName = (config as any).pgpmModuleName as string | undefined;
  const keepDb = (config as any).keepDb as boolean | undefined;

  if (isMultiTarget) {
    console.log(`\nTarget "${target.name}"`);
    let sourceLabel: string;
    const schemaInfo = apiNames && apiNames.length > 0
      ? `apiNames: ${apiNames.join(', ')}`
      : `schemas: ${(schemas ?? ['public']).join(', ')}`;
    if (pgpmModulePath) {
      sourceLabel = `pgpm module: ${pgpmModulePath} (${schemaInfo})`;
    } else if (pgpmWorkspacePath && pgpmModuleName) {
      sourceLabel = `pgpm workspace: ${pgpmWorkspacePath}, module: ${pgpmModuleName} (${schemaInfo})`;
    } else if (database) {
      sourceLabel = `database: ${database} (${schemaInfo})`;
    } else if (config.schema) {
      sourceLabel = `schema: ${config.schema}`;
    } else {
      sourceLabel = `endpoint: ${config.endpoint}`;
    }
    console.log(`  Source: ${sourceLabel}`);
  }

  // 1. Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
    database,
    pgpmModulePath,
    pgpmWorkspacePath,
    pgpmModuleName,
    schemas,
    apiNames,
  });
  if (!sourceValidation.valid) {
    return {
      success: false,
      error: formatMessage(sourceValidation.error!),
    };
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
    database,
    pgpmModulePath,
    pgpmWorkspacePath,
    pgpmModuleName,
    schemas,
    apiNames,
    keepDb,
    authorization: options.authorization || config.headers['Authorization'],
    headers: config.headers,
  });

  // 2. Run the codegen pipeline
  let pipelineResult;
  try {
    console.log(`${prefix}Fetching schema...`);
    pipelineResult = await runCodegenPipeline({
      source,
      config,
      verbose: options.verbose,
      skipCustomOperations: options.skipCustomOperations,
    });
  } catch (err) {
    return {
      success: false,
      error: formatMessage(
        `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`
      ),
    };
  }

  const { tables, customOperations, stats } = pipelineResult;

  // 3. Validate tables found
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      success: false,
      error: formatMessage(tablesValidation.error!),
    };
  }

  return {
    success: true,
    data: { tables, customOperations, stats },
  };
}

/**
 * Generate unified output when both React Query and ORM are enabled
 *
 * Output structure:
 * {output}/
 *   index.ts          - Main barrel (re-exports shared + react-query + orm)
 *   types.ts          - Shared entity types
 *   schema-types.ts   - Shared schema types (enums, input types)
 *   react-query/      - React Query SDK
 *   orm/              - ORM client
 */
async function generateUnifiedOutput(
  target: ResolvedTargetConfig,
  pipelineResult: PipelineResult,
  options: GenerateOptions,
  isMultiTarget: boolean
): Promise<GenerateTargetResult[]> {
  const config = target.config;
  const outputRoot = config.output;
  const prefix = isMultiTarget ? `[${target.name}] ` : '';
  const formatMessage = (message: string) =>
    isMultiTarget ? `Target "${target.name}": ${message}` : message;

  const results: GenerateTargetResult[] = [];
  const { tables, customOperations } = pipelineResult;

  // 1. Generate shared types to output root
  console.log(`${prefix}Generating shared types...`);
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
      results.push({
        name: target.name,
        output: outputRoot,
        generatorType: 'shared',
        success: false,
        message: formatMessage(`Failed to write shared types: ${writeResult.errors?.join(', ')}`),
        errors: writeResult.errors,
      });
      return results;
    }
    console.log(`${prefix}Shared types written to ${outputRoot}`);
  }

  // 2. Generate React Query SDK to react-query/ subdirectory
  const reactQueryResult = await generateReactQueryForTarget(
    target,
    pipelineResult,
    options,
    isMultiTarget,
    '..' // import types from parent directory
  );
  results.push(reactQueryResult);

  // 3. Generate ORM client to orm/ subdirectory
  const ormResult = await generateOrmForTarget(
    target,
    pipelineResult,
    options,
    isMultiTarget,
    '..' // import types from parent directory
  );
  results.push(ormResult);

  // 4. Generate unified barrel export
  if (!options.dryRun) {
    const unifiedBarrel = generateUnifiedBarrel(sharedResult.hasSchemaTypes);
    await writeGeneratedFiles([{ path: 'index.ts', content: unifiedBarrel }], outputRoot, []);
  }

  return results;
}

/**
 * Generate the unified barrel export for the root output directory
 */
function generateUnifiedBarrel(hasSchemaTypes: boolean): string {
  const lines = [
    '/**',
    ' * Generated SDK - auto-generated, do not edit',
    ' */',
    '',
    '// Shared types',
    "export * from './types';",
  ];

  if (hasSchemaTypes) {
    lines.push("export * from './schema-types';");
  }

  lines.push('');
  lines.push('// React Query SDK');
  lines.push("export * from './react-query';");
  lines.push('');
  lines.push('// ORM Client');
  lines.push("export * from './orm';");
  lines.push('');

  return lines.join('\n');
}

async function generateReactQueryForTarget(
  target: ResolvedTargetConfig,
  pipelineResult: PipelineResult,
  options: GenerateOptions,
  isMultiTarget: boolean,
  sharedTypesPath?: string
): Promise<GenerateTargetResult> {
  const config = target.config;
  const outputDir = sharedTypesPath
    ? path.join(config.output, 'react-query')
    : config.output;
  const prefix = isMultiTarget ? `[${target.name}] ` : '';
  const log = options.verbose
    ? (message: string) => console.log(`${prefix}${message}`)
    : () => {};
  const formatMessage = (message: string) =>
    isMultiTarget ? `Target "${target.name}": ${message}` : message;

  const { tables, customOperations, stats } = pipelineResult;

  // Generate React Query SDK
  console.log(`${prefix}Generating React Query SDK...`);
  const { files: generatedFiles, stats: genStats } = generateReactQueryFiles({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
    sharedTypesPath,
  });
  console.log(`${prefix}Generated ${genStats.totalFiles} files`);

  log(`  ${genStats.queryHooks} table query hooks`);
  log(`  ${genStats.mutationHooks} table mutation hooks`);
  log(`  ${genStats.customQueryHooks} custom query hooks`);
  log(`  ${genStats.customMutationHooks} custom mutation hooks`);

  const customQueries = customOperations.queries.map((q) => q.name);
  const customMutations = customOperations.mutations.map((m) => m.name);

  if (options.dryRun) {
    return {
      name: target.name,
      output: outputDir,
      generatorType: 'react-query',
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

  // Write files
  log('Writing files...');
  console.log(`${prefix}Output: ${outputDir}`);
  const writeResult = await writeGeneratedFiles(generatedFiles, outputDir, [
    'queries',
    'mutations',
  ]);

  if (!writeResult.success) {
    return {
      name: target.name,
      output: outputDir,
      generatorType: 'react-query',
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
    generatorType: 'react-query',
    success: true,
    message: formatMessage(
      `Generated React Query SDK for ${tables.length} tables${customOpsMsg}. Files written to ${outputDir}`
    ),
    tables: tables.map((t) => t.name),
    customQueries,
    customMutations,
    filesWritten: writeResult.filesWritten,
  };
}

async function generateOrmForTarget(
  target: ResolvedTargetConfig,
  pipelineResult: PipelineResult,
  options: GenerateOptions,
  isMultiTarget: boolean,
  sharedTypesPath?: string
): Promise<GenerateTargetResult> {
  const config = target.config;
  const outputDir = sharedTypesPath
    ? path.join(config.output, 'orm')
    : (options.output || config.orm.output);
  const prefix = isMultiTarget ? `[${target.name}] ` : '';
  const log = options.verbose
    ? (message: string) => console.log(`${prefix}${message}`)
    : () => {};
  const formatMessage = (message: string) =>
    isMultiTarget ? `Target "${target.name}": ${message}` : message;

  const { tables, customOperations, stats } = pipelineResult;

  // Generate ORM client
  console.log(`${prefix}Generating ORM client...`);
  const { files: generatedFiles, stats: genStats } = generateOrmFiles({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
    sharedTypesPath,
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
      generatorType: 'orm',
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

  // Write files
  log('Writing files...');
  console.log(`${prefix}Output: ${outputDir}`);
  const writeResult = await writeGeneratedFiles(generatedFiles, outputDir, [
    'models',
    'query',
    'mutation',
  ]);

  if (!writeResult.success) {
    return {
      name: target.name,
      output: outputDir,
      generatorType: 'orm',
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
    generatorType: 'orm',
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
