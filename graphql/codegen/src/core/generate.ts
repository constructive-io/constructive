/**
 * Main generate function - orchestrates the entire codegen pipeline
 *
 * This is the primary entry point for programmatic usage.
 * The CLI is a thin wrapper around this function.
 */
import path from 'node:path';

import type { CliConfig, GraphQLSDKConfigTarget } from '../types/config';
import { getConfigOptions } from '../types/config';
import type { CleanOperation, CleanTable } from '../types/schema';
import { generate as generateReactQueryFiles } from './codegen';
import { generateRootBarrel } from './codegen/barrel';
import { generateCli as generateCliFiles, generateMultiTargetCli } from './codegen/cli';
import type { MultiTargetCliTarget } from './codegen/cli';
import {
  generateReadme as generateCliReadme,
  generateAgentsDocs as generateCliAgentsDocs,
  getCliMcpTools,
  generateSkills as generateCliSkills,
  generateMultiTargetReadme,
  generateMultiTargetAgentsDocs,
  getMultiTargetCliMcpTools,
  generateMultiTargetSkills,
} from './codegen/cli/docs-generator';
import type { MultiTargetDocsInput } from './codegen/cli/docs-generator';
import { resolveDocsConfig } from './codegen/docs-utils';
import type { McpTool } from './codegen/docs-utils';
import {
  generateHooksReadme,
  generateHooksAgentsDocs,
  getHooksMcpTools,
  generateHooksSkills,
} from './codegen/hooks-docs-generator';
import { generateOrm as generateOrmFiles } from './codegen/orm';
import {
  generateOrmReadme,
  generateOrmAgentsDocs,
  getOrmMcpTools,
  generateOrmSkills,
} from './codegen/orm/docs-generator';
import { generateSharedTypes } from './codegen/shared';
import {
  generateTargetReadme,
  generateCombinedMcpConfig,
  generateRootRootReadme,
} from './codegen/target-docs-generator';
import type { RootRootReadmeTarget } from './codegen/target-docs-generator';
import { createSchemaSource, validateSourceOptions } from './introspect';
import { writeGeneratedFiles } from './output';
import { runCodegenPipeline, validateTablesFound } from './pipeline';

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
  pipelineData?: {
    tables: CleanTable[];
    customOperations: {
      queries: CleanOperation[];
      mutations: CleanOperation[];
    };
  };
}

/**
 * Main generate function - takes a single config and generates code
 *
 * This is the primary entry point for programmatic usage.
 * For multiple configs, call this function in a loop.
 */
export interface GenerateInternalOptions {
  skipCli?: boolean;
}

