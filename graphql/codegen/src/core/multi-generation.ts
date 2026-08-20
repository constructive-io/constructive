/**
 * Coordinated multi-target code generation.
 */
import path from 'node:path';

import type {
  CliConfig,
  GraphQLSDKConfigTarget,
  SchemaConfig,
} from '../types/config';
import { getConfigOptions, mergeConfig } from '../types/config';
import { throwIfAborted } from './cancellation';
import { generateMultiTargetBarrel } from './codegen/barrel';
import {
  generateMultiTargetCli,
  type MultiTargetCliTarget,
} from './codegen/cli';
import {
  generateMultiTargetAgentsDocs,
  generateMultiTargetReadme,
  generateMultiTargetSkills,
  type MultiTargetDocsInput,
} from './codegen/cli/docs-generator';
import { resolveDocsConfig } from './codegen/docs-utils';
import {
  generateRootRootReadme,
  type RootRootReadmeTarget,
} from './codegen/target-docs-generator';
import type {
  FileChange,
  GeneratedFileWriteJob,
  GenerationPlan,
  WriteResult,
} from './output';
import {
  applySharedPgpmDb,
  disposeSharedPgpmSources,
  prepareSharedPgpmSources,
} from './shared-pgpm-source';
import { getStaleTargetWriteJobs, TARGETS_MANIFEST } from './stale-targets';
import {
  applyGenerationJobs,
  combinePlanFingerprint,
  completePreparedGeneration,
  failPreparedGeneration,
  type GenerateProgressEvent,
  type GenerateResult,
  planFields,
  planTargetGeneration,
  type PreparedGeneration,
  recoveryFields,
  resolveSkillsOutputDir,
  resolveTargetPaths,
} from './target-generation';

export { removeStaleTargetDirs, TARGETS_MANIFEST } from './stale-targets';

export interface GenerateMultiOptions {
  configs: Record<string, GraphQLSDKConfigTarget>;
  cliOverrides?: Partial<GraphQLSDKConfigTarget>;
  verbose?: boolean;
  dryRun?: boolean;
  schema?: SchemaConfig;
  unifiedCli?: CliConfig | boolean;
  /** Remove subdirectories in the output root that don't match any current target name. */
  cleanStaleTargets?: boolean;
  /** Base directory for relative config, source, and output paths. */
  cwd?: string;
  overwriteModifiedGenerated?: boolean;
  yes?: boolean;
  onProgress?: (event: GenerateProgressEvent) => void;
  signal?: AbortSignal;
  /** Explicit environment used to resolve omitted PostgreSQL settings. */
  env?: Readonly<Record<string, string | undefined>>;
}

export interface GenerateMultiResult {
  results: Array<{ name: string; result: GenerateResult }>;
  hasError: boolean;
  plans?: GenerationPlan[];
  planFingerprint?: string;
  fileChanges?: FileChange[];
  warnings?: string[];
  recoveryPath?: string;
  rollbackErrors?: string[];
}

