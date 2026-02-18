#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 *
 * This is a thin wrapper around the core generate() function.
 * All business logic is in the core modules.
 */
import { CLI, CLIOptions, getPackageJson, Inquirerer } from 'inquirerer';

import { runCodegenHandler } from './handler';

const usage = `
graphql-codegen - GraphQL SDK generator for Constructive databases

Usage:
  graphql-codegen [options]

Source Options (choose one):
  -c, --config <path>           Path to config file
  -e, --endpoint <url>          GraphQL endpoint URL
  -s, --schema-file <path>      Path to GraphQL schema file
  --schema-dir <dir>            Directory of .graphql files (auto-expands to multi-target)

Database Options:
  --schemas <list>              Comma-separated PostgreSQL schemas
  --api-names <list>            Comma-separated API names (mutually exclusive with --schemas)
                                Multiple apiNames auto-expand to multi-target (one schema per API).

Generator Options:
  --react-query                 Generate React Query hooks
  --orm                         Generate ORM client
  -o, --output <dir>            Output directory
  -t, --target <name>           Target name (for multi-target configs)
  -a, --authorization <token>   Authorization header value
  --dry-run                     Preview without writing files
  -v, --verbose                 Show detailed output

Schema Export:
  --schema-only                 Export GraphQL SDL instead of running full codegen.
                                Works with any source (endpoint, file, database, PGPM).
                                With multiple apiNames, writes one .graphql per API.

  -h, --help                    Show this help message
  --version                     Show version number
`;

export const commands = async (
  argv: Record<string, unknown>,
  prompter: Inquirerer,
  _options: CLIOptions,
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

  await runCodegenHandler(argv, prompter);
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
      v: 'verbose',
    },
    boolean: ['schema-only'],
    string: [
      'config',
      'endpoint',
      'schema-file',
      'schema-dir',
      'output',
      'target',
      'authorization',
      'schemas',
      'api-names',
    ],
  },
};

if (require.main === module) {
  const cli = new CLI(commands, options);
  cli.run();
}
