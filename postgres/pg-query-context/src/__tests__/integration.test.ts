import { Pool, PoolClient } from 'pg';

import { withPgClient } from '../index';

const describeWithPostgres = process.env.PG_QUERY_CONTEXT_RUN_PG_INTEGRATION === '1'
  ? describe
  : describe.skip;

interface SessionState {
  role: string;
  transaction_read_only: string;
  search_path: string;
  row_security: string;
  user_id: string | null;
}

async function readSessionState(client: PoolClient): Promise<SessionState> {
  const result = await client.query<SessionState>(`
    SELECT
      current_setting('role') AS role,
      current_setting('transaction_read_only') AS transaction_read_only,
      current_setting('search_path') AS search_path,
      current_setting('row_security') AS row_security,
      current_setting('jwt.claims.user_id', true) AS user_id
  `);
  return result.rows[0];
}

describeWithPostgres('transaction-local PostgreSQL context', () => {
  let pool: Pool;
  let runtimeRole: string;

  beforeAll(async () => {
    pool = new Pool({ max: 1 });
    const client = await pool.connect();
    try {
      const identity = await client.query<{ current_user: string }>(
        'SELECT current_user'
      );
      runtimeRole = identity.rows[0].current_user;

      // Deliberately establish a visibly different session baseline. With a
      // one-client pool, every assertion below observes the same backend.
      await client.query('RESET ROLE');
      await client.query('SET transaction_read_only TO off');
      await client.query('SET search_path TO public');
      await client.query('SET row_security TO off');
      await client.query(
        "SELECT pg_catalog.set_config('jwt.claims.user_id', 'baseline-user', false)"
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('RESET ROLE');
      await client.query('RESET ALL');
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('applies every security setting locally and restores the session after commit and rollback', async () => {
    const committedInside = await withPgClient(pool, {
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      'jwt.claims.user_id': ''
    }, readSessionState);

    expect(committedInside).toEqual({
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      user_id: ''
    });

    const afterCommitClient = await pool.connect();
    try {
      await expect(readSessionState(afterCommitClient)).resolves.toEqual({
        role: 'none',
        transaction_read_only: 'off',
        search_path: 'public',
        row_security: 'off',
        user_id: 'baseline-user'
      });
    } finally {
      afterCommitClient.release();
    }

    let rolledBackInside: SessionState | undefined;
    await expect(withPgClient(pool, {
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      'jwt.claims.user_id': 'rollback-canary'
    }, async (client) => {
      rolledBackInside = await readSessionState(client);
      throw new Error('force rollback');
    })).rejects.toThrow('force rollback');

    expect(rolledBackInside).toEqual({
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      user_id: 'rollback-canary'
    });

    const afterRollbackClient = await pool.connect();
    try {
      await expect(readSessionState(afterRollbackClient)).resolves.toEqual({
        role: 'none',
        transaction_read_only: 'off',
        search_path: 'public',
        row_security: 'off',
        user_id: 'baseline-user'
      });
    } finally {
      afterRollbackClient.release();
    }
  });
});
