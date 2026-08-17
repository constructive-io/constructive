import { Pool, type PoolClient } from 'pg';
import { getConnections } from 'pgsql-test';

import pgQueryContext, { withPgClient } from '../index';

interface SessionState {
  role: string;
  transaction_read_only: string;
  search_path: string;
  row_security: string;
  user_id: string;
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

describe('pg-query-context transaction-local integration', () => {
  let db: Awaited<ReturnType<typeof getConnections>>['db'];
  let teardown: Awaited<ReturnType<typeof getConnections>>['teardown'];
  let singleClientPool: Pool;

  beforeAll(async () => {
    ({ db, teardown } = await getConnections({}, []));
    singleClientPool = new Pool({ ...db.config, max: 1 });
  });

  afterAll(async () => {
    if (singleClientPool) await singleClientPool.end();
    if (teardown) await teardown();
  });

  beforeEach(async () => {
    if (db) await db.beforeEach();
  });

  afterEach(async () => {
    if (db) await db.afterEach();
  });

  it('applies a complete context and restores state after rollback', async () => {
    const { rows: identityRows } = await db.client.query<{
      current_user: string;
    }>('SELECT current_user');
    const currentUser = identityRows[0].current_user;
    const context = {
      role: currentUser,
      'jwt.claims.user_id': 'integration-user',
      'jwt.claims.api_id': 'integration-api',
      'jwt.claims.database_id': 'integration-database',
      'request.id': 'integration-request',
      transaction_read_only: 'on',
      row_security: 'on',
      search_path: 'pg_catalog, public',
    };

    const result = await pgQueryContext({
      client: db.client,
      context,
      skipTransaction: true,
      query: `
        SELECT
          current_user,
          current_setting('jwt.claims.user_id', true) AS user_id,
          current_setting('jwt.claims.api_id', true) AS api_id,
          current_setting('jwt.claims.database_id', true) AS database_id,
          current_setting('request.id', true) AS request_id,
          current_setting('transaction_read_only') AS read_only,
          current_setting('row_security') AS row_security,
          current_setting('search_path') AS search_path
      `,
    });

    expect(result.rows[0]).toEqual({
      current_user: currentUser,
      user_id: 'integration-user',
      api_id: 'integration-api',
      database_id: 'integration-database',
      request_id: 'integration-request',
      read_only: 'on',
      row_security: 'on',
      search_path: 'pg_catalog, public',
    });

    await db.rollback();
    const restored = await db.client.query<{
      user_id: string;
      request_id: string;
    }>(`
      SELECT
        current_setting('jwt.claims.user_id', true) AS user_id,
        current_setting('request.id', true) AS request_id
    `);
    // PostgreSQL retains an empty placeholder for a custom GUC after its first
    // transaction-local use; importantly, the request values themselves do not
    // survive the rollback.
    expect(restored.rows[0]).toEqual({ user_id: '', request_id: '' });
    await db.savepoint();
  });

  it('restores a reused backend baseline after commit and rollback', async () => {
    const baselineClient = await singleClientPool.connect();
    let runtimeRole: string;
    try {
      const identity = await baselineClient.query<{ current_user: string }>(
        'SELECT current_user'
      );
      runtimeRole = identity.rows[0].current_user;

      await baselineClient.query('RESET ROLE');
      await baselineClient.query('SET transaction_read_only TO off');
      await baselineClient.query('SET search_path TO public');
      await baselineClient.query('SET row_security TO off');
      await baselineClient.query(
        "SELECT pg_catalog.set_config('jwt.claims.user_id', 'baseline-user', false)"
      );
    } finally {
      baselineClient.release();
    }

    const committedInside = await withPgClient(
      singleClientPool,
      {
        role: runtimeRole,
        transaction_read_only: 'on',
        search_path: 'pg_catalog',
        row_security: 'on',
        'jwt.claims.user_id': '',
      },
      readSessionState
    );

    expect(committedInside).toEqual({
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      user_id: '',
    });

    const afterCommitClient = await singleClientPool.connect();
    try {
      await expect(readSessionState(afterCommitClient)).resolves.toEqual({
        role: 'none',
        transaction_read_only: 'off',
        search_path: 'public',
        row_security: 'off',
        user_id: 'baseline-user',
      });
    } finally {
      afterCommitClient.release();
    }

    let rolledBackInside: SessionState | undefined;
    await expect(
      withPgClient(
        singleClientPool,
        {
          role: runtimeRole,
          transaction_read_only: 'on',
          search_path: 'pg_catalog',
          row_security: 'on',
          'jwt.claims.user_id': 'rollback-canary',
        },
        async (client) => {
          rolledBackInside = await readSessionState(client);
          throw new Error('force rollback');
        }
      )
    ).rejects.toThrow('force rollback');

    expect(rolledBackInside).toEqual({
      role: runtimeRole,
      transaction_read_only: 'on',
      search_path: 'pg_catalog',
      row_security: 'on',
      user_id: 'rollback-canary',
    });

    const afterRollbackClient = await singleClientPool.connect();
    try {
      await expect(readSessionState(afterRollbackClient)).resolves.toEqual({
        role: 'none',
        transaction_read_only: 'off',
        search_path: 'public',
        row_security: 'off',
        user_id: 'baseline-user',
      });
    } finally {
      afterRollbackClient.release();
    }
  });
});
