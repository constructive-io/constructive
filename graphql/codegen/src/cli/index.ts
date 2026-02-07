#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 *
 * This is a thin wrapper around the core generate() function.
 * All business logic is in the core modules.
 */
import { CLI, CLIOptions, getPackageJson, Inquirerer } from 'inquirerer';

import { findConfigFile, loadConfigFile } from '../core/config';
import { generate } from '../core/generate';
import type { GraphQLSDKConfigTarget } from '../types/config';
import {
  buildDbConfig,
  buildGenerateOptions,
  camelizeArgv,
  codegenQuestions,
  printResult,
  seedArgvFromConfig
} from './shared';

const usage = `
graphql-codegen - GraphQL SDK generator for Constructive databases

Usage:
  graphql-codegen [options]

Source Options (choose one):
  -c, --config <path>           Path to config file
  -e, --endpoint <url>          GraphQL endpoint URL
  -s, --schema-file <path>      Path to GraphQL schema file

Database Options:
  --schemas <list>              Comma-separated PostgreSQL schemas
  --api-names <list>            Comma-separated API names (mutually exclusive with --schemas)

Generator Options:
  --react-query                 Generate React Query hooks
  --orm                         Generate ORM client
  -o, --output <dir>            Output directory
  -t, --target <name>           Target name (for multi-target configs)
  -a, --authorization <token>   Authorization header value
  --dry-run                     Preview without writing files
  -v, --verbose                 Show detailed output

  -h, --help                    Show this help message
  --version                     Show version number
`;

export const commands = async (
  argv: Record<string, unknown>,
  prompter: Inquirerer,
  _options: CLIOptions
): Promise<Record<string, unknown>> => {
  if (argv.version) {
    const pkg = getPackageJson(__dirname);
    console.log(pkg.version);
    process.exit(0);
  }

  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const hasSourceFlags = Boolean(
    argv.endpoint || argv.e || argv['schema-file'] || argv.s ||
    argv.schemas || argv['api-names']
  );
  const explicitConfigPath = (argv.config || argv.c) as string | undefined;
  const configPath = explicitConfigPath || (!hasSourceFlags ? findConfigFile() : undefined);
  const targetName = (argv.target || argv.t) as string | undefined;

  let fileConfig: GraphQLSDKConfigTarget = {};

  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }

    const config = loaded.config as Record<string, unknown>;
    const isMulti = !('endpoint' in config || 'schemaFile' in config || 'db' in config);

    if (isMulti) {
      const targets = config as Record<string, GraphQLSDKConfigTarget>;
      const names = targetName ? [targetName] : Object.keys(targets);

      if (targetName && !targets[targetName]) {
        console.error('x', `Target "${targetName}" not found. Available: ${Object.keys(targets).join(', ')}`);
        process.exit(1);
      }

      const cliOptions = buildDbConfig(camelizeArgv(argv as Record<string, any>));
      let hasError = false;
      for (const name of names) {
        console.log(`\n[${name}]`);
        const result = await generate({ ...targets[name], ...cliOptions } as GraphQLSDKConfigTarget);
        printResult(result);
        if (!result.success) hasError = true;
      }

      prompter.close();
      if (hasError) process.exit(1);
      return argv;
    }

    fileConfig = config as GraphQLSDKConfigTarget;
  }

  const seeded = seedArgvFromConfig(argv, fileConfig);
  const answers = await prompter.prompt(seeded, codegenQuestions);
  const options = buildGenerateOptions(answers, fileConfig);
  const result = await generate(options);
  printResult(result);
  prompter.close();
  return argv;
};

export const options: Partial<CLIOptions> = {
  minimistOpts: {
    alias: {
      h: 'help',
      c: 'config',
      e: 'endpoint',
      s: 'schema-file',
      o: 'output',
      t: 'target',
      a: 'authorization',
      v: 'verbose'
    },
    boolean: [
      'help', 'version', 'verbose', 'dry-run', 'react-query', 'orm', 'keep-db'
    ],
    string: [
      'config', 'endpoint', 'schema-file', 'output', 'target', 'authorization',
      'pgpm-module-path', 'pgpm-workspace-path', 'pgpm-module-name',
      'schemas', 'api-names'
    ]
  }
};

if (require.main === module) {
  const cli = new CLI(commands, options);
  cli.run();
}
