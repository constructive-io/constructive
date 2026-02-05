#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 *
 * This is a thin wrapper around the core generate() function.
 * All business logic is in the core modules.
 */
import { CLI, CLIOptions, getPackageJson,Inquirerer } from 'inquirerer';

import { findConfigFile, loadConfigFile } from '../core/config';
import { generate } from '../core/generate';
import type { GraphQLSDKConfigTarget } from '../types/config';
import { camelizeArgv, type CodegenAnswers,codegenQuestions, printResult } from './shared';

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
  --browser-compatible          Generate browser-compatible code (default: true)
                                Set to false for Node.js with localhost DNS fix
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

  const configPath = (argv.config || argv.c || findConfigFile()) as string | undefined;
  const targetName = (argv.target || argv.t) as string | undefined;

  // Collect CLI flags that should override config file settings
  const cliOverrides: Partial<GraphQLSDKConfigTarget> = {};
  if (argv['react-query'] === true) cliOverrides.reactQuery = true;
  if (argv.orm === true) cliOverrides.orm = true;
  if (argv.verbose === true || argv.v === true) cliOverrides.verbose = true;
  if (argv['dry-run'] === true) cliOverrides.dryRun = true;
  if (argv.output || argv.o) cliOverrides.output = (argv.output || argv.o) as string;
  if (argv.authorization || argv.a) cliOverrides.authorization = (argv.authorization || argv.a) as string;

  // If config file exists, load and run
  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }

    const config = loaded.config as Record<string, unknown>;

    // Check if it's a multi-target config (no source fields at top level)
    const isMulti = !('endpoint' in config || 'schemaFile' in config || 'db' in config);

    if (isMulti) {
      // Multi-target: simple for loop over targets
      const targets = config as Record<string, GraphQLSDKConfigTarget>;
      const names = targetName ? [targetName] : Object.keys(targets);

      if (targetName && !targets[targetName]) {
        console.error('x', `Target "${targetName}" not found. Available: ${Object.keys(targets).join(', ')}`);
        process.exit(1);
      }

      let hasError = false;
      for (const name of names) {
        console.log(`\n[${name}]`);
        const result = await generate({ ...targets[name], ...cliOverrides });
        printResult(result);
        if (!result.success) hasError = true;
      }

      prompter.close();
      if (hasError) process.exit(1);
      return argv;
    }

    // Single config — merge CLI overrides
    const result = await generate({ ...(config as GraphQLSDKConfigTarget), ...cliOverrides });
    printResult(result);
    if (!result.success) process.exit(1);
    prompter.close();
    return argv;
  }

  // No config file - prompt for options using shared questions
  const answers = await prompter.prompt<CodegenAnswers>(argv as CodegenAnswers, codegenQuestions);

  // Convert kebab-case CLI args to camelCase for internal use
  const camelized = camelizeArgv(answers) as CodegenAnswers;

  // Build db config if schemas or apiNames provided
  const db = (camelized.schemas || camelized.apiNames) ? {
    schemas: camelized.schemas,
    apiNames: camelized.apiNames
  } : undefined;

  const result = await generate({
    endpoint: camelized.endpoint,
    schemaFile: camelized.schemaFile,
    db,
    output: camelized.output,
    authorization: camelized.authorization,
    reactQuery: camelized.reactQuery,
    orm: camelized.orm,
    browserCompatible: camelized.browserCompatible,
    dryRun: camelized.dryRun,
    verbose: camelized.verbose
  });

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
      'help', 'version', 'verbose', 'dry-run', 'react-query', 'orm', 'keep-db', 'browser-compatible'
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
