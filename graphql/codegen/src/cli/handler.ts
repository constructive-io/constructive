/**
 * Shared codegen CLI handler
 *
 * Contains the core logic used by both `graphql-codegen` and `cnc codegen`.
 * Both CLIs delegate to runCodegenHandler() after handling their own
 * help/version flags.
 */
import type { Question } from 'inquirerer';

import { findConfigFile, loadConfigFile } from '../core/config';
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

  const schemaOnly = Boolean(args.schemaOnly);

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
        schemaOnly,
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
      schemaOnly,
    });
    for (const { name, result } of results) {
      console.log(`\n[${name}]`);
      printResult(result);
    }
    if (hasError) process.exit(1);
    return;
  }

  const result = await generate({ ...options, schemaOnly });
  printResult(result);
}
