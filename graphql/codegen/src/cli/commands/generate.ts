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
import { execSync } from 'node:child_process';

import type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget,
  ResolvedTargetConfig,
} from '../../types/config';
import { isMultiConfig, mergeConfig, resolveConfig } from '../../types/config';
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
  /** Named target in a multi-target config */
  target?: string;
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

export interface GenerateTargetResult {
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

/**
 * Execute the generate command
 */
export async function generateCommand(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (options.verbose) {
    console.log('Loading configuration...');
  }

  const configResult = await loadConfig(options);
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
    const result = await generateForTarget(target, options, isMultiTarget);
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
      ? `Generated SDK for ${results.length} targets.`
      : `Generated SDK for ${successCount} of ${results.length} targets.`;

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

async function generateForTarget(
  target: ResolvedTargetConfig,
  options: GenerateOptions,
  isMultiTarget: boolean
): Promise<GenerateTargetResult> {
  const config = target.config;
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
    console.log(`  Output: ${config.output}`);
  }

  // 1. Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schema: config.schema || undefined,
  });
  if (!sourceValidation.valid) {
    return {
      name: target.name,
      output: config.output,
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
      output: config.output,
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
      output: config.output,
      success: false,
      message: formatMessage(tablesValidation.error!),
    };
  }

  // 4. Generate code
  console.log(`${prefix}Generating code...`);
  const { files: generatedFiles, stats: genStats } = generate({
    tables,
    customOperations: {
      queries: customOperations.queries,
      mutations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
    },
    config,
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
      output: config.output,
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
  const writeResult = await writeGeneratedFiles(generatedFiles, config.output, [
    'queries',
    'mutations',
  ]);

  if (!writeResult.success) {
    return {
      name: target.name,
      output: config.output,
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
    output: config.output,
    success: true,
    message: formatMessage(
      `Generated SDK for ${tables.length} tables${customOpsMsg}. Files written to ${config.output}`
    ),
    tables: tables.map((t) => t.name),
    customQueries,
    customMutations,
    filesWritten: writeResult.filesWritten,
  };
}

interface LoadConfigResult {
  success: boolean;
  targets?: ResolvedTargetConfig[];
  isMulti?: boolean;
  error?: string;
}

function buildTargetOverrides(
  options: GenerateOptions
): GraphQLSDKConfigTarget {
  const overrides: GraphQLSDKConfigTarget = {};

  if (options.endpoint) {
    overrides.endpoint = options.endpoint;
    overrides.schema = undefined;
  }

  if (options.schema) {
    overrides.schema = options.schema;
    overrides.endpoint = undefined;
  }

  if (options.output) {
    overrides.output = options.output;
  }

  return overrides;
}

async function loadConfig(options: GenerateOptions): Promise<LoadConfigResult> {
  if (options.endpoint && options.schema) {
    return {
      success: false,
      error: 'Cannot use both --endpoint and --schema. Choose one source.',
    };
  }

  // Find config file
  let configPath = options.config;
  if (!configPath) {
    configPath = findConfigFile() ?? undefined;
  }

  let baseConfig: GraphQLSDKConfig = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    baseConfig = loadResult.config;
  }

  const overrides = buildTargetOverrides(options);

  if (isMultiConfig(baseConfig)) {
    if (Object.keys(baseConfig.targets).length === 0) {
      return {
        success: false,
        error: 'Config file defines no targets.',
      };
    }

    if (
      !options.target &&
      (options.endpoint || options.schema || options.output)
    ) {
      return {
        success: false,
        error:
          'Multiple targets configured. Use --target with --endpoint, --schema, or --output.',
      };
    }

    if (options.target && !baseConfig.targets[options.target]) {
      return {
        success: false,
        error: `Target "${options.target}" not found in config file.`,
      };
    }

    const selectedTargets = options.target
      ? { [options.target]: baseConfig.targets[options.target] }
      : baseConfig.targets;
    const defaults = baseConfig.defaults ?? {};
    const resolvedTargets: ResolvedTargetConfig[] = [];

    for (const [name, target] of Object.entries(selectedTargets)) {
      let mergedTarget = mergeConfig(defaults, target);
      if (options.target && name === options.target) {
        mergedTarget = mergeConfig(mergedTarget, overrides);
      }

      if (!mergedTarget.endpoint && !mergedTarget.schema) {
        return {
          success: false,
          error: `Target "${name}" is missing an endpoint or schema.`,
        };
      }

      resolvedTargets.push({
        name,
        config: resolveConfig(mergedTarget),
      });
    }

    return {
      success: true,
      targets: resolvedTargets,
      isMulti: true,
    };
  }

  if (options.target) {
    return {
      success: false,
      error:
        'Config file does not define targets. Remove --target to continue.',
    };
  }

  const mergedConfig = mergeConfig(baseConfig, overrides);

  if (!mergedConfig.endpoint && !mergedConfig.schema) {
    return {
      success: false,
      error:
        'No source specified. Use --endpoint or --schema, or create a config file with "graphql-codegen init".',
    };
  }

  return {
    success: true,
    targets: [{ name: 'default', config: resolveConfig(mergedConfig) }],
    isMulti: false,
  };
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
      fs.writeFileSync(filePath, file.content, 'utf-8');
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

  // Format all generated files with prettier
  if (errors.length === 0) {
    if (showProgress) {
      console.log('Formatting generated files...');
    }
    const formatResult = formatOutput(outputDir);
    if (!formatResult.success && showProgress) {
      console.warn('Warning: Failed to format generated files:', formatResult.error);
    }
  }

  return {
    success: errors.length === 0,
    filesWritten: written,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Format generated files using prettier
 * Runs prettier on the output directory after all files are written
 * Uses bundled config with sensible defaults (singleQuote, trailingComma, etc.)
 */
export function formatOutput(outputDir: string): { success: boolean; error?: string } {
  // Resolve to absolute path for reliable execution
  const absoluteOutputDir = path.resolve(outputDir);

  try {
    // Find prettier binary from this package's node_modules/.bin
    // prettier is a dependency of @constructive-io/graphql-codegen
    const prettierPkgPath = require.resolve('prettier/package.json');
    const prettierDir = path.dirname(prettierPkgPath);
    const prettierBin = path.join(prettierDir, 'bin', 'prettier.cjs');

    // Use bundled config with sensible defaults
    const configPath = path.join(__dirname, 'codegen-prettier.json');
    const fallbackConfigPath = path.resolve(
      __dirname,
      '../../../src/cli/commands/codegen-prettier.json'
    );
    const resolvedConfigPath = fs.existsSync(configPath)
      ? configPath
      : fs.existsSync(fallbackConfigPath)
        ? fallbackConfigPath
        : null;

    if (!resolvedConfigPath) {
      return { success: true };
    }

    execSync(
      `"${prettierBin}" --write --config "${resolvedConfigPath}" "${absoluteOutputDir}"`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
      }
    );
    return { success: true };
  } catch (err) {
    // prettier may fail if files have syntax errors or if not installed
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
