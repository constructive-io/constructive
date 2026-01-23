#!/usr/bin/env node
/**
 * CLI entry point for graphql-codegen
 *
 * This is a thin wrapper around the core generate() function.
 * All business logic is in the core modules.
 */
import path from 'path';
import { CLI, CLIOptions, Inquirerer, Question, getPackageJson } from 'inquirerer';

import { loadAndResolveConfig, findConfigFile } from '../core/config';
import { createSchemaSource, validateSourceOptions, inferTablesFromIntrospection } from '../core/introspect';
import { runCodegenPipeline, validateTablesFound } from '../core/pipeline';
import { generate as generateReactQueryFiles } from '../core/codegen';
import { generateOrm as generateOrmFiles } from '../core/codegen/orm';
import { generateSharedTypes } from '../core/codegen/shared';
import { writeGeneratedFiles } from '../core/output';
import type { GraphQLSDKConfigTarget, TargetConfig } from '../types/config';

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
  -t, --target <name>           Target name in config file
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

export interface GenerateOptions extends GraphQLSDKConfigTarget {
  config?: string;
  target?: string;
  authorization?: string;
  verbose?: boolean;
  dryRun?: boolean;
  skipCustomOperations?: boolean;
}

export interface GenerateTargetResult {
  name: string;
  output: string;
  success: boolean;
  message: string;
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

export interface GenerateResult {
  success: boolean;
  message: string;
  targets?: GenerateTargetResult[];
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Main generate function - orchestrates the entire codegen pipeline
 */
export async function generate(options: GenerateOptions = {}): Promise<GenerateResult> {
  if (options.verbose) {
    console.log('Loading configuration...');
  }

  const configResult = await loadAndResolveConfig(options);
  if (!configResult.success) {
    return { success: false, message: configResult.error! };
  }

  const targets = configResult.targets ?? [];
  if (targets.length === 0) {
    return { success: false, message: 'No targets resolved from configuration.' };
  }

  const results: GenerateTargetResult[] = [];

  for (const target of targets) {
    const runReactQuery = options.reactQuery ?? target.config.reactQuery;
    const runOrm = options.orm ?? target.config.orm;

    if (!runReactQuery && !runOrm) {
      results.push({
        name: target.name,
        output: target.config.output,
        success: false,
        message: `Target "${target.name}": No generators enabled. Use --react-query or --orm.`,
      });
      continue;
    }

    const result = await generateForTarget(target, options, runReactQuery, runOrm);
    results.push(result);
  }

  if (results.length === 1) {
    const [result] = results;
    return {
      success: result.success,
      message: result.message,
      targets: results,
      tables: result.tables,
      filesWritten: result.filesWritten,
      errors: result.errors,
    };
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  return {
    success: failedCount === 0,
    message: failedCount === 0
      ? `Generated ${results.length} outputs successfully.`
      : `Generated ${successCount} of ${results.length} outputs.`,
    targets: results,
    errors: failedCount > 0 ? results.flatMap((r) => r.errors ?? []) : undefined,
  };
}

async function generateForTarget(
  target: TargetConfig,
  options: GenerateOptions,
  runReactQuery: boolean,
  runOrm: boolean
): Promise<GenerateTargetResult> {
  const config = target.config;
  const outputRoot = config.output;

  // Validate source
  const sourceValidation = validateSourceOptions({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
  });
  if (!sourceValidation.valid) {
    return {
      name: target.name,
      output: outputRoot,
      success: false,
      message: sourceValidation.error!,
    };
  }

  const source = createSchemaSource({
    endpoint: config.endpoint || undefined,
    schemaFile: config.schemaFile || undefined,
    db: config.db,
    authorization: options.authorization || config.headers?.['Authorization'],
    headers: config.headers,
  });

  // Run pipeline
  let pipelineResult;
  try {
    console.log(`Fetching schema from ${source.describe()}...`);
    pipelineResult = await runCodegenPipeline({
      source,
      config,
      verbose: options.verbose,
      skipCustomOperations: options.skipCustomOperations,
    });
  } catch (err) {
    return {
      name: target.name,
      output: outputRoot,
      success: false,
      message: `Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  const { tables, customOperations } = pipelineResult;

  // Validate tables
  const tablesValidation = validateTablesFound(tables);
  if (!tablesValidation.valid) {
    return {
      name: target.name,
      output: outputRoot,
      success: false,
      message: tablesValidation.error!,
    };
  }

  const allFilesWritten: string[] = [];
  const bothEnabled = runReactQuery && runOrm;

  // Generate shared types when both are enabled
  if (bothEnabled) {
    console.log('Generating shared types...');
    const sharedResult = generateSharedTypes({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(sharedResult.files, outputRoot, []);
      if (!writeResult.success) {
        return {
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write shared types: ${writeResult.errors?.join(', ')}`,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate React Query hooks
  if (runReactQuery) {
    const hooksDir = bothEnabled ? path.join(outputRoot, 'hooks') : path.join(outputRoot, 'hooks');
    console.log('Generating React Query hooks...');
    const { files } = generateReactQueryFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
      sharedTypesPath: bothEnabled ? '..' : undefined,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(files, hooksDir, ['queries', 'mutations']);
      if (!writeResult.success) {
        return {
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write React Query hooks: ${writeResult.errors?.join(', ')}`,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate ORM client
  if (runOrm) {
    const ormDir = bothEnabled ? path.join(outputRoot, 'orm') : path.join(outputRoot, 'orm');
    console.log('Generating ORM client...');
    const { files } = generateOrmFiles({
      tables,
      customOperations: {
        queries: customOperations.queries,
        mutations: customOperations.mutations,
        typeRegistry: customOperations.typeRegistry,
      },
      config,
      sharedTypesPath: bothEnabled ? '..' : undefined,
    });

    if (!options.dryRun) {
      const writeResult = await writeGeneratedFiles(files, ormDir, ['models', 'query', 'mutation']);
      if (!writeResult.success) {
        return {
          name: target.name,
          output: outputRoot,
          success: false,
          message: `Failed to write ORM client: ${writeResult.errors?.join(', ')}`,
          errors: writeResult.errors,
        };
      }
      allFilesWritten.push(...(writeResult.filesWritten ?? []));
    }
  }

  // Generate unified barrel when both are enabled
  if (bothEnabled && !options.dryRun) {
    const barrelContent = `/**
 * Generated SDK - auto-generated, do not edit
 * @generated by @constructive-io/graphql-codegen
 */
export * from './types';
export * from './hooks';
export * from './orm';
`;
    await writeGeneratedFiles([{ path: 'index.ts', content: barrelContent }], outputRoot, []);
  }

  const generators = [runReactQuery && 'React Query', runOrm && 'ORM'].filter(Boolean).join(' and ');

  return {
    name: target.name,
    output: outputRoot,
    success: true,
    message: options.dryRun
      ? `Dry run complete. Would generate ${generators} for ${tables.length} tables.`
      : `Generated ${generators} for ${tables.length} tables. Files written to ${outputRoot}`,
    tables: tables.map((t) => t.name),
    filesWritten: allFilesWritten,
  };
}

function printResult(result: GenerateResult): void {
  const targets = result.targets ?? [];
  const isMultiTarget = targets.length > 1 || (targets.length === 1 && targets[0]?.name !== 'default');

  if (isMultiTarget) {
    console.log(result.success ? '[ok]' : 'x', result.message);
    for (const t of targets) {
      console.log(`\n${t.success ? '[ok]' : 'x'} ${t.message}`);
      if (t.tables?.length) {
        console.log('  Tables:', t.tables.join(', '));
      }
    }
  } else if (result.success) {
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
    target: argv.target || argv.t,
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
    config: answers.config as string | undefined,
    target: normalizedArgv.target as string | undefined,
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
      t: 'target',
      v: 'verbose',
    },
    boolean: [
      'help', 'version', 'verbose', 'dry-run', 'react-query', 'orm', 'keep-db',
    ],
    string: [
      'config', 'endpoint', 'schema-file', 'output', 'authorization', 'target',
      'pgpm-module-path', 'pgpm-workspace-path', 'pgpm-module-name',
      'schemas', 'api-names',
    ],
  },
};

if (require.main === module) {
  const cli = new CLI(commands, options);
  cli.run();
}
