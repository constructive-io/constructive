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

Options:
  --help, -h         Show this help message
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

function configToEnvVars(config: PgConfig, objectStore?: ObjectStoreConfig): Record<string, string> {
  const vars: Record<string, string> = {
    PGHOST: config.host,
    PGPORT: String(config.port),
    PGUSER: config.user,
    PGPASSWORD: config.password,
    PGDATABASE: config.database
  };

  if (objectStore) {
    vars.CDN_ENDPOINT = objectStore.endpoint;
    vars.AWS_ACCESS_KEY = objectStore.accessKey;
    vars.AWS_SECRET_KEY = objectStore.secretKey;
    vars.AWS_REGION = objectStore.region;
  }

  return vars;
}

function printExports(config: PgConfig, objectStore?: ObjectStoreConfig): void {
  const envVars = configToEnvVars(config, objectStore);
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`export ${key}=${value}`);
  }
}

function executeCommand(config: PgConfig, command: string, args: string[], objectStore?: ObjectStoreConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const envVars = configToEnvVars(config, objectStore);
    const env = {
      ...process.env,
      ...envVars
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
  const profile = useSupabase ? SUPABASE_PROFILE : DEFAULT_PROFILE;
  const objectStoreProfile = useObjectStore ? OBJECT_STORE_PROFILE : undefined;

  const knownFlags = ['--supabase', '--minio', '--rustfs'];

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
    printExports(profile, objectStoreProfile);
    return;
  }

  const [command, ...args] = commandArgs;
  
  try {
    const exitCode = await executeCommand(profile, command, args, objectStoreProfile);
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
