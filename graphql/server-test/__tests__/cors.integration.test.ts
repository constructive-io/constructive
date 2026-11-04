import { createDefaultRegistry } from '@constructive-io/express-context';
import { Server } from '@constructive-io/graphql-server';
import { graphileCache } from 'graphile-cache';
import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const HOST = 'a.cors.example';
const ORIGIN = 'https://a.client.example';
const OTHER_ORIGIN = 'https://b.client.example';
const SESSION = 'constructive_session=cors-test-session';
const MUTATION = { query: 'mutation { touch(input: {}) { result } }' };

// Exercise the production Server composition, including real API resolution,
// metadata loaders, authentication, CSRF and GraphQL. Only the database reader
// contracts are supplied by the local SQL fixture; no middleware is mocked.
describe.each(['', 'https://fallback.example', '*'])('server CORS (fallback %j)', (fallback) => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let request: supertest.Agent;
  let teardown: (() => Promise<void>) | undefined;
  const previousOrigin = process.env.SERVER_ORIGIN;
  const registry = createDefaultRegistry();

  beforeAll(async () => {
    process.env.SERVER_ORIGIN = fallback;
    ({ pg, db, request, teardown } = await getConnections({
      schemas: ['cors_test'],
      server: { useRouting: true, api: { isPublic: true, metaSchemas: ['routing_public'] } }
    }, [seed.sqlfile([path.join(__dirname, '../__fixtures__/seed/cors/schema.sql')])]));
  });

  afterAll(async () => {
    await teardown?.();
    if (previousOrigin === undefined) delete process.env.SERVER_ORIGIN;
    else process.env.SERVER_ORIGIN = previousOrigin;
    registry.invalidate();
  });

  beforeEach(async () => {
    await Server.closeCaches();
    registry.invalidate();
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
    await Server.closeCaches();
    registry.invalidate();
  });

  const counts = async () => (await pg.one<{ auth: string; graphql: string }>(`
    SELECT (SELECT last_value FROM cors_test.auth_calls) AS auth,
           (SELECT last_value FROM cors_test.graphql_calls) AS graphql
  `));

  const preflight = (origin?: string, host = HOST, url = '/graphql') => {
    const req = request.options(url).set('Host', host)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization,x-csrf-token');
    return origin === undefined ? req : req.set('Origin', origin);
  };

  const expectNoCors = (res: supertest.Response) => {
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(res.headers['access-control-allow-methods']).toBeUndefined();
    expect(res.headers['access-control-allow-headers']).toBeUndefined();
  };

  it('resolves scoped metadata before preflight and reflects the allowed origin', async () => {
    const before = await counts();
    const builds = graphileCache.size;
    // Even a credential-bearing OPTIONS must not invoke authentication.
    const res = await preflight(ORIGIN).set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(200);
    expect(res.text).toBe('');
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toBe('content-type,authorization,x-csrf-token');
    expect(res.headers.vary).toContain('Origin');
    expect(res.headers.vary).toContain('Access-Control-Request-Headers');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await counts()).toEqual(before);
    expect(graphileCache.size).toBe(builds);
  });

  it.each([undefined, 'null', 'not-an-origin', 'https://attacker.example'])('ends OPTIONS for origin %j without auth or GraphQL', async (origin) => {
    const before = await counts();
    const builds = graphileCache.size;
    const res = await preflight(origin).set('Cookie', SESSION);
    expect(res.status).toBe(200);
    expect(res.text).toBe('');
    if (fallback === '*') {
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    } else {
      expectNoCors(res);
    }
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await counts()).toEqual(before);
    expect(graphileCache.size).toBe(builds);
  });

  it('keeps API origin lists separate across warm requests', async () => {
    const a = await preflight(ORIGIN);
    const b = await preflight(OTHER_ORIGIN, 'b.cors.example');
    const denied = await preflight(ORIGIN, 'b.cors.example');
    expect(a.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(b.headers['access-control-allow-origin']).toBe(OTHER_ORIGIN);
    expect(denied.status).toBe(200);
    if (fallback === '*') expect(denied.headers['access-control-allow-origin']).toBe(ORIGIN);
    else expectNoCors(denied);
  });

  it.each(['/graphql', '/fn/example', '/v1/threads'])('ends preflight before downstream middleware on %s', async (url) => {
    const before = await counts();
    const res = await preflight(OTHER_ORIGIN, HOST, url).set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(200);
    expect(res.text).toBe('');
    expect(await counts()).toEqual(before);
  });

  it.each([['unknown.cors.example', 404], ['broken.cors.example', 500]] as const)(
    'fails closed for %s even with a matching fallback', async (host, status) => {
      const before = await counts();
      const origin = fallback && fallback !== '*' ? fallback : ORIGIN;
      const res = await preflight(origin, host);
      expect(res.status).toBe(status);
      expectNoCors(res);
      const actual = await request.post('/graphql').set('Host', host).set('Origin', origin).send(MUTATION);
      expect(actual.status).toBe(status);
      expectNoCors(actual);
      expect(await counts()).toEqual(before);
    }
  );

  it('preserves localhost and explicit fallback behavior when the API has no origins', async () => {
    const local = await preflight('http://localhost:3000', 'empty.cors.example');
    expect(local.status).toBe(200);
    expect(local.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const origin = 'https://fallback.example';
    const res = await preflight(origin, 'empty.cors.example');
    expect(res.status).toBe(200);
    if (fallback) expect(res.headers['access-control-allow-origin']).toBe(origin);
    else expectNoCors(res);
  });

  it('returns scoped CORS headers on an actual authentication refusal', async () => {
    const before = await counts();
    const res = await request.post('/graphql').set('Host', HOST).set('Origin', ORIGIN)
      .set('Authorization', 'Bearer invalid').send(MUTATION);
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect((await counts()).graphql).toBe(before.graphql);
  });

  it.each([ORIGIN, OTHER_ORIGIN])('still enforces CSRF for an actual cookie request from %s', async (origin) => {
    const before = await counts();
    const res = await request.post('/graphql').set('Host', HOST).set('Origin', origin)
      .set('Cookie', SESSION).send(MUTATION);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    expect((await counts()).graphql).toBe(before.graphql);
  });

  it.each(['bearer', 'cookie', 'anonymous'])('executes actual %s requests under the existing auth/CSRF rules', async (mode) => {
    const before = await counts();
    const req = request.post('/graphql').set('Host', HOST).set('Origin', ORIGIN);
    if (mode === 'bearer') req.set('Authorization', 'Bearer cors-test-session');
    if (mode === 'cookie') {
      const token = 'a'.repeat(64);
      req.set('Cookie', `${SESSION}; csrf_token=${token}`).set('X-CSRF-Token', token);
    }
    const res = await req.send(MUTATION);
    expect(res.body).toMatchObject({ data: { touch: { result: expect.any(String) } } });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.touch.result).toBe(mode === 'anonymous' ? 'anonymous' : 'authenticated');
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(Number((await counts()).graphql)).toBe(Number(before.graphql) + 1);
  });

  it('allows authenticated non-browser requests without an Origin', async () => {
    const res = await request.post('/graphql').set('Host', HOST)
      .set('Authorization', 'Bearer cors-test-session').send(MUTATION);
    expect(res.body).toMatchObject({ data: { touch: { result: 'authenticated' } } });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.touch.result).toBe('authenticated');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
