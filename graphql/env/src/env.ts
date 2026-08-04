import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { parseEnvBoolean, parseEnvNumber } from '12factor-env';

/**
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
export const getGraphQLEnvVars = (env: NodeJS.ProcessEnv = process.env): Partial<ConstructiveOptions> => {
  const {
    GRAPHILE_SCHEMA,
    GRAPHILE_INTROSPECTION_MODE,
    GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE,
    GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS,
    GRAPHILE_QUERY_CACHE_MAX_LENGTH,
    GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH,
    GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH,
    GRAPHILE_REALTIME_SCHEMA,
    GRAPHILE_REALTIME_NOTIFICATION_MODE,
    GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS,
    GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS,
    GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS,
    GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION,

    GRAPHQL_ROUTING_CACHE_MAX_ENTRIES,

    FEATURES_SIMPLE_INFLECTION,
    FEATURES_OPPOSITE_BASE_NAMES,
    FEATURES_POSTGIS,

    API_ROUTING_SCHEMA,
    API_IS_PUBLIC,
    API_EXPOSED_SCHEMAS,
    API_META_SCHEMAS,
    API_ALLOW_META_SCHEMA_HEADER,
    API_ANON_ROLE,
    API_ROLE_NAME,

    GRAPHQL_INTERNAL_REQUEST_SECRET,

    GRAPHQL_RUNTIME_PGUSER,
    GRAPHQL_RUNTIME_PGPASSWORD,

    EMBEDDER_PROVIDER,
    EMBEDDER_MODEL,
    EMBEDDER_BASE_URL,
    CHAT_PROVIDER,
    CHAT_MODEL,
    CHAT_BASE_URL,

    SMS_PROVIDER,
    SMS_SENDER_ID,
    SMS_REQUEST_TIMEOUT_MS,
    SEND_SMS_DRY_RUN,
    DEVSMS_BASE_URL
  } = env;

  // Keep this function as a partial env-override parser. SMS runtime defaults
  // belong to the consuming application; injecting them here would incorrectly
  // let an absent env var overwrite pgpm.json or consumer-specific values.
  const smsRequestTimeoutMs = parseEnvNumber(SMS_REQUEST_TIMEOUT_MS);
  const smsDryRun = parseEnvBoolean(SEND_SMS_DRY_RUN);
  const hasSmsEnvOverrides = Boolean(
    SMS_PROVIDER ||
    SMS_SENDER_ID ||
    smsRequestTimeoutMs !== undefined ||
    smsDryRun !== undefined ||
    DEVSMS_BASE_URL
  );

  return {
    ...((GRAPHQL_RUNTIME_PGUSER || GRAPHQL_RUNTIME_PGPASSWORD) && {
      runtimePg: {
        ...(GRAPHQL_RUNTIME_PGUSER && { user: GRAPHQL_RUNTIME_PGUSER }),
        ...(GRAPHQL_RUNTIME_PGPASSWORD && { password: GRAPHQL_RUNTIME_PGPASSWORD })
      }
    }),
    ...(GRAPHQL_ROUTING_CACHE_MAX_ENTRIES && {
      routingCache: {
        maxEntries: parsePositiveSafeInteger(
          GRAPHQL_ROUTING_CACHE_MAX_ENTRIES,
          'GRAPHQL_ROUTING_CACHE_MAX_ENTRIES'
        )
      }
    }),
    graphile: {
      ...(GRAPHILE_INTROSPECTION_MODE && {
        introspectionMode: parseGraphileIntrospectionMode(GRAPHILE_INTROSPECTION_MODE)
      }),
      ...(GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE && {
        introspectionClientReleaseMode: parseGraphileIntrospectionClientReleaseMode(
          GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE
        )
      }),
      ...(GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS && {
        introspectionDependencySchemas: parseSchemaList(
          GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS,
          'GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS'
        )
      }),
      ...((GRAPHILE_QUERY_CACHE_MAX_LENGTH
        || GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH
        || GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH) && {
        grafastCache: {
          ...(GRAPHILE_QUERY_CACHE_MAX_LENGTH && {
            queryCacheMaxLength: parsePositiveSafeInteger(
              GRAPHILE_QUERY_CACHE_MAX_LENGTH,
              'GRAPHILE_QUERY_CACHE_MAX_LENGTH'
            )
          }),
          ...(GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH && {
            operationsCacheMaxLength: parsePositiveSafeInteger(
              GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH,
              'GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH'
            )
          }),
          ...(GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH && {
            operationOperationPlansCacheMaxLength: parsePositiveSafeInteger(
              GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH,
              'GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH'
            )
          })
        }
      }),
      ...(GRAPHILE_REALTIME_SCHEMA && {
        realtimeSchema: parseExactSchemaName(
          GRAPHILE_REALTIME_SCHEMA,
          'GRAPHILE_REALTIME_SCHEMA'
        )
      }),
      ...(GRAPHILE_REALTIME_NOTIFICATION_MODE && {
        realtimeNotificationMode: parseGraphileRealtimeNotificationMode(
          GRAPHILE_REALTIME_NOTIFICATION_MODE
        )
      }),
      ...(GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS && {
        realtimeNotificationRoleRevalidationMs: parsePositiveSafeInteger(
          GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS,
          'GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS'
        )
      }),
      ...(GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS && {
        realtimeCursorPollIntervalMs: parsePositiveSafeInteger(
          GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS,
          'GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS'
        )
      }),
      ...(GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS && {
        realtimeCursorHeartbeatIntervalMs: parsePositiveSafeInteger(
          GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS,
          'GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS'
        )
      }),
      ...(GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION && {
        releaseBuildStateAfterValidation: parseEnvBoolean(
          GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION
        )
      }),
      ...(GRAPHILE_SCHEMA && {
        schema: GRAPHILE_SCHEMA.includes(',')
          ? GRAPHILE_SCHEMA.split(',').map(s => s.trim())
          : GRAPHILE_SCHEMA
      })
    },
    features: {
      ...(FEATURES_SIMPLE_INFLECTION && { simpleInflection: parseEnvBoolean(FEATURES_SIMPLE_INFLECTION) }),
      ...(FEATURES_OPPOSITE_BASE_NAMES && { oppositeBaseNames: parseEnvBoolean(FEATURES_OPPOSITE_BASE_NAMES) }),
      ...(FEATURES_POSTGIS && { postgis: parseEnvBoolean(FEATURES_POSTGIS) })
    },
    api: {
      ...(API_ROUTING_SCHEMA && { routingSchema: API_ROUTING_SCHEMA }),
      ...(API_IS_PUBLIC && { isPublic: parseEnvBoolean(API_IS_PUBLIC) }),
      ...(API_EXPOSED_SCHEMAS && { exposedSchemas: API_EXPOSED_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_META_SCHEMAS && { metaSchemas: API_META_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_ALLOW_META_SCHEMA_HEADER && {
        allowMetaSchemaHeader: parseEnvBoolean(API_ALLOW_META_SCHEMA_HEADER)
      }),
      ...(API_ANON_ROLE && { anonRole: API_ANON_ROLE }),
      ...(API_ROLE_NAME && { roleName: API_ROLE_NAME }),
      ...(GRAPHQL_INTERNAL_REQUEST_SECRET && {
        internalRequestSecret: GRAPHQL_INTERNAL_REQUEST_SECRET
      })
    },
    ...((EMBEDDER_PROVIDER || CHAT_PROVIDER) && {
      llm: {
        ...((EMBEDDER_PROVIDER || EMBEDDER_MODEL || EMBEDDER_BASE_URL) && {
          embedder: {
            ...(EMBEDDER_PROVIDER && { provider: EMBEDDER_PROVIDER }),
            ...(EMBEDDER_MODEL && { model: EMBEDDER_MODEL }),
            ...(EMBEDDER_BASE_URL && { baseUrl: EMBEDDER_BASE_URL })
          }
        }),
        ...((CHAT_PROVIDER || CHAT_MODEL || CHAT_BASE_URL) && {
          chat: {
            ...(CHAT_PROVIDER && { provider: CHAT_PROVIDER }),
            ...(CHAT_MODEL && { model: CHAT_MODEL }),
            ...(CHAT_BASE_URL && { baseUrl: CHAT_BASE_URL })
          }
        })
      }
    }),
    ...(hasSmsEnvOverrides && {
      sms: {
        ...(SMS_PROVIDER && { provider: SMS_PROVIDER }),
        ...(SMS_SENDER_ID && { senderId: SMS_SENDER_ID }),
        ...(smsRequestTimeoutMs !== undefined && {
          requestTimeoutMs: smsRequestTimeoutMs
        }),
        ...(smsDryRun !== undefined && { dryRun: smsDryRun }),
        ...(DEVSMS_BASE_URL && {
          devsms: {
            baseUrl: DEVSMS_BASE_URL
          }
        })
      }
    })
  };
};

const parseGraphileIntrospectionMode = (
  value: string
): 'stock' | 'scoped-required' => {
  if (value === 'stock' || value === 'scoped-required') return value;
  throw new Error(
    `GRAPHILE_INTROSPECTION_MODE must be 'stock' or 'scoped-required'; received '${value}'`
  );
};

const parseGraphileIntrospectionClientReleaseMode = (
  value: string
): 'reuse' | 'destroy' => {
  if (value === 'reuse' || value === 'destroy') return value;
  throw new Error(
    "GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE must be 'reuse' or 'destroy'; "
    + `received '${value}'`
  );
};

const parseGraphileRealtimeNotificationMode = (
  value: string
): 'dedicated' | 'shared-exact' => {
  if (value === 'dedicated' || value === 'shared-exact') return value;
  throw new Error(
    "GRAPHILE_REALTIME_NOTIFICATION_MODE must be 'dedicated' or 'shared-exact'; "
    + `received '${value}'`
  );
};

const parseSchemaList = (value: string, variable: string): string[] => {
  const schemas = value.split(',').map((schema) => schema.trim());
  if (schemas.some((schema) => schema.length === 0)) {
    throw new Error(`${variable} must be a comma-separated list of non-empty schema names`);
  }
  return [...new Set(schemas)];
};

const parseExactSchemaName = (value: string, variable: string): string => {
  const schema = value.trim();
  if (schema.length === 0) {
    throw new Error(`${variable} must be one non-empty exact schema name`);
  }
  return schema;
};

const parsePositiveSafeInteger = (value: string, variable: string): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${variable} must be a positive safe integer; received '${value}'`);
  }
  return parsed;
};