export async function generate(
  options: GenerateOptions = {},
  internalOptions?: GenerateInternalOptions,
): Promise<GenerateResult> {
  // Apply defaults to get resolved config
  const config = getConfigOptions(options);
  const outputRoot = config.output;

  // Determine which generators to run
  // ORM is always required when React Query is enabled (hooks delegate to ORM)
  // This handles minimist setting orm=false when --orm flag is absent
  const runReactQuery = config.reactQuery ?? false;
  const runCli = internalOptions?.skipCli ? false : !!config.cli;
  const runOrm =
    runReactQuery || !!config.cli || (options.orm !== undefined ? !!options.orm : false);

  if (!runReactQuery && !runOrm && !runCli) {
    return {
      success: false,
      message:
        'No generators enabled. Use reactQuery: true, orm: true, or cli: true in your config.',
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
    authorization: options.authorization || config.headers?.Authorization,
    headers: config.headers,
  });

  // Run pipeline
  let pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>;
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
  const filesToWrite: Array<{ path: string; content: string }> = [];

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
    filesToWrite.push(...sharedResult.files);
  }

  // Generate React Query hooks
  if (runReactQuery) {
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
    filesToWrite.push(
      ...files.map((file) => ({
        ...file,
        path: path.posix.join('hooks', file.path),
      })),
    );
  }

  // Generate ORM client
  if (runOrm) {
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
    filesToWrite.push(
      ...files.map((file) => ({
        ...file,
        path: path.posix.join('orm', file.path),
      })),
    );
  }

  // Generate CLI commands
  if (runCli) {
    console.log('Generating CLI commands...');
    const { files } = generateCliFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
      },
      config,
    });
    filesToWrite.push(
      ...files.map((file) => ({
        path: path.posix.join('cli', file.fileName),
        content: file.content,
      })),
    );
  }

  // Generate barrel file at output root
  const barrelContent = generateRootBarrel({
    hasTypes: bothEnabled,
    hasHooks: runReactQuery,
    hasOrm: runOrm,
    hasCli: runCli,
  });
  filesToWrite.push({ path: 'index.ts', content: barrelContent });

  // Generate docs for each enabled generator
  const docsConfig = resolveDocsConfig(config.docs);
  const allCustomOps: CleanOperation[] = [
    ...(customOperations.queries ?? []),
    ...(customOperations.mutations ?? []),
  ];
  const allMcpTools: McpTool[] = [];

  if (runOrm) {
    if (docsConfig.readme) {
      const readme = generateOrmReadme(tables, allCustomOps);
      filesToWrite.push({ path: path.posix.join('orm', readme.fileName), content: readme.content });
    }
    if (docsConfig.agents) {
      const agents = generateOrmAgentsDocs(tables, allCustomOps);
      filesToWrite.push({ path: path.posix.join('orm', agents.fileName), content: agents.content });
    }
    if (docsConfig.mcp) {
      allMcpTools.push(...getOrmMcpTools(tables, allCustomOps));
    }
    if (docsConfig.skills) {
      for (const skill of generateOrmSkills(tables, allCustomOps)) {
        filesToWrite.push({ path: path.posix.join('orm', skill.fileName), content: skill.content });
      }
    }
  }

  if (runReactQuery) {
    if (docsConfig.readme) {
      const readme = generateHooksReadme(tables, allCustomOps);
      filesToWrite.push({ path: path.posix.join('hooks', readme.fileName), content: readme.content });
    }
    if (docsConfig.agents) {
      const agents = generateHooksAgentsDocs(tables, allCustomOps);
      filesToWrite.push({ path: path.posix.join('hooks', agents.fileName), content: agents.content });
    }
    if (docsConfig.mcp) {
      allMcpTools.push(...getHooksMcpTools(tables, allCustomOps));
    }
    if (docsConfig.skills) {
      for (const skill of generateHooksSkills(tables, allCustomOps)) {
        filesToWrite.push({ path: path.posix.join('hooks', skill.fileName), content: skill.content });
      }
    }
  }

  if (runCli) {
    const toolName =
      typeof config.cli === 'object' && config.cli?.toolName
        ? config.cli.toolName
        : 'app';
    if (docsConfig.readme) {
      const readme = generateCliReadme(tables, allCustomOps, toolName);
      filesToWrite.push({ path: path.posix.join('cli', readme.fileName), content: readme.content });
    }
    if (docsConfig.agents) {
      const agents = generateCliAgentsDocs(tables, allCustomOps, toolName);
      filesToWrite.push({ path: path.posix.join('cli', agents.fileName), content: agents.content });
    }
    if (docsConfig.mcp) {
      allMcpTools.push(...getCliMcpTools(tables, allCustomOps, toolName));
    }
    if (docsConfig.skills) {
      for (const skill of generateCliSkills(tables, allCustomOps, toolName)) {
        filesToWrite.push({ path: path.posix.join('cli', skill.fileName), content: skill.content });
      }
    }
  }

  // Generate combined mcp.json at output root
  if (docsConfig.mcp && allMcpTools.length > 0) {
    const mcpName =
      typeof config.cli === 'object' && config.cli?.toolName
        ? config.cli.toolName
        : 'graphql-sdk';
    const mcpFile = generateCombinedMcpConfig(allMcpTools, mcpName);
    filesToWrite.push({ path: mcpFile.fileName, content: mcpFile.content });
  }

  // Generate per-target README at output root
  if (docsConfig.readme) {
    const targetReadme = generateTargetReadme({
      hasOrm: runOrm,
      hasHooks: runReactQuery,
      hasCli: runCli,
      tableCount: tables.length,
      customQueryCount: customOperations.queries.length,
      customMutationCount: customOperations.mutations.length,
      config,
    });
    filesToWrite.push({ path: targetReadme.fileName, content: targetReadme.content });
  }

  if (!options.dryRun) {
    const writeResult = await writeGeneratedFiles(filesToWrite, outputRoot, [], {
      pruneStaleFiles: true,
    });
    if (!writeResult.success) {
      return {
        success: false,
        message: `Failed to write generated files: ${writeResult.errors?.join(', ')}`,
        output: outputRoot,
        errors: writeResult.errors,
      };
    }
    allFilesWritten.push(...(writeResult.filesWritten ?? []));
  }

  const generators = [
    runReactQuery && 'React Query',
    runOrm && 'ORM',
    runCli && 'CLI',
  ]
    .filter(Boolean)
    .join(' and ');

  return {
    success: true,
    message: options.dryRun
      ? `Dry run complete. Would generate ${generators} for ${tables.length} tables.`
      : `Generated ${generators} for ${tables.length} tables. Files written to ${outputRoot}`,
    output: outputRoot,
    tables: tables.map((t) => t.name),
    filesWritten: allFilesWritten,
    pipelineData: {
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
      },
    },
  };
}

export interface GenerateMultiOptions {
  configs: Record<string, GraphQLSDKConfigTarget>;
  cliOverrides?: Partial<GraphQLSDKConfigTarget>;
  verbose?: boolean;
  dryRun?: boolean;
  unifiedCli?: CliConfig | boolean;
}

