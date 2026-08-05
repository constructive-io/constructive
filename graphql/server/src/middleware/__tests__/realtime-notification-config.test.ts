import type {
  ConstructiveOptions,
  NotificationPgResolverInput
} from '@constructive-io/graphql-types';

import {
  GraphileRealtimeNotificationConfigError,
  resolveRealtimeCursorIntervals,
  resolveRealtimeNotificationMode,
  resolveRealtimeNotificationPgConfig,
  resolveRealtimeNotificationRoleRevalidationMs
} from '../realtime-notification-config';

const route = {
  databaseId: 'database-a',
  databaseName: 'tenant_a',
  apiId: 'api-a',
  schemas: ['tenant_a_public']
};

describe('shared realtime notification configuration', () => {
  it('defaults to the current dedicated subscriber and current cursor timings', () => {
    const options = {} as ConstructiveOptions;
    expect(resolveRealtimeNotificationMode(options)).toBe('dedicated');
    expect(resolveRealtimeNotificationRoleRevalidationMs(options)).toBe(60_000);
    expect(resolveRealtimeCursorIntervals(options)).toEqual({
      pollIntervalMs: 5_000,
      heartbeatIntervalMs: 30_000
    });
  });

  it('accepts explicit shared mode and cursor timing contracts', () => {
    const options = {
      graphile: {
        realtimeNotificationMode: 'shared-exact',
        realtimeNotificationRoleRevalidationMs: 30_000,
        realtimeCursorPollIntervalMs: 30_000,
        realtimeCursorHeartbeatIntervalMs: 90_000
      }
    } as ConstructiveOptions;

    expect(resolveRealtimeNotificationMode(options)).toBe('shared-exact');
    expect(resolveRealtimeNotificationRoleRevalidationMs(options)).toBe(30_000);
    expect(resolveRealtimeCursorIntervals(options)).toEqual({
      pollIntervalMs: 30_000,
      heartbeatIntervalMs: 90_000
    });
  });

  it('requires explicit listener credentials and never falls back to control credentials', async () => {
    const options = {
      pg: {
        host: 'db.internal',
        port: 5432,
        database: 'control',
        user: 'control_owner',
        password: 'control-secret'
      },
      notificationPgResolver: () => ({
        database: 'tenant_a',
        user: 'tenant_a_notify'
      })
    } as ConstructiveOptions;

    await expect(resolveRealtimeNotificationPgConfig(options, route))
      .rejects.toThrow('must return an explicit password');
  });

  it('combines network defaults with one exact per-database listener identity', async () => {
    const resolver = jest.fn((_input: Readonly<NotificationPgResolverInput>) => ({
      database: 'tenant_a',
      user: 'tenant_a_notify',
      password: 'notification-secret',
      pool: { max: 2 }
    }));
    const options = {
      pg: {
        host: 'db.internal',
        port: 6432,
        database: 'control',
        user: 'control_owner',
        password: 'control-secret',
        ssl: true
      },
      notificationPgResolver: resolver
    } as ConstructiveOptions;

    await expect(resolveRealtimeNotificationPgConfig(options, route)).resolves.toEqual({
      host: 'db.internal',
      port: 6432,
      database: 'tenant_a',
      user: 'tenant_a_notify',
      password: 'notification-secret',
      ssl: true,
      pool: { max: 2 }
    });
    const input = resolver.mock.calls[0][0];
    expect(input).toEqual(route);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.schemas)).toBe(true);
  });

  it('rejects a resolver that routes to a different physical database', async () => {
    const options = {
      notificationPgResolver: () => ({
        database: 'tenant_b',
        user: 'tenant_b_notify',
        password: 'notification-secret'
      })
    } as ConstructiveOptions;

    await expect(resolveRealtimeNotificationPgConfig(options, route)).rejects
      .toBeInstanceOf(GraphileRealtimeNotificationConfigError);
  });

  it('rejects an ambiguous connection string even when explicit fields are present', async () => {
    const options = {
      notificationPgResolver: () => ({
        database: 'tenant_a',
        user: 'tenant_a_notify',
        password: 'explicit-secret',
        connectionString: 'postgres://other:override@foreign/tenant_b'
      })
    } as ConstructiveOptions;

    await expect(resolveRealtimeNotificationPgConfig(options, route)).rejects
      .toThrow('must not return a connectionString');
  });
});
