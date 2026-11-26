// A checked-out client reports a dropped connection as an 'error' event on the
// client itself, and pg-pool does not listen while the client is checked out.
// Every client the default pool connects must carry its own listener, or that
// event ends the process.

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import pg from 'pg';

import { defaultPgPoolFactory } from '../index';

const freshConfig = () => ({
  database: `client_errors_${randomUUID()}`,
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'x'
});

describe('defaultPgPoolFactory client errors', () => {
  it('gives every connected client an error listener of its own', async () => {
    // defaultPgPoolFactory does not connect until a query runs, so this needs
    // no server; the client stands in for one the pool has just connected.
    const pool = defaultPgPoolFactory(freshConfig());
    expect(pool).toBeInstanceOf(pg.Pool);
    const client = new EventEmitter();

    (pool as pg.Pool).emit('connect', client as unknown as pg.PoolClient);

    expect(client.listenerCount('error')).toBe(1);
    expect(() =>
      client.emit('error', new Error('Connection terminated unexpectedly'))
    ).not.toThrow();

    await pool.end();
  });
});
