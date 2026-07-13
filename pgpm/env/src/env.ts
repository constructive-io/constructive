import { PgpmOptions } from '@pgpmjs/types';
import { parseEnvBoolean, parseEnvNumber } from '12factor-env/parsers';

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

    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,

    DEPLOYMENT_USE_TX,
    DEPLOYMENT_FAST,
    DEPLOYMENT_USE_PLAN,
    DEPLOYMENT_CACHE,
    DEPLOYMENT_TO_CHANGE,

    MIGRATIONS_CODEGEN_USE_TX,

    // Error output formatting env vars
    PGPM_ERROR_QUERY_HISTORY_LIMIT,
    PGPM_ERROR_MAX_LENGTH,
    PGPM_ERROR_VERBOSE
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
    pg: {
      ...(PGHOST && { host: PGHOST }),
      ...(PGPORT && { port: parseEnvNumber(PGPORT) }),
      ...(PGUSER && { user: PGUSER }),
      ...(PGPASSWORD && { password: PGPASSWORD }),
      ...(PGDATABASE && { database: PGDATABASE }),
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
    errorOutput: {
      ...(PGPM_ERROR_QUERY_HISTORY_LIMIT && { queryHistoryLimit: parseEnvNumber(PGPM_ERROR_QUERY_HISTORY_LIMIT) }),
      ...(PGPM_ERROR_MAX_LENGTH && { maxLength: parseEnvNumber(PGPM_ERROR_MAX_LENGTH) }),
      ...(PGPM_ERROR_VERBOSE && { verbose: parseEnvBoolean(PGPM_ERROR_VERBOSE) }),
    }
  };
};
