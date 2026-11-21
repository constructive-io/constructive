import { randomUUID } from 'crypto';
import { graphileCache } from 'graphile-cache';
import { type Client,createClient } from 'graphql-ws';
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
const CHARLIE = 'bbbbbbbb-0000-4000-8000-000000000004';
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
  let charlie: string;
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

  async function bulkCreate(token: string, ids: string[], sharedIds: string[] = []) {
    const result = await http(token, `mutation($ids: [UUID]!, $shared: [UUID]!) {
      bulkCreateRlsNotes(input: {noteIds: $ids, sharedIds: $shared}) { result }
    }`, { ids, shared: sharedIds });
    expect(result.bulkCreateRlsNotes.result).toEqual([...ids].sort());
  }

  async function overflow(stream: Stream) {
    for (let i = 0; i < 100 && !payloads(stream).some(payload => payload.overflow); i++) await pause(20);
    expect(stream.errors).toEqual([]);
    expect(stream.frames.flatMap(frame => frame.errors ?? [])).toEqual([]);
    expect(payloads(stream).filter(payload => payload.overflow)).toEqual([
      { event: 'INSERT', rowId: null, overflow: true, rlsNote: null }
    ]);
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
    charlie = (await http(undefined, `mutation { issueSession(input: {actor: "${CHARLIE}"}) { result } }`)).issueSession.result;
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

  it('delivers long realtime channel INSERT, UPDATE and DELETE over the authenticated tenant socket', async () => {
    const longWrite = async (id: string, operation: string) => {
      const result = await http(alice, `mutation($id: UUID!, $op: String!) {
        writeLongRealtimeNote(input: {noteId: $id, operation: $op}) { result }
      }`, { id, op: operation });
      expect(result.writeLongRealtimeNote.result).toBe(id);
    };
    const probe = randomUUID();
    await longWrite(probe, 'INSERT');
    const stream = open(alice, undefined, `subscription {
      onLongRealtimeNotificationLifecycleNoteChanged {
        event rowId longRealtimeNotificationLifecycleNote { id title }
      }
    }`);
    for (let i = 0; i < 50 && payloads(stream).length === 0; i++) {
      await longWrite(probe, 'UPDATE');
      await pause(30);
    }
    await delivered(stream, probe, 'UPDATE');
    const id = randomUUID();
    for (const operation of ['INSERT', 'UPDATE', 'DELETE']) {
      await longWrite(id, operation);
      await delivered(stream, id, operation);
    }
    const events = payloads(stream).filter(payload => payload.rowId === id);
    expect(events.map(payload => payload.event)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    expect(events[0].longRealtimeNotificationLifecycleNote).toMatchObject({ id, title: 'long channel contents' });
    expect(events[2].longRealtimeNotificationLifecycleNote).toBeNull();
  });

  it.each(['@skip(if: true)', '@include(if: false)'])('does not disclose a private change alongside an excluded alias: %s', async directive => {
    const a = open(alice);
    const b = open(bob, undefined, `subscription {
      active: onRlsNoteChanged { event rowId overflow rlsNote { id title } }
      excluded: onRlsNoteChanged ${directive} { event rowId }
    }`);
    await ready(a, b);
    const id = randomUUID();
    await write(id, 'INSERT');
    await delivered(a, id, 'INSERT');
    await visible(alice, id, true);
    await visible(bob, id, false);
    await silent(b);
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

  it.each(['UPDATE', 'DELETE'])('authorizes each row of a mixed-visibility bulk %s with an invisible ID first', async operation => {
    const [privateId, ...sharedIds] = [randomUUID(), randomUUID(), randomUUID()].sort();
    const owner = open(alice);
    const observer = open(bob);
    const filtered = open(bob, [privateId, sharedIds[1]],
      'subscription($ids: [UUID!]) { change: onRlsNoteChanged(ids: $ids) { event rowId } }', observer.client);
    await ready(owner, observer);
    await write(privateId, 'INSERT');
    await delivered(owner, privateId, 'INSERT');
    for (const id of sharedIds) {
      await write(id, 'INSERT', true);
      await delivered(owner, id, 'INSERT');
      await delivered(observer, id, 'INSERT');
    }
    await delivered(filtered, sharedIds[1], 'INSERT');
    await visible(bob, privateId, false);
    for (const id of sharedIds) await visible(bob, id, true);
    await pause(100);
    for (const stream of streams) stream.frames.length = 0;
    const ids = [privateId, ...sharedIds];
    const result = await http(alice, 'mutation($ids: [UUID]!, $op: String!) { bulkWriteRlsNotes(input: {noteIds: $ids, operation: $op}) { result } }', { ids, op: operation });
    expect(result.bulkWriteRlsNotes.result).toBe(true);
    await Promise.all([
      ...ids.map(id => delivered(owner, id, operation)),
      ...sharedIds.map(id => delivered(observer, id, operation)),
      delivered(filtered, sharedIds[1], operation)
    ]);
    await pause(100);
    for (const [stream, expectedIds] of [[owner, ids], [observer, sharedIds], [filtered, [sharedIds[1]]]] as const) {
      expect(stream.errors).toEqual([]);
      expect(stream.frames.flatMap(frame => frame.errors ?? [])).toEqual([]);
      expect(payloads(stream).map(payload => payload.rowId).sort()).toEqual([...expectedIds].sort());
      expect(payloads(stream).map(payload => payload.event)).toEqual(expectedIds.map(() => operation));
    }
    for (const payload of payloads(observer)) {
      if (operation === 'DELETE') expect(payload.rlsNote).toBeNull();
      else expect(payload.rlsNote).toMatchObject({ id: payload.rowId });
    }
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
    const fresh = open(alice, undefined, document, original.client);
    expect(fresh.client).toBe(original.client);
    await ready(original, fresh);
    await visible(alice, id, true);
    await write(id, 'DELETE');
    await delivered(original, id, 'DELETE');
    await silent(fresh);
  });

  it('delivers 50 visible events and one id-less overflow for an owner bulk insert of 61 rows', async () => {
    const owner = open(alice);
    const observer = open(charlie);
    await ready(owner, observer);
    await pause(1100);
    const ids = Array.from({ length: 61 }, () => randomUUID()).sort();
    await bulkCreate(alice, ids);
    await overflow(owner);
    const events = payloads(owner).filter(payload => !payload.overflow);
    expect(events).toHaveLength(50);
    expect(events.map(payload => payload.rowId)).toEqual(ids.slice(0, 50));
    expect(events.every(payload => payload.rlsNote.id === payload.rowId)).toBe(true);
    await silent(observer);
  });

  it('does not send a third user any frame for another user bulk inserting 61 private rows', async () => {
    const writer = open(bob);
    const observer = open(charlie);
    await ready(writer, observer);
    await pause(1100);
    const ids = Array.from({ length: 61 }, () => randomUUID()).sort();
    await bulkCreate(bob, ids);
    await delivered(writer, ids[0], 'INSERT');
    await visible(charlie, ids[0], false);
    await silent(observer);
  });

  it('counts only visible rows in a mixed batch with 61 invisible IDs first', async () => {
    const owner = open(alice);
    const observer = open(bob);
    await ready(owner, observer);
    await pause(1100);
    const ids = Array.from({ length: 64 }, () => randomUUID()).sort();
    const sharedIds = ids.slice(61);
    await bulkCreate(alice, ids, sharedIds);
    for (const id of sharedIds) await delivered(observer, id, 'INSERT');
    await overflow(owner);
    await pause(100);
    expect(payloads(observer).map(payload => payload.rowId)).toEqual(sharedIds);
    expect(payloads(observer).some(payload => payload.overflow)).toBe(false);
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
