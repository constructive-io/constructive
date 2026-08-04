import type {
  ConstructiveOptions,
  GraphileRealtimeNotificationMode,
  NotificationPgResolverInput
} from '@constructive-io/graphql-types';
import type { PgNotificationListenerConfig } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

export const GRAPHILE_REALTIME_NOTIFICATION_CONFIG_ERROR_CODE =
  'GRAPHILE_REALTIME_NOTIFICATION_CONFIG_INVALID';

export class GraphileRealtimeNotificationConfigError extends Error {
  readonly code = GRAPHILE_REALTIME_NOTIFICATION_CONFIG_ERROR_CODE;

  constructor(message: string) {
    super(message);
    this.name = 'GraphileRealtimeNotificationConfigError';
  }
}

export const resolveRealtimeNotificationMode = (
  options: ConstructiveOptions
): GraphileRealtimeNotificationMode => {
  const mode = options.graphile?.realtimeNotificationMode ?? 'dedicated';
  if (mode !== 'dedicated' && mode !== 'shared-exact') {
    throw new GraphileRealtimeNotificationConfigError(
      'graphile.realtimeNotificationMode must be dedicated or shared-exact'
    );
  }
  return mode;
};

export const resolveRealtimeNotificationRoleRevalidationMs = (
  options: ConstructiveOptions
): number => {
  const value = options.graphile?.realtimeNotificationRoleRevalidationMs ?? 60_000;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new GraphileRealtimeNotificationConfigError(
      'graphile.realtimeNotificationRoleRevalidationMs must be a positive safe integer'
    );
  }
  return value;
};

const positiveInterval = (value: number, setting: string): number => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new GraphileRealtimeNotificationConfigError(
      `${setting} must be a positive safe integer`
    );
  }
  return value;
};

export const resolveRealtimeCursorIntervals = (
  options: ConstructiveOptions
): { pollIntervalMs: number; heartbeatIntervalMs: number } => ({
  pollIntervalMs: positiveInterval(
    options.graphile?.realtimeCursorPollIntervalMs ?? 5_000,
    'graphile.realtimeCursorPollIntervalMs'
  ),
  heartbeatIntervalMs: positiveInterval(
    options.graphile?.realtimeCursorHeartbeatIntervalMs ?? 30_000,
    'graphile.realtimeCursorHeartbeatIntervalMs'
  )
});

/**
 * Resolve one dedicated listener login without inheriting control-plane or
 * runtime credentials. Network/TLS defaults may be shared, but user, password,
 * and physical database must be explicit in every resolver result.
 */
export const resolveRealtimeNotificationPgConfig = async (
  options: ConstructiveOptions,
  input: NotificationPgResolverInput
): Promise<PgNotificationListenerConfig> => {
  const resolver = options.notificationPgResolver;
  if (typeof resolver !== 'function') {
    throw new GraphileRealtimeNotificationConfigError(
      'shared-exact realtime requires notificationPgResolver'
    );
  }

  let resolved: Awaited<ReturnType<typeof resolver>>;
  try {
    resolved = await resolver(Object.freeze({
      databaseId: input.databaseId,
      databaseName: input.databaseName,
      apiId: input.apiId,
      schemas: Object.freeze([...input.schemas])
    }));
  } catch {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver failed for the requested physical database'
    );
  }
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver must return a PostgreSQL configuration object'
    );
  }
  if (Object.prototype.hasOwnProperty.call(resolved, 'connectionString')) {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver must not return a connectionString; use explicit fields'
    );
  }
  if (typeof resolved.user !== 'string' || resolved.user.trim().length === 0) {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver must return an explicit user'
    );
  }
  if (typeof resolved.password !== 'string' || resolved.password.length === 0) {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver must return an explicit password'
    );
  }
  if (resolved.database !== input.databaseName) {
    throw new GraphileRealtimeNotificationConfigError(
      'notificationPgResolver database does not match the routed physical database'
    );
  }

  const networkDefaults = {
    ...(options.pg?.host === undefined ? {} : { host: options.pg.host }),
    ...(options.pg?.port === undefined ? {} : { port: options.pg.port }),
    ...(options.pg?.ssl === undefined ? {} : { ssl: options.pg.ssl })
  };
  const normalized = getPgEnvOptions({
    ...networkDefaults,
    ...resolved
  });
  if (
    normalized.user !== resolved.user
    || normalized.password !== resolved.password
    || normalized.database !== input.databaseName
  ) {
    throw new GraphileRealtimeNotificationConfigError(
      'notification PostgreSQL identity changed during normalization'
    );
  }
  return {
    ...normalized,
    ...(resolved.pool ? { pool: { ...resolved.pool } } : {})
  };
};
