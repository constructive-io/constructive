import { EventEmitter } from 'node:events';

import { makePgService, PgSubscriber } from 'postgraphile/adaptors/pg';
import { getConnections } from 'pgsql-test';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) return;
    await flushPromises();
  }
  throw new Error('Timed out waiting for the fake Postgres boundary');
};

class FakeClient extends EventEmitter {
  readonly queryCalls: string[] = [];
  readonly releaseCalls: boolean[] = [];
  queryHandler: (text: string) => Promise<unknown> = async () => undefined;

  query(text: string): Promise<unknown> {
    this.queryCalls.push(text);
    return this.queryHandler(text);
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  release(destroy?: Error | boolean): void {
    this.releaseCalls.push(destroy === true);
  }
}

type SubscriberPool = ConstructorParameters<typeof PgSubscriber>[0];

const makePool = (
  connect: () => Promise<FakeClient>
): {
  pool: SubscriberPool;
  connect: jest.Mock<Promise<FakeClient>, []>;
} => {
  const connectMock = jest.fn(connect);
  return {
    pool: { connect: connectMock } as unknown as SubscriberPool,
    connect: connectMock,
  };
};

describe('public PostGraphile PostgreSQL release contracts', () => {
  it('waits for UNLISTEN and memoizes repeated subscriber release calls', async () => {
    const client = new FakeClient();
    const unlisten = deferred<unknown>();
    client.queryHandler = async (text) => {
      if (text.startsWith('UNLISTEN')) return unlisten.promise;
      return undefined;
    };
    const { pool } = makePool(async () => client);
    const subscriber = new PgSubscriber(pool);
    subscriber.subscribe('topic');

    await waitFor(() => client.queryCalls.some((text) => text.startsWith('LISTEN')));

    const firstRelease = subscriber.release();
    const secondRelease = subscriber.release();
    expect(secondRelease).toBe(firstRelease);

    await waitFor(() =>
      client.queryCalls.some((text) => text.startsWith('UNLISTEN'))
    );
    expect(client.releaseCalls).toEqual([]);

    unlisten.resolve(undefined);
    await firstRelease;
    expect(client.releaseCalls).toEqual([false]);
    expect(client.listenerCount('notification')).toBe(0);
    expect(client.listenerCount('error')).toBe(0);
  });

  it('finishes every pending iterator for one topic during release', async () => {
    const client = new FakeClient();
    const { pool } = makePool(async () => client);
    const subscriber = new PgSubscriber(pool);
    const first = subscriber.subscribe('topic');
    const second = subscriber.subscribe('topic');
    const firstNext = first.next();
    const secondNext = second.next();

    await subscriber.release();
    await expect(firstNext).resolves.toMatchObject({ done: true });
    await expect(secondNext).resolves.toMatchObject({ done: true });
  });

  it('destroys a client that resolves after shutdown starts', async () => {
    const client = new FakeClient();
    const connection = deferred<FakeClient>();
    const { pool, connect } = makePool(() => connection.promise);
    const subscriber = new PgSubscriber(pool);
    subscriber.subscribe('topic');
    await waitFor(() => connect.mock.calls.length === 1);

    const release = subscriber.release();
    await flushPromises();
    expect(client.releaseCalls).toEqual([]);

    connection.resolve(client);
    await release;
    expect(client.releaseCalls).toEqual([true]);
    expect(client.queryCalls).toEqual([]);
    expect(client.listenerCount('notification')).toBe(0);
    expect(client.listenerCount('error')).toBe(0);
  });

  it('surfaces a pending connection failure during release', async () => {
    const connectionFailure = new Error('connection failed during shutdown');
    const connection = deferred<FakeClient>();
    const { pool, connect } = makePool(() => connection.promise);
    const subscriber = new PgSubscriber(pool);
    subscriber.subscribe('topic');
    await waitFor(() => connect.mock.calls.length === 1);

    const release = subscriber.release();
    connection.reject(connectionFailure);

    await expect(release).rejects.toBe(connectionFailure);
  });

  it('destroys the client and surfaces an UNLISTEN failure', async () => {
    const client = new FakeClient();
    const unlistenFailure = new Error('UNLISTEN failed');
    client.queryHandler = async (text) => {
      if (text.startsWith('UNLISTEN')) throw unlistenFailure;
      return undefined;
    };
    const { pool } = makePool(async () => client);
    const subscriber = new PgSubscriber(pool);
    subscriber.subscribe('topic');

    await waitFor(() => client.queryCalls.some((text) => text.startsWith('LISTEN')));
    await expect(subscriber.release()).rejects.toBe(unlistenFailure);

    expect(client.releaseCalls).toEqual([true]);
    expect(client.listenerCount('notification')).toBe(0);
    expect(client.listenerCount('error')).toBe(0);
  });

  it('attempts every owned service releaser and preserves ordered failures', async () => {
    const subscriberFailure = new Error('subscriber release failed');
    const poolFailure = new Error('pool end failed');
    const events: string[] = [];
    const service = makePgService({
      connectionString: 'postgres://unused/release-contract',
      schemas: ['public'],
    });
    const subscriber = service.pgSubscriber as unknown as {
      release: () => Promise<void>;
    };
    const pool = service.adaptorSettings?.pool as unknown as {
      end: () => Promise<void>;
    };
    subscriber.release = jest.fn(async () => {
      events.push('subscriber');
      throw subscriberFailure;
    });
    pool.end = jest.fn(async () => {
      events.push('pool');
      throw poolFailure;
    });

    const firstRelease = service.release();
    const secondRelease = service.release();
    expect(secondRelease).toBe(firstRelease);

    let error: unknown;
    try {
      await firstRelease;
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([
      subscriberFailure,
      poolFailure,
    ]);
    expect(events).toEqual(['subscriber', 'pool']);
  });

  it('rethrows one owned service failure unchanged after attempting the pool', async () => {
    const subscriberFailure = new Error('subscriber release failed');
    const events: string[] = [];
    const service = makePgService({
      connectionString: 'postgres://unused/release-contract-single',
      schemas: ['public'],
    });
    const subscriber = service.pgSubscriber as unknown as {
      release: () => Promise<void>;
    };
    const pool = service.adaptorSettings?.pool as unknown as {
      end: () => Promise<void>;
    };
    subscriber.release = jest.fn(async () => {
      events.push('subscriber');
      throw subscriberFailure;
    });
    pool.end = jest.fn(async () => {
      events.push('pool');
    });

    await expect(service.release()).rejects.toBe(subscriberFailure);
    expect(events).toEqual(['subscriber', 'pool']);
  });

  it('unlistens and returns the same real backend before service release resolves', async () => {
    const fixture = await getConnections({}, []);
    const poolConfig = { ...fixture.pg.config, max: 1 };
    const pool = fixture.manager.getPool(poolConfig);
    const producer = fixture.pg;
    const service = makePgService({ pool, schemas: ['public'] });
    try {
      const iterator = await service.pgSubscriber!.subscribe('graphile_cache_release_test');
      let received = false;
      const notification = iterator.next().then(result => {
        expect(result.value).toBe('ready');
        received = true;
      });
      // LISTEN startup is asynchronous; send until the real subscriber confirms
      // readiness instead of assuming a timer implies the query has completed.
      for (let attempt = 0; attempt < 100 && !received; attempt++) {
        await producer.query("SELECT pg_notify('graphile_cache_release_test', 'ready')");
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(received).toBe(true);
      await notification;
      expect(pool.totalCount).toBe(1);
      expect(pool.idleCount).toBe(0);
      await service.release();
      expect(pool.idleCount).toBe(1);
      const channels = await pool.query('SELECT pg_listening_channels()');
      expect(channels.rows).toEqual([]);
      expect(pool.totalCount).toBe(1);
    } finally {
      try { await service.release(); }
      finally { await fixture.teardown(); }
    }
  });
});
