import { PgpmOptions, BucketProvider } from '@pgpmjs/types';

export const parseEnvNumber = (val?: string): number | undefined => {
  const num = Number(val);
  return !isNaN(num) ? num : undefined;
};

export const parseEnvBoolean = (val?: string): boolean | undefined => {
  if (val === undefined) return undefined;
  return ['true', '1', 'yes'].includes(val.toLowerCase());
};

const parseEnvStringArray = (val?: string): string[] | undefined => {
  if (!val) return undefined;
  return val
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
};

/**
 * Parse core PGPM environment variables.
 * GraphQL-related env vars (GRAPHILE_*, FEATURES_*, API_*) are handled by @constructive-io/graphql-env.
 * 
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
export const getEnvVars = (env: NodeJS.ProcessEnv = process.env): PgpmOptions => {
    const {
      PGROOTDATABASE,
      PGTEMPLATE,
      DB_PREFIX,
      DB_EXTENSIONS,
      DB_CWD,
      DB_CONNECTION_USER,
      DB_CONNECTION_PASSWORD,
      DB_CONNECTION_ROLE,
      // New connections.app and connections.admin env vars
      DB_CONNECTIONS_APP_USER,
      DB_CONNECTIONS_APP_PASSWORD,
      DB_CONNECTIONS_ADMIN_USER,
      DB_CONNECTIONS_ADMIN_PASSWORD,

      PORT,
    SERVER_HOST,
    SERVER_TRUST_PROXY,
    SERVER_ORIGIN,
    SERVER_STRICT_AUTH,

    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,

    BUCKET_PROVIDER,
    BUCKET_NAME,
    AWS_REGION,
    AWS_ACCESS_KEY,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_KEY,
    AWS_SECRET_ACCESS_KEY,
    MINIO_ENDPOINT,

    DEPLOYMENT_USE_TX,
    DEPLOYMENT_FAST,
    DEPLOYMENT_USE_PLAN,
    DEPLOYMENT_CACHE,
    DEPLOYMENT_TO_CHANGE,

    MIGRATIONS_CODEGEN_USE_TX,

    // Jobs-related env vars
    JOBS_SCHEMA,
    JOBS_SUPPORT_ANY,
    JOBS_SUPPORTED,
    INTERNAL_GATEWAY_URL,
    INTERNAL_JOBS_CALLBACK_URL,
    INTERNAL_JOBS_CALLBACK_PORT,

    // Error output formatting env vars
    PGPM_ERROR_QUERY_HISTORY_LIMIT,
    PGPM_ERROR_MAX_LENGTH,
    PGPM_ERROR_VERBOSE,

    // SMTP email env vars
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    SMTP_REPLY_TO,
    SMTP_REQUIRE_TLS,
    SMTP_TLS_REJECT_UNAUTHORIZED,
    SMTP_POOL,
    SMTP_MAX_CONNECTIONS,
    SMTP_MAX_MESSAGES,
    SMTP_NAME,
    SMTP_LOGGER,
    SMTP_DEBUG
  } = env;

  return {
    db: {
      ...(PGROOTDATABASE && { rootDb: PGROOTDATABASE }),
      ...(PGTEMPLATE && { template: PGTEMPLATE }),
      ...(DB_PREFIX && { prefix: DB_PREFIX }),
      ...(DB_EXTENSIONS && { extensions: DB_EXTENSIONS.split(',').map(ext => ext.trim()) }),
      ...(DB_CWD && { cwd: DB_CWD }),
          ...((DB_CONNECTION_USER || DB_CONNECTION_PASSWORD || DB_CONNECTION_ROLE) && {
            connection: {
              ...(DB_CONNECTION_USER && { user: DB_CONNECTION_USER }),
              ...(DB_CONNECTION_PASSWORD && { password: DB_CONNECTION_PASSWORD }),
              ...(DB_CONNECTION_ROLE && { role: DB_CONNECTION_ROLE }),
            }
          }),
          ...((DB_CONNECTIONS_APP_USER || DB_CONNECTIONS_APP_PASSWORD || DB_CONNECTIONS_ADMIN_USER || DB_CONNECTIONS_ADMIN_PASSWORD) && {
            connections: {
              ...((DB_CONNECTIONS_APP_USER || DB_CONNECTIONS_APP_PASSWORD) && {
                app: {
                  ...(DB_CONNECTIONS_APP_USER && { user: DB_CONNECTIONS_APP_USER }),
                  ...(DB_CONNECTIONS_APP_PASSWORD && { password: DB_CONNECTIONS_APP_PASSWORD }),
                }
              }),
              ...((DB_CONNECTIONS_ADMIN_USER || DB_CONNECTIONS_ADMIN_PASSWORD) && {
                admin: {
                  ...(DB_CONNECTIONS_ADMIN_USER && { user: DB_CONNECTIONS_ADMIN_USER }),
                  ...(DB_CONNECTIONS_ADMIN_PASSWORD && { password: DB_CONNECTIONS_ADMIN_PASSWORD }),
                }
              }),
            }
          }),
        },
    server: {
      ...(PORT && { port: parseEnvNumber(PORT) }),
      ...(SERVER_HOST && { host: SERVER_HOST }),
      ...(SERVER_TRUST_PROXY && { trustProxy: parseEnvBoolean(SERVER_TRUST_PROXY) }),
      ...(SERVER_ORIGIN && { origin: SERVER_ORIGIN }),
      ...(SERVER_STRICT_AUTH && { strictAuth: parseEnvBoolean(SERVER_STRICT_AUTH) }),
    },
    pg: {
      ...(PGHOST && { host: PGHOST }),
      ...(PGPORT && { port: parseEnvNumber(PGPORT) }),
      ...(PGUSER && { user: PGUSER }),
      ...(PGPASSWORD && { password: PGPASSWORD }),
      ...(PGDATABASE && { database: PGDATABASE }),
    },
    cdn: {
      ...(BUCKET_PROVIDER && { provider: BUCKET_PROVIDER as BucketProvider }),
      ...(BUCKET_NAME && { bucketName: BUCKET_NAME }),
      ...(AWS_REGION && { awsRegion: AWS_REGION }),
      ...((AWS_ACCESS_KEY || AWS_ACCESS_KEY_ID) && { awsAccessKey: AWS_ACCESS_KEY || AWS_ACCESS_KEY_ID }),
      ...((AWS_SECRET_KEY || AWS_SECRET_ACCESS_KEY) && { awsSecretKey: AWS_SECRET_KEY || AWS_SECRET_ACCESS_KEY }),
      ...(MINIO_ENDPOINT && { minioEndpoint: MINIO_ENDPOINT }),
    },
    deployment: {
      ...(DEPLOYMENT_USE_TX && { useTx: parseEnvBoolean(DEPLOYMENT_USE_TX) }),
      ...(DEPLOYMENT_FAST && { fast: parseEnvBoolean(DEPLOYMENT_FAST) }),
      ...(DEPLOYMENT_USE_PLAN && { usePlan: parseEnvBoolean(DEPLOYMENT_USE_PLAN) }),
      ...(DEPLOYMENT_CACHE && { cache: parseEnvBoolean(DEPLOYMENT_CACHE) }),
      ...(DEPLOYMENT_TO_CHANGE && { toChange: DEPLOYMENT_TO_CHANGE }),
    },
    migrations: {
      ...(MIGRATIONS_CODEGEN_USE_TX && {
        codegen: {
          useTx: parseEnvBoolean(MIGRATIONS_CODEGEN_USE_TX)
        }
      }),
    },
    jobs: {
      ...(JOBS_SCHEMA && {
        schema: {
          schema: JOBS_SCHEMA
        }
      }),
      ...((JOBS_SUPPORT_ANY || JOBS_SUPPORTED) && {
        worker: {
          ...(JOBS_SUPPORT_ANY && {
            supportAny: parseEnvBoolean(JOBS_SUPPORT_ANY)
          }),
          ...(JOBS_SUPPORTED && {
            supported: parseEnvStringArray(JOBS_SUPPORTED)
          })
        },
        scheduler: {
          ...(JOBS_SUPPORT_ANY && {
            supportAny: parseEnvBoolean(JOBS_SUPPORT_ANY)
          }),
          ...(JOBS_SUPPORTED && {
            supported: parseEnvStringArray(JOBS_SUPPORTED)
          })
        }
      }),
      ...((INTERNAL_GATEWAY_URL ||
        INTERNAL_JOBS_CALLBACK_URL ||
        INTERNAL_JOBS_CALLBACK_PORT) && {
        gateway: {
          ...(INTERNAL_GATEWAY_URL && {
            gatewayUrl: INTERNAL_GATEWAY_URL
          }),
          ...(INTERNAL_JOBS_CALLBACK_URL && {
            callbackUrl: INTERNAL_JOBS_CALLBACK_URL
          }),
          ...(INTERNAL_JOBS_CALLBACK_PORT && {
            callbackPort: parseEnvNumber(INTERNAL_JOBS_CALLBACK_PORT)
          })
        }
      })
    },
    errorOutput: {
      ...(PGPM_ERROR_QUERY_HISTORY_LIMIT && { queryHistoryLimit: parseEnvNumber(PGPM_ERROR_QUERY_HISTORY_LIMIT) }),
      ...(PGPM_ERROR_MAX_LENGTH && { maxLength: parseEnvNumber(PGPM_ERROR_MAX_LENGTH) }),
      ...(PGPM_ERROR_VERBOSE && { verbose: parseEnvBoolean(PGPM_ERROR_VERBOSE) }),
    },
    smtp: {
      ...(SMTP_HOST && { host: SMTP_HOST }),
      ...(SMTP_PORT && { port: parseEnvNumber(SMTP_PORT) }),
      ...(SMTP_SECURE && { secure: parseEnvBoolean(SMTP_SECURE) }),
      ...(SMTP_USER && { user: SMTP_USER }),
      ...(SMTP_PASS && { pass: SMTP_PASS }),
      ...(SMTP_FROM && { from: SMTP_FROM }),
      ...(SMTP_REPLY_TO && { replyTo: SMTP_REPLY_TO }),
      ...(SMTP_REQUIRE_TLS && { requireTLS: parseEnvBoolean(SMTP_REQUIRE_TLS) }),
      ...(SMTP_TLS_REJECT_UNAUTHORIZED && { tlsRejectUnauthorized: parseEnvBoolean(SMTP_TLS_REJECT_UNAUTHORIZED) }),
      ...(SMTP_POOL && { pool: parseEnvBoolean(SMTP_POOL) }),
      ...(SMTP_MAX_CONNECTIONS && { maxConnections: parseEnvNumber(SMTP_MAX_CONNECTIONS) }),
      ...(SMTP_MAX_MESSAGES && { maxMessages: parseEnvNumber(SMTP_MAX_MESSAGES) }),
      ...(SMTP_NAME && { name: SMTP_NAME }),
      ...(SMTP_LOGGER && { logger: parseEnvBoolean(SMTP_LOGGER) }),
      ...(SMTP_DEBUG && { debug: parseEnvBoolean(SMTP_DEBUG) }),
    }
  };
};

type NodeEnv = 'development' | 'production' | 'test';

export const getNodeEnv = (): NodeEnv => {
  const env = process.env.NODE_ENV?.toLowerCase();
  if (env === 'production' || env === 'test') return env;
  return 'development';
};
