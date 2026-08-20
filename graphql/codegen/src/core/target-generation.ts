/**
 * Single-target code generation planning and result assembly.
 *
 * This module owns source introspection and generated artifact construction.
 * Filesystem application is delegated to the output writer.
 */
import { createHash } from 'node:crypto';
import path from 'node:path';

import { buildClientSchema, printSchema } from 'graphql';

import type { GraphQLSDKConfigTarget } from '../types/config';
import { getConfigOptions } from '../types/config';
import type { Operation, Table, TypeRegistry } from '../types/schema';
import { rethrowIfCancelled, throwIfAborted } from './cancellation';
import { generate as generateReactQueryFiles } from './codegen';
import { generateRootBarrel } from './codegen/barrel';
import { generateCli as generateCliFiles } from './codegen/cli';
import {
  generateAgentsDocs as generateCliAgentsDocs,
  generateReadme as generateCliReadme,
  generateSkills as generateCliSkills,
} from './codegen/cli/docs-generator';
import { resolveDocsConfig } from './codegen/docs-utils';
import {
  generateHooksAgentsDocs,
  generateHooksReadme,
  generateHooksSkills,
} from './codegen/hooks-docs-generator';
import { generateOrm as generateOrmFiles } from './codegen/orm';
import {
  generateOrmAgentsDocs,
  generateOrmReadme,
  generateOrmSkills,
} from './codegen/orm/docs-generator';
import { generateSharedTypes } from './codegen/shared';
import { generateTargetReadme } from './codegen/target-docs-generator';
import { createSchemaSource, validateSourceOptions } from './introspect';
import type {
  FileChange,
  GeneratedFileWriteJob,
  GenerationPlan,
  WriteBatchResult,
  WriteResult,
} from './output';
import { writeGeneratedFileJobs } from './output';
import { runCodegenPipeline, validateTablesFound } from './pipeline';
import { findWorkspaceRoot } from './workspace';

export interface GenerateOptions extends GraphQLSDKConfigTarget {
  authorization?: string;
  verbose?: boolean;
  dryRun?: boolean;
  skipCustomOperations?: boolean;
  /** Base directory for all relative source and output paths. */
  cwd?: string;
  /** Allow replacing or deleting generated files modified since the last run. */
  overwriteModifiedGenerated?: boolean;
  /** Explicit confirmation required with overwriteModifiedGenerated. */
  yes?: boolean;
  /** Receives progress without coupling the core generator to terminal output. */
  onProgress?: (event: GenerateProgressEvent) => void;
  /** Cancels fetch and generation before the filesystem commit begins. */
  signal?: AbortSignal;
  /** Explicit environment used to resolve omitted PostgreSQL settings. */
  env?: Readonly<Record<string, string | undefined>>;
}

export interface GenerateProgressEvent {
  phase:
    | 'schema.fetch'
    | 'types.generate'
    | 'hooks.generate'
    | 'orm.generate'
    | 'cli.generate'
    | 'pgpm.prepare';
  message: string;
}

export interface GenerateResult {
  success: boolean;
  message: string;
  output?: string;
  tables?: string[];
  filesWritten?: string[];
  filesRemoved?: string[];
  /** Complete filesystem plans, including unchanged files and conflicts. */
  plans?: GenerationPlan[];
  /** Stable hash of the ordered plan fingerprints. */
  planFingerprint?: string;
  /** Flattened file changes for agent-oriented consumers. */
  fileChanges?: FileChange[];
  errors?: string[];
  /** Non-fatal writer diagnostics, including retained transaction data. */
  warnings?: string[];
  /** Transaction directory retained because cleanup or rollback was incomplete. */
  recoveryPath?: string;
  /** Filesystem restoration failures requiring manual recovery. */
  rollbackErrors?: string[];
  pipelineData?: {
    tables: Table[];
    customOperations: {
      queries: Operation[];
      mutations: Operation[];
      typeRegistry?: TypeRegistry;
    };
  };
}

interface PrepareGenerationOptions {
  skipCli?: boolean;
  targetName?: string;
}

