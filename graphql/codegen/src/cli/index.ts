#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 */

import { CLI, CLIOptions, Inquirerer, ParsedArgs, cliExitWithError, extractFirst, getPackageJson } from 'inquirerer';

import { initCommand } from './commands/init';
import { generate, generateReactQuery, generateOrm } from './commands/generate-unified';
import { loadWatchConfig } from '../core/config';
import { startWatch } from '../core/watch';
import { createSchemaSource, inferTablesFromIntrospection } from '../core/introspect';
import type { GraphQLSDKConfigTarget } from '../types/config';

const usageText = `
graphql-codegen - GraphQL SDK generator for Constructive databases

Usage:
  graphql-codegen <command> [options]

Commands:
  init           Initialize a new graphql-codegen configuration file
  generate       Generate SDK from GraphQL endpoint, schema file, database, or PGPM module
  introspect     Introspect a GraphQL endpoint or schema file and print table info

Options:
  --help, -h     Show this help message
  --version, -v  Show version number

Run 'graphql-codegen <command> --help' for more information on a command.
`;

const initUsageText = `
graphql-codegen init - Initialize a new graphql-codegen configuration file

Usage:
  graphql-codegen init [options]

Options:
  --directory, -d <dir>   Target directory for the config file (default: .)
  --force, -f             Force overwrite existing config
  --endpoint, -e <url>    GraphQL endpoint URL to pre-populate
  --output, -o <dir>      Output directory to pre-populate (default: ./generated)
  --help, -h              Show this help message
`;

const generateUsageText = `
graphql-codegen generate - Generate SDK from GraphQL endpoint, schema file, database, or PGPM module

Usage:
  graphql-codegen generate [options]

Source Options (choose one):
  --config, -c <path>         Path to config file
  --endpoint, -e <url>        GraphQL endpoint URL
  --schema, -s <path>         Path to GraphQL schema file (.graphql)
  --database <name>           Database name or connection string
  --pgpm-module-path <path>   Path to PGPM module (creates ephemeral database)
  --pgpm-workspace-path <path> Path to PGPM workspace (use with --pgpm-module-name)
  --pgpm-module-name <name>   Module name in workspace (use with --pgpm-workspace-path)

Schema Options (for database/PGPM modes):
  --schemas <list>            Comma-separated list of schemas to introspect (default: public)
  --api-names <list>          Comma-separated list of API names (auto-resolves schemas from services_public.api_schemas)

Generator Options:
  --react-query               Generate React Query SDK (hooks + fetch functions)
  --orm                       Generate Prisma-like ORM client
  --target, -t <name>         Target name in config file
  --output, -o <dir>          Output directory (overrides config)
  --authorization, -a <header> Authorization header value
  --verbose                   Verbose output
  --dry-run                   Dry run - show what would be generated without writing files
  --skip-custom-operations    Skip custom operations (only generate table CRUD)
  --keep-db                   Keep ephemeral database after generation (for debugging)

Watch Mode Options:
  --watch, -w                 Watch mode - poll endpoint for schema changes
  --poll-interval <ms>        Polling interval in milliseconds (default: 3000)
  --debounce <ms>             Debounce delay before regenerating (default: 800)
  --touch <file>              File to touch on schema change
  --no-clear                  Do not clear terminal on regeneration

  --help, -h                  Show this help message

Examples:
  graphql-codegen generate --endpoint http://localhost:5000/graphql --react-query
  graphql-codegen generate --database mydb --schemas public,app_public --orm
  graphql-codegen generate --pgpm-module-path ./my-module --api-names my_api --react-query --orm
  graphql-codegen generate --config ./graphql-codegen.config.ts
`;

const introspectUsageText = `
graphql-codegen introspect - Introspect a GraphQL endpoint or schema file and print table info

Usage:
  graphql-codegen introspect [options]

Options:
  --endpoint, -e <url>        GraphQL endpoint URL
  --schema, -s <path>         Path to GraphQL schema file (.graphql)
  --authorization, -a <header> Authorization header value
  --json                      Output as JSON
  --help, -h                  Show this help message
`;

