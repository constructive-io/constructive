import { setTimeout as delay } from 'node:timers/promises';

import type { PoolClient } from 'pg';
import { getConnections } from 'pgsql-test';
import { makePgService } from 'postgraphile/adaptors/pg';

import { makeIntrospectionWiring } from '../../server/src/middleware/graphile-introspection';
import { IdleReleasingPgSubscriber } from '../../server/src/middleware/pg-subscriber';

type Connections = Awaited<ReturnType<typeof getConnections>>;
type Service = ReturnType<typeof makePgService>;
let connections: Connections;
let pool: ReturnType<Connections['manager']['getPool']>;
let services: Service[];
let listener: PoolClient;

async function until(probe: () => Promise<boolean> | boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await delay(10);
  }
  throw new Error('Backend/pool lifecycle did not settle');
}

async function snapshot(label: string) {
  await connections.pg.query('SELECT pg_stat_clear_snapshot()');
  const { rows } = await connections.pg.query(`SELECT state, wait_event_type, wait_event,
    CASE WHEN query ~* '^(UNLISTEN|LISTEN)' THEN query ELSE split_part(query, ' ', 1) END AS command
    FROM pg_stat_activity WHERE datname = current_database() AND application_name = $1
    ORDER BY pid`, ['subscriber-pool-lifecycle']);
  const result = { label, max: pool.options.max, total: pool.totalCount, idle: pool.idleCount,
    waiting: pool.waitingCount, held: pool.totalCount - pool.idleCount, backends: rows };
  console.log(JSON.stringify(result));
  return result;
}

async function waitForCommand(command: string, count: number) {
  await until(async () => {
    await connections.pg.query('SELECT pg_stat_clear_snapshot()');
    const result = await connections.pg.query(`SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE datname = current_database() AND application_name = $1 AND query LIKE $2`,
    ['subscriber-pool-lifecycle', `${command} %`]);
    return result.rows[0].count === count;
  });
}

beforeAll(async () => {
  connections = await getConnections({}, []);
  const config = { ...connections.pg.config, max: 5, connectionTimeoutMillis: 150,
    application_name: 'subscriber-pool-lifecycle' };
  pool = connections.manager.getPool(config);
});
afterAll(async () => { await connections?.teardown(); });
beforeEach(async () => {
  await connections.pg.beforeEach();
  await connections.db.beforeEach();
  services = [];
  listener = await pool.connect();
  await listener.query('LISTEN "schema:update"');
});
afterEach(async () => {
  for (const service of services) await service.release?.();
  await listener.query('UNLISTEN "schema:update"');
  listener.release();
  await until(() => pool.idleCount === pool.totalCount);
  await connections.db.afterEach();
  await connections.pg.afterEach();
});

it('upstream control retains one checked-out backend per idle cached API and exhausts a five-slot query pool', async () => {
  await snapshot('upstream-baseline');
  for (let i = 1; i <= 4; i++) {
    const service = makePgService({ pool, schemas: [`tenant_${i}`] });
    services.push(service);
    const stream = await service.pgSubscriber!.subscribe(`tenant_topic_${i}`);
    await waitForCommand('LISTEN', 2);
    await stream.return!();
    await waitForCommand('UNLISTEN', i);
    expect((await snapshot(`upstream-tenant-${i}-unsubscribed`)).held).toBe(i + 1);
  }
  await expect(pool.query('SELECT 1')).rejects.toThrow('timeout exceeded when trying to connect');
});

it('server services return idle subscriber clients across more cached APIs than the pool budget', async () => {
  for (let i = 1; i <= 12; i++) {
    const service = makeIntrospectionWiring(pool, [`tenant_${i}`], undefined).pgService as Service;
    services.push(service);
    const stream = await service.pgSubscriber!.subscribe(`tenant_topic_${i}`);
    await waitForCommand('LISTEN', 2);
    await stream.return!();
    await until(() => pool.totalCount - pool.idleCount === 1);
    expect((await snapshot(`server-tenant-${i}-unsubscribed`)).held).toBe(1);
    expect((await pool.query('SELECT 1 AS available')).rows).toEqual([{ available: 1 }]);
  }
});

