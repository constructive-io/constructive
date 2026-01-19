/**
 * CLI entry point for graphql-codegen
 */

import { Command } from 'commander';

import { initCommand, findConfigFile, loadConfigFile } from './commands/init';
import { generateCommand } from './commands/generate';
import { generateOrmCommand } from './commands/generate-orm';
import { startWatch } from './watch';
import {
  isMultiConfig,
  mergeConfig,
  resolveConfig,
  type GraphQLSDKConfig,
  type GraphQLSDKConfigTarget,
  type ResolvedConfig,
} from '../types/config';

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

const program = new Command();

/**
 * Load configuration for watch mode, merging CLI options with config file
 */
async function loadWatchConfig(options: {
  config?: string;
  target?: string;
  endpoint?: string;
  output?: string;
  pollInterval?: number;
  debounce?: number;
  touch?: string;
  clear?: boolean;
}): Promise<ResolvedConfig | null> {
  // Find config file
  let configPath = options.config;
  if (!configPath) {
    configPath = findConfigFile() ?? undefined;
  }

  let baseConfig: GraphQLSDKConfig = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      console.error('x', loadResult.error);
      return null;
    }
    baseConfig = loadResult.config;
  }

  if (isMultiConfig(baseConfig)) {
    if (!options.target) {
      console.error(
        'x Watch mode requires --target when using multiple targets.'
      );
      return null;
    }

    if (!baseConfig.targets[options.target]) {
      console.error(`x Target "${options.target}" not found in config file.`);
      return null;
    }
  } else if (options.target) {
    console.error('x Config file does not define targets. Remove --target.');
    return null;
  }

  const sourceOverrides: GraphQLSDKConfigTarget = {};
  if (options.endpoint) {
    sourceOverrides.endpoint = options.endpoint;
    sourceOverrides.schema = undefined;
  }

  const watchOverrides: GraphQLSDKConfigTarget = {
    watch: {
      ...(options.pollInterval !== undefined && {
        pollInterval: options.pollInterval,
      }),
      ...(options.debounce !== undefined && { debounce: options.debounce }),
      ...(options.touch !== undefined && { touchFile: options.touch }),
      ...(options.clear !== undefined && { clearScreen: options.clear }),
    },
  };

  let mergedTarget: GraphQLSDKConfigTarget;

  if (isMultiConfig(baseConfig)) {
    const defaults = baseConfig.defaults ?? {};
    const targetConfig = baseConfig.targets[options.target!];
    mergedTarget = mergeConfig(defaults, targetConfig);
  } else {
    mergedTarget = baseConfig;
  }

  mergedTarget = mergeConfig(mergedTarget, sourceOverrides);
  mergedTarget = mergeConfig(mergedTarget, watchOverrides);

  if (!mergedTarget.endpoint) {
    console.error(
      'x No endpoint specified. Watch mode only supports live endpoints.'
    );
    return null;
  }

  if (mergedTarget.schema) {
    console.error(
      'x Watch mode is only supported with an endpoint, not schema.'
    );
    return null;
  }

  return resolveConfig(mergedTarget);
}

program
  .name('graphql-codegen')
  .description(
    'CLI for generating GraphQL SDK from PostGraphile endpoints or schema files'
  )
  .version('2.17.48');