/**
 * Format duration in a human-readable way
 * - Under 1 second: show milliseconds (e.g., "123ms")
 * - Over 1 second: show seconds with 2 decimal places (e.g., "1.23s")
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}


/**
 * Init command handler
 */
async function handleInit(argv: Partial<ParsedArgs>): Promise<void> {
  if (argv.help || argv.h) {
    console.log(initUsageText);
    process.exit(0);
  }

  const startTime = performance.now();
  const result = await initCommand({
    directory: (argv.directory as string) || (argv.d as string) || '.',
    force: !!(argv.force || argv.f),
    endpoint: (argv.endpoint as string) || (argv.e as string),
    output: (argv.output as string) || (argv.o as string) || './generated',
  });
  const duration = formatDuration(performance.now() - startTime);

  if (result.success) {
    console.log('[ok]', result.message, `(${duration})`);
  } else {
    console.error('x', result.message, `(${duration})`);
    process.exit(1);
  }
}

/**
 * Generate command handler - unified handler for React Query SDK and ORM generation
 */
async function handleGenerate(argv: Partial<ParsedArgs>): Promise<void> {
  if (argv.help || argv.h) {
    console.log(generateUsageText);
    process.exit(0);
  }

  const startTime = performance.now();

  // Source options
  const config = (argv.config as string) || (argv.c as string);
  const target = (argv.target as string) || (argv.t as string);
  const endpoint = (argv.endpoint as string) || (argv.e as string);
  const schema = (argv.schema as string) || (argv.s as string);
  const database = argv.database as string | undefined;
  const pgpmModulePath = argv['pgpm-module-path'] as string | undefined;
  const pgpmWorkspacePath = argv['pgpm-workspace-path'] as string | undefined;
  const pgpmModuleName = argv['pgpm-module-name'] as string | undefined;

  // Schema options
  const schemasArg = argv.schemas as string | undefined;
  const schemas = schemasArg ? schemasArg.split(',').map((s) => s.trim()) : undefined;
  const apiNamesArg = argv['api-names'] as string | undefined;
  const apiNames = apiNamesArg ? apiNamesArg.split(',').map((s) => s.trim()) : undefined;

  // Generator options
  const reactQuery = !!argv['react-query'];
  const orm = !!argv.orm;
  const output = (argv.output as string) || (argv.o as string);
  const authorization = (argv.authorization as string) || (argv.a as string);
  const verbose = !!argv.verbose;
  const dryRun = !!(argv['dry-run'] || argv.dryRun);
  const skipCustomOperations = !!(argv['skip-custom-operations'] || argv.skipCustomOperations);
  const keepDb = !!(argv['keep-db'] || argv.keepDb);

  // Watch options
  const watch = !!(argv.watch || argv.w);
  const pollInterval = argv['poll-interval'] !== undefined
    ? parseInt(argv['poll-interval'] as string, 10)
    : undefined;
  const debounce = argv.debounce !== undefined
    ? parseInt(argv.debounce as string, 10)
    : undefined;
  const touch = argv.touch as string | undefined;
  const clear = argv.clear !== false;

  // Validate source options
  const sourceCount = [endpoint, schema, database, pgpmModulePath, pgpmWorkspacePath].filter(Boolean).length;
  if (sourceCount > 1 && !pgpmWorkspacePath) {
    console.error('x Cannot use multiple source options. Choose one: --endpoint, --schema, --database, or --pgpm-module-path');
    process.exit(1);
  }

  // Validate pgpm workspace options
  if (pgpmWorkspacePath && !pgpmModuleName) {
    console.error('x --pgpm-workspace-path requires --pgpm-module-name');
    process.exit(1);
  }
  if (pgpmModuleName && !pgpmWorkspacePath) {
    console.error('x --pgpm-module-name requires --pgpm-workspace-path');
    process.exit(1);
  }

  // Validate schema options
  if (schemas && apiNames) {
    console.error('x Cannot use both --schemas and --api-names. Choose one.');
    process.exit(1);
  }

  // Watch mode
  if (watch) {
    if (schema || database || pgpmModulePath || pgpmWorkspacePath) {
      console.error('x Watch mode is only supported with --endpoint or --config.');
      process.exit(1);
    }
    const watchConfig = await loadWatchConfig({
      config,
      target,
      endpoint,
      output,
      pollInterval,
      debounce,
      touch,
      clear,
    });
    if (!watchConfig) {
      process.exit(1);
    }

    const generatorType = orm ? 'orm' : 'react-query';
    await startWatch({
      config: watchConfig,
      generatorType,
      verbose,
      authorization,
      configPath: config,
      target,
      outputDir: output,
      skipCustomOperations,
      generateReactQuery,
      generateOrm,
    });
    return;
  }

  // Run generation
  const result = await generate({
    config,
    target,
    endpoint,
    schema,
    database,
    pgpmModulePath,
    pgpmWorkspacePath,
    pgpmModuleName,
    schemas,
    apiNames,
    output,
    authorization,
    verbose,
    dryRun,
    skipCustomOperations,
    keepDb,
    enableReactQuery: reactQuery,
    enableOrm: orm,
  });
  const duration = formatDuration(performance.now() - startTime);

  // Print results
  printGenerateResults(result, duration);
}

