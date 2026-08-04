import { EventEmitter } from 'node:events';

import type {
  ConstructiveOptions,
  RuntimePgResolverInput
} from '@constructive-io/graphql-types';
import type { NextFunction, Request, Response } from 'express';

import {
  createRuntimePgResolutionStore,
  resolveRuntimePgConfig
} from '../runtime-pg-config';
import { InvalidRuntimePgConfigurationError } from '../runtime-pg-requirements';

const route: RuntimePgResolverInput = {
  databaseId: 'database-a',
  databaseName: 'tenant_a',
  apiId: 'api-a',
  schemas: ['tenant_a_public', 'tenant_a_auth'],
  roles: ['tenant_a_anonymous', 'tenant_a_authenticated']
};

const resolverOptions = (
  resolver: ConstructiveOptions['runtimePgResolver']
): ConstructiveOptions => ({
  pg: {
    host: 'db.internal',
    port: 6432,
    database: 'control',
    user: 'control_owner',
    password: 'control-secret',
    ssl: true
  },
  graphile: { introspectionMode: 'scoped-required' },
  runtimePgResolver: resolver
});

describe('exact runtime PostgreSQL resolution', () => {
  it('resolves one frozen credential-free route and normalizes an opaque pool identity', async () => {
    const resolver = jest.fn((_input: Readonly<RuntimePgResolverInput>) => ({
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret',
      pool: { max: 2, maxUses: 1 }
    }));

    const resolution = await resolveRuntimePgConfig(
      resolverOptions(resolver),
      route,
      'production'
    );

    expect(resolution.pgConfig).toEqual({
      host: 'db.internal',
      port: 6432,
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret',
      ssl: true,
      pool: { max: 2, maxUses: 1 }
    });
    expect(resolution.poolIdentity).toMatch(/^pg:v1:/);
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(Object.isFrozen(resolution.pgConfig)).toBe(true);
    expect(resolver).toHaveBeenCalledTimes(1);
    const input = resolver.mock.calls[0][0];
    expect(input).toEqual(route);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.schemas)).toBe(true);
    expect(Object.isFrozen(input.roles)).toBe(true);
  });

  it('rejects ambiguous connection strings and physical database mismatches', async () => {
    await expect(resolveRuntimePgConfig(resolverOptions(() => ({
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret',
      connectionString: 'postgres://other:secret@foreign/tenant_b'
    } as never)), route, 'production')).rejects.toThrow(
      'must not return a connectionString'
    );

    await expect(resolveRuntimePgConfig(resolverOptions(() => ({
      database: 'tenant_b',
      user: 'tenant_b_runtime',
      password: 'runtime-secret'
    })), route, 'production')).rejects.toThrow(
      'does not match the routed physical database'
    );
  });

  it('binds login and pool policy into the opaque identity on one attested target', async () => {
    const base = await resolveRuntimePgConfig(resolverOptions(() => ({
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret',
      pool: { max: 2 }
    })), route, 'production');
    const otherTarget = await resolveRuntimePgConfig(resolverOptions(() => ({
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'rotated-runtime-secret',
      pool: { max: 3 }
    })), route, 'production');

    expect(otherTarget.poolIdentity).not.toBe(base.poolIdentity);
  });

  it.each([
    { host: 'other.internal' },
    { port: 5433 },
    { ssl: false }
  ])('rejects runtime/control endpoint divergence: %p', async (networkOverride) => {
    await expect(resolveRuntimePgConfig(resolverOptions(() => ({
      ...networkOverride,
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret'
    })), route, 'production')).rejects.toThrow(
      'network/TLS endpoint does not match the routed control-plane database'
    );
  });

  it('authorizes static credentials for one exact ordered route only', async () => {
    const options: ConstructiveOptions = {
      pg: { host: 'db.internal', port: 5432, ssl: true },
      graphile: { introspectionMode: 'scoped-required' },
      runtimePg: {
        database: 'tenant_a',
        user: 'tenant_a_runtime',
        password: 'runtime-secret'
      },
      runtimePgStaticIdentity: route
    };

    await expect(resolveRuntimePgConfig(options, route, 'production'))
      .resolves.toMatchObject({
        pgConfig: {
          database: 'tenant_a',
          user: 'tenant_a_runtime'
        }
      });
    await expect(resolveRuntimePgConfig(options, {
      ...route,
      schemas: [...route.schemas].reverse()
    }, 'production')).rejects.toThrow(
      'not authorized for the requested exact route'
    );
    await expect(resolveRuntimePgConfig(options, {
      ...route,
      roles: [route.roles[1], route.roles[0]]
    }, 'production')).rejects.toThrow(
      'not authorized for the requested exact route'
    );
  });

  it('keeps the secret-bearing resolution outside req and resolves only once', async () => {
    const resolver = jest.fn(() => ({
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret'
    }));
    const store = createRuntimePgResolutionStore(resolverOptions(resolver));
    const req = Object.assign(new EventEmitter(), {
      api: {
        apiId: route.apiId,
        databaseId: route.databaseId,
        dbname: route.databaseName,
        schema: [...route.schemas],
        anonRole: route.roles[0],
        roleName: route.roles[1]
      }
    }) as unknown as Request;
    const res = new EventEmitter() as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    await store.middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(resolver).toHaveBeenCalledTimes(1);
    const first = store.getRuntimePgResolution(req);
    const second = store.getRuntimePgResolution(req);
    expect(second).toBe(first);
    expect(Reflect.ownKeys(req)).not.toContain('runtimePg');
    expect(JSON.stringify(req)).not.toContain('runtime-secret');

    req.api = {
      ...req.api!,
      databaseId: 'database-b'
    };
    expect(() => store.getRuntimePgResolution(req)).toThrow(
      'Authoritative API route changed after runtime PostgreSQL resolution'
    );
    req.api = {
      ...req.api,
      databaseId: route.databaseId
    };

    (res as unknown as EventEmitter).emit('finish');
    expect(() => store.getRuntimePgResolution(req))
      .toThrow(InvalidRuntimePgConfigurationError);
  });
});
