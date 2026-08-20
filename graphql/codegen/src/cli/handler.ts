/**
 * Shared codegen operation and legacy terminal adapter.
 *
 * `runCodegenOperation` is the reusable boundary: it never prints, prompts,
 * exits, or changes process-global state. The legacy CLI adapter below keeps
 * the existing human presentation while CNC migrates to the command runtime.
 */
import path from 'node:path';

import type { Question } from 'inquirerer';

import { throwIfAborted } from '../core/cancellation';
import { findConfigFile, loadConfigFile } from '../core/config';
import {
  expandApiNamesToMultiTarget,
  expandSchemaDirToMultiTarget,
  generate,
  generateMulti,
  type GenerateMultiResult,
  type GenerateProgressEvent,
  type GenerateResult,
} from '../core/generate';
import type { FileChange, GenerationPlan } from '../core/output';
import {
  isSafeCodegenEndpoint,
  reportConfigSensitiveValues,
  type SensitiveValueReporter,
} from '../core/sensitive-values';
import type { GraphQLSDKConfigTarget, SchemaConfig } from '../types/config';
import { mergeConfig } from '../types/config';
import {
  buildDbConfig,
  buildGenerateOptions,
  camelizeArgv,
  codegenQuestions,
  hasResolvedCodegenSource,
  normalizeCodegenListOptions,
  printResult,
  seedArgvFromConfig,
} from './shared';

interface Prompter {
  prompt(
    argv: Record<string, unknown>,
    questions: Question[]
  ): Promise<Record<string, unknown>>;
}

export class CodegenOperationError extends Error {
  readonly code: string;
  readonly path?: string;

  constructor(code: string, message: string, path?: string) {
    super(message);
    this.name = 'CodegenOperationError';
    this.code = code;
    this.path = path;
  }
}

export interface RunCodegenOperationOptions {
  cwd: string;
  env?: Readonly<Record<string, string | undefined>>;
  prompter?: Prompter;
  overwriteModifiedGenerated?: boolean;
  yes?: boolean;
  onProgress?: (event: GenerateProgressEvent) => void;
  /** Receives secrets discovered while resolving direct or file configuration. */
  onSensitiveValue?: SensitiveValueReporter;
  /**
   * Permit executable TypeScript/JavaScript configuration imports.
   * Disabled by default; only the legacy standalone CLI enables this.
   */
  allowExecutableConfig?: boolean;
  /** Reject invalid or credential-bearing endpoint URLs before progress. */
  requireSafeEndpoints?: boolean;
  signal?: AbortSignal;
}

export interface CodegenOperationResult {
  results: Array<{ name?: string; result: GenerateResult }>;
  hasError: boolean;
  plans: GenerationPlan[];
  planFingerprint?: string;
  fileChanges: FileChange[];
  warnings?: string[];
  recoveryPath?: string;
  rollbackErrors?: string[];
}

const collectResult = (
  result: GenerateResult,
  name?: string
): CodegenOperationResult => ({
  results: [{ ...(name === undefined ? {} : { name }), result }],
  hasError: !result.success,
  plans: result.plans ?? [],
  ...(result.planFingerprint === undefined
    ? {}
    : { planFingerprint: result.planFingerprint }),
  fileChanges: result.fileChanges ?? [],
  ...(result.warnings === undefined ? {} : { warnings: result.warnings }),
  ...(result.recoveryPath === undefined
    ? {}
    : { recoveryPath: result.recoveryPath }),
  ...(result.rollbackErrors === undefined
    ? {}
    : { rollbackErrors: result.rollbackErrors }),
});

const collectMultiResult = (
  result: GenerateMultiResult
): CodegenOperationResult => ({
  results: result.results,
  hasError: result.hasError,
  plans: result.plans ?? [],
  ...(result.planFingerprint === undefined
    ? {}
    : { planFingerprint: result.planFingerprint }),
  fileChanges: result.fileChanges ?? [],
  ...(result.warnings === undefined ? {} : { warnings: result.warnings }),
  ...(result.recoveryPath === undefined
    ? {}
    : { recoveryPath: result.recoveryPath }),
  ...(result.rollbackErrors === undefined
    ? {}
    : { rollbackErrors: result.rollbackErrors }),
});

const schemaOptions = (
  args: Record<string, unknown>
): SchemaConfig | undefined =>
  args.schemaEnabled
    ? {
      enabled: true,
      ...(args.schemaOutput ? { output: String(args.schemaOutput) } : {}),
      ...(args.schemaFilename
        ? { filename: String(args.schemaFilename) }
        : {}),
    }
    : undefined;

const assertSafeResolvedEndpoints = (
  targets: readonly GraphQLSDKConfigTarget[],
  options: RunCodegenOperationOptions
): void => {
  if (options.requireSafeEndpoints !== true) return;
  for (const target of targets) {
    if (
      target.endpoint !== undefined &&
      !isSafeCodegenEndpoint(target.endpoint)
    ) {
      throw new CodegenOperationError(
        'CODEGEN_ENDPOINT_INVALID',
        'The codegen endpoint must be an absolute HTTP or HTTPS URL without embedded credentials, credential-like query parameters, or a fragment.'
      );
    }
  }
};

