import type { NextFunction, Request, Response } from 'express';

import { ActorEntityError, createActorEntityResolver } from '../actor-entity';

const mockQuery = jest.fn();
const mockPgQueryContext = jest.fn();

jest.mock('pg-cache', () => ({
  getPgPool: () => ({ query: mockQuery })
}));
jest.mock('pg-query-context', () => ({
  __esModule: true,
  default: (args: any) => mockPgQueryContext(args)
}));
jest.mock('@pgpmjs/env', () => ({ getNodeEnv: () => 'test' }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createAuthenticateMiddleware } = require('../auth');

describe('createActorEntityResolver', () => {
  it('resolves and caches the entity pair per database + actor', async () => {
    const query = jest.fn().mockResolvedValue({ entity_id: 'owner-1', entity_type: 'app' });
    const resolve = createActorEntityResolver({ query, ttlMs: 1000, now: () => 0 });

    await expect(resolve('db-1', 'actor-1')).resolves.toEqual({ entityId: 'owner-1', entityType: 'app' });
    await expect(resolve('db-1', 'actor-1')).resolves.toEqual({ entityId: 'owner-1', entityType: 'app' });
    expect(query).toHaveBeenCalledTimes(1);

    await resolve('db-2', 'actor-1');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('expires cached entries after the ttl', async () => {
    let clock = 0;
    const query = jest.fn().mockResolvedValue({ entity_id: 'owner-1', entity_type: 'org' });
    const resolve = createActorEntityResolver({ query, ttlMs: 10, now: () => clock });

    await resolve('db-1', 'actor-1');
    clock = 11;
    await resolve('db-1', 'actor-1');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('throws when the actor does not resolve to an entity', async () => {
    const resolve = createActorEntityResolver({ query: jest.fn().mockResolvedValue(undefined) });
    await expect(resolve('db-1', 'ghost')).rejects.toBeInstanceOf(ActorEntityError);
  });
});

describe('authenticate middleware entity attribution', () => {
  const api = {
    dbname: 'tenant_db',
    databaseId: 'db-1',
    rlsModule: {
      authenticate: 'authenticate',
      authenticateStrict: 'authenticate_strict',
      privateSchema: { schemaName: 'app_private' }
    }
  };

  const run = async (authorization?: string) => {
    const middleware = createAuthenticateMiddleware({ pg: {}, server: {} } as any);
    const req = {
      api,
      headers: authorization ? { authorization } : {},
      get: (): string | undefined => undefined,
      clientIp: '127.0.0.1'
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    await middleware(req, res, next);
    return { req, res, next };
  };

  const PROBE = /to_regprocedure\('app_scope\.actor_entity/;
  const withAppScope = (present: boolean, row?: { entity_id: string; entity_type: string }) =>
    mockQuery.mockImplementation(async (sql: string) =>
      PROBE.test(sql) ? { rows: [{ present }] } : { rows: row ? [row] : [] }
    );
  const entityCalls = () => mockQuery.mock.calls.filter(([sql]) => !PROBE.test(sql));

  beforeEach(() => {
    mockQuery.mockReset();
    mockPgQueryContext.mockReset();
  });

  it('stamps the actor entity resolved through app_scope.actor_entity for a user token', async () => {
    mockPgQueryContext.mockResolvedValue({ rowCount: 1, rows: [{ user_id: 'user-1', role: 'authenticated' }] });
    withAppScope(true, { entity_id: 'user-1', entity_type: 'app' });

    const { req, next } = await run('Bearer tok');

    expect(entityCalls()).toEqual([
      [expect.stringContaining('app_scope.actor_entity($1, $2)'), ['db-1', 'user-1']]
    ]);
    expect(req.actorEntity).toEqual({ entityId: 'user-1', entityType: 'app' });
    expect(next).toHaveBeenCalled();
  });

  it("attributes a principal credential to its owner's entity pair", async () => {
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ user_id: 'principal-1', principal_id: 'principal-1', kind: 'principal' }]
    });
    withAppScope(true, { entity_id: 'org-1', entity_type: 'org' });

    const { req } = await run('Bearer tok');

    expect(entityCalls()).toEqual([[expect.any(String), ['db-1', 'principal-1']]]);
    expect(req.actorEntity).toEqual({ entityId: 'org-1', entityType: 'org' });
  });

  it('fails the request instead of continuing entityless when the actor cannot be resolved', async () => {
    mockPgQueryContext.mockResolvedValue({ rowCount: 1, rows: [{ user_id: 'user-1' }] });
    withAppScope(true);

    const { req, res, next } = await run('Bearer tok');

    expect(req.actorEntity).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [expect.objectContaining({ extensions: expect.objectContaining({ code: 'INTERNAL_FAILURE' }) })]
      })
    );
  });

  it('stamps nothing when the tenant database has no app_scope', async () => {
    mockPgQueryContext.mockResolvedValue({ rowCount: 1, rows: [{ user_id: 'user-1' }] });
    withAppScope(false);

    const { req, next } = await run('Bearer tok');

    expect(entityCalls()).toEqual([]);
    expect(req.actorEntity).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('leaves anonymous requests without an actor entity', async () => {
    const { req, next } = await run();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(req.actorEntity).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
