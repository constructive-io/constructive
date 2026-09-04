import { spawn } from 'child_process';
import { Inquirerer, ParsedArgs } from 'inquirerer';
import { defaultPgConfig, PgConfig } from 'pg-env';

const envUsageText = `
Environment Command:

  pgpm env [OPTIONS] [COMMAND...]

  Manage environment variables for local development with profile support.

Database Profiles:
  (default)          Use local Postgres development profile
  --supabase         Use Supabase local development profile

Additional Services:
  --minio            Include MinIO/S3 environment variables
  --rustfs           Include RustFS/S3 environment variables (same vars as --minio)

Modes:
  No command         Print export statements for shell evaluation
  With command       Execute command with environment variables applied

Already running your own Postgres? PGHOST, PGPORT, PGUSER, PGPASSWORD and
PGDATABASE that are already set in your shell are kept as-is; only the
missing ones are filled in from the profile. Pass --reset to overwrite them
(--supabase is an explicit profile switch and always overwrites).

Options:
  --help, -h         Show this help message
  --reset            Overwrite PG* variables that are already set
  --supabase         Use Supabase profile instead of default Postgres
  --minio            Include CDN_ENDPOINT, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION
  --rustfs           Alias for --minio (RustFS serves the same S3 API on :9000)

Examples:
  pgpm env                                    Print default Postgres env exports
  pgpm env --supabase                         Print Supabase env exports
  pgpm env --minio                            Print Postgres + MinIO env exports
  pgpm env --rustfs                           Print Postgres + RustFS env exports
  pgpm env --supabase --minio                 Print Supabase + MinIO env exports
  eval "$(pgpm env)"                          Load default Postgres env into shell
  eval "$(pgpm env --reset)"                  Same, replacing any PG* already set
  eval "$(pgpm env --minio)"                  Load Postgres + MinIO env into shell
  eval "$(pgpm env --supabase --minio)"       Load Supabase + MinIO env into shell
  pgpm env pgpm deploy --database db1         Run command with default Postgres env
  pgpm env --minio pgpm deploy --database db1 Run command with Postgres + MinIO env
`;

const SUPABASE_PROFILE: PgConfig = {
  host: 'localhost',
  port: 54322,
  user: 'supabase_admin',
  password: 'postgres',
  database: 'postgres'
};

const DEFAULT_PROFILE: PgConfig = {
  ...defaultPgConfig
};

interface ObjectStoreConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
}

const OBJECT_STORE_PROFILE: ObjectStoreConfig = {
  endpoint: 'http://localhost:9000',
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  region: 'us-east-1',
};

export interface EnvResolution {
  /** Variables to export or pass to the child process. */
  vars: Record<string, string>;
  /** PG* variables left untouched because the caller's shell already set them. */
  kept: string[];
}

export interface ResolveEnvOptions {
  objectStore?: ObjectStoreConfig;
  /** Overwrite PG* variables even when the environment already has them. */
  reset?: boolean;
}

export function resolveEnvVars(
  config: PgConfig,
  existing: NodeJS.ProcessEnv,
  { objectStore, reset = false }: ResolveEnvOptions = {}
): EnvResolution {
  const profileVars: Record<string, string> = {
    PGHOST: config.host,
    PGPORT: String(config.port),
    PGUSER: config.user,
    PGPASSWORD: config.password,
    PGDATABASE: config.database
  };

  const vars: Record<string, string> = {};
  const kept: string[] = [];
  for (const [key, value] of Object.entries(profileVars)) {
    if (!reset && existing[key]) {
      kept.push(key);
    } else {
      vars[key] = value;
    }
  }

  if (objectStore) {
    vars.CDN_ENDPOINT = objectStore.endpoint;
    vars.AWS_ACCESS_KEY = objectStore.accessKey;
    vars.AWS_SECRET_KEY = objectStore.secretKey;
    vars.AWS_REGION = objectStore.region;
  }

  return { vars, kept };
}

function printExports({ vars, kept }: EnvResolution): void {
  if (kept.length > 0) {
    console.log(`# keeping ${kept.join(', ')} from your environment (pass --reset to overwrite)`);
  }
  for (const [key, value] of Object.entries(vars)) {
    console.log(`export ${key}=${value}`);
  }
}

function executeCommand({ vars }: EnvResolution, command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...vars
    };

    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
      shell: false
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });
}

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer
) => {
  if (argv.help || argv.h) {
    console.log(envUsageText);
    process.exit(0);
  }

  const useSupabase = argv.supabase === true || typeof argv.supabase === 'string';
  const useObjectStore =
    argv.minio === true || typeof argv.minio === 'string' ||
    argv.rustfs === true || typeof argv.rustfs === 'string';
  const reset = useSupabase || argv.reset === true || typeof argv.reset === 'string';
  const profile = useSupabase ? SUPABASE_PROFILE : DEFAULT_PROFILE;
  const resolution = resolveEnvVars(profile, process.env, {
    objectStore: useObjectStore ? OBJECT_STORE_PROFILE : undefined,
    reset
  });

  const knownFlags = ['--supabase', '--minio', '--rustfs', '--reset'];

  const rawArgs = process.argv.slice(2);
  
  let envIndex = rawArgs.findIndex(arg => arg === 'env');
  if (envIndex === -1) {
    envIndex = 0;
  }
  
  const argsAfterEnv = rawArgs.slice(envIndex + 1);
  
  let commandArgs = argsAfterEnv.filter(arg => !knownFlags.includes(arg));
  
  commandArgs = commandArgs.filter(arg => arg !== '--cwd' && !arg.startsWith('--cwd='));
  
  const cwdIndex = commandArgs.findIndex(arg => arg === '--cwd');
  if (cwdIndex !== -1 && cwdIndex + 1 < commandArgs.length) {
    commandArgs.splice(cwdIndex, 2);
  }

  if (commandArgs.length === 0) {
    printExports(resolution);
    return;
  }

  const [command, ...args] = commandArgs;
  
  try {
    const exitCode = await executeCommand(resolution, command, args);
    process.exit(exitCode);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error executing command: ${error.message}`);
    } else {
      console.error(`Error executing command: ${String(error)}`);
    }
    process.exit(1);
  }
};
