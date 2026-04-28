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
    USE_MULTI_TENANCY_CACHE,

    EMBEDDER_PROVIDER,
    EMBEDDER_MODEL,
    EMBEDDER_BASE_URL,
    CHAT_PROVIDER,
    CHAT_MODEL,
    CHAT_BASE_URL,
  } = env;

  return {
    graphile: {
      ...(GRAPHILE_SCHEMA && {
        schema: GRAPHILE_SCHEMA.includes(',')
          ? GRAPHILE_SCHEMA.split(',').map(s => s.trim())
          : GRAPHILE_SCHEMA
      }),
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
      ...(USE_MULTI_TENANCY_CACHE && { useMultiTenancyCache: parseEnvBoolean(USE_MULTI_TENANCY_CACHE) }),
    },
    ...((EMBEDDER_PROVIDER || CHAT_PROVIDER) && {
      llm: {
        ...((EMBEDDER_PROVIDER || EMBEDDER_MODEL || EMBEDDER_BASE_URL) && {
          embedder: {
            ...(EMBEDDER_PROVIDER && { provider: EMBEDDER_PROVIDER }),
            ...(EMBEDDER_MODEL && { model: EMBEDDER_MODEL }),
            ...(EMBEDDER_BASE_URL && { baseUrl: EMBEDDER_BASE_URL }),
          },
        }),
        ...((CHAT_PROVIDER || CHAT_MODEL || CHAT_BASE_URL) && {
          chat: {
            ...(CHAT_PROVIDER && { provider: CHAT_PROVIDER }),
            ...(CHAT_MODEL && { model: CHAT_MODEL }),
            ...(CHAT_BASE_URL && { baseUrl: CHAT_BASE_URL }),
          },
        }),
      },
    }),
  };
};
