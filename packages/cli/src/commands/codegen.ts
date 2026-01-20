import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSchemaSDL } from '@constructive-io/graphql-server';
import {
  generateCommand,
  type GenerateTargetResult,
} from '@constructive-io/graphql-codegen/cli/commands/generate';
import {
  generateOrmCommand,
  type GenerateOrmTargetResult,
} from '@constructive-io/graphql-codegen/cli/commands/generate-orm';
import { findConfigFile } from '@constructive-io/graphql-codegen/cli/commands/init';
import {
  ConstructiveOptions,
  getEnvOptions,
} from '@constructive-io/graphql-env';

function parseHeaders(headerArg: string | string[] | undefined): Record<string, string> {
  const headerList = Array.isArray(headerArg) ? headerArg : headerArg ? [headerArg] : [];
  const headers: Record<string, string> = {};
  for (const h of headerList) {
    const idx = typeof h === 'string' ? h.indexOf(':') : -1;
    if (idx <= 0) continue;
    const name = h.slice(0, idx).trim();
    const value = h.slice(idx + 1).trim();
    if (!name) continue;
    headers[name] = value;
  }
  return headers;
}

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Options:
  --help, -h                 Show this help message
  --mode <type>              Generation mode: "hooks" (default) or "orm"
  --config <path>            Path to graphql-codegen config file
  --target <name>            Target name in config file
  --endpoint <url>           GraphQL endpoint URL
  --auth <token>             Authorization header value (e.g., "Bearer 123")
  --header "Name: Value"    Optional HTTP header; repeat to add multiple
  --out <dir>                Output directory
  --dry-run                  Preview without writing files
  -v, --verbose              Verbose output

  --database <name>          Database override for DB mode (defaults to PGDATABASE)
  --schemas <list>           Comma-separated schemas (required for DB mode)

Examples:
  cnc codegen --endpoint https://api.example.com/graphql
  cnc codegen --mode orm --endpoint https://api.example.com/graphql
  cnc codegen --mode hooks --schemas public --database mydb
`;

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const mode = (argv.mode as string) || 'hooks';
  const endpointArg = (argv.endpoint as string) || '';
  const outputArg = argv.out as string | undefined;
  const outDir = outputArg || 'codegen';
  const auth = (argv.auth as string) || '';
  const configPath = (argv.config as string) || '';
  const target = (argv.target as string) || '';
  const dryRun = !!(argv['dry-run'] || argv.dryRun);
  const verbose = !!(argv.verbose || argv.v);

  if (mode !== 'hooks' && mode !== 'orm') {
    console.error(`Error: Invalid mode "${mode}". Must be "hooks" or "orm".`);
    process.exit(1);
  }
  const resolvedConfigPath = configPath || findConfigFile() || '';
  const hasConfigFile = Boolean(resolvedConfigPath);
  const outputForGenerate = outputArg || !hasConfigFile ? outDir : undefined;

  const selectedDb = (argv.database as string) || undefined;
  const options: ConstructiveOptions = selectedDb
    ? getEnvOptions({ pg: { database: selectedDb } })
    : getEnvOptions();
  const schemasArg = (argv.schemas as string) || '';

  const headers = parseHeaders(argv.header as string | string[] | undefined);

  const runGenerate = async ({
    endpoint,
    schema,
  }: {
    endpoint?: string;
    schema?: string;
  }) => {
    const result = mode === 'orm'
      ? await generateOrmCommand({
          config: configPath || undefined,
          target: target || undefined,
          endpoint,
          schema,
          output: outputForGenerate,
          authorization: auth || undefined,
          headers,
          verbose,
          dryRun,
        })
      : await generateCommand({
          config: configPath || undefined,
          target: target || undefined,
          endpoint,
          schema,
          output: outputForGenerate,
          authorization: auth || undefined,
          headers,
          verbose,
          dryRun,
        });
    const targetResults: (GenerateTargetResult | GenerateOrmTargetResult)[] = result.targets ?? [];
    const hasNamedTargets =
      targetResults.length > 0 &&
      (targetResults.length > 1 || targetResults[0]?.name !== 'default');

    if (hasNamedTargets) {
      console.log(result.message);
      targetResults.forEach((target) => {
        const status = target.success ? '[ok]' : 'x';
        console.log(`\n${status} ${target.message}`);

        if (target.tables?.length) {
          console.log('  Tables:');
          (target.tables as any).forEach((table: any) => console.log(`    - ${table}`));
        }
        if (target.filesWritten?.length) {
          console.log('  Files written:');
          (target.filesWritten as any).forEach((file: any) => console.log(`    - ${file}`));
        }
        if (!target.success && target.errors?.length) {
          (target.errors as any).forEach((error: any) => console.error(`  - ${error}`));
        }
      });

      if (!result.success) {
        process.exit(1);
      }
      return;
    }

    if (!result.success) {
      console.error(result.message);
      if (result.errors?.length)
        (result.errors as any).forEach((e: any) => console.error('  -', e));
      process.exit(1);
    }
    console.log(result.message);
    if (result.filesWritten?.length) {
      (result.filesWritten as any).forEach((f: any) => console.log(f));
    }
  };

  if (endpointArg) {
    await runGenerate({ endpoint: endpointArg });
    return;
  }

  if (!schemasArg.trim()) {
    console.error(
      'Error: --schemas is required when building from database. Provide a comma-separated list of schemas.'
    );
    process.exit(1);
  }

  const schemas = schemasArg
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  await fs.promises.mkdir(outDir, { recursive: true });
  const sdl = await buildSchemaSDL({
    database: options.pg.database,
    schemas,
    graphile: {
      pgSettings: async () => ({ role: 'administrator' }),
    },
  });

  const schemaPath = path.join(outDir, 'schema.graphql');
  await fs.promises.writeFile(schemaPath, sdl, 'utf-8');

  await runGenerate({ schema: schemaPath });
};
