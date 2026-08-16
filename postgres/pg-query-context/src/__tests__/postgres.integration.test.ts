import { getConnections } from 'pgsql-test';

import pgQueryContext from '../index';

describe('pg-query-context transaction-local integration', () => {
  let db: Awaited<ReturnType<typeof getConnections>>['db'];
  let teardown: Awaited<ReturnType<typeof getConnections>>['teardown'];

  beforeAll(async () => {
    ({ db, teardown } = await getConnections({}, []));
  });

  afterAll(async () => {
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
});