export interface PreparedGeneration {
  result: GenerateResult;
  writeJobs: GeneratedFileWriteJob[];
  messages: {
    applied: string;
    dryRun: string;
  };
}

export type GenerationPreparation =
  | { ok: false; result: GenerateResult }
  | { ok: true; prepared: PreparedGeneration };

export function resolveSkillsOutputDir(
  config: GraphQLSDKConfigTarget,
  outputRoot: string,
  cwd: string,
): string {
  const resolvedOutputRoot = resolvePathFrom(cwd, outputRoot)!;
  const workspaceRoot =
    findWorkspaceRoot(resolvedOutputRoot) ?? findWorkspaceRoot(cwd) ?? cwd;

  if (config.skillsPath) {
    return path.isAbsolute(config.skillsPath)
      ? config.skillsPath
      : path.resolve(workspaceRoot, config.skillsPath);
  }

  return path.resolve(workspaceRoot, '.agents/skills');
}

export function resolvePathFrom(
  cwd: string,
  value: string | undefined,
): string | undefined {
  if (!value) return value;
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(cwd, value);
}

export function resolveTargetPaths(
  target: GraphQLSDKConfigTarget,
  cwd: string,
): GraphQLSDKConfigTarget {
  return {
    ...target,
    output: resolvePathFrom(cwd, target.output),
    schemaFile: resolvePathFrom(cwd, target.schemaFile),
    schemaDir: resolvePathFrom(cwd, target.schemaDir),
    schema: target.schema
      ? {
        ...target.schema,
        output: resolvePathFrom(cwd, target.schema.output),
      }
      : undefined,
    db: target.db
      ? {
        ...target.db,
        pgpm: target.db.pgpm
          ? {
            ...target.db.pgpm,
            modulePath: resolvePathFrom(cwd, target.db.pgpm.modulePath),
            workspacePath: resolvePathFrom(
              cwd,
              target.db.pgpm.workspacePath,
            ),
          }
          : undefined,
      }
      : undefined,
  };
}

export function combinePlanFingerprint(
  plans: GenerationPlan[],
): string | undefined {
  if (plans.length === 0) return undefined;
  return createHash('sha256')
    .update(
      JSON.stringify(
        plans.map((plan) => ({
          outputDir: plan.outputDir,
          fingerprint: plan.fingerprint,
        })),
      ),
    )
    .digest('hex');
}

export function planFields(
  results: WriteResult[],
): Pick<GenerateResult, 'plans' | 'planFingerprint' | 'fileChanges'> {
  const plans = results.flatMap((result) => (result.plan ? [result.plan] : []));
  return {
    plans,
    planFingerprint: combinePlanFingerprint(plans),
    fileChanges: plans.flatMap((plan) => plan.changes),
  };
}

export function recoveryFields(
  results: WriteResult[],
): Pick<GenerateResult, 'warnings' | 'recoveryPath' | 'rollbackErrors'> {
  const warnings = results.flatMap((result) => result.warnings ?? []);
  const rollbackErrors = results.flatMap(
    (result) => result.rollbackErrors ?? [],
  );
  const recoveryPath = results.find(
    (result) => result.recoveryPath !== undefined,
  )?.recoveryPath;
  return {
    ...(warnings.length === 0 ? {} : { warnings }),
    ...(recoveryPath === undefined ? {} : { recoveryPath }),
    ...(rollbackErrors.length === 0 ? {} : { rollbackErrors }),
  };
}

const failedPreparation = (result: GenerateResult): GenerationPreparation => ({
  ok: false,
  result,
});

export async function applyGenerationJobs(
  jobs: GeneratedFileWriteJob[],
  options: Pick<GenerateOptions, 'dryRun' | 'signal'>,
): Promise<WriteBatchResult> {
  throwIfAborted(options.signal);
  return writeGeneratedFileJobs(jobs, {
    dryRun: options.dryRun,
    showProgress: false,
    signal: options.signal,
  });
}

