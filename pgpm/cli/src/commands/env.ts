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

Modes:
  No command         Print export statements for shell evaluation
  With command       Execute command with environment variables applied

Options:
  --help, -h         Show this help message
  --supabase         Use Supabase profile instead of default Postgres
  --minio            Include CDN_ENDPOINT, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION

Examples:
  pgpm env                                    Print default Postgres env exports
  pgpm env --supabase                         Print Supabase env exports
  pgpm env --minio                            Print Postgres + MinIO env exports
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

interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
}

const MINIO_PROFILE: MinioConfig = {
  endpoint: 'http://localhost:9000',
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  region: 'us-east-1',
};

function configToEnvVars(config: PgConfig, minio?: MinioConfig): Record<string, string> {
  const vars: Record<string, string> = {
    PGHOST: config.host,
    PGPORT: String(config.port),
    PGUSER: config.user,
    PGPASSWORD: config.password,
    PGDATABASE: config.database
  };

  if (minio) {
    vars.CDN_ENDPOINT = minio.endpoint;
    vars.AWS_ACCESS_KEY = minio.accessKey;
    vars.AWS_SECRET_KEY = minio.secretKey;
    vars.AWS_REGION = minio.region;
  }

  return vars;
}

function printExports(config: PgConfig, minio?: MinioConfig): void {
  const envVars = configToEnvVars(config, minio);
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`export ${key}=${value}`);
  }
}

function executeCommand(config: PgConfig, command: string, args: string[], minio?: MinioConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const envVars = configToEnvVars(config, minio);
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
  const useMinio = argv.minio === true || typeof argv.minio === 'string';
  const profile = useSupabase ? SUPABASE_PROFILE : DEFAULT_PROFILE;
  const minioProfile = useMinio ? MINIO_PROFILE : undefined;

  const knownFlags = ['--supabase', '--minio'];

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
    printExports(profile, minioProfile);
    return;
  }

  const [command, ...args] = commandArgs;
  
  try {
    const exitCode = await executeCommand(profile, command, args, minioProfile);
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
