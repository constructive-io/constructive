import { PgpmOptions, BucketProvider } from '@pgpmjs/types';

const parseEnvNumber = (val?: string): number | undefined => {
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
 */
export const getEnvVars = (): PgpmOptions => {
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
    INTERNAL_JOBS_CALLBACK_PORT
  } = process.env;

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
    }
  };
};

type NodeEnv = 'development' | 'production' | 'test';

export const getNodeEnv = (): NodeEnv => {
  const env = process.env.NODE_ENV?.toLowerCase();
  if (env === 'production' || env === 'test') return env;
  return 'development';
};