/**
 * Print generate results in a consistent format
 */
function printGenerateResults(result: Awaited<ReturnType<typeof generate>>, duration: string): void {
  const targetResults = result.targets ?? [];
  const hasNamedTargets =
    targetResults.length > 0 &&
    (targetResults.length > 1 || targetResults[0]?.name !== 'default');

  if (hasNamedTargets) {
    console.log(result.success ? '[ok]' : 'x', result.message, `(${duration})`);
    targetResults.forEach((t) => {
      const status = t.success ? '[ok]' : 'x';
      console.log(`\n${status} ${t.message}`);

      if (t.tables && t.tables.length > 0) {
        console.log('  Tables:');
        t.tables.forEach((table) => console.log(`    - ${table}`));
      }
      if (t.customQueries && t.customQueries.length > 0) {
        console.log('  Custom Queries:');
        t.customQueries.forEach((query) => console.log(`    - ${query}`));
      }
      if (t.customMutations && t.customMutations.length > 0) {
        console.log('  Custom Mutations:');
        t.customMutations.forEach((mutation) => console.log(`    - ${mutation}`));
      }
      if (t.filesWritten && t.filesWritten.length > 0) {
        console.log('  Files written:');
        t.filesWritten.forEach((file) => console.log(`    - ${file}`));
      }
      if (!t.success && t.errors) {
        t.errors.forEach((error) => console.error(`  - ${error}`));
      }
    });

    if (!result.success) {
      process.exit(1);
    }
    return;
  }

  if (result.success) {
    console.log('[ok]', result.message, `(${duration})`);
    if (result.tables && result.tables.length > 0) {
      console.log('\nTables:');
      result.tables.forEach((t) => console.log(`  - ${t}`));
    }
    if (result.customQueries && result.customQueries.length > 0) {
      console.log('\nCustom Queries:');
      result.customQueries.forEach((q) => console.log(`  - ${q}`));
    }
    if (result.customMutations && result.customMutations.length > 0) {
      console.log('\nCustom Mutations:');
      result.customMutations.forEach((m) => console.log(`  - ${m}`));
    }
    if (result.filesWritten && result.filesWritten.length > 0) {
      console.log('\nFiles written:');
      result.filesWritten.forEach((f) => console.log(`  - ${f}`));
    }
  } else {
    console.error('x', result.message, `(${duration})`);
    if (result.errors) {
      result.errors.forEach((e) => console.error('  -', e));
    }
    process.exit(1);
  }
}

/**
 * Introspect command handler
 */
