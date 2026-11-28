process.env.LOG_SCOPE = 'pgsql-test';

import { getConnections } from '../src/connect';
import type { PgTestConnector } from '../src/manager';
import { PgTestClient } from '../src/test-client';

/**
 * A connection the server ends (`pg_terminate_backend` here; a restart or a
 * failover in practice) must fail the queries that use it, not end the test
 * process. node-postgres reports it with an 'error' event, which is fatal when
 * nothing listens for it.
 */

let pg: PgTestClient;
let db: PgTestClient;
let manager: PgTestConnector;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, manager, teardown } = await getConnections());
});

beforeEach(async () => {
  await pg.beforeEach();
  await db.beforeEach();
});

afterEach(async () => {
  await db.afterEach();
  await pg.afterEach();
});

afterAll(async () => {
  await teardown();
});

/**
 * Resolves once node-postgres has finished with a connection. It emits 'end'
 * after any 'error' for the same loss, so the loss has been handled by then.
 * Listening for 'end' does not count as handling 'error'.
 */
const ended = (client: { once(event: 'end', listener: () => void): unknown }): Promise<void> =>
  new Promise((resolve) => {
    client.once('end', () => resolve());
  });

const terminate = async (pid: number): Promise<void> => {
  await pg.query('SELECT pg_terminate_backend($1)', [pid]);
};

type Pool = ReturnType<PgTestConnector['getPool']>;

/**
 * Checks a connection out of the pool, notes its server process, and returns
 * it to the pool, where it sits idle until the test ends it.
 */
const idleConnection = async (pool: Pool): Promise<{ pid: number; gone: Promise<void> }> => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return { pid: rows[0].pid, gone: ended(client) };
  } finally {
    client.release();
  }
};

describe('connections the server ends', () => {
  it('fails later queries on a test client without ending the process', async () => {
    const victim = manager.getClient(db.config);
    const { pid } = await victim.one<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    const gone = ended(victim.client);

    await terminate(pid);
    await gone;

    await expect(victim.query('SELECT 1')).rejects.toThrow();
    // Other connections are unaffected.
    expect(await db.one('SELECT 1 AS ok')).toEqual({ ok: 1 });
  });

  it('replaces an idle pooled connection', async () => {
    const pool = manager.getPool(db.config);
    const { pid, gone } = await idleConnection(pool);

    await terminate(pid);
    await gone;

    const { rows } = await pool.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    expect(rows[0].pid).not.toBe(pid);
  });

  it('fails the queries of a checked-out pooled connection', async () => {
    const pool = manager.getPool(db.config);
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      const gone = ended(client);

      await terminate(rows[0].pid);
      await gone;

      await expect(client.query('SELECT 1')).rejects.toThrow();
    } finally {
      // Destroy rather than reuse it, whatever the checks found.
      client.release(true);
    }
  });
});
