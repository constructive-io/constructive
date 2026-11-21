import { requestProtectionLoader } from '@constructive-io/express-context';
import { context, lambda } from 'grafast';
import { makeExtendSchemaPlugin } from 'graphile-utils';
import { createClient } from 'graphql-ws';
import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';
import WebSocket from 'ws';

import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';

jest.setTimeout(60000);

const HOST = 'app.test.constructive.io';
const ACTOR = 'bbbbbbbb-0000-4000-8000-000000000002';
const DATABASE = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const shared = path.join(__dirname, '../../../__fixtures__/seed');
let releasePulse: () => void;
const probe = makeExtendSchemaPlugin({
  typeDefs: 'extend type Subscription { identity: String! pulse: Int! }',
  plans: {
    Subscription: {
      pulse: {
        subscribePlan() {
          return lambda(context(), async function* () {
            yield 0;
            await new Promise<void>((resolve) => { releasePulse = resolve; });
            yield 1;
          });
        },
        plan: ($event) => $event
      },
      identity: {
        subscribePlan() {
          return lambda(context(), async function* (ctx) {
            yield JSON.stringify((ctx as { pgSettings: Record<string, string> }).pgSettings);
          });
        },
        plan: ($event) => $event
      }
    }
  }
});

describe('public tenant WebSocket subscriptions', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let token: string;

  beforeAll(async () => {
    ({ pg, db, server, request, teardown } = await getConnections({
      schemas: ['simple-pets-public', 'simple-pets-pets-public'],
      graphile: { preset: { plugins: [probe] } },
      server: { useRouting: true, api: { isPublic: true, metaSchemas: [
        'catalog_private', 'routing_public', 'apps_public', 'metaschema_public', 'metaschema_modules_public'
      ] } }
    }, [
      seed.pgpm(path.join(shared, '../..')),
      seed.sqlfile([
        path.join(shared, 'app-schemas/simple-pets/schema.sql'),
        path.join(shared, 'scoped/test-data.sql'),
        path.join(__dirname, '../__fixtures__/seed/realtime-module-registrations.sql'),
        path.join(__dirname, '../__fixtures__/seed/websocket.sql')
      ])
    ]));
    const response = await request.post('/graphql').set('Host', HOST).send({
      query: 'mutation($actor: UUID!) { issueSession(input: {actor: $actor}) { result } }',
      variables: { actor: ACTOR }
    });
    expect(response.body.errors).toBeUndefined();
    token = response.body.data.issueSession.result;
    expect(typeof token).toBe('string');
  });
  afterAll(async () => { await teardown?.(); });
  beforeEach(async () => { await pg.beforeEach(); await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); await pg.afterEach(); });

  function socketClient(params?: Record<string, unknown>, headers: Record<string, string> = {}, host = HOST) {
    class Socket extends WebSocket {
      constructor(address: string, protocols: string[]) {
        super(address, protocols, { headers: { Host: host, ...headers } });
      }
    }
    return createClient({
      url: server.graphqlUrl.replace('http:', 'ws:'),
      webSocketImpl: Socket,
      connectionParams: params,
      retryAttempts: 0,
      connectionAckWaitTimeout: 3000
    });
  }

  async function subscribe(params?: Record<string, unknown>, headers: Record<string, string> = {}, query = 'subscription { identity }', host = HOST): Promise<any> {
    const client = socketClient(params, headers, host);
    let unsubscribe = () => {};
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('No WebSocket result')), 5000);
        unsubscribe = client.subscribe({ query }, {
          next: (value) => { clearTimeout(timeout); resolve(value); },
          error: (error) => { clearTimeout(timeout); reject(error); },
          complete: () => { clearTimeout(timeout); }
        });
      });
    } finally {
      unsubscribe();
      await client.dispose();
    }
  }

  it('delivers a real subscription using connectionParams-only authentication and tenant pgSettings', async () => {
    const result = await subscribe({ Authorization: `Bearer ${token}` });
    expect(result.errors).toBeUndefined();
    expect(JSON.parse(result.data.identity)).toMatchObject({
      role: 'authenticated',
      'jwt.claims.user_id': ACTOR,
      'jwt.claims.database_id': DATABASE,
      'jwt.claims.api_id': '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
    });
  });

  it('accepts a bearer header without connection parameters', async () => {
    const result = await subscribe(undefined, { Authorization: `Bearer ${token}` });
    expect(JSON.parse(result.data.identity)['jwt.claims.user_id']).toBe(ACTOR);
  });

  it.each([
    { query: `subscription { identity } #${'é'.repeat(600)}` },
    { query: 'subscription { identity }', variables: { value: 'é'.repeat(600) } }
  ])('refuses oversized subscription payloads in UTF-8 bytes: %#', async (payload) => {
    expect(JSON.stringify(payload).length).toBeLessThan(1024);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeGreaterThan(1024);
    const client = socketClient({ Authorization: `Bearer ${token}` });
    try {
      const result = await new Promise((resolve) => {
        client.subscribe(payload, {
          next: resolve,
          error: resolve,
          complete: () => resolve('unexpected completion')
        });
      });
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ extensions: expect.objectContaining({ code: 'REQUEST_TOO_LARGE' }) })
      ]));
    } finally {
      await client.dispose();
    }
  });

  it('rechecks payload bytes after refreshing protection on an existing socket', async () => {
    const saved = await pg.one('SELECT max_request_bytes FROM routing_public.database_settings WHERE database_id = $1', [DATABASE]);
    const client = socketClient({ Authorization: `Bearer ${token}` });
    const frames: any[] = [];
    const failures: unknown[] = [];
    let first!: () => void;
    let complete!: () => void;
    const started = new Promise<void>(resolve => { first = resolve; });
    const finished = new Promise<void>(resolve => { complete = resolve; });
    let stop = () => {};
    try {
      await pg.query('UPDATE routing_public.database_settings SET max_request_bytes = 8192 WHERE database_id = $1', [DATABASE]);
      await pg.publish();
      requestProtectionLoader.invalidate(DATABASE);
      stop = client.subscribe({ query: 'subscription { pulse }' }, {
        next: value => { frames.push(value); first(); },
        error: error => { failures.push(error); first(); complete(); },
        complete
      });
      await started;
      expect(failures).toEqual([]);
      expect(frames[0].data.pulse).toBe(0);
      await pg.query('UPDATE routing_public.database_settings SET max_request_bytes = 1024 WHERE database_id = $1', [DATABASE]);
      await pg.publish();
      requestProtectionLoader.invalidate(DATABASE);
      const payload = { query: `subscription { identity } #${'a'.repeat(2048)}` };
      const bytes = Buffer.byteLength(JSON.stringify(payload));
      expect(bytes).toBeGreaterThan(1024);
      expect(bytes).toBeLessThan(8192);
      const result = await new Promise(resolve => {
        client.subscribe(payload, { next: resolve, error: resolve, complete: () => resolve('unexpected completion') });
      });
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ extensions: expect.objectContaining({ code: 'REQUEST_TOO_LARGE' }) })
      ]));
      releasePulse();
      await finished;
      expect(failures).toEqual([]);
      expect(frames.flatMap(frame => frame.errors ?? [])).toEqual([]);
      expect(frames.map(frame => frame.data.pulse)).toEqual([0, 1]);
    } finally {
      releasePulse?.();
      stop();
      await client.dispose();
      await pg.query('UPDATE routing_public.database_settings SET max_request_bytes = $1 WHERE database_id = $2', [saved.max_request_bytes, DATABASE]);
      await pg.publish();
      requestProtectionLoader.invalidate(DATABASE);
    }
  });

  it('refuses upgrades before the handshake when open sockets exhaust the shared HTTP budget', async () => {
    const sockets: WebSocket[] = [];
    try {
      for (let i = 0; i < 2; i++) {
        await new Promise<void>((resolve, reject) => {
          const socket = new WebSocket(server.graphqlUrl.replace('http:', 'ws:'), 'graphql-transport-ws', { headers: { Host: HOST } });
          sockets.push(socket);
          socket.once('open', resolve);
          socket.once('error', reject);
        });
      }
      const status = await new Promise<number>((resolve, reject) => {
        const socket = new WebSocket(server.graphqlUrl.replace('http:', 'ws:'), 'graphql-transport-ws', { headers: { Host: HOST } });
        socket.on('error', () => {});
        socket.once('unexpected-response', (_req, response) => {
          response.resume();
          socket.terminate();
          resolve(response.statusCode);
        });
        socket.once('open', () => { socket.close(); reject(new Error('Upgrade bypassed admission')); });
      });
      expect(status).toBe(429);
      const refused = await request.post('/graphql').set('Host', HOST).send({ query: '{ __typename }' });
      expect(refused.status).toBe(429);
      expect(refused.body.errors[0].extensions.code).toBe('CONCURRENCY_LIMIT_REACHED');
    } finally {
      await Promise.all(sockets.map((socket) => new Promise<void>((resolve) => {
        socket.once('close', resolve);
        socket.close();
      })));
    }
    const accepted = await request.post('/graphql').set('Host', HOST).send({ query: '{ __typename }' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.errors).toBeUndefined();
  });

  it('keeps another subscription alive when an operation has malformed GraphQL', async () => {
    const client = socketClient({ Authorization: `Bearer ${token}` });
    const values: number[] = [];
    let first: () => void;
    const started = new Promise<void>((resolve) => { first = resolve; });
    let stop = () => {};
    try {
      const finished = new Promise<void>((resolve, reject) => {
        stop = client.subscribe({ query: 'subscription { pulse }' }, {
          next: (result) => { values.push(result.data.pulse as number); first(); },
          error: reject,
          complete: resolve
        });
      });
      await started;
      const malformed = await new Promise((resolve) => {
        client.subscribe({ query: 'subscription {' }, {
          next: resolve,
          error: resolve,
          complete: () => resolve('unexpected completion')
        });
      });
      expect(malformed).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('Syntax Error') })
      ]));
      releasePulse();
      await finished;
      expect(values).toEqual([0, 1]);
    } finally {
      releasePulse?.();
      stop();
      await client.dispose();
    }
  });

  it.each([undefined, { Authorization: 'Bearer garbage' }])('refuses missing or invalid bearer credentials: %j', async (params) => {
    await expect(subscribe(params)).rejects.toEqual(expect.arrayContaining([
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }) })
    ]));
  });

  it('does not fall back to a valid handshake bearer when connectionParams are invalid', async () => {
    await expect(subscribe({ Authorization: 'Bearer garbage' }, { Authorization: `Bearer ${token}` })).rejects.toEqual(expect.arrayContaining([
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }) })
    ]));
  });

  it('does not use ambient session cookies as WebSocket credentials', async () => {
    await expect(subscribe(undefined, { Cookie: `constructive_session=${token}` })).rejects.toEqual(expect.arrayContaining([
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }) })
    ]));
  });

  it('refuses mutations on the subscription-only transport', async () => {
    await expect(subscribe({ Authorization: `Bearer ${token}` }, {}, 'mutation { issueSession(input: {actor: "' + ACTOR + '"}) { result } }')).rejects.toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'WebSocket transport only accepts subscriptions' })
    ]));
  });

  it('does not route unknown hosts to another tenant', async () => {
    await expect(subscribe({ Authorization: `Bearer ${token}` }, {}, 'subscription { identity }', 'absent.test.constructive.io')).rejects.toMatchObject({ message: expect.stringMatching(/404/) });
  });
});
