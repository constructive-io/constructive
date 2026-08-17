import type { Pool, PoolClient } from 'pg';

import {
  installCheckoutSanitizer,
  sanitizePgClient,
} from '../sanitizer';

type PreparedConnection = {
  parsedStatements: Record<string, string>;
  _graphilePreparedStatementCache?: { dispose: jest.Mock };
};

const createClient = (
  connection: PreparedConnection,
  query = jest.fn().mockResolvedValue({ rows: [] })
): PoolClient =>
  ({
    connection,
    query,
    release: jest.fn(),
  }) as unknown as PoolClient;

const createPool = (connect: jest.Mock): Pool =>
  ({
    connect,
  }) as unknown as Pool;

describe('PostgreSQL checkout sanitation', () => {
  it('discards session state and clears client-side prepared-statement bookkeeping', async () => {
    const graphileCache = { dispose: jest.fn() };
    const connection: PreparedConnection = {
      parsedStatements: {
        tenantLookup: 'select 1',
        tenantMutation: 'select 2',
      },
      _graphilePreparedStatementCache: graphileCache,
    };
    const client = createClient(connection);

    await expect(sanitizePgClient(client)).resolves.toBe(client);

    expect(client.query).toHaveBeenCalledWith('DISCARD ALL');
    expect(connection.parsedStatements).toEqual({});
    expect(connection).not.toHaveProperty('_graphilePreparedStatementCache');
    expect(graphileCache.dispose).not.toHaveBeenCalled();
    expect(client.release).not.toHaveBeenCalled();
  });

  it('destroys a client and preserves the original sanitation error', async () => {
    const error = new Error('DISCARD ALL failed');
    const connection: PreparedConnection = {
      parsedStatements: { tenantLookup: 'select 1' },
    };
    const client = createClient(
      connection,
      jest.fn().mockRejectedValue(error)
    );

    await expect(sanitizePgClient(client)).rejects.toBe(error);

    expect(client.release).toHaveBeenCalledWith(true);
    expect(connection.parsedStatements).toEqual({
      tenantLookup: 'select 1',
    });
  });

  it('sanitizes every promise-based checkout and installs only once', async () => {
    const connection: PreparedConnection = { parsedStatements: {} };
    const client = createClient(connection);
    const connect = jest.fn().mockResolvedValue(client);
    const pool = createPool(connect);

    expect(installCheckoutSanitizer(pool)).toBe(pool);
    expect(installCheckoutSanitizer(pool)).toBe(pool);

    await expect(pool.connect()).resolves.toBe(client);
    await expect(pool.connect()).resolves.toBe(client);

    expect(connect).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenNthCalledWith(1, 'DISCARD ALL');
    expect(client.query).toHaveBeenNthCalledWith(2, 'DISCARD ALL');
  });

  it('preserves node-postgres callback checkout semantics', async () => {
    const connection: PreparedConnection = { parsedStatements: {} };
    const client = createClient(connection);
    const pool = createPool(jest.fn().mockResolvedValue(client));
    installCheckoutSanitizer(pool);

    await new Promise<void>((resolve, reject) => {
      pool.connect((error, checkedOutClient, done) => {
        try {
          expect(error).toBeUndefined();
          expect(checkedOutClient).toBe(client);
          expect(done).toEqual(expect.any(Function));
          done();
          expect(client.release).toHaveBeenCalledWith();
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });

  it('reports callback checkout failures only after destroying the client', async () => {
    const error = new Error('cannot sanitize client');
    const connection: PreparedConnection = { parsedStatements: {} };
    const client = createClient(
      connection,
      jest.fn().mockRejectedValue(error)
    );
    const pool = createPool(jest.fn().mockResolvedValue(client));
    installCheckoutSanitizer(pool);

    await new Promise<void>((resolve, reject) => {
      pool.connect((checkoutError, checkedOutClient) => {
        try {
          expect(checkoutError).toBe(error);
          expect(checkedOutClient).toBeUndefined();
          expect(client.release).toHaveBeenCalledWith(true);
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });
});
