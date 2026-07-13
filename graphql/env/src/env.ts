import {
  BucketProvider,
  ConstructiveOptions
} from '@constructive-io/graphql-types';
import {
  parseEnvBoolean,
  parseEnvNumber,
  parseEnvStringArray
} from '12factor-env/parsers';

type NodeEnv = 'development' | 'production' | 'test';

export const getNodeEnv = (): NodeEnv => {
  const env = process.env.NODE_ENV?.toLowerCase();
  if (env === 'production' || env === 'test') return env;
  return 'development';
};

/**
 * Parse GraphQL-related environment variables.
 * These are the env vars that Constructive packages need but pgpm doesn't.
 *
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

    PORT,
    SERVER_HOST,
    SERVER_TRUST_PROXY,
    SERVER_ORIGIN,
    SERVER_STRICT_AUTH,

    BUCKET_PROVIDER,
    BUCKET_NAME,
    AWS_REGION,
    AWS_ACCESS_KEY,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_KEY,
    AWS_SECRET_ACCESS_KEY,
    CDN_ENDPOINT,
    CDN_PUBLIC_URL_PREFIX,

    JOBS_SCHEMA,
    JOBS_SUPPORT_ANY,
    JOBS_SUPPORTED,
    INTERNAL_GATEWAY_URL,
    INTERNAL_JOBS_CALLBACK_URL,
    INTERNAL_JOBS_CALLBACK_PORT,

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
    SMTP_DEBUG,

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
    },
    server: {
      ...(PORT && { port: parseEnvNumber(PORT) }),
      ...(SERVER_HOST && { host: SERVER_HOST }),
      ...(SERVER_TRUST_PROXY && {
        trustProxy: parseEnvBoolean(SERVER_TRUST_PROXY)
      }),
      ...(SERVER_ORIGIN && { origin: SERVER_ORIGIN }),
      ...(SERVER_STRICT_AUTH && {
        strictAuth: parseEnvBoolean(SERVER_STRICT_AUTH)
      })
    },
    cdn: {
      ...(BUCKET_PROVIDER && { provider: BUCKET_PROVIDER as BucketProvider }),
      ...(BUCKET_NAME && { bucketName: BUCKET_NAME }),
      ...(AWS_REGION && { awsRegion: AWS_REGION }),
      ...((AWS_ACCESS_KEY || AWS_ACCESS_KEY_ID) && {
        awsAccessKey: AWS_ACCESS_KEY || AWS_ACCESS_KEY_ID
      }),
      ...((AWS_SECRET_KEY || AWS_SECRET_ACCESS_KEY) && {
        awsSecretKey: AWS_SECRET_KEY || AWS_SECRET_ACCESS_KEY
      }),
      ...(CDN_ENDPOINT && { endpoint: CDN_ENDPOINT }),
      ...(CDN_PUBLIC_URL_PREFIX && { publicUrlPrefix: CDN_PUBLIC_URL_PREFIX })
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
    smtp: {
      ...(SMTP_HOST && { host: SMTP_HOST }),
      ...(SMTP_PORT && { port: parseEnvNumber(SMTP_PORT) }),
      ...(SMTP_SECURE && { secure: parseEnvBoolean(SMTP_SECURE) }),
      ...(SMTP_USER && { user: SMTP_USER }),
      ...(SMTP_PASS && { pass: SMTP_PASS }),
      ...(SMTP_FROM && { from: SMTP_FROM }),
      ...(SMTP_REPLY_TO && { replyTo: SMTP_REPLY_TO }),
      ...(SMTP_REQUIRE_TLS && {
        requireTLS: parseEnvBoolean(SMTP_REQUIRE_TLS)
      }),
      ...(SMTP_TLS_REJECT_UNAUTHORIZED && {
        tlsRejectUnauthorized: parseEnvBoolean(SMTP_TLS_REJECT_UNAUTHORIZED)
      }),
      ...(SMTP_POOL && { pool: parseEnvBoolean(SMTP_POOL) }),
      ...(SMTP_MAX_CONNECTIONS && {
        maxConnections: parseEnvNumber(SMTP_MAX_CONNECTIONS)
      }),
      ...(SMTP_MAX_MESSAGES && {
        maxMessages: parseEnvNumber(SMTP_MAX_MESSAGES)
      }),
      ...(SMTP_NAME && { name: SMTP_NAME }),
      ...(SMTP_LOGGER && { logger: parseEnvBoolean(SMTP_LOGGER) }),
      ...(SMTP_DEBUG && { debug: parseEnvBoolean(SMTP_DEBUG) })
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
