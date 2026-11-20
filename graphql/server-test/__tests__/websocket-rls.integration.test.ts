import { randomUUID } from 'crypto';
import { graphileCache } from 'graphile-cache';
import { createClient, type Client } from 'graphql-ws';
import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';
import WebSocket from 'ws';

import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';

jest.setTimeout(60000);

const HOST = 'app.test.constructive.io';
const ALICE = 'bbbbbbbb-0000-4000-8000-000000000002';
const BOB = 'bbbbbbbb-0000-4000-8000-000000000003';
const shared = path.join(__dirname, '../../../__fixtures__/seed');
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const document = `subscription($ids: [UUID!]) {
  onRlsNoteChanged(ids: $ids) { event rowId overflow rlsNote { id title } }
}`;

interface Stream { client: Client; frames: any[]; errors: unknown[]; stop: () => void }

describe('RLS-gated public tenant WebSocket events', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let alice: string;
  let bob: string;
  let streams: Stream[] = [];

  async function http(token: string | undefined, query: string, variables = {}) {
    const req = request.post('/graphql').set('Host', HOST);
    if (token) req.set('Authorization', `Bearer ${token}`);
    const response = await req.send({ query, variables });
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    return response.body.data;
  }

  async function write(id: string, operation: string, shared?: boolean) {
    const result = await http(alice, `mutation($id: UUID!, $op: String!, $shared: Boolean) {
      writeRlsNote(input: {noteId: $id, operation: $op, shared: $shared}) { result }
    }`, { id, op: operation, shared });
    expect(result.writeRlsNote.result).toBe(id);
  }

  async function visible(token: string, id: string, expected: boolean) {
    expect((await http(token, 'query($id: UUID!) { rlsNoteVisible(noteId: $id) }', { id })).rlsNoteVisible).toBe(expected);
  }

  function open(token: string, ids?: string[], query = document, client?: Client) {
    class Socket extends WebSocket {
      constructor(address: string, protocols: string[]) { super(address, protocols, { headers: { Host: HOST } }); }
    }
    const stream: Stream = {
      client: client ?? createClient({
        url: server.graphqlUrl.replace('http:', 'ws:'), webSocketImpl: Socket,
        connectionParams: { Authorization: `Bearer ${token}` }, retryAttempts: 0
      }), frames: [], errors: [], stop: () => {}
    };
    stream.stop = stream.client.subscribe({ query, variables: { ids } }, {
      next: value => stream.frames.push(value), error: error => stream.errors.push(error), complete: () => {}
    });
    streams.push(stream);
    return stream;
  }

  async function delivered(stream: Stream, id: string, event: string) {
    for (let i = 0; i < 100; i++) {
      expect(stream.errors).toEqual([]);
      expect(stream.frames.flatMap(frame => frame.errors ?? [])).toEqual([]);
      if (payloads(stream).some(payload => payload.rowId === id && payload.event === event)) return;
      await pause(20);
    }
    throw new Error(`Missing ${event} for ${id}: ${JSON.stringify(stream.frames)}`);
  }

  function payloads(stream: Stream): any[] {
    return stream.frames.flatMap(frame => Object.values(frame.data ?? {}).filter(value => value && typeof value === 'object'));
  }

  async function ready(...watchers: Stream[]) {
    const id = randomUUID();
    await write(id, 'INSERT', true);
    for (let i = 0; i < 50; i++) {
      await write(id, 'UPDATE');
      await pause(30);
      if (watchers.every(stream => payloads(stream).some(payload => payload.rowId === id))) break;
    }
    for (const stream of watchers) await delivered(stream, id, 'UPDATE');
    await pause(100);
    for (const stream of streams) stream.frames.length = 0;
  }

  async function silent(stream: Stream) {
    await pause(300);
    expect(stream.errors).toEqual([]);
    expect(stream.frames).toEqual([]);
  }

  beforeAll(async () => {
    ({ pg, db, server, request, teardown } = await getConnections({
      schemas: ['simple-pets-public', 'simple-pets-pets-public'],
      server: { useRouting: true, api: { isPublic: true, metaSchemas: [
        'catalog_private', 'routing_public', 'apps_public', 'metaschema_public', 'metaschema_modules_public'
      ] } }
    }, [seed.pgpm(path.join(shared, '../..')), seed.sqlfile([
      path.join(shared, 'app-schemas/simple-pets/schema.sql'), path.join(shared, 'scoped/test-data.sql'),
      path.join(__dirname, '../__fixtures__/seed/websocket.sql'),
      path.join(__dirname, '../__fixtures__/seed/websocket-rls.sql')
    ])]));
    alice = (await http(undefined, `mutation { issueSession(input: {actor: "${ALICE}"}) { result } }`)).issueSession.result;
    bob = (await http(undefined, `mutation { issueSession(input: {actor: "${BOB}"}) { result } }`)).issueSession.result;
    expect(alice).not.toBe(bob);
  });
  beforeEach(async () => { await pg.beforeEach(); await db.beforeEach(); });
  afterEach(async () => {
    for (const stream of streams) stream.stop();
    await Promise.all([...new Set(streams.map(stream => stream.client))].map(client => client.dispose()));
    streams = [];
    await db.afterEach(); await pg.afterEach();
  });
  afterAll(async () => {
    // PgServices own their shared LISTEN sessions independently of PostGraphile.
    const services = new Set([...graphileCache.values()].flatMap(
      (entry): readonly { release?: () => void | Promise<void> }[] => entry.pgl.getResolvedPreset().pgServices ?? []
    ));
    for (const service of services) await service.release?.();
    await teardown?.();
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'])('suppresses every frame for a private %s, not just the row object', async operation => {
    const a = open(alice);
    const b = open(bob);
    await ready(a, b);
    const id = randomUUID();
    await write(id, 'INSERT');
    await delivered(a, id, 'INSERT');
    await visible(alice, id, true);
    await visible(bob, id, false);
    if (operation !== 'INSERT') {
      await pause(100);
      a.frames.length = b.frames.length = 0;
      await write(id, operation);
      await delivered(a, id, operation);
    }
    await silent(b);
  });

  it('does not turn an exact-ID metadata-only subscription into an oracle', async () => {
    const id = randomUUID();
    await write(id, 'INSERT');
    const filtered = open(bob, [id], 'subscription($ids: [UUID!]) { secret: onRlsNoteChanged(ids: $ids) { event rowId } }');
    const canary = open(bob, undefined, document, filtered.client);
    const a = open(alice);
    await ready(a, canary);
    await visible(bob, id, false);
    await write(id, 'UPDATE');
    await delivered(a, id, 'UPDATE');
    await silent(filtered);
  });

  it('forgets visibility when an UPDATE moves the row out of scope, including later DELETE', async () => {
    const a = open(alice);
    const b = open(bob);
    await ready(a, b);
    const id = randomUUID();
    await write(id, 'INSERT', true);
    await delivered(a, id, 'INSERT'); await delivered(b, id, 'INSERT');
    await visible(bob, id, true);
    a.frames.length = b.frames.length = 0;
    await write(id, 'UPDATE', false);
    await delivered(a, id, 'UPDATE');
    await visible(bob, id, false);
    await write(id, 'DELETE');
    await delivered(a, id, 'DELETE');
    await silent(b);
  });

  it('keeps DELETE visibility history per subscription, even for the same authenticated user', async () => {
    const original = open(alice);
    await ready(original);
    const id = randomUUID();
    await write(id, 'INSERT');
    await delivered(original, id, 'INSERT');
    const fresh = open(alice);
    await ready(original, fresh);
    await visible(alice, id, true);
    await write(id, 'DELETE');
    await delivered(original, id, 'DELETE');
    await silent(fresh);
  });

  it('does not disclose unscoped INVALIDATE notifications', async () => {
    const a = open(alice);
    const b = open(bob);
    await ready(a, b);
    await http(alice, 'mutation { rlsOverflow(input: {}) { result } }');
    await silent(b);
  });

  it('authorizes metadata-only selections, including an aliased subscription field', async () => {
    const owner = open(alice);
    const observer = open(bob, undefined, 'subscription { change: onRlsNoteChanged { event rowId } }');
    await ready(owner, observer);
    const id = randomUUID();
    await write(id, 'INSERT');
    await delivered(owner, id, 'INSERT');
    await silent(observer);
  });

  it.each(['rlsNote { id }', '__typename'])('suppresses hidden frames when selecting only %s', async selection => {
    const owner = open(alice);
    const observer = open(bob, undefined, `subscription { onRlsNoteChanged { ${selection} } }`);
    await ready(owner);
    const canary = randomUUID();
    await write(canary, 'INSERT', true);
    for (let i = 0; i < 50 && observer.frames.length === 0; i++) {
      await write(canary, 'UPDATE');
      await pause(30);
    }
    expect(observer.errors).toEqual([]);
    expect(observer.frames.flatMap(frame => frame.errors ?? [])).toEqual([]);
    expect(observer.frames.length).toBeGreaterThan(0);
    await pause(100);
    owner.frames.length = observer.frames.length = 0;
    const id = randomUUID();
    await write(id, 'INSERT');
    await delivered(owner, id, 'INSERT');
    await silent(observer);
  });
});