/** Execute codegen without terminal or process-global side effects. */
export async function runCodegenOperation(
  argv: Record<string, unknown>,
  options: RunCodegenOperationOptions
): Promise<CodegenOperationResult> {
  throwIfAborted(options.signal);
  const cwd = path.resolve(options.cwd);
  const args = camelizeArgv(argv);
  reportConfigSensitiveValues(args, options.onSensitiveValue);
  const onProgress = options.onProgress ?? (() => undefined);
  const schema = schemaOptions(args);
  const dryRun = args.dryRun === true;
  const hasSourceFlags = Boolean(
    args.endpoint ||
    args.schemaFile ||
    args.schemaDir ||
    args.schemas ||
    args.apiNames
  );
  const configPath =
    (args.config as string | undefined) ||
    (!hasSourceFlags ? (findConfigFile(cwd) ?? undefined) : undefined);
  const targetName = args.target as string | undefined;
  let fileConfig: GraphQLSDKConfigTarget = {};

  if (configPath) {
    const loaded = await loadConfigFile(configPath, cwd, options.env ?? {}, {
      allowExecutableConfig: options.allowExecutableConfig === true,
    });
    throwIfAborted(options.signal);
    if (loaded.success === false) {
      throw new CodegenOperationError(
        loaded.code ?? 'CODEGEN_CONFIG_INVALID',
        loaded.error ?? 'Unable to load the codegen configuration.',
        loaded.path
      );
    }

    const config = loaded.config;
    reportConfigSensitiveValues(config, options.onSensitiveValue);
    if (loaded.normalized.kind === 'multi') {
      const targets = loaded.normalized.targets;
      if (targetName && !targets[targetName]) {
        throw new CodegenOperationError(
          'CODEGEN_TARGET_NOT_FOUND',
          `Target "${targetName}" not found. Available: ${Object.keys(targets).join(', ')}`
        );
      }

      const cliOverrides = buildDbConfig(
        normalizeCodegenListOptions(args)
      ) as Partial<GraphQLSDKConfigTarget>;
      reportConfigSensitiveValues(cliOverrides, options.onSensitiveValue);
      const selectedTargets = targetName
        ? { [targetName]: targets[targetName] }
        : targets;
      const resolvedTargets = Object.values(selectedTargets).map((target) =>
        mergeConfig(target, cliOverrides)
      );
      reportConfigSensitiveValues(resolvedTargets, options.onSensitiveValue);
      assertSafeResolvedEndpoints(resolvedTargets, options);
      const generated = await generateMulti({
        configs: selectedTargets,
        cliOverrides,
        schema,
        cwd,
        dryRun,
        overwriteModifiedGenerated: options.overwriteModifiedGenerated,
        yes: options.yes,
        onProgress,
        signal: options.signal,
        env: options.env ?? {},
      });
      return collectMultiResult(generated);
    }

    fileConfig = loaded.normalized.target;
  }

  const seeded = seedArgvFromConfig(args, fileConfig);
  let answers = seeded;
  if (!hasResolvedCodegenSource(seeded)) {
    if (!options.prompter) {
      throw new CodegenOperationError(
        'CODEGEN_SOURCE_REQUIRED',
        'No codegen source was supplied. Use --endpoint, --schema-file, --schema-dir, --schemas, --api-names, or --config.'
      );
    }
    answers = await options.prompter.prompt(seeded, codegenQuestions);
    throwIfAborted(options.signal);
  }

  const generatedOptions = buildGenerateOptions(answers, fileConfig);
  reportConfigSensitiveValues(generatedOptions, options.onSensitiveValue);
  assertSafeResolvedEndpoints([generatedOptions], options);
  const expanded =
    expandApiNamesToMultiTarget(generatedOptions) ||
    expandSchemaDirToMultiTarget(generatedOptions, cwd);
  if (expanded) {
    reportConfigSensitiveValues(expanded, options.onSensitiveValue);
    assertSafeResolvedEndpoints(Object.values(expanded), options);
    const generated = await generateMulti({
      configs: expanded,
      schema,
      cwd,
      dryRun,
      overwriteModifiedGenerated: options.overwriteModifiedGenerated,
      yes: options.yes,
      onProgress,
      signal: options.signal,
      env: options.env ?? {},
    });
    return collectMultiResult(generated);
  }

  const result = await generate({
    ...generatedOptions,
    cwd,
    dryRun,
    overwriteModifiedGenerated: options.overwriteModifiedGenerated,
    yes: options.yes,
    onProgress,
    signal: options.signal,
    env: options.env ?? {},
    ...(schema ? { schema } : {}),
  });
  return collectResult(result);
}

/** Legacy human adapter retained for the standalone graphql-codegen CLI. */
export async function runCodegenHandler(
  argv: Record<string, unknown>,
  prompter: Prompter
): Promise<void> {
  try {
    const operation = await runCodegenOperation(argv, {
      cwd: process.cwd(),
      env: { ...process.env },
      prompter,
      allowExecutableConfig: true,
      onProgress: ({ message }) => console.log(message),
    });
    for (const { name, result } of operation.results) {
      if (name) console.log(`\n[${name}]`);
      printResult(result);
    }
    if (operation.hasError) process.exitCode = 1;
  } catch (error) {
    console.error(
      'x',
      error instanceof Error ? error.message : 'Code generation failed.'
    );
    process.exitCode = 1;
  }
}