it('shares one listener within an API, isolates APIs, and preserves NOTIFY and cursor-manager delivery', async () => {
  const first = makeIntrospectionWiring(pool, ['first'], undefined).pgService as Service;
  const second = makeIntrospectionWiring(pool, ['second'], undefined).pgService as Service;
  services.push(first, second);
  const a = await first.pgSubscriber!.subscribe('shared_topic');
  const b = await first.pgSubscriber!.subscribe('shared_topic');
  const other = await second.pgSubscriber!.subscribe('other_topic');
  await waitForCommand('LISTEN', 3);
  expect(pool.totalCount - pool.idleCount).toBe(3);
  await pool.query('SELECT pg_notify($1, $2)', ['shared_topic', 'notify']);
  expect(await a.next()).toEqual({ done: false, value: 'notify' });
  expect(await b.next()).toEqual({ done: false, value: 'notify' });
  await a.return!();
  await a.return!();
  expect(pool.totalCount - pool.idleCount).toBe(3);
  (first.pgSubscriber as IdleReleasingPgSubscriber).eventEmitter.emit('shared_topic', 'cursor');
  expect(await b.next()).toEqual({ done: false, value: 'cursor' });
  await b.return!();
  await until(() => pool.totalCount - pool.idleCount === 2);
  (second.pgSubscriber as IdleReleasingPgSubscriber).eventEmitter.emit('other_topic', 'isolated');
  expect(await other.next()).toEqual({ done: false, value: 'isolated' });
  await other.return!();
  await until(() => pool.totalCount - pool.idleCount === 1);
});

it('returns a client when unsubscribed before acquisition finishes', async () => {
  const service = makeIntrospectionWiring(pool, ['early'], undefined).pgService as Service;
  services.push(service);
  const stream = await service.pgSubscriber!.subscribe('early_topic');
  await stream.return!();
  await until(() => pool.totalCount - pool.idleCount === 1);
  expect((await pool.query('SELECT 1 AS available')).rows[0].available).toBe(1);
});

it('keeps a replacement subscription alive while a pending iterator is being returned', async () => {
  const service = makeIntrospectionWiring(pool, ['overlap'], undefined).pgService as Service;
  services.push(service);
  const stream = await service.pgSubscriber!.subscribe('overlap_topic');
  await waitForCommand('LISTEN', 2);
  const pending = stream.next();
  const returning = stream.return!();
  const replacement = await service.pgSubscriber!.subscribe('replacement_topic');
  expect(await pending).toEqual({ done: true, value: undefined });
  await returning;
  expect(pool.totalCount - pool.idleCount).toBe(2);
  (service.pgSubscriber as IdleReleasingPgSubscriber).eventEmitter.emit('replacement_topic', 'replacement');
  expect(await replacement.next()).toEqual({ done: false, value: 'replacement' });
  await replacement.return!();
  await until(() => pool.totalCount - pool.idleCount === 1);
});

it('returns clients after iterator errors and rejects subscriptions after service release', async () => {
  const service = makeIntrospectionWiring(pool, ['errors'], undefined).pgService as Service;
  services.push(service);
  const stream = await service.pgSubscriber!.subscribe('error_topic');
  await waitForCommand('LISTEN', 2);
  const error = new Error('subscriber failed');
  await expect(stream.throw!(error)).rejects.toBe(error);
  await until(() => pool.totalCount - pool.idleCount === 1);
  const next = await service.pgSubscriber!.subscribe('new_topic');
  await waitForCommand('LISTEN', 2);
  await service.release!();
  expect(await next.next()).toEqual({ done: true, value: undefined });
  await until(() => pool.totalCount - pool.idleCount === 1);
  expect(() => service.pgSubscriber!.subscribe('released_topic')).toThrow('PgSubscriber is released');
});

it('does not acquire a listener for an unused service', async () => {
  const service = makeIntrospectionWiring(pool, ['unused'], undefined).pgService as Service;
  services.push(service);
  expect(pool.totalCount - pool.idleCount).toBe(1);
  await service.release!();
  expect(pool.totalCount - pool.idleCount).toBe(1);
});
