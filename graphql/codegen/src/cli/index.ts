#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 *
 * This is a thin wrapper around the core generate() function.
 * All business logic is in the core modules.
 */
import { CLI, CLIOptions, Inquirerer, Question, getPackageJson } from 'inquirerer';

import { generate } from '../core/generate';
import { findConfigFile } from '../core/config';
import type { GenerateResult } from '../core/generate';

const usage = `
graphql-codegen - GraphQL SDK generator for Constructive databases

Usage:
  graphql-codegen [options]

Source Options (choose one):
  -c, --config <path>           Path to config file
  -e, --endpoint <url>          GraphQL endpoint URL
  -s, --schema-file <path>      Path to GraphQL schema file
  --pgpm-module-path <path>     Path to PGPM module directory
  --pgpm-workspace-path <path>  Path to PGPM workspace (requires --pgpm-module-name)
  --pgpm-module-name <name>     PGPM module name in workspace

Database Options:
  --schemas <list>              Comma-separated PostgreSQL schemas
  --api-names <list>            Comma-separated API names (mutually exclusive with --schemas)

Generator Options:
  --react-query                 Generate React Query hooks
  --orm                         Generate ORM client
  -o, --output <dir>            Output directory
  -a, --authorization <token>   Authorization header value
  --keep-db                     Keep ephemeral database after generation
  --dry-run                     Preview without writing files
  -v, --verbose                 Show detailed output

  -h, --help                    Show this help message
  --version                     Show version number
`;

const questions: Question[] = [
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'output',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: './generated',
    useDefault: true,
  },
  {
    name: 'reactQuery',
    message: 'Generate React Query hooks?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'orm',
    message: 'Generate ORM client?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
];

function printResult(result: GenerateResult): void {
  if (result.success) {
    console.log('[ok]', result.message);
    if (result.tables?.length) {
      console.log('Tables:', result.tables.join(', '));
    }
  } else {
    console.error('x', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
  }
}

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

  // Normalize CLI args
  const normalizedArgv = {
    ...argv,
    config: argv.config || findConfigFile() || undefined,
    output: argv.output || argv.o,
    endpoint: argv.endpoint || argv.e,
    schemaFile: argv['schema-file'] || argv.s,
    authorization: argv.authorization || argv.a,
    reactQuery: argv['react-query'],
    orm: argv.orm,
    dryRun: argv['dry-run'],
    verbose: argv.verbose || argv.v,
    keepDb: argv['keep-db'],
  };

  const answers = await prompter.prompt(normalizedArgv, questions);

  // Build db config if pgpm options provided
  const pgpmModulePath = argv['pgpm-module-path'] as string | undefined;
  const pgpmWorkspacePath = argv['pgpm-workspace-path'] as string | undefined;
  const pgpmModuleName = argv['pgpm-module-name'] as string | undefined;
  const schemasArg = argv.schemas as string | undefined;
  const apiNamesArg = argv['api-names'] as string | undefined;

  const db = (pgpmModulePath || pgpmWorkspacePath) ? {
    pgpm: {
      modulePath: pgpmModulePath,
      workspacePath: pgpmWorkspacePath,
      moduleName: pgpmModuleName,
    },
    schemas: schemasArg ? schemasArg.split(',').map((s) => s.trim()) : undefined,
    apiNames: apiNamesArg ? apiNamesArg.split(',').map((s) => s.trim()) : undefined,
    keepDb: !!normalizedArgv.keepDb,
  } : undefined;

  const result = await generate({
    endpoint: answers.endpoint as string | undefined,
    schemaFile: normalizedArgv.schemaFile as string | undefined,
    db,
    output: answers.output as string | undefined,
    authorization: normalizedArgv.authorization as string | undefined,
    reactQuery: !!answers.reactQuery || !!normalizedArgv.reactQuery,
    orm: !!answers.orm || !!normalizedArgv.orm,
    dryRun: !!normalizedArgv.dryRun,
    verbose: !!normalizedArgv.verbose,
  });

  printResult(result);

  if (!result.success) {
    process.exit(1);
  }

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
      a: 'authorization',
      v: 'verbose',
    },
    boolean: [
      'help', 'version', 'verbose', 'dry-run', 'react-query', 'orm', 'keep-db',
    ],
    string: [
      'config', 'endpoint', 'schema-file', 'output', 'authorization',
      'pgpm-module-path', 'pgpm-workspace-path', 'pgpm-module-name',
      'schemas', 'api-names',
    ],
  },
};

if (require.main === module) {
  const cli = new CLI(commands, options);
  cli.run();
}
