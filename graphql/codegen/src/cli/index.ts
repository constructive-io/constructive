/**
 * CLI entry point for graphql-codegen
 */

import { Command } from 'commander';

import { initCommand, findConfigFile, loadConfigFile } from './commands/init';
import { generateCommand } from './commands/generate';
import { generateOrmCommand } from './commands/generate-orm';
import { startWatch } from './watch';
import { resolveConfig, type GraphQLSDKConfig, type ResolvedConfig } from '../types/config';

const program = new Command();

/**
 * Load configuration for watch mode, merging CLI options with config file
 */
async function loadWatchConfig(options: {
  config?: string;
  endpoint?: string;
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

  let baseConfig: Partial<GraphQLSDKConfig> = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      console.error('✗', loadResult.error);
      return null;
    }
    baseConfig = loadResult.config;
  }

  // Merge CLI options with config
  const mergedConfig: GraphQLSDKConfig = {
    endpoint: options.endpoint || baseConfig.endpoint || '',
    output: baseConfig.output,
    headers: baseConfig.headers,
    tables: baseConfig.tables,
    queries: baseConfig.queries,
    mutations: baseConfig.mutations,
    excludeFields: baseConfig.excludeFields,
    hooks: baseConfig.hooks,
    postgraphile: baseConfig.postgraphile,
    codegen: baseConfig.codegen,
    orm: baseConfig.orm,
    watch: {
      ...baseConfig.watch,
      // CLI options override config
      ...(options.pollInterval !== undefined && { pollInterval: options.pollInterval }),
      ...(options.debounce !== undefined && { debounce: options.debounce }),
      ...(options.touch !== undefined && { touchFile: options.touch }),
      ...(options.clear !== undefined && { clearScreen: options.clear }),
    },
  };

  if (!mergedConfig.endpoint) {
    console.error('✗ No endpoint specified. Use --endpoint or create a config file with "graphql-codegen init".');
    return null;
  }

  return resolveConfig(mergedConfig);
}

program
  .name('graphql-codegen')
  .description('CLI for generating GraphQL SDK from PostGraphile endpoints')
  .version('2.17.48');

