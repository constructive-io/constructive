import { ConstructiveOptions } from '@constructive-io/graphql-types';

/**
 * Parse GraphQL-related environment variables.
 * These are the env vars that Constructive packages need but pgpm doesn't.
 */
const parseEnvBoolean = (val?: string): boolean | undefined => {
  if (val === undefined) return undefined;
  return ['true', '1', 'yes'].includes(val.toLowerCase());
};

/**
 * Default schema list used when SCHEMAS environment variable is not provided.
 * This provides a sensible fallback for most PostgreSQL applications.
 */
export const DEFAULT_SCHEMA_LIST: readonly string[] = ['public'] as const;

/**
 * Core environment variable configuration with defaults.
 * These defaults are used when constructing DATABASE_URL from individual PG* variables.
 */
export interface CoreEnvConfig {
  PORT: number;
  PGHOST: string;
  PGPORT: string;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  DATABASE_URL: string;
  SCHEMAS: string[];
}

/**
 * Default values for core environment variables.
 */
export const coreEnvDefaults = {
  PORT: 5433,
  PGHOST: 'localhost',
  PGPORT: '5432',
  PGUSER: process.env.USER || 'postgres',
  PGPASSWORD: '',
  PGDATABASE: 'postgres',
};

/**
 * Parse core environment variables (PORT, PG*, DATABASE_URL, SCHEMAS).
 * DATABASE_URL is constructed from individual PG* variables if not explicitly set.
 *
 * @param env - Environment object to read from (defaults to process.env)
 * @returns Parsed core environment configuration
 */
export const getCoreEnvVars = (env: NodeJS.ProcessEnv = process.env): CoreEnvConfig => {
  const PORT = env.PORT ? parseInt(env.PORT, 10) : coreEnvDefaults.PORT;
  const PGHOST = env.PGHOST || coreEnvDefaults.PGHOST;
  const PGPORT = env.PGPORT || coreEnvDefaults.PGPORT;
  const PGUSER = env.PGUSER || coreEnvDefaults.PGUSER;
  const PGPASSWORD = env.PGPASSWORD ?? coreEnvDefaults.PGPASSWORD;
  const PGDATABASE = env.PGDATABASE || coreEnvDefaults.PGDATABASE;

  // Construct DATABASE_URL from individual variables if not explicitly set
  const DATABASE_URL = env.DATABASE_URL ||
    `postgres://${PGUSER}${PGPASSWORD ? ':' + PGPASSWORD : ''}@${PGHOST}:${PGPORT}/${PGDATABASE}`;

  // Parse SCHEMAS as comma-separated list, with DEFAULT_SCHEMA_LIST fallback
  const SCHEMAS = env.SCHEMAS
    ? env.SCHEMAS.split(',').map(s => s.trim()).filter(Boolean)
    : [...DEFAULT_SCHEMA_LIST];

  return {
    PORT,
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,
    DATABASE_URL,
    SCHEMAS,
  };
};

/**
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
export const getGraphQLEnvVars = (env: NodeJS.ProcessEnv = process.env): Partial<ConstructiveOptions> => {
  const {
    GRAPHILE_SCHEMA,

    FEATURES_SIMPLE_INFLECTION,
    FEATURES_OPPOSITE_BASE_NAMES,
    FEATURES_POSTGIS,

    API_ENABLE_SERVICES,
    API_IS_PUBLIC,
    API_EXPOSED_SCHEMAS,
    API_META_SCHEMAS,
    API_ANON_ROLE,
    API_ROLE_NAME,
    API_DEFAULT_DATABASE_ID,

    // Grafserv/WebSocket configuration
    GRAPHQL_PATH,
    GRAPHIQL_PATH,
    WEBSOCKETS_ENABLED,
    WEBSOCKETS_PATH,
  } = env;

  return {
    graphile: {
      ...(GRAPHILE_SCHEMA && {
        schema: GRAPHILE_SCHEMA.includes(',')
          ? GRAPHILE_SCHEMA.split(',').map(s => s.trim())
          : GRAPHILE_SCHEMA
      }),
      grafserv: {
        ...(GRAPHQL_PATH && { graphqlPath: GRAPHQL_PATH }),
        ...(GRAPHIQL_PATH && { graphiqlPath: GRAPHIQL_PATH }),
        websockets: {
          ...(WEBSOCKETS_ENABLED !== undefined && { enabled: parseEnvBoolean(WEBSOCKETS_ENABLED) }),
          ...(WEBSOCKETS_PATH && { path: WEBSOCKETS_PATH }),
        },
      },
    },
    features: {
      ...(FEATURES_SIMPLE_INFLECTION && { simpleInflection: parseEnvBoolean(FEATURES_SIMPLE_INFLECTION) }),
      ...(FEATURES_OPPOSITE_BASE_NAMES && { oppositeBaseNames: parseEnvBoolean(FEATURES_OPPOSITE_BASE_NAMES) }),
      ...(FEATURES_POSTGIS && { postgis: parseEnvBoolean(FEATURES_POSTGIS) }),
    },
    api: {
      ...(API_ENABLE_SERVICES && { enableServicesApi: parseEnvBoolean(API_ENABLE_SERVICES) }),
      ...(API_IS_PUBLIC && { isPublic: parseEnvBoolean(API_IS_PUBLIC) }),
      ...(API_EXPOSED_SCHEMAS && { exposedSchemas: API_EXPOSED_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_META_SCHEMAS && { metaSchemas: API_META_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_ANON_ROLE && { anonRole: API_ANON_ROLE }),
      ...(API_ROLE_NAME && { roleName: API_ROLE_NAME }),
      ...(API_DEFAULT_DATABASE_ID && { defaultDatabaseId: API_DEFAULT_DATABASE_ID }),
    },
  };
};
