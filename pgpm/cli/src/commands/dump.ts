import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { ParsedArgs } from 'minimist';
import { getPgEnvOptions, getSpawnEnvWithPg } from 'pg-env';
import { getPgPool } from 'pg-cache';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { getTargetDatabase } from '../utils';

const log = new Logger('dump');

const dumpUsageText = `
Dump Command:

  pgpm dump [options]

  Dump a postgres database to a sql file.

Options:
  --help, -h                 Show this help message
  --db, --database <name>    Target postgres database name
  --out <path>               Output file path
  --database-id <id>         When set, the dump will include a prune step that keeps only this database_id after restore
  --cwd <directory>          Working directory (default: current directory)

Examples:
  pgpm dump
  pgpm dump --database mydb
  pgpm dump --database mydb --out ./mydb.sql
  pgpm dump --database mydb --database-id 00000000-0000-0000-0000-000000000000
`;

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function quoteIdent(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`;
}

async function runPgDump(args: string[], env: Record<string, string>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pg_dump', args, {
      env: {
        ...process.env,
        ...env
      },
      stdio: 'inherit',
      shell: false
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pg_dump exited with code ${code ?? 1}`));
    });
  });
}

async function resolveDatabaseId(dbname: string, databaseIdRaw: string): Promise<{ id: string; name: string } | null> {
  const pool = getPgPool(getPgEnvOptions({ database: dbname }));
  const res = await pool.query(`select id, name from metaschema_public.database order by name`);

  const byId = res.rows.find((r: any) => String(r.id) === databaseIdRaw);
  if (byId) return { id: String(byId.id), name: String(byId.name) };

  const byName = res.rows.find((r: any) => String(r.name) === databaseIdRaw);
  if (byName) return { id: String(byName.id), name: String(byName.name) };

  return null;
}

async function buildPruneSql(dbname: string, databaseId: string): Promise<string> {
  const pool = getPgPool(getPgEnvOptions({ database: dbname }));

  const tables = await pool.query(`
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.column_name = 'database_id'
      and t.table_type = 'BASE TABLE'
      and c.table_schema not in ('pg_catalog', 'information_schema')
    order by c.table_schema, c.table_name
  `);

  const lines: string[] = [];
  lines.push('');
  lines.push('-- pgpm dump prune');
  lines.push('-- this section keeps only one database_id after restore');
  lines.push('do $$ begin');
  lines.push(`  raise notice 'pruning data to database_id ${databaseId}';`);
  lines.push('end $$;');
  lines.push('set session_replication_role = replica;');

  for (const row of tables.rows) {
    const schema = String(row.table_schema);
    const table = String(row.table_name);
    lines.push(`delete from ${quoteIdent(schema)}.${quoteIdent(table)} where database_id <> '${databaseId}';`);
  }

  lines.push(`delete from metaschema_public.database where id <> '${databaseId}';`);
  lines.push('set session_replication_role = origin;');
  lines.push('do $$ begin');
  lines.push(`  raise notice 'prune done';`);
  lines.push('end $$;');
  lines.push('');

  return lines.join('\n');
}

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(dumpUsageText);
    process.exit(0);
  }

  const cwd = (argv.cwd as string) || process.cwd();
  const dbname = await getTargetDatabase(argv, prompter, { message: 'Select database' });

  const outPath = path.resolve(cwd, (argv.out as string) || `pgpm-dump-${dbname}-${nowStamp()}.sql`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let databaseIdInfo: { id: string; name: string } | null = null;
  const databaseIdRaw = argv['database-id'] as string | undefined;
  if (databaseIdRaw) {
    databaseIdInfo = await resolveDatabaseId(dbname, databaseIdRaw);
    if (!databaseIdInfo) {
      throw new Error(`unknown database-id ${databaseIdRaw}`);
    }
  }

  log.info(`dumping database ${dbname}`);
  log.info(`writing to ${outPath}`);
  if (databaseIdInfo) {
    log.info(`database id ${databaseIdInfo.id}`);
  }

  const pgEnv = getPgEnvOptions({ database: dbname });
  const spawnEnv = getSpawnEnvWithPg(pgEnv);

  const args = [
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    '--file',
    outPath,
    dbname
  ];

  await runPgDump(args, spawnEnv as any);

  if (databaseIdInfo) {
    const pruneSql = await buildPruneSql(dbname, databaseIdInfo.id);
    fs.appendFileSync(outPath, pruneSql, 'utf8');
    log.info('added prune section to dump file');
  }

  log.success('dump complete');
  return argv;
};


