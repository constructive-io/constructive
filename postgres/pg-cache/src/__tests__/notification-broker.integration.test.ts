import type pg from 'pg';
import { getPgEnvOptions, type PgConfig } from 'pg-env';

import { teardownPgPools } from '../lru';
import {
  acquirePgNotificationBroker,
  getPgNotificationBrokerStats,
  PgNotificationTopicError,
  teardownPgNotificationBrokers,
} from '../notification-broker';
import { defaultPgPoolFactory, getPgPool } from '../pg';

// Production acquisition always audits the login on its pinned listener, so
// this test requires the dedicated least-privilege notification fixture.
const describeWithPostgres =
  process.env.PG_CACHE_RUN_NOTIFICATION_ROLE_INTEGRATION === '1'
    ? describe
    : describe.skip;

describeWithPostgres('notification broker against PostgreSQL', () => {
  let observerPool: pg.Pool;
  let listenerPgConfig: PgConfig & { pool: { max: number } };

  beforeAll(() => {
    listenerPgConfig = {
      ...getPgEnvOptions(),
      pool: { max: 1 },
    };
    observerPool = defaultPgPoolFactory(
      { ...listenerPgConfig, pool: { max: 1 } },
      { purpose: 'notification-broker-integration-observer' }
    ) as pg.Pool;
  });

  afterAll(async () => {
    await teardownPgNotificationBrokers();
    await teardownPgPools();
    await observerPool?.end();
  });

  it('shares one LISTEN backend across three isolated generation leases and releases it', async () => {
    const nonce = `${process.pid.toString(36)}_${Date.now().toString(36)}`;
    const topics = [
      `pg_cache_it_${nonce}_a`,
      `pg_cache_it_${nonce}_b`,
      `pg_cache_it_${nonce}_c`,
    ];
    const listenQueries = topics.map((topic) => `LISTEN "${topic}"`);

    const first = await acquirePgNotificationBroker(listenerPgConfig, {
      topics: [topics[0]],
    });
    const second = await acquirePgNotificationBroker(listenerPgConfig, {
      topics: [topics[1]],
    });
    const third = await acquirePgNotificationBroker(listenerPgConfig, {
      topics: [topics[2]],
    });
    const brokerPool = getPgPool(listenerPgConfig, {
      purpose: 'notification-broker',
    });

    expect(
      new Set([first.identity, second.identity, third.identity]).size
    ).toBe(1);
    expect(getPgNotificationBrokerStats()).toMatchObject({
      brokers: 1,
      listenerConnections: 1,
      leases: 3,
      topics: 3,
    });
    expect(brokerPool.totalCount).toBe(1);
    expect(brokerPool.idleCount).toBe(0);

    const activeListeners = await observerPool.query<{
      pid: number;
      query: string;
    }>(
      `
      SELECT pid, query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND usename = current_user
        AND pid <> pg_backend_pid()
        AND query = ANY($1::text[])
    `,
      [listenQueries]
    );
    expect(activeListeners.rows).toEqual([
      { pid: expect.any(Number), query: listenQueries[2] },
    ]);
    const listenerPid = activeListeners.rows[0].pid;

    expect(() => first.subscribe(topics[1])).toThrow(PgNotificationTopicError);
    const firstStream = first.subscribe(topics[0]);
    const secondStream = second.subscribe(topics[1]);
    const thirdStream = third.subscribe(topics[2]);
    let firstResolved = false;
    let thirdResolved = false;
    const firstNext = firstStream.next().then((result) => {
      firstResolved = true;
      return result;
    });
    const secondNext = secondStream.next();
    const thirdNext = thirdStream.next().then((result) => {
      thirdResolved = true;
      return result;
    });

    await observerPool.query('SELECT pg_notify($1, $2)', [
      topics[1],
      'for-second',
    ]);
    await expect(secondNext).resolves.toEqual({
      done: false,
      value: 'for-second',
    });
    // Delivery to every lease happens synchronously inside one notification
    // callback, so these flags prove the second topic did not reach its peers.
    expect(firstResolved).toBe(false);
    expect(thirdResolved).toBe(false);

    await observerPool.query('SELECT pg_notify($1, $2)', [
      topics[0],
      'for-first',
    ]);
    await observerPool.query('SELECT pg_notify($1, $2)', [
      topics[2],
      'for-third',
    ]);
    await expect(firstNext).resolves.toEqual({
      done: false,
      value: 'for-first',
    });
    await expect(thirdNext).resolves.toEqual({
      done: false,
      value: 'for-third',
    });

    await second.release();
    await first.release();
    expect(getPgNotificationBrokerStats()).toMatchObject({
      brokers: 1,
      listenerConnections: 1,
      leases: 1,
      topics: 1,
    });
    expect(brokerPool.idleCount).toBe(0);

    await third.release();
    expect(getPgNotificationBrokerStats()).toMatchObject({
      brokers: 0,
      listenerConnections: 0,
      leases: 0,
      topics: 0,
    });
    expect(brokerPool.totalCount).toBe(0);
    expect(brokerPool.idleCount).toBe(0);

    let releasedListenerRows: Array<{ pid: number }> = [];
    for (let attempt = 0; attempt < 50; attempt++) {
      const releasedListener = await observerPool.query<{ pid: number }>(
        `
        SELECT pid
        FROM pg_stat_activity
        WHERE pid = $1
      `,
        [listenerPid]
      );
      releasedListenerRows = releasedListener.rows;
      if (releasedListenerRows.length === 0) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(releasedListenerRows).toEqual([]);
  });

  it('replaces a released generation with a new backend and no old topic owner', async () => {
    const nonce = `${process.pid.toString(36)}_${Date.now().toString(36)}`;
    const oldTopic = `pg_cache_generation_${nonce}_old`;
    const newTopic = `pg_cache_generation_${nonce}_new`;

    const oldLease = await acquirePgNotificationBroker(listenerPgConfig, {
      topics: [oldTopic],
    });
    const oldListener = await observerPool.query<{ pid: number }>(
      `
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND usename = current_user
        AND pid <> pg_backend_pid()
        AND query = $1
    `,
      [`LISTEN "${oldTopic}"`]
    );
    expect(oldListener.rows).toHaveLength(1);
    const oldPid = oldListener.rows[0].pid;

    await oldLease.release();
    const newLease = await acquirePgNotificationBroker(listenerPgConfig, {
      topics: [newTopic],
    });
    const newListener = await observerPool.query<{ pid: number }>(
      `
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND usename = current_user
        AND pid <> pg_backend_pid()
        AND query = $1
    `,
      [`LISTEN "${newTopic}"`]
    );
    expect(newListener.rows).toHaveLength(1);
    expect(newListener.rows[0].pid).not.toBe(oldPid);

    const next = newLease.subscribe(newTopic).next();
    await observerPool.query('SELECT pg_notify($1, $2)', [oldTopic, 'stale']);
    await observerPool.query('SELECT pg_notify($1, $2)', [newTopic, 'current']);
    await expect(next).resolves.toEqual({ done: false, value: 'current' });

    await newLease.release();
    expect(getPgNotificationBrokerStats()).toMatchObject({
      brokers: 0,
      listenerConnections: 0,
      leases: 0,
      topics: 0,
    });
  });
});
