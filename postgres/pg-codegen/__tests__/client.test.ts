/**
 * Live round-trip test for the generated Prisma-like client: the committed
 * __fixtures__ output runs real queries through TableClient against a
 * provisioned database.
 */
import { join } from 'path';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { RowNotFoundError } from '../__fixtures__/generated/client';
import { CodegenTestDb, createCodegenTestDb } from '../__fixtures__/generated/codegen_test/db';

const sql = (f: string) => join(__dirname, '/../sql', f);

let teardown: () => Promise<void>;
let pg: PgTestClient;
let db: CodegenTestDb;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({}, [seed.sqlfile([sql('test.sql')])]));
  db = createCodegenTestDb(pg.client);
});

beforeEach(() => pg.beforeEach());
afterEach(() => pg.afterEach());
afterAll(() => teardown());

it('creates and reads back a full record', async () => {
  const user = await db.users.create({ data: { username: 'alice', email: 'alice@example.com' } });
  expect(user).toMatchObject({ username: 'alice', email: 'alice@example.com' });
  expect(typeof user.id).toBe('number');
  expect(typeof user.createdAt).toBe('string');

  const found = await db.users.findFirstOrThrow({ where: { id: user.id } });
  expect(found).toEqual(user);
});

it('narrows the result with select and maps camelCase fields to columns', async () => {
  const user = await db.users.create({ data: { username: 'bob' }, select: { id: true } });
  expect(Object.keys(user)).toEqual(['id']);

  const run = await db.agentRuns.create({
    data: {
      threadId: '00000000-0000-0000-0000-000000000001',
      status: 'running',
      tags: ['a', 'b'],
      metadata: { attempt: 1 }
    },
    select: { id: true, threadId: true, status: true, tags: true, lastEventSeq: true }
  });
  expect(run.threadId).toBe('00000000-0000-0000-0000-000000000001');
  expect(run.status).toBe('running');
  expect(run.tags).toEqual(['a', 'b']);
  expect(run.lastEventSeq).toBe(0);
});

it('filters with the query-spec grammar and orders/limits', async () => {
  await db.users.create({ data: { username: 'carol' } });
  await db.users.create({ data: { username: 'dave' } });
  await db.users.create({ data: { username: 'carla' } });

  const cs = await db.users.findMany({
    where: { username: { startsWith: 'c' } },
    orderBy: { username: 'DESC' },
    select: { username: true }
  });
  expect(cs.map(u => u.username)).toEqual(['carol', 'carla']);

  const limited = await db.users.findMany({ orderBy: { username: 'ASC' }, limit: 2 });
  expect(limited).toHaveLength(2);

  expect(await db.users.count({ username: { in: ['carol', 'dave'] } })).toBe(2);
  expect(await db.users.count()).toBe(3);
});

it('treats bare values as equalTo and null as isNull', async () => {
  const eve = await db.users.create({ data: { username: 'eve', email: 'eve@example.com' } });
  await db.users.create({ data: { username: 'mallory' } });

  const byName = await db.users.findFirst({ where: { username: 'eve' } });
  expect(byName?.id).toBe(eve.id);

  const noEmail = await db.users.findMany({ where: { email: null }, select: { username: true } });
  expect(noEmail.map(u => u.username)).toEqual(['mallory']);
});

it('excludes a field the binding must not read, and keeps the rest', async () => {
  const created = await db.users.create({
    data: { username: 'nadia', email: 'nadia@example.com' },
    // A column this caller must not carry — the same shape a scope's copy of a
    // table without the scope key column needs.
    select: { email: false }
  });
  expect(created).toEqual({ id: created.id, username: 'nadia', createdAt: created.createdAt });

  const found = await db.users.findFirstOrThrow({
    where: { id: created.id },
    select: { email: false, createdAt: false }
  });
  expect(found).toEqual({ id: created.id, username: 'nadia' });
  // @ts-expect-error an excluded field is absent from the result type, not just the row
  found.email;

  // A field named `true` is a projection: the exclusions are simply not in it.
  const projected = await db.users.findFirstOrThrow({
    where: { id: created.id },
    select: { username: true, email: false }
  });
  expect(projected).toEqual({ username: 'nadia' });
});

it('combines and/or/not filters', async () => {
  await db.users.create({ data: { username: 'frank' } });
  await db.users.create({ data: { username: 'grace' } });

  const rows = await db.users.findMany({
    where: { or: [{ username: 'frank' }, { username: 'grace' }], not: { username: 'frank' } },
    select: { username: true }
  });
  expect(rows.map(u => u.username)).toEqual(['grace']);
});

it('updates matching rows and returns the decoded projection', async () => {
  const user = await db.users.create({ data: { username: 'heidi' } });
  const updated = await db.users.update({
    where: { id: user.id },
    data: { username: 'heidi2' },
    select: { id: true, username: true }
  });
  expect(updated).toEqual([{ id: user.id, username: 'heidi2' }]);

  await expect(
    db.users.updateOrThrow({ where: { username: 'nobody' }, data: { email: 'x@example.com' } })
  ).rejects.toThrow(RowNotFoundError);
});

it('deletes rows and reports what was removed', async () => {
  await db.users.create({ data: { username: 'ivan' } });
  const removed = await db.users.delete({ where: { username: 'ivan' }, select: { username: true } });
  expect(removed).toEqual([{ username: 'ivan' }]);
  expect(await db.users.count({ username: 'ivan' })).toBe(0);
});

it('findFirstOrThrow raises on no match', async () => {
  await expect(db.users.findFirstOrThrow({ where: { id: 999999 } })).rejects.toThrow(RowNotFoundError);
});

it('reads unqualified when a conditional filter spreads to nothing', async () => {
  await db.users.create({ data: { username: 'karl' } });
  const keyColumn: string | null = null;

  const rows = await db.users.findMany({
    where: { ...(keyColumn ? { username: keyColumn } : {}) },
    select: { username: true }
  });
  expect(rows.map(u => u.username)).toEqual(['karl']);
  expect(await db.users.count({})).toBe(1);
});

it('refuses a write whose filter would match every row', async () => {
  await db.users.create({ data: { username: 'lena' } });

  await expect(db.users.update({ where: {}, data: { email: 'x@example.com' } })).rejects.toThrow(
    /refusing an empty where filter/
  );
  await expect(db.users.delete({ where: {} })).rejects.toThrow(/refusing an empty where filter/);
  expect(await db.users.count()).toBe(1);
});

it('rebinds to another connection with $with', async () => {
  const rebound = db.$with(pg.client);
  await rebound.users.create({ data: { username: 'judy' } });
  expect(await rebound.users.count({ username: 'judy' })).toBe(1);
});