async function handleIntrospect(argv: Partial<ParsedArgs>): Promise<void> {
  if (argv.help || argv.h) {
    console.log(introspectUsageText);
    process.exit(0);
  }

  const startTime = performance.now();

  const endpoint = (argv.endpoint as string) || (argv.e as string);
  const schema = (argv.schema as string) || (argv.s as string);
  const authorization = (argv.authorization as string) || (argv.a as string);
  const json = !!argv.json;

  if (!endpoint && !schema) {
    console.error('x Either --endpoint or --schema must be provided.');
    process.exit(1);
  }
  if (endpoint && schema) {
    console.error(
      'x Cannot use both --endpoint and --schema. Choose one source.'
    );
    process.exit(1);
  }

  try {
    const source = createSchemaSource({
      endpoint,
      schema,
      authorization,
    });

    console.log('Fetching schema from', source.describe(), '...');

    const { introspection } = await source.fetch();
    const tables = inferTablesFromIntrospection(introspection);
    const duration = formatDuration(performance.now() - startTime);

    if (json) {
      console.log(JSON.stringify(tables, null, 2));
    } else {
      console.log(`\n[ok] Found ${tables.length} tables (${duration}):\n`);
      tables.forEach((table) => {
        const fieldCount = table.fields.length;
        const relationCount =
          table.relations.belongsTo.length +
          table.relations.hasOne.length +
          table.relations.hasMany.length +
          table.relations.manyToMany.length;
        console.log(
          `  ${table.name} (${fieldCount} fields, ${relationCount} relations)`
        );
      });
    }
  } catch (err) {
    const duration = formatDuration(performance.now() - startTime);
    console.error(
      'x Failed to introspect schema:',
      err instanceof Error ? err.message : err,
      `(${duration})`
    );
    process.exit(1);
  }
}

const createCommandMap = (): Record<string, (argv: Partial<ParsedArgs>) => Promise<void>> => {
  return {
    init: handleInit,
    generate: handleGenerate,
    introspect: handleIntrospect,
  };
};

export const commands = async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
): Promise<Partial<ParsedArgs>> => {
  if (argv.version || argv.v) {
    const pkg = getPackageJson(__dirname);
    console.log(pkg.version);
    process.exit(0);
  }

  const { first: command, newArgv } = extractFirst(argv);

  if ((argv.help || argv.h) && !command) {
    console.log(usageText);
    process.exit(0);
  }

  if (command === 'help') {
    console.log(usageText);
    process.exit(0);
  }

  const commandMap = createCommandMap();

  if (!command) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'command',
        message: 'What do you want to do?',
        options: Object.keys(commandMap),
      },
    ]);
    const selectedCommand = answer.command as string;
    const commandFn = commandMap[selectedCommand];
    if (commandFn) {
      await commandFn(newArgv);
    }
    prompter.close();
    return argv;
  }

  const commandFn = commandMap[command];

  if (!commandFn) {
    console.log(usageText);
    await cliExitWithError(`Unknown command: ${command}`);
  }

  await commandFn(newArgv);
  prompter.close();

  return argv;
};

export const options: Partial<CLIOptions> = {
  minimistOpts: {
    alias: {
      v: 'version',
      h: 'help',
      c: 'config',
      t: 'target',
      e: 'endpoint',
      s: 'schema',
      o: 'output',
      a: 'authorization',
      d: 'directory',
      f: 'force',
      w: 'watch',
    },
    boolean: [
      'help', 'version', 'force', 'verbose', 'dry-run', 'watch', 'json',
      'skip-custom-operations', 'clear', 'react-query', 'orm', 'keep-db',
    ],
    string: [
      'config', 'target', 'endpoint', 'schema', 'output', 'authorization',
      'directory', 'touch', 'poll-interval', 'debounce', 'database',
      'pgpm-module-path', 'pgpm-workspace-path', 'pgpm-module-name',
      'schemas', 'api-names',
    ],
    default: {
      clear: true,
    },
  },
};

if (require.main === module) {
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    const pkg = getPackageJson(__dirname);
    console.log(pkg.version);
    process.exit(0);
  }

  const app = new CLI(commands, options);

  app.run().then(() => {
  }).catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
