import { EventEmitter } from 'node:events';

import type pg from 'pg';

import {
  getPgCheckoutSanitizerStats,
  installCheckoutSanitizer,
  sanitizePgClient
} from '../pg';

const mockClient = () => ({
  query: jest.fn(async () => ({ rows: [] as unknown[] })),
  release: jest.fn(),
  connection: {
    parsedStatements: { tenant_query: 'select 1' },
    _graphilePreparedStatementCache: { reset: jest.fn() }
  }
}) as unknown as pg.PoolClient & {
  connection: {
    parsedStatements: Record<string, string>;
    _graphilePreparedStatementCache?: { reset: jest.Mock };
  };
};

describe('runtime checkout sanitation', () => {
  it('discards server state and clears both prepared-statement caches', async () => {
    const client = mockClient();

    await expect(sanitizePgClient(client)).resolves.toBe(client);

    expect(client.query).toHaveBeenNthCalledWith(1, 'DISCARD ALL');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'SET search_path TO pg_catalog; SET row_security TO on; SET jit_optimize_above_cost TO -1'
    );
    expect(client.connection.parsedStatements).toEqual({});
    expect(client.connection).not.toHaveProperty('_graphilePreparedStatementCache');
    expect(client.release).not.toHaveBeenCalled();
  });

  it('does not run Dataplan LRU disposers after DISCARD ALL', async () => {
    const client = mockClient();
    const reset = client.connection._graphilePreparedStatementCache!.reset;

    await sanitizePgClient(client, true);

    expect(reset).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('DISCARD ALL');
  });

  it('uses one checkout query when DISCARD restores a pinned startup baseline', async () => {
    const client = mockClient();

    await expect(sanitizePgClient(client, true)).resolves.toBe(client);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('DISCARD ALL');
    expect(client.connection.parsedStatements).toEqual({});
  });

  it('destroys a connection when DISCARD ALL fails', async () => {
    const client = mockClient();
    (client.query as jest.Mock).mockRejectedValueOnce(new Error('idle in transaction'));

    await expect(sanitizePgClient(client)).rejects.toThrow('idle in transaction');
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it('destroys a connection when restoring the trusted baseline fails', async () => {
    const client = mockClient();
    (client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('baseline rejected'));

    await expect(sanitizePgClient(client)).rejects.toThrow('baseline rejected');
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it('skips DISCARD only for a factory-marked virgin with no competing connect hook', async () => {
    const client = mockClient();
    let connected = false;
    const pool = Object.assign(new EventEmitter(), {
      waitingCount: 0,
      query: jest.fn(),
      connect: jest.fn(async () => {
        if (!connected) {
          connected = true;
          pool.emit('connect', client);
        }
        return client;
      })
    }) as unknown as pg.Pool;

    installCheckoutSanitizer(pool, true, true);

    await expect(pool.connect()).resolves.toBe(client);
    expect(client.query).not.toHaveBeenCalled();
    expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
      checkoutAttempts: 1,
      virginFastPathCheckouts: 1,
      sanitizedReuseCheckouts: 0
    });

    await expect(pool.connect()).resolves.toBe(client);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('DISCARD ALL');
    expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
      checkoutAttempts: 2,
      virginFastPathCheckouts: 1,
      sanitizedReuseCheckouts: 1,
      sanitationFailures: 0
    });
  });

  it('fully sanitizes a virgin after a self-removing connect hook can touch it', async () => {
    const client = mockClient();
    let connected = false;
    const pool = Object.assign(new EventEmitter(), {
      waitingCount: 0,
      query: jest.fn(),
      connect: jest.fn(async () => {
        if (!connected) {
          connected = true;
          pool.emit('connect', client);
        }
        return client;
      })
    }) as unknown as pg.Pool;

    installCheckoutSanitizer(pool, true, true);
    pool.prependOnceListener('connect', () => undefined);

    await expect(pool.connect()).resolves.toBe(client);
    expect(client.query).toHaveBeenCalledWith('DISCARD ALL');
    expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
      virginFastPathCheckouts: 0,
      sanitizedReuseCheckouts: 1
    });
  });

  it('fully sanitizes a minimal custom pool without EventEmitter methods', async () => {
    const client = mockClient();
    const pool = {
      waitingCount: 0,
      query: jest.fn(),
      connect: jest.fn(async () => client)
    } as unknown as pg.Pool;

    installCheckoutSanitizer(pool);

    await expect(pool.connect()).resolves.toBe(client);
    expect(client.query).toHaveBeenNthCalledWith(1, 'DISCARD ALL');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'SET search_path TO pg_catalog; SET row_security TO on; SET jit_optimize_above_cost TO -1'
    );
    expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
      checkoutAttempts: 1,
      virginFastPathCheckouts: 0,
      sanitizedReuseCheckouts: 1
    });
  });

  it('routes a custom pool query through one sanitized checkout', async () => {
    const client = mockClient();
    const queryResult = { rows: [{ value: 7 }] };
    (client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(queryResult);
    const bypassingQuery = jest.fn(async () => ({ rows: [{ value: -1 }] }));
    const connect = jest.fn(async () => client);
    const pool = {
      waitingCount: 0,
      query: bypassingQuery,
      connect
    } as unknown as pg.Pool;

    installCheckoutSanitizer(pool);

    await expect(pool.query('SELECT $1::int AS value', [7])).resolves.toBe(queryResult);
    expect(bypassingQuery).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(1, 'DISCARD ALL');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'SET search_path TO pg_catalog; SET row_security TO on; SET jit_optimize_above_cost TO -1'
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'SELECT $1::int AS value', [7]);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith();
  });

  it('preserves callback queries without executing the custom pool bypass', async () => {
    const client = mockClient();
    const queryResult = { rows: [{ value: 9 }] };
    (client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(queryResult);
    const bypassingQuery = jest.fn();
    const pool = {
      waitingCount: 0,
      query: bypassingQuery,
      connect: jest.fn(async () => client)
    } as unknown as pg.Pool;

    installCheckoutSanitizer(pool);

    const callbackResult = await new Promise((resolve, reject) => {
      const returned = pool.query(
        'SELECT $1::int AS value',
        [9],
        (error, result) => error ? reject(error) : resolve(result)
      );
      expect(returned).toBeUndefined();
    });

    expect(callbackResult).toBe(queryResult);
    expect(bypassingQuery).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query).toHaveBeenNthCalledWith(3, 'SELECT $1::int AS value', [9]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('destroys the checked-out custom client when a direct query fails', async () => {
    const client = mockClient();
    const queryError = new Error('query rejected');
    (client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(queryError);
    const bypassingQuery = jest.fn();
    const pool = {
      waitingCount: 0,
      query: bypassingQuery,
      connect: jest.fn(async () => client)
    } as unknown as pg.Pool;

    installCheckoutSanitizer(pool);

    await expect(pool.query('SELECT broken')).rejects.toBe(queryError);
    expect(bypassingQuery).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query).toHaveBeenNthCalledWith(3, 'SELECT broken');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(queryError);
  });

  it('does not release twice when direct-query sanitation fails', async () => {
    const client = mockClient();
    const sanitationError = new Error('discard rejected');
    (client.query as jest.Mock).mockRejectedValueOnce(sanitationError);
    const bypassingQuery = jest.fn();
    const pool = {
      waitingCount: 0,
      query: bypassingQuery,
      connect: jest.fn(async () => client)
    } as unknown as pg.Pool;

    installCheckoutSanitizer(pool);

    await expect(pool.query('SELECT unsafe')).rejects.toBe(sanitationError);
    expect(bypassingQuery).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it('rejects a custom sanitized pool whose query method cannot be replaced', () => {
    const pool = {
      waitingCount: 0,
      connect: jest.fn()
    } as unknown as pg.Pool;
    Object.defineProperty(pool, 'query', {
      value: jest.fn(),
      writable: false
    });

    expect(() => installCheckoutSanitizer(pool)).toThrow(
      'A sanitized custom PostgreSQL pool must expose a replaceable query() method'
    );
  });
});
