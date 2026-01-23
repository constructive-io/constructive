import { CLIOptions, Inquirerer, Question } from 'inquirerer';
import {
  generate,
  findConfigFile,
  buildSchemaFromDatabase,
  type GenerateResult,
  type GenerateTargetResult,
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

const questions: Question[] = [
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'config',
    message: 'Path to config file',
    type: 'text',
    required: false,
  },
  {
    name: 'target',
    message: 'Target name in config file',
    type: 'text',
    required: false,
  },
  {
    name: 'out',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: 'codegen',
    useDefault: true,
  },
  {
    name: 'auth',
    message: 'Authorization header value',
    type: 'text',
    required: false,
  },
  {
    name: 'database',
    message: 'Database name (for DB mode)',
    type: 'text',
    required: false,
  },
  {
    name: 'schemas',
    message: 'Comma-separated schemas (for DB mode)',
    type: 'text',
    required: false,
  },
  {
    name: 'orm',
    message: 'Generate ORM client instead of React Query hooks?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'dryRun',
    message: 'Preview without writing files?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'verbose',
    message: 'Verbose output?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
];

type AnyResult = GenerateResult;
type AnyTargetResult = GenerateTargetResult;

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  // Handle CLI aliases and defaults
  const normalizedArgv = {
    ...argv,
    dryRun: argv['dry-run'] || argv.dryRun,
    verbose: argv.verbose || argv.v,
    config: argv.config || findConfigFile() || undefined,
  };

  const answers: any = await prompter.prompt(normalizedArgv, questions);
  const endpoint = answers.endpoint as string | undefined;
  const config = answers.config as string | undefined;
  const target = answers.target as string | undefined;
  const out = answers.out as string | undefined;
  const auth = answers.auth as string | undefined;
  const database = answers.database as string | undefined;
  const schemasArg = answers.schemas as string | undefined;
  const orm = answers.orm as boolean | undefined;
  const dryRun = answers.dryRun as boolean | undefined;
  const verbose = answers.verbose as boolean | undefined;

  // Parse schemas from comma-separated string
  const schemas = schemasArg
    ? String(schemasArg).split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  // Determine output directory
  const outDir = (out as string) || 'codegen';
  let schemaPath: string | undefined;

  // Build schema from database if schemas are provided
  if (schemas.length > 0) {
    const db = (database as string) || getEnvOptions().pg.database;
    const result = await buildSchemaFromDatabase({
      database: db,
      schemas,
      outDir,
    });
    schemaPath = result.schemaPath;
  }

  // Validate that we have a source
  if (!endpoint && !schemaPath && !config) {
    console.error(
      'Error: No source specified. Use --endpoint, --config, or --schemas for database mode.'
    );
    process.exit(1);
  }

  // Determine output directory
  const output = config ? out : outDir;

  // Call unified generate function with appropriate flags
  const result = await generate({
    config,
    target,
    endpoint: endpoint || undefined,
    schema: schemaPath,
    output,
    authorization: auth,
    verbose,
    dryRun,
    // Use flags to control which generators run
    reactQuery: !orm,
    orm: orm,
  });

  printResult(result);

  if (!result.success) {
    process.exit(1);
  }
};

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
