import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSchemaSDL } from '@constructive-io/graphql-server';
import {
  generateReactQuery,
  generateOrm,
  findConfigFile,
  type GenerateResult,
  type GenerateTargetResult,
  type GenerateOrmResult,
  type GenerateOrmTargetResult,
} from '@constructive-io/graphql-codegen';
import { getEnvOptions } from '@constructive-io/graphql-env';

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Options:
  --help, -h                 Show this help message
  --config <path>            Path to graphql-codegen config file
  --target <name>            Target name in config file
  --endpoint <url>           GraphQL endpoint URL
  --auth <token>             Authorization header value (e.g., "Bearer 123")
  --out <dir>                Output directory (default: codegen)
  --dry-run                  Preview without writing files
  -v, --verbose              Verbose output

  --orm                      Generate Prisma-like ORM client instead of React Query hooks

  --database <name>          Database override for DB mode (defaults to PGDATABASE)
  --schemas <list>           Comma-separated schemas (required for DB mode)
`;

interface CodegenOptions {
  endpoint?: string;
  config?: string;
  target?: string;
  output?: string;
  auth?: string;
  database?: string;
  schemas?: string[];
  dryRun: boolean;
  verbose: boolean;
  orm: boolean;
}

type SourceMode =
  | { type: 'endpoint'; endpoint: string }
  | { type: 'database'; database: string; schemas: string[] }
  | { type: 'config'; configPath: string }
  | { type: 'none' };

type AnyResult = GenerateResult | GenerateOrmResult;
type AnyTargetResult = GenerateTargetResult | GenerateOrmTargetResult;

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const opts = parseArgs(argv);
  const mode = determineMode(opts);

  if (mode.type === 'none') {
    console.error(
      'Error: No source specified. Use --endpoint, --config, or --schemas for database mode.'
    );
    process.exit(1);
  }

  // Build schema from database if needed
  const outDir = opts.output || 'codegen';
  const schemaPath =
    mode.type === 'database'
      ? await buildSchemaFromDatabase(mode.database, mode.schemas, outDir)
      : undefined;

  const commandOptions = {
    config: opts.config,
    target: opts.target,
    endpoint: mode.type === 'endpoint' ? mode.endpoint : undefined,
    schema: schemaPath,
    output: opts.config ? opts.output : outDir,
    authorization: opts.auth,
    verbose: opts.verbose,
    dryRun: opts.dryRun,
  };

  const result = opts.orm
    ? await generateOrm(commandOptions)
    : await generateReactQuery(commandOptions);

  printResult(result);

  if (!result.success) {
    process.exit(1);
  }
};

function parseArgs(argv: Partial<ParsedArgs>): CodegenOptions {
  const schemasArg = (argv.schemas as string) || '';
  return {
    endpoint: (argv.endpoint as string) || undefined,
    config: (argv.config as string) || findConfigFile() || undefined,
    target: (argv.target as string) || undefined,
    output: (argv.out as string) || undefined,
    auth: (argv.auth as string) || undefined,
    database: (argv.database as string) || undefined,
    schemas: schemasArg
      ? schemasArg.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    dryRun: !!(argv['dry-run'] || argv.dryRun),
    verbose: !!(argv.verbose || argv.v),
    orm: !!argv.orm,
  };
}

function determineMode(opts: CodegenOptions): SourceMode {
  if (opts.endpoint) {
    return { type: 'endpoint', endpoint: opts.endpoint };
  }
  if (opts.schemas?.length) {
    const database = opts.database || getEnvOptions().pg.database;
    return { type: 'database', database, schemas: opts.schemas };
  }
  if (opts.config) {
    return { type: 'config', configPath: opts.config };
  }
  return { type: 'none' };
}

function printTargetResult(target: AnyTargetResult): void {
  const status = target.success ? '[ok]' : 'x';
  console.log(`\n${status} ${target.message}`);

  if (target.tables?.length) {
    console.log('  Tables:');
    target.tables.forEach((t) => console.log(`    - ${t}`));
  }
  if (target.filesWritten?.length) {
    console.log('  Files written:');
    target.filesWritten.forEach((f) => console.log(`    - ${f}`));
  }
  if (!target.success && target.errors?.length) {
    target.errors.forEach((e) => console.error(`  - ${e}`));
  }
}

function printResult(result: AnyResult): void {
  const targets = result.targets ?? [];
  const isMultiTarget =
    targets.length > 1 || (targets.length === 1 && targets[0]?.name !== 'default');

  if (isMultiTarget) {
    console.log(result.message);
    targets.forEach(printTargetResult);
    return;
  }

  if (!result.success) {
    console.error(result.message);
    result.errors?.forEach((e) => console.error('  -', e));
  } else {
    console.log(result.message);
    result.filesWritten?.forEach((f) => console.log(f));
  }
}

async function buildSchemaFromDatabase(
  database: string,
  schemas: string[],
  outDir: string
): Promise<string> {
  await fs.promises.mkdir(outDir, { recursive: true });
  const sdl = await buildSchemaSDL({
    database,
    schemas,
    graphile: { pgSettings: async () => ({ role: 'administrator' }) },
  });
  const schemaPath = path.join(outDir, 'schema.graphql');
  await fs.promises.writeFile(schemaPath, sdl, 'utf-8');
  return schemaPath;
}