export async function generateMulti(
  options: GenerateMultiOptions,
): Promise<GenerateMultiResult> {
  throwIfAborted(options.signal);
  const {
    configs,
    cliOverrides,
    verbose,
    dryRun,
    schema,
    unifiedCli,
    cleanStaleTargets,
    overwriteModifiedGenerated,
    yes,
  } = options;
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const env = options.env ?? {};
  const names = Object.keys(configs);
  const results: Array<{ name: string; result: GenerateResult }> = [];
  let hasError = false;

  const schemaEnabled = !!schema?.enabled;
  const targetInfos: RootRootReadmeTarget[] = [];
  const useUnifiedCli = !schemaEnabled && !!unifiedCli && names.length > 1;

  const cliTargets: MultiTargetCliTarget[] = [];
  const additionalWriteResults: WriteResult[] = [];
  const collectedWriteJobs: GeneratedFileWriteJob[] = [];
  const preparedTargets = new Map<string, PreparedGeneration>();
  let staleTargetWriteJobs: GeneratedFileWriteJob[] = [];
  const additionalWriteJobs: Array<{
    files: Array<{ path: string; content: string }>;
    outputDir: string;
    adoptUnownedPaths?: string[];
  }> = [];

  // Stale cleanup is a read-only planning input. It is committed with every
  // other generated root only after all targets have generated successfully.
  if (cleanStaleTargets && names.length > 0) {
    try {
      throwIfAborted(options.signal);
      const firstOutput = resolveTargetPaths(
        getConfigOptions(configs[names[0]]),
        cwd,
      ).output!;
      const outputRoot = path.dirname(firstOutput);
      staleTargetWriteJobs = getStaleTargetWriteJobs(outputRoot, names);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to plan stale target cleanup.';
      return {
        results: [
          {
            name: 'targets',
            result: {
              success: false,
              message,
              errors: [message],
            },
          },
        ],
        hasError: true,
        plans: [],
        fileChanges: [],
      };
    }
  }

  const sharedSources = await prepareSharedPgpmSources(
    configs,
    cliOverrides,
    cwd,
    env,
    options.onProgress,
    options.signal,
  );

  try {
    for (const name of names) {
      throwIfAborted(options.signal);
      const baseConfig = mergeConfig(configs[name], cliOverrides ?? {});
      const targetConfig = applySharedPgpmDb(
        baseConfig,
        sharedSources,
        cwd,
        env,
      );
      const preparation = await planTargetGeneration(
        {
          ...targetConfig,
          verbose,
          dryRun,
          cwd,
          overwriteModifiedGenerated,
          yes,
          onProgress: options.onProgress,
          signal: options.signal,
          env,
          schema: schemaEnabled
            ? { ...schema, filename: schema?.filename ?? `${name}.graphql` }
            : targetConfig.schema,
        },
        useUnifiedCli
          ? {
            skipCli: true,
            targetName: name,
          }
          : { targetName: name },
      );
      const result =
        preparation.ok === false
          ? preparation.result
          : preparation.prepared.result;
      results.push({ name, result });
      if (preparation.ok === false) {
        hasError = true;
      } else {
        preparedTargets.set(name, preparation.prepared);
        collectedWriteJobs.push(...preparation.prepared.writeJobs);
        const displayConfig = getConfigOptions(targetConfig);
        const resolvedConfig = resolveTargetPaths(displayConfig, cwd);
        const gens: string[] = [];
        if (resolvedConfig.reactQuery) gens.push('React Query');
        if (
          resolvedConfig.orm ||
          resolvedConfig.reactQuery ||
          !!resolvedConfig.cli
        )
          gens.push('ORM');
        if (resolvedConfig.cli) gens.push('CLI');
        targetInfos.push({
          name,
          output: displayConfig.output!,
          endpoint: resolvedConfig.endpoint || undefined,
          generators: gens,
        });

        if (useUnifiedCli && result.pipelineData) {
          const isAuthTarget = name === 'auth';
          cliTargets.push({
            name,
            endpoint: resolvedConfig.endpoint || '',
            ormImportPath: `../${displayConfig.output!.replace(/^\.\//, '')}/orm`,
            tables: result.pipelineData.tables,
            customOperations: result.pipelineData.customOperations,
            isAuthTarget,
            typeRegistry: result.pipelineData.customOperations.typeRegistry,
          });
        }
      }
    }

    if (useUnifiedCli && cliTargets.length > 0) {
      throwIfAborted(options.signal);
      const cliConfig = typeof unifiedCli === 'object' ? unifiedCli : {};
      const toolName = cliConfig.toolName ?? 'app';
      const firstTargetConfig = configs[names[0]];
      const { files } = generateMultiTargetCli({
        toolName,
        stashName: cliConfig.stashName,
        builtinNames: cliConfig.builtinNames,
        targets: cliTargets,
        entryPoint: cliConfig.entryPoint,
      });
      throwIfAborted(options.signal);

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

      // Merge all target type registries into a combined registry for docs generation
      const combinedRegistry = new Map<
        string,
        import('../types/schema').ResolvedType
      >();
      for (const t of cliTargets) {
        if (t.typeRegistry) {
          for (const [key, value] of t.typeRegistry) {
            combinedRegistry.set(key, value);
          }
        }
      }

      const docsInput: MultiTargetDocsInput = {
        toolName,
        builtinNames,
        registry: combinedRegistry.size > 0 ? combinedRegistry : undefined,
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

      if (docsConfig.readme) {
        const readme = generateMultiTargetReadme(docsInput);
        cliFilesToWrite.push({
          path: path.posix.join('cli', readme.fileName),
          content: readme.content,
        });
      }
      if (docsConfig.agents) {
        const agents = generateMultiTargetAgentsDocs(docsInput);
        cliFilesToWrite.push({
          path: path.posix.join('cli', agents.fileName),
          content: agents.content,
        });
      }
      additionalWriteJobs.push({
        files: cliFilesToWrite,
        outputDir: cwd,
      });

      if (docsConfig.skills) {
        const cliSkillsToWrite = generateMultiTargetSkills(docsInput).map(
          (skill) => ({
            path: skill.fileName,
            content: skill.content,
          }),
        );

        const firstTargetResolved = getConfigOptions({
          ...(firstTargetConfig ?? {}),
          ...(cliOverrides ?? {}),
        });
        const skillsOutputDir = resolveSkillsOutputDir(
          firstTargetResolved,
          firstTargetResolved.output,
          cwd,
        );
        additionalWriteJobs.push({
          files: cliSkillsToWrite,
          outputDir: skillsOutputDir,
        });
      }
    }

    // Generate root-root README and barrel if multi-target
    if (names.length > 1 && targetInfos.length > 0) {
      throwIfAborted(options.signal);
      const rootReadme = generateRootRootReadme(targetInfos);
      additionalWriteJobs.push({
        files: [{ path: rootReadme.fileName, content: rootReadme.content }],
        outputDir: cwd,
      });

      // Write a root barrel (index.ts) that re-exports each target as a
      // namespace so the package has a single entry-point.  Derive the
      // common output root from the first target's output path.
      const successfulNames = [...preparedTargets.keys()];
      if (successfulNames.length > 0) {
        const firstOutput = resolveTargetPaths(
          getConfigOptions(configs[successfulNames[0]]),
          cwd,
        ).output!;
        const outputRoot = path.dirname(firstOutput);
        const barrelContent = generateMultiTargetBarrel(successfulNames);
        additionalWriteJobs.push({
          files: [
            { path: 'index.ts', content: barrelContent },
            {
              path: TARGETS_MANIFEST,
              content: `${JSON.stringify(successfulNames.sort())}\n`,
            },
          ],
          outputDir: outputRoot,
          adoptUnownedPaths: [TARGETS_MANIFEST],
        });
      }
    }

    if (cleanStaleTargets && names.length === 1 && targetInfos.length === 1) {
      const firstOutput = resolveTargetPaths(
        getConfigOptions({
          ...configs[names[0]],
          ...(cliOverrides ?? {}),
        }),
        cwd,
      ).output!;
      additionalWriteJobs.push({
        files: [
          {
            path: TARGETS_MANIFEST,
            content: `${JSON.stringify(names)}\n`,
          },
        ],
        outputDir: path.dirname(firstOutput),
        adoptUnownedPaths: [TARGETS_MANIFEST],
      });
    }

    if (!hasError) {
      throwIfAborted(options.signal);
      const finalJobs: GeneratedFileWriteJob[] = [
        ...collectedWriteJobs,
        ...staleTargetWriteJobs.map((job) => ({
          ...job,
          options: {
            ...(job.options ?? {}),
            overwriteModifiedGenerated,
            confirmOverwrite: yes,
          },
        })),
        ...additionalWriteJobs.map((job) => ({
          files: job.files,
          outputDir: job.outputDir,
          options: {
            pruneStaleFiles: false,
            overwriteModifiedGenerated,
            confirmOverwrite: yes,
            adoptUnownedPaths: job.adoptUnownedPaths,
            showProgress: false,
          },
        })),
      ];
      const batch = await applyGenerationJobs(finalJobs, {
        dryRun,
        signal: options.signal,
      });
      additionalWriteResults.push(...batch.results);
      if (!batch.success) {
        hasError = true;
        const errors = batch.errors ?? ['Failed to apply generated files.'];
        const recovery = recoveryFields(batch.results);
        results.push({
          name: 'write',
          result: {
            success: false,
            message: errors.join(', '),
            errors,
            ...planFields(batch.results),
            ...recovery,
          },
        });
      }
    }
  } finally {
    await disposeSharedPgpmSources(
      sharedSources,
      Object.values(configs).some((config) => config.db?.keepDb),
    );
  }

  const failedAttempt = results.find(({ result }) => !result.success);
  const notAppliedMessage =
    failedAttempt?.name === 'write'
      ? 'Generation was not applied because the coordinated filesystem apply failed.'
      : failedAttempt
        ? `Generation was not applied because target "${failedAttempt.name}" failed during planning.`
        : 'Generation was not applied.';
  const finalResults = results.map(({ name, result }) => {
    const prepared = preparedTargets.get(name);
    if (!prepared) return { name, result };
    return {
      name,
      result: hasError
        ? failPreparedGeneration(prepared, notAppliedMessage)
        : completePreparedGeneration(prepared, dryRun === true),
    };
  });
  const targetPlans = finalResults.flatMap(({ result }) => result.plans ?? []);
  const coordinatedPlans = additionalWriteResults.flatMap((result) =>
    result.plan ? [result.plan] : [],
  );
  const plans = coordinatedPlans.length > 0 ? coordinatedPlans : targetPlans;
  const recovery = recoveryFields(additionalWriteResults);
  return {
    results: finalResults,
    hasError,
    plans,
    planFingerprint: combinePlanFingerprint(plans),
    fileChanges: plans.flatMap((plan) => plan.changes),
    ...recovery,
  };
}
