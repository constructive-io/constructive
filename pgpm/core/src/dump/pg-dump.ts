/**
 * `pg_dump` as a typed core operation.
 *
 * Both `pgpm dump` (write a file) and `pgpm diff` (capture a schema for
 * comparison) need the same process plumbing — connection env, flag
 * assembly, error translation — so it lives here rather than being
 * re-spawned per command.
 */
import { spawn } from 'child_process';
import type { PgConfig } from 'pg-env';
import { getSpawnEnvWithPg } from 'pg-env';

/**
 * Schemas that record deployment history rather than authored schema.
 * Excluded when dumping a database for comparison: two databases with the
 * same schema but different migration histories are the same schema.
 */
export const LEDGER_SCHEMAS = ['pgpm_migrate', 'sqitch'] as const;

/** How to invoke `pg_dump` and what to ask it for. */
export interface PgDumpOptions {
  /** Connection. Its `database` is passed explicitly, not just via PG* env. */
  config: PgConfig;
  /** Schema definitions only, no data. */
  schemaOnly?: boolean;
  /** Data only, no schema definitions. */
  dataOnly?: boolean;
  /** Emit data as INSERT statements instead of COPY. */
  inserts?: boolean;
  /** Emit data as INSERT statements naming every column. */
  columnInserts?: boolean;
  /** Omit ownership commands (default: true). */
  noOwner?: boolean;
  /** Omit GRANT/REVOKE commands. */
  noPrivileges?: boolean;
  /** Output format (default: plain). */
  format?: 'plain' | 'custom' | 'directory' | 'tar';
  /** Restrict to these schemas. */
  schemas?: string[];
  /** Skip these schemas (see {@link LEDGER_SCHEMAS}). */
  excludeSchemas?: string[];
  /** Restrict to these tables. */
  tables?: string[];
  /** Skip these tables. */
  excludeTables?: string[];
  /** Write the dump here. When unset, the dump is returned as a string. */
  file?: string;
  /** Flags appended verbatim, for anything not modelled above. */
  extraArgs?: string[];
  /**
   * The `pg_dump` command to run, as argv (e.g.
   * `['docker', 'exec', '-e', 'PGUSER=postgres', 'pg', 'pg_dump']`).
   * Defaults to {@link resolvePgDumpCommand}.
   */
  command?: string[];
}

/**
 * The `pg_dump` argv to use. `pg_dump` must match the server's major version;
 * when the local client is older (or absent), `PGPM_PG_DUMP` can point at a
 * version-matched one — including one inside a container, e.g.
 * `docker exec -e PGUSER=postgres <container> pg_dump`. This is a tool
 * location, not connection configuration: connection settings still come from
 * `pg-env`.
 */
export const resolvePgDumpCommand = (): string[] => {
  const override = (process.env.PGPM_PG_DUMP ?? '').trim();
  return override ? override.split(/\s+/) : ['pg_dump'];
};

/** Assemble `pg_dump` flags from options (exported for testing/inspection). */
export const buildPgDumpArgs = (options: PgDumpOptions): string[] => {
  const args: string[] = [];
  if (options.format) args.push(`--format=${options.format}`);
  if (options.schemaOnly) args.push('--schema-only');
  if (options.dataOnly) args.push('--data-only');
  if (options.inserts) args.push('--inserts');
  if (options.columnInserts) args.push('--column-inserts');
  if (options.noOwner !== false) args.push('--no-owner');
  if (options.noPrivileges) args.push('--no-privileges');
  for (const schema of options.schemas ?? []) args.push(`--schema=${schema}`);
  for (const schema of options.excludeSchemas ?? []) args.push(`--exclude-schema=${schema}`);
  for (const table of options.tables ?? []) args.push(`--table=${table}`);
  for (const table of options.excludeTables ?? []) args.push(`--exclude-table=${table}`);
  if (options.file) args.push('--file', options.file);
  args.push(...(options.extraArgs ?? []));
  // Pass the database explicitly rather than relying solely on PGDATABASE:
  // a wrapped command (e.g. `docker exec`) does not inherit the host's env.
  args.push('--dbname', options.config.database);
  return args;
};

/**
 * Run `pg_dump`. Returns the dump text, or an empty string when `file` was
 * given (pg_dump wrote it directly).
 */
export const pgDump = async (options: PgDumpOptions): Promise<string> => {
  const [cmd, ...prefixArgs] = options.command ?? resolvePgDumpCommand();
  const args = [...prefixArgs, ...buildPgDumpArgs(options)];
  const env = getSpawnEnvWithPg(options.config);

  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') {
        reject(new Error(
          `${cmd} not found; ensure PostgreSQL client tools are installed and in PATH, ` +
          'or set PGPM_PG_DUMP to a version-matched pg_dump command'
        ));
        return;
      }
      reject(e);
    });
    child.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(`pg_dump exited with code ${code}: ${err.trim()}`));
    });
  });
};

/**
 * Dump a database's schema for comparison: definitions only, no ownership,
 * and without the migration-history schemas (which are the ledger, not the
 * schema under comparison — read those with `PgpmMigrate.readDeployedState`).
 */
export const dumpSchemaForComparison = async (
  config: PgConfig,
  options: { excludeSchemas?: string[]; command?: string[] } = {}
): Promise<string> =>
  pgDump({
    config,
    schemaOnly: true,
    noOwner: true,
    excludeSchemas: [...LEDGER_SCHEMAS, ...(options.excludeSchemas ?? [])],
    ...(options.command ? { command: options.command } : {})
  });
