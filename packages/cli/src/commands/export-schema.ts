import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  exportSchemaSimple,
  splitCommas,
} from '@constructive-io/graphql-codegen';

const usage = `
Constructive Export Schema (from PGPM module, no server required):

  cnc export-schema [OPTIONS]

PGPM Source (choose one):
  --pgpm-module-path <path>     Path to PGPM module directory
  --pgpm-workspace-path <path>  Path to PGPM workspace directory
  --pgpm-module-name <name>     Module name within workspace

Schema Selection (choose one):
  --api-names <list>            Comma-separated API names
  --schemas <list>              Comma-separated PostgreSQL schemas

Output Options:
  --output <dir>                Output directory (default: current directory)
  --filename <name>             Output filename (default: schema.graphql)
  --keep-db                     Keep ephemeral database after export (debug)
  --verbose                     Verbose output

  --help, -h                   Show this help message
`;

export default async (
  argv: Partial<Record<string, unknown>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const pgpmModulePath = argv['pgpm-module-path'] as string | undefined;
  const pgpmWorkspacePath = argv['pgpm-workspace-path'] as string | undefined;
  const pgpmModuleName = argv['pgpm-module-name'] as string | undefined;
  const output = (argv.output || '.') as string;
  const filename = argv.filename as string | undefined;
  const verbose = Boolean(argv.verbose);
  const keepDb = Boolean(argv['keep-db']);

  const schemas = splitCommas(argv.schemas as string | undefined);
  const apiNames = splitCommas(argv['api-names'] as string | undefined);

  if (!pgpmModulePath && !(pgpmWorkspacePath && pgpmModuleName)) {
    console.error(
      'x',
      'export-schema requires --pgpm-module-path or both --pgpm-workspace-path and --pgpm-module-name',
    );
    process.exit(1);
  }

  if (!schemas?.length && !apiNames?.length) {
    console.error(
      'x',
      'export-schema requires --schemas or --api-names',
    );
    process.exit(1);
  }

  const pgpm = pgpmModulePath
    ? { modulePath: pgpmModulePath }
    : { workspacePath: pgpmWorkspacePath!, moduleName: pgpmModuleName! };

  const result = await exportSchemaSimple({
    pgpm,
    apiNames,
    schemas,
    output,
    filename,
    keepDb,
    verbose,
  });

  if (result.success) {
    console.log('[ok]', result.message);
    for (const file of result.files ?? []) {
      console.log(`  ${file.target}: ${file.path} (schemas: ${file.schemas.join(', ')})`);
    }
  } else {
    console.error('x', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }
};