export interface GenerateMultiResult {
  results: Array<{ name: string; result: GenerateResult }>;
  hasError: boolean;
}

export async function generateMulti(
  options: GenerateMultiOptions,
): Promise<GenerateMultiResult> {
  const { configs, cliOverrides, verbose, dryRun, unifiedCli } = options;
  const names = Object.keys(configs);
  const results: Array<{ name: string; result: GenerateResult }> = [];
  let hasError = false;

  const targetInfos: RootRootReadmeTarget[] = [];
  const useUnifiedCli = !!unifiedCli && names.length > 1;

  const cliTargets: MultiTargetCliTarget[] = [];

  for (const name of names) {
    const targetConfig = {
      ...configs[name],
      ...(cliOverrides ?? {}),
    };
    const result = await generate(
      { ...targetConfig, verbose, dryRun },
      useUnifiedCli ? { skipCli: true } : undefined,
    );
    results.push({ name, result });
    if (!result.success) {
      hasError = true;
    } else {
      const resolvedConfig = getConfigOptions(targetConfig);
      const gens: string[] = [];
      if (resolvedConfig.reactQuery) gens.push('React Query');
      if (resolvedConfig.orm || resolvedConfig.reactQuery || !!resolvedConfig.cli) gens.push('ORM');
      if (resolvedConfig.cli) gens.push('CLI');
      targetInfos.push({
        name,
        output: resolvedConfig.output,
        endpoint: resolvedConfig.endpoint || undefined,
        generators: gens,
      });

      if (useUnifiedCli && result.pipelineData) {
        const isAuthTarget = name === 'auth';
        cliTargets.push({
          name,
          endpoint: resolvedConfig.endpoint || '',
          ormImportPath: `../../${resolvedConfig.output}/orm`,
          tables: result.pipelineData.tables,
          customOperations: result.pipelineData.customOperations,
          isAuthTarget,
        });
      }
    }
  }

  if (useUnifiedCli && cliTargets.length > 0 && !dryRun) {
    const cliConfig = typeof unifiedCli === 'object' ? unifiedCli : {};
    const toolName = cliConfig.toolName ?? 'app';
    const { files } = generateMultiTargetCli({
      toolName,
      builtinNames: cliConfig.builtinNames,
      targets: cliTargets,
    });

    const cliFilesToWrite = files.map((file) => ({
      path: path.posix.join('cli', file.fileName),
      content: file.content,
    }));

    const firstTargetDocsConfig = names.length > 0 && configs[names[0]]?.docs;
    const docsConfig = resolveDocsConfig(firstTargetDocsConfig);
    const { resolveBuiltinNames } = await import('./codegen/cli');
    const builtinNames = resolveBuiltinNames(
      cliTargets.map((t) => t.name),
      cliConfig.builtinNames,
    );

    const docsInput: MultiTargetDocsInput = {
      toolName,
      builtinNames,
      targets: cliTargets.map((t) => ({
        name: t.name,
        endpoint: t.endpoint,
        tables: t.tables,
        customOperations: [
          ...(t.customOperations?.queries ?? []),
          ...(t.customOperations?.mutations ?? []),
        ],
        isAuthTarget: t.isAuthTarget,
      })),
    };

    const allMcpTools: McpTool[] = [];

    if (docsConfig.readme) {
      const readme = generateMultiTargetReadme(docsInput);
      cliFilesToWrite.push({ path: path.posix.join('cli', readme.fileName), content: readme.content });
    }
    if (docsConfig.agents) {
      const agents = generateMultiTargetAgentsDocs(docsInput);
      cliFilesToWrite.push({ path: path.posix.join('cli', agents.fileName), content: agents.content });
    }
    if (docsConfig.mcp) {
      allMcpTools.push(...getMultiTargetCliMcpTools(docsInput));
    }
    if (docsConfig.skills) {
      for (const skill of generateMultiTargetSkills(docsInput)) {
        cliFilesToWrite.push({ path: path.posix.join('cli', skill.fileName), content: skill.content });
      }
    }
    if (docsConfig.mcp && allMcpTools.length > 0) {
      const mcpFile = generateCombinedMcpConfig(allMcpTools, toolName);
      cliFilesToWrite.push({ path: path.posix.join('cli', mcpFile.fileName), content: mcpFile.content });
    }

    const { writeGeneratedFiles: writeFiles } = await import('./output');
    await writeFiles(cliFilesToWrite, '.', [], { pruneStaleFiles: false });
  }

  // Generate root-root README if multi-target
  if (names.length > 1 && targetInfos.length > 0 && !dryRun) {
    const rootReadme = generateRootRootReadme(targetInfos);
    const { writeGeneratedFiles: writeFiles } = await import('./output');
    await writeFiles(
      [{ path: rootReadme.fileName, content: rootReadme.content }],
      '.',
      [],
      { pruneStaleFiles: false },
    );
  }

  return { results, hasError };
}