// Init command
program
  .command('init')
  .description('Initialize a new graphql-codegen configuration file')
  .option('-d, --directory <dir>', 'Target directory for the config file', '.')
  .option('-f, --force', 'Force overwrite existing config', false)
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL to pre-populate')
  .option(
    '-o, --output <dir>',
    'Output directory to pre-populate',
    './generated'
  )
  .action(async (options) => {
    const startTime = performance.now();
    const result = await initCommand({
      directory: options.directory,
      force: options.force,
      endpoint: options.endpoint,
      output: options.output,
    });
    const duration = formatDuration(performance.now() - startTime);

    if (result.success) {
      console.log('[ok]', result.message, `(${duration})`);
    } else {
      console.error('x', result.message, `(${duration})`);
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate')
  .description('Generate SDK from GraphQL endpoint or schema file')
  .option('-c, --config <path>', 'Path to config file')
  .option('-t, --target <name>', 'Target name in config file')
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL (overrides config)')
  .option('-s, --schema <path>', 'Path to GraphQL schema file (.graphql)')
  .option('-o, --output <dir>', 'Output directory (overrides config)')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('-v, --verbose', 'Verbose output', false)
  .option(
    '--dry-run',
    'Dry run - show what would be generated without writing files',
    false
  )
  .option(
    '-w, --watch',
    'Watch mode - poll endpoint for schema changes (in-memory)',
    false
  )
  .option(
    '--poll-interval <ms>',
    'Polling interval in milliseconds (default: 3000)',
    parseInt
  )
  .option(
    '--debounce <ms>',
    'Debounce delay before regenerating (default: 800)',
    parseInt
  )
  .option('--touch <file>', 'File to touch on schema change')
  .option('--no-clear', 'Do not clear terminal on regeneration')
  .action(async (options) => {
    const startTime = performance.now();

    // Validate source options
    if (options.endpoint && options.schema) {
      console.error(
        'x Cannot use both --endpoint and --schema. Choose one source.'
      );
      process.exit(1);
    }

    // Watch mode (only for endpoint)
    if (options.watch) {
      if (options.schema) {
        console.error(
          'x Watch mode is only supported with --endpoint, not --schema.'
        );
        process.exit(1);
      }
      const config = await loadWatchConfig(options);
      if (!config) {
        process.exit(1);
      }

      await startWatch({
        config,
        generatorType: 'generate',
        verbose: options.verbose,
        authorization: options.authorization,
        configPath: options.config,
        target: options.target,
        outputDir: options.output,
      });
      return;
    }

    // Normal one-shot generation
    const result = await generateCommand({
      config: options.config,
      target: options.target,
      endpoint: options.endpoint,
      schema: options.schema,
      output: options.output,
      authorization: options.authorization,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });
    const duration = formatDuration(performance.now() - startTime);

    const targetResults = result.targets ?? [];
    const hasNamedTargets =
      targetResults.length > 0 &&
      (targetResults.length > 1 || targetResults[0]?.name !== 'default');

    if (hasNamedTargets) {
      console.log(result.success ? '[ok]' : 'x', result.message);
      targetResults.forEach((target) => {
        const status = target.success ? '[ok]' : 'x';
        console.log(`\n${status} ${target.message}`);

        if (target.tables && target.tables.length > 0) {
          console.log('  Tables:');
          target.tables.forEach((table) => console.log(`    - ${table}`));
        }
        if (target.filesWritten && target.filesWritten.length > 0) {
          console.log('  Files written:');
          target.filesWritten.forEach((file) => console.log(`    - ${file}`));
        }
        if (!target.success && target.errors) {
          target.errors.forEach((error) => console.error(`  - ${error}`));
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
  });

// Generate ORM command
program
  .command('generate-orm')
  .description(
    'Generate Prisma-like ORM client from GraphQL endpoint or schema file'
  )
  .option('-c, --config <path>', 'Path to config file')
  .option('-t, --target <name>', 'Target name in config file')
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL (overrides config)')
  .option('-s, --schema <path>', 'Path to GraphQL schema file (.graphql)')
  .option('-o, --output <dir>', 'Output directory (overrides config)')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('-v, --verbose', 'Verbose output', false)
  .option(
    '--dry-run',
    'Dry run - show what would be generated without writing files',
    false
  )
  .option(
    '--skip-custom-operations',
    'Skip custom operations (only generate table CRUD)',
    false
  )
  .option(
    '-w, --watch',
    'Watch mode - poll endpoint for schema changes (in-memory)',
    false
  )
  .option(
    '--poll-interval <ms>',
    'Polling interval in milliseconds (default: 3000)',
    parseInt
  )
  .option(
    '--debounce <ms>',
    'Debounce delay before regenerating (default: 800)',
    parseInt
  )
  .option('--touch <file>', 'File to touch on schema change')
  .option('--no-clear', 'Do not clear terminal on regeneration')
  .action(async (options) => {
    const startTime = performance.now();

    // Validate source options
    if (options.endpoint && options.schema) {
      console.error(
        'x Cannot use both --endpoint and --schema. Choose one source.'
      );
      process.exit(1);
    }

    // Watch mode (only for endpoint)
    if (options.watch) {
      if (options.schema) {
        console.error(
          'x Watch mode is only supported with --endpoint, not --schema.'
        );
        process.exit(1);
      }
      const config = await loadWatchConfig(options);
      if (!config) {
        process.exit(1);
      }

      await startWatch({
        config,
        generatorType: 'generate-orm',
        verbose: options.verbose,
        authorization: options.authorization,
        configPath: options.config,
        target: options.target,
        outputDir: options.output,
        skipCustomOperations: options.skipCustomOperations,
      });
      return;
    }

    // Normal one-shot generation
    const result = await generateOrmCommand({
      config: options.config,
      target: options.target,
      endpoint: options.endpoint,
      schema: options.schema,
      output: options.output,
      authorization: options.authorization,
      verbose: options.verbose,
      dryRun: options.dryRun,
      skipCustomOperations: options.skipCustomOperations,
    });
    const duration = formatDuration(performance.now() - startTime);

    const targetResults = result.targets ?? [];
    const hasNamedTargets =
      targetResults.length > 0 &&
      (targetResults.length > 1 || targetResults[0]?.name !== 'default');

    if (hasNamedTargets) {
      console.log(result.success ? '[ok]' : 'x', result.message);
      targetResults.forEach((target) => {
        const status = target.success ? '[ok]' : 'x';
        console.log(`\n${status} ${target.message}`);

        if (target.tables && target.tables.length > 0) {
          console.log('  Tables:');
          target.tables.forEach((table) => console.log(`    - ${table}`));
        }
        if (target.customQueries && target.customQueries.length > 0) {
          console.log('  Custom Queries:');
          target.customQueries.forEach((query) =>
            console.log(`    - ${query}`)
          );
        }
        if (target.customMutations && target.customMutations.length > 0) {
          console.log('  Custom Mutations:');
          target.customMutations.forEach((mutation) =>
            console.log(`    - ${mutation}`)
          );
        }
        if (target.filesWritten && target.filesWritten.length > 0) {
          console.log('  Files written:');
          target.filesWritten.forEach((file) => console.log(`    - ${file}`));
        }
        if (!target.success && target.errors) {
          target.errors.forEach((error) => console.error(`  - ${error}`));
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
  });

// Introspect command (for debugging) - uses the new inference system
program
  .command('introspect')
  .description(
    'Introspect a GraphQL endpoint or schema file and print table info'
  )
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL')
  .option('-s, --schema <path>', 'Path to GraphQL schema file (.graphql)')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const startTime = performance.now();

    // Validate source options
    if (!options.endpoint && !options.schema) {
      console.error('x Either --endpoint or --schema must be provided.');
      process.exit(1);
    }
    if (options.endpoint && options.schema) {
      console.error(
        'x Cannot use both --endpoint and --schema. Choose one source.'
      );
      process.exit(1);
    }

    const { createSchemaSource } = await import('./introspect/source');
    const { inferTablesFromIntrospection } =
      await import('./introspect/infer-tables');

    try {
      const source = createSchemaSource({
        endpoint: options.endpoint,
        schema: options.schema,
        authorization: options.authorization,
      });

      console.log('Fetching schema from', source.describe(), '...');

      const { introspection } = await source.fetch();
      const tables = inferTablesFromIntrospection(introspection);
      const duration = formatDuration(performance.now() - startTime);

      if (options.json) {
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
  });

program.parse();
