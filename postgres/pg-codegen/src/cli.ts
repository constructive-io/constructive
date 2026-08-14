#!/usr/bin/env node
/**
 * pg-codegen CLI.
 *
 *   pg-codegen --schema app_public --out src/generated
 *   pg-codegen --schema app_public --schema app_jobs --out src/generated --check
 *
 * Connection settings come from the standard PG environment (pg-env):
 * PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.
 */
import { Client } from 'pg';
import { getPgEnvOptions } from 'pg-env';

import { checkFileTree, generate, isClean, writeFileTree } from './generate';

interface CliArgs {
  schemas: string[];
  out: string;
  check: boolean;
}

const USAGE = `Usage: pg-codegen --schema <name> [--schema <name> ...] --out <dir> [--check]

Options:
  --schema <name>  A schema to generate records for (repeatable, or comma-separated)
  --out <dir>      Directory the generated files are written to (or compared against)
  --check          Compare against the files already in --out and exit non-zero on drift
  --help           Show this message

Connection settings come from the standard PG environment variables.`;

export const parseArgs = (argv: string[]): CliArgs => {
  const schemas: string[] = [];
  let out = '';
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
    case '--schema': {
      const value = argv[++i];
      if (!value) throw new Error('--schema requires a value');
      schemas.push(...value.split(',').map(name => name.trim()).filter(Boolean));
      break;
    }
    case '--out': {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a value');
      out = value;
      break;
    }
    case '--check':
      check = true;
      break;
    case '--help':
    case '-h':
      console.log(USAGE);
      process.exit(0);
      break;
    default:
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (schemas.length === 0) throw new Error('At least one --schema is required');
  if (!out) throw new Error('--out is required');
  return { schemas, out, check };
};

export const main = async (argv: string[]): Promise<number> => {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error((error as Error).message);
    console.error();
    console.error(USAGE);
    return 2;
  }

  const pg = getPgEnvOptions();
  const client = new Client({
    host: pg.host,
    port: pg.port,
    user: pg.user,
    password: pg.password,
    database: pg.database
  });
  await client.connect();
  try {
    const files = await generate(client, { schemas: args.schemas });
    if (args.check) {
      const report = await checkFileTree(args.out, files);
      if (isClean(report)) {
        console.log(`pg-codegen: ${Object.keys(files).length} files up to date in ${args.out}`);
        return 0;
      }
      for (const file of report.missing) console.error(`missing: ${file}`);
      for (const file of report.stale) console.error(`stale:   ${file}`);
      console.error('pg-codegen --check failed: regenerate with the same command without --check');
      return 1;
    }
    await writeFileTree(args.out, files);
    console.log(`pg-codegen: wrote ${Object.keys(files).length} files to ${args.out}`);
    return 0;
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    error => {
      console.error(error);
      process.exit(1);
    }
  );
}