export function completePreparedGeneration(
  prepared: PreparedGeneration,
  dryRun: boolean,
  writeResults: WriteResult[] = [],
): GenerateResult {
  const filesWritten = dryRun
    ? []
    : writeResults.flatMap((result) => result.filesWritten ?? []);
  const filesRemoved = dryRun
    ? []
    : writeResults.flatMap((result) => result.filesRemoved ?? []);
  return {
    ...prepared.result,
    success: true,
    message: dryRun ? prepared.messages.dryRun : prepared.messages.applied,
    filesWritten,
    filesRemoved,
    ...planFields(writeResults),
    ...recoveryFields(writeResults),
  };
}

export function failPreparedGeneration(
  prepared: PreparedGeneration,
  message: string,
  writeResults: WriteResult[] = [],
  errors: string[] = [message],
): GenerateResult {
  return {
    ...prepared.result,
    success: false,
    message,
    errors,
    filesWritten: [],
    filesRemoved: [],
    ...planFields(writeResults),
    ...recoveryFields(writeResults),
  };
}

export async function planTargetGeneration(
  options: GenerateOptions = {},
  internalOptions?: PrepareGenerationOptions,
): Promise<GenerationPreparation> {
  throwIfAborted(options.signal);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const configOverrides = { ...options };
  delete configOverrides.cwd;
  delete configOverrides.overwriteModifiedGenerated;
  delete configOverrides.yes;
  delete configOverrides.onProgress;
  delete configOverrides.signal;
  delete configOverrides.env;
  const report = (event: GenerateProgressEvent): void => {
    if (options.onProgress) options.onProgress(event);
    else console.log(event.message);
  };
  // Resolve every relative path against the operation cwd once. Downstream
  // generation never needs to mutate or rediscover the process cwd.
  const config = resolveTargetPaths(getConfigOptions(configOverrides), cwd);
  const outputRoot = config.output!;

  // Determine which generators to run
  // ORM is always required when React Query is enabled (hooks delegate to ORM)
  // This handles minimist setting orm=false when --orm flag is absent
  const runReactQuery = config.reactQuery ?? false;
  const runCli = internalOptions?.skipCli ? false : !!config.cli;
  const runOrm =
    runReactQuery ||
    !!config.cli ||
    (options.orm !== undefined ? !!options.orm : false);

  const schemaEnabled = !!options.schema?.enabled;

  if (!schemaEnabled && !runReactQuery && !runOrm && !runCli) {
    return failedPreparation({
      success: false,
      message:
        'No generators enabled. Use reactQuery: true, orm: true, or cli: true in your config.',
      output: outputRoot,
    });
  }

  // Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
  });
  if (!sourceValidation.valid) {
    return failedPreparation({
      success: false,
      message: sourceValidation.error!,
      output: outputRoot,
    });
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
    authorization: options.authorization || config.headers?.Authorization,
    headers: config.headers,
    env: options.env ?? {},
  });

  if (schemaEnabled && !runReactQuery && !runOrm && !runCli) {
    try {
      throwIfAborted(options.signal);
      report({
        phase: 'schema.fetch',
        message: `Fetching schema from ${source.describe()}...`,
      });
      throwIfAborted(options.signal);
      const { introspection } = await source.fetch(options.signal);
      throwIfAborted(options.signal);
      const schema = buildClientSchema(introspection as any);
      const sdl = printSchema(schema);
      throwIfAborted(options.signal);

      if (!sdl.trim()) {
        return failedPreparation({
          success: false,
          message: 'Schema introspection returned empty SDL.',
          output: outputRoot,
        });
      }

      const outDir = config.schema?.output || outputRoot;
      const filename = options.schema?.filename || 'schema.graphql';
      const filePath = path.join(outDir, filename);
      throwIfAborted(options.signal);
      return {
        ok: true,
        prepared: {
          result: {
            success: true,
            message: `Schema ready to export to ${filePath}`,
            output: outDir,
          },
          writeJobs: [
            {
              files: [{ path: filename, content: sdl }],
              outputDir: outDir,
              options: {
                pruneStaleFiles: false,
                overwriteModifiedGenerated: options.overwriteModifiedGenerated,
                confirmOverwrite: options.yes,
                showProgress: false,
              },
            },
          ],
          messages: {
            dryRun: `Dry run complete. Would export schema to ${filePath}`,
            applied: `Schema exported to ${filePath}`,
          },
        },
      };
    } catch (err) {
      rethrowIfCancelled(err, options.signal);
      return failedPreparation({
        success: false,
        message: `Failed to export schema: ${err instanceof Error ? err.message : 'Unknown error'}`,
        output: outputRoot,
      });
    }
  }

  // Run pipeline
  let pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>;
  try {
    throwIfAborted(options.signal);
    report({
      phase: 'schema.fetch',
      message: `Fetching schema from ${source.describe()}...`,
    });
    throwIfAborted(options.signal);
    pipelineResult = await runCodegenPipeline({
      source,
      config,
      verbose: options.verbose,
      onLog: (message) =>
        report({
          phase: 'schema.fetch',
          message,
        }),
      skipCustomOperations: options.skipCustomOperations,
      signal: options.signal,
    });
    throwIfAborted(options.signal);
  } catch (err) {
    rethrowIfCancelled(err, options.signal);
    return failedPreparation({
      success: false,
      message: `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`,
      output: outputRoot,
    });
  }

  const { tables, customOperations } = pipelineResult;

  // Validate tables
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return failedPreparation({
      success: false,
      message: tablesValidation.error!,
      output: outputRoot,
    });
  }

  const bothEnabled = runReactQuery && runOrm;
  const filesToWrite: Array<{ path: string; content: string }> = [];

  // Generate shared types when both are enabled
  if (bothEnabled) {
    throwIfAborted(options.signal);
    report({ phase: 'types.generate', message: 'Generating shared types...' });
    throwIfAborted(options.signal);
    const sharedResult = generateSharedTypes({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
    });
    throwIfAborted(options.signal);
    // The root barrel below is the final owner of index.ts and already exports
    // shared ./types alongside the enabled generators. The old writer silently
    // overwrote this shared-only barrel; keep the plan unambiguous instead.
    filesToWrite.push(
      ...sharedResult.files.filter((file) => file.path !== 'index.ts'),
    );
  }

  // Generate React Query hooks
  if (runReactQuery) {
    throwIfAborted(options.signal);
    report({
      phase: 'hooks.generate',
      message: 'Generating React Query hooks...',
    });
    throwIfAborted(options.signal);
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
    throwIfAborted(options.signal);
    filesToWrite.push(
      ...files.map((file) => ({
        ...file,
        path: path.posix.join('hooks', file.path),
      })),
    );
  }

  // Generate ORM client
  if (runOrm) {
    throwIfAborted(options.signal);
    report({ phase: 'orm.generate', message: 'Generating ORM client...' });
    throwIfAborted(options.signal);
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
    throwIfAborted(options.signal);
    filesToWrite.push(
      ...files.map((file) => ({
        ...file,
        path: path.posix.join('orm', file.path),
      })),
    );
  }

  // Generate CLI commands
  if (runCli) {
    throwIfAborted(options.signal);
    report({ phase: 'cli.generate', message: 'Generating CLI commands...' });
    throwIfAborted(options.signal);
    const { files } = generateCliFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
      },
      config,
      typeRegistry: customOperations.typeRegistry,
    });
    throwIfAborted(options.signal);
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
  const allCustomOps: Operation[] = [
    ...(customOperations.queries ?? []),
    ...(customOperations.mutations ?? []),
  ];
  const targetName = internalOptions?.targetName ?? 'default';
  const skillsToWrite: Array<{ path: string; content: string }> = [];

  if (runOrm) {
    if (docsConfig.readme) {
      const readme = generateOrmReadme(
        tables,
        allCustomOps,
        customOperations.typeRegistry,
      );
      filesToWrite.push({
        path: path.posix.join('orm', readme.fileName),
        content: readme.content,
      });
    }
    if (docsConfig.agents) {
      const agents = generateOrmAgentsDocs(tables, allCustomOps);
      filesToWrite.push({
        path: path.posix.join('orm', agents.fileName),
        content: agents.content,
      });
    }
    if (docsConfig.skills) {
      for (const skill of generateOrmSkills(
        tables,
        allCustomOps,
        targetName,
        customOperations.typeRegistry,
      )) {
        skillsToWrite.push({ path: skill.fileName, content: skill.content });
      }
    }
  }

  if (runReactQuery) {
    if (docsConfig.readme) {
      const readme = generateHooksReadme(
        tables,
        allCustomOps,
        customOperations.typeRegistry,
      );
      filesToWrite.push({
        path: path.posix.join('hooks', readme.fileName),
        content: readme.content,
      });
    }
    if (docsConfig.agents) {
      const agents = generateHooksAgentsDocs(tables, allCustomOps);
      filesToWrite.push({
        path: path.posix.join('hooks', agents.fileName),
        content: agents.content,
      });
    }
    if (docsConfig.skills) {
      for (const skill of generateHooksSkills(
        tables,
        allCustomOps,
        targetName,
        customOperations.typeRegistry,
      )) {
        skillsToWrite.push({ path: skill.fileName, content: skill.content });
      }
    }
  }

  if (runCli) {
    const toolName =
      typeof config.cli === 'object' && config.cli?.toolName
        ? config.cli.toolName
        : 'app';
    if (docsConfig.readme) {
      const readme = generateCliReadme(
        tables,
        allCustomOps,
        toolName,
        customOperations.typeRegistry,
      );
      filesToWrite.push({
        path: path.posix.join('cli', readme.fileName),
        content: readme.content,
      });
    }
    if (docsConfig.agents) {
      const agents = generateCliAgentsDocs(
        tables,
        allCustomOps,
        toolName,
        customOperations.typeRegistry,
      );
      filesToWrite.push({
        path: path.posix.join('cli', agents.fileName),
        content: agents.content,
      });
    }
    if (docsConfig.skills) {
      for (const skill of generateCliSkills(
        tables,
        allCustomOps,
        toolName,
        targetName,
        customOperations.typeRegistry,
      )) {
        skillsToWrite.push({ path: skill.fileName, content: skill.content });
      }
    }
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
    filesToWrite.push({
      path: targetReadme.fileName,
      content: targetReadme.content,
    });
  }

  const writeJobs: Array<{
    files: Array<{ path: string; content: string }>;
    outputDir: string;
    pruneStaleFiles: boolean;
  }> = [
    {
      files: filesToWrite,
      outputDir: outputRoot,
      pruneStaleFiles: true,
    },
  ];
  throwIfAborted(options.signal);
  if (skillsToWrite.length > 0) {
    writeJobs.push({
      files: skillsToWrite,
      outputDir: resolveSkillsOutputDir(config, outputRoot, cwd),
      pruneStaleFiles: false,
    });
  }

  throwIfAborted(options.signal);
  const coordinatedJobs: GeneratedFileWriteJob[] = writeJobs.map((job) => ({
    files: job.files,
    outputDir: job.outputDir,
    options: {
      pruneStaleFiles: job.pruneStaleFiles,
      overwriteModifiedGenerated: options.overwriteModifiedGenerated,
      confirmOverwrite: options.yes,
      showProgress: false,
    },
  }));

  const generators = [
    runReactQuery && 'React Query',
    runOrm && 'ORM',
    runCli && 'CLI',
  ]
    .filter(Boolean)
    .join(' and ');

  return {
    ok: true,
    prepared: {
      result: {
        success: true,
        message: `Generated files are ready to apply to ${outputRoot}`,
        output: outputRoot,
        tables: tables.map((t) => t.name),
        pipelineData: {
          tables,
          customOperations: {
            queries: customOperations.queries,
            mutations: customOperations.mutations,
            typeRegistry: customOperations.typeRegistry,
          },
        },
      },
      writeJobs: coordinatedJobs,
      messages: {
        dryRun: `Dry run complete. Would generate ${generators} for ${tables.length} tables.`,
        applied: `Generated ${generators} for ${tables.length} tables. Files written to ${outputRoot}`,
      },
    },
  };
}