// Init command
program
  .command('init')
  .description('Initialize a new graphql-codegen configuration file')
  .option('-d, --directory <dir>', 'Target directory for the config file', '.')
  .option('-f, --force', 'Force overwrite existing config', false)
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL to pre-populate')
  .option('-o, --output <dir>', 'Output directory to pre-populate', './generated')
  .action(async (options) => {
    const result = await initCommand({
      directory: options.directory,
      force: options.force,
      endpoint: options.endpoint,
      output: options.output,
    });

    if (result.success) {
      console.log('✓', result.message);
    } else {
      console.error('✗', result.message);
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate')
  .description('Generate SDK from GraphQL endpoint')
  .option('-c, --config <path>', 'Path to config file')
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL (overrides config)')
  .option('-o, --output <dir>', 'Output directory (overrides config)')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--dry-run', 'Dry run - show what would be generated without writing files', false)
  .option('-w, --watch', 'Watch mode - poll endpoint for schema changes (in-memory)', false)
  .option('--poll-interval <ms>', 'Polling interval in milliseconds (default: 3000)', parseInt)
  .option('--debounce <ms>', 'Debounce delay before regenerating (default: 800)', parseInt)
  .option('--touch <file>', 'File to touch on schema change')
  .option('--no-clear', 'Do not clear terminal on regeneration')
  .action(async (options) => {
    // Watch mode
    if (options.watch) {
      const config = await loadWatchConfig(options);
      if (!config) {
        process.exit(1);
      }
      
      await startWatch({
        config,
        generatorType: 'generate',
        verbose: options.verbose,
        authorization: options.authorization,
        outputDir: options.output,
      });
      return;
    }

    // Normal one-shot generation
    const result = await generateCommand({
      config: options.config,
      endpoint: options.endpoint,
      output: options.output,
      authorization: options.authorization,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });

    if (result.success) {
      console.log('✓', result.message);
      if (result.tables && result.tables.length > 0) {
        console.log('\nTables:');
        result.tables.forEach((t) => console.log(`  - ${t}`));
      }
      if (result.filesWritten && result.filesWritten.length > 0) {
        console.log('\nFiles written:');
        result.filesWritten.forEach((f) => console.log(`  - ${f}`));
      }
    } else {
      console.error('✗', result.message);
      if (result.errors) {
        result.errors.forEach((e) => console.error('  -', e));
      }
      process.exit(1);
    }
  });

// Generate ORM command
program
  .command('generate-orm')
  .description('Generate Prisma-like ORM client from GraphQL endpoint')
  .option('-c, --config <path>', 'Path to config file')
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL (overrides config)')
  .option('-o, --output <dir>', 'Output directory (overrides config)', './generated/orm')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--dry-run', 'Dry run - show what would be generated without writing files', false)
  .option('--skip-custom-operations', 'Skip custom operations (only generate table CRUD)', false)
  .option('-w, --watch', 'Watch mode - poll endpoint for schema changes (in-memory)', false)
  .option('--poll-interval <ms>', 'Polling interval in milliseconds (default: 3000)', parseInt)
  .option('--debounce <ms>', 'Debounce delay before regenerating (default: 800)', parseInt)
  .option('--touch <file>', 'File to touch on schema change')
  .option('--no-clear', 'Do not clear terminal on regeneration')
  .action(async (options) => {
    // Watch mode
    if (options.watch) {
      const config = await loadWatchConfig(options);
      if (!config) {
        process.exit(1);
      }
      
      await startWatch({
        config,
        generatorType: 'generate-orm',
        verbose: options.verbose,
        authorization: options.authorization,
        outputDir: options.output,
        skipCustomOperations: options.skipCustomOperations,
      });
      return;
    }

    // Normal one-shot generation
    const result = await generateOrmCommand({
      config: options.config,
      endpoint: options.endpoint,
      output: options.output,
      authorization: options.authorization,
      verbose: options.verbose,
      dryRun: options.dryRun,
      skipCustomOperations: options.skipCustomOperations,
    });

    if (result.success) {
      console.log('✓', result.message);
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
      console.error('✗', result.message);
      if (result.errors) {
        result.errors.forEach((e) => console.error('  -', e));
      }
      process.exit(1);
    }
  });

// Introspect command (for debugging)
program
  .command('introspect')
  .description('Introspect a GraphQL endpoint and print table info')
  .requiredOption('-e, --endpoint <url>', 'GraphQL endpoint URL')
  .option('-a, --authorization <header>', 'Authorization header value')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const { fetchMeta, validateEndpoint } = await import('./introspect/fetch-meta');
    const { transformMetaToCleanTables, getTableNames } = await import('./introspect/transform');

    // Validate endpoint
    const validation = validateEndpoint(options.endpoint);
    if (!validation.valid) {
      console.error('✗ Invalid endpoint:', validation.error);
      process.exit(1);
    }

    console.log('Fetching schema from', options.endpoint, '...');

    const result = await fetchMeta({
      endpoint: options.endpoint,
      authorization: options.authorization,
    });

    if (!result.success) {
      console.error('✗ Failed to fetch schema:', result.error);
      process.exit(1);
    }

    const tables = transformMetaToCleanTables(result.data!);
    const tableNames = getTableNames(tables);

    if (options.json) {
      console.log(JSON.stringify(tables, null, 2));
    } else {
      console.log(`\n✓ Found ${tables.length} tables:\n`);
      tableNames.forEach((name) => {
        const table = tables.find((t) => t.name === name)!;
        const fieldCount = table.fields.length;
        const relationCount =
          table.relations.belongsTo.length +
          table.relations.hasOne.length +
          table.relations.hasMany.length +
          table.relations.manyToMany.length;
        console.log(`  ${name} (${fieldCount} fields, ${relationCount} relations)`);
      });
    }
  });

program.parse();
