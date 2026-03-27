/**
 * Shared codegen CLI handler
 *
 * Contains the core logic used by both `graphql-codegen` and `cnc codegen`.
 * Both CLIs delegate to runCodegenHandler() after handling their own
 * help/version flags.
 */
import type { Question } from 'inquirerer';

import { findConfigFile, loadConfigFile } from '../core/config';
import { buildPgTypesMap, writePgTypesFile } from '../core/dump-pg-types';
import { expandApiNamesToMultiTarget, expandSchemaDirToMultiTarget, generate, generateMulti } from '../core/generate';
import type { GraphQLSDKConfigTarget } from '../types/config';
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
  prompt(argv: Record<string, unknown>, questions: Question[]): Promise<Record<string, unknown>>;
}

export async function runCodegenHandler(
  argv: Record<string, unknown>,
  prompter: Prompter,
): Promise<void> {
  const args = camelizeArgv(argv as Record<string, any>);

  // Handle --dump-pg-types: run pipeline, extract pg type metadata, write JSON
  if (args.dumpPgTypes) {
    await handleDumpPgTypes(args, prompter);
    return;
  }

  const schemaConfig = args.schemaEnabled
    ? {
        enabled: true,
        ...(args.schemaOutput ? { output: String(args.schemaOutput) } : {}),
        ...(args.schemaFilename ? { filename: String(args.schemaFilename) } : {}),
      }
    : undefined;

  const hasSourceFlags = Boolean(
    args.endpoint || args.schemaFile || args.schemaDir || args.schemas || args.apiNames
  );
  const configPath =
    (args.config as string | undefined) ||
    (!hasSourceFlags ? findConfigFile() : undefined);
  const targetName = args.target as string | undefined;

  let fileConfig: GraphQLSDKConfigTarget = {};

  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }

    const config = loaded.config as Record<string, unknown>;
    const isMulti = !(
      'endpoint' in config ||
      'schemaFile' in config ||
      'schemaDir' in config ||
      'db' in config
    );

    if (isMulti) {
      const targets = config as Record<string, GraphQLSDKConfigTarget>;

      if (targetName && !targets[targetName]) {
        console.error(
          'x',
          `Target "${targetName}" not found. Available: ${Object.keys(targets).join(', ')}`,
        );
        process.exit(1);
      }

      const cliOptions = buildDbConfig(
        normalizeCodegenListOptions(args),
      );

      const selectedTargets = targetName
        ? { [targetName]: targets[targetName] }
        : targets;

      const { results, hasError } = await generateMulti({
        configs: selectedTargets,
        cliOverrides: cliOptions as Partial<GraphQLSDKConfigTarget>,
        schema: schemaConfig,
      });

      for (const { name, result } of results) {
        console.log(`\n[${name}]`);
        printResult(result);
      }

      if (hasError) process.exit(1);
      return;
    }

    fileConfig = config as GraphQLSDKConfigTarget;
  }

  const seeded = seedArgvFromConfig(args, fileConfig);
  const answers = hasResolvedCodegenSource(seeded)
    ? seeded
    : await prompter.prompt(seeded, codegenQuestions);
  const options = buildGenerateOptions(answers, fileConfig);

  const expandedApi = expandApiNamesToMultiTarget(options);
  const expandedDir = expandSchemaDirToMultiTarget(options);
  const expanded = expandedApi || expandedDir;
  if (expanded) {
    const { results, hasError } = await generateMulti({
      configs: expanded,
      schema: schemaConfig,
    });
    for (const { name, result } of results) {
      console.log(`\n[${name}]`);
      printResult(result);
    }
    if (hasError) process.exit(1);
    return;
  }

  const result = await generate({
    ...options,
    ...(schemaConfig ? { schema: schemaConfig } : {}),
  });
  printResult(result);
}

async function handleDumpPgTypes(
  args: Record<string, unknown>,
  prompter: Prompter,
): Promise<void> {
  const hasSourceFlags = Boolean(
    args.endpoint || args.schemaFile || args.schemaDir || args.schemas || args.apiNames
  );
  const configPath =
    (args.config as string | undefined) ||
    (!hasSourceFlags ? findConfigFile() : undefined);

  let fileConfig: GraphQLSDKConfigTarget = {};
  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }
    fileConfig = loaded.config as GraphQLSDKConfigTarget;
  }

  const seeded = seedArgvFromConfig(args, fileConfig);
  const answers = hasResolvedCodegenSource(seeded)
    ? seeded
    : await prompter.prompt(seeded, codegenQuestions);
  const options = buildGenerateOptions(answers, fileConfig);

  // Run the pipeline to get tables (we need the full codegen pipeline to infer tables)
  const result = await generate({
    ...options,
    dryRun: true, // Don't write codegen files, just get pipeline data
  });

  if (!result.success || !result.pipelineData?.tables.length) {
    console.error('x', result.message || 'No tables found');
    process.exit(1);
  }

  const pgTypes = buildPgTypesMap(result.pipelineData.tables);
  const outputPath = typeof args.dumpPgTypes === 'string'
    ? args.dumpPgTypes
    : 'pg-types.json';
  const written = await writePgTypesFile(pgTypes, outputPath);

  const tableCount = Object.keys(pgTypes).length;
  const fieldCount = Object.values(pgTypes).reduce(
    (sum, fields) => sum + Object.keys(fields).length,
    0,
  );
  console.log(`[ok] Wrote pg-types.json: ${tableCount} tables, ${fieldCount} fields`);
  console.log(`     ${written}`);
  console.log('');
  console.log('Usage: add pgTypesFile to your codegen config:');
  console.log(`  { pgTypesFile: '${outputPath}' }`);
}
