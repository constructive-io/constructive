import type { Pool, PoolClient } from 'pg';

import pgQueryContext, {
  UNSAFE_POOLED_CONTEXT_ERROR_CODE,
  UnsafePooledContextError,
  withPgClient,
} from '../index';

const SETTINGS_SQL =
  'SELECT pg_catalog.set_config(setting->>0, setting->>1, true) ' +
  'FROM pg_catalog.json_array_elements($1::json) AS setting';

const makePool = () => {
  const client = {
    query: jest.fn(async () => ({ rows: [] as unknown[] })),
    release: jest.fn(),
  } as unknown as PoolClient;
  const pool = {
    connect: jest.fn(async () => client),
    totalCount: 1,
  } as unknown as Pool;
  return { client, pool };
};

describe('pg query context', () => {
  it('applies the complete ordered context in one parameterized round trip', async () => {
    const { client, pool } = makePool();
    const context = {
      'jwt.claims.user_id': '',
      role: 'tenant_runtime',
      transaction_read_only: 'off',
      search_path: 'pg_catalog, "tenant_api"',
      row_security: 'on',
    };
    const callback = jest.fn(async () => 'ok');

    await expect(withPgClient(pool, context, callback)).resolves.toBe('ok');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, SETTINGS_SQL, [
      JSON.stringify(Object.entries(context)),
    ]);
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(callback).toHaveBeenCalledWith(client);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('does not issue a context query for an empty context', async () => {
    const { client, pool } = makePool();

    await withPgClient(pool, {}, async (): Promise<void> => undefined);

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
  });

  it('fails closed instead of coercing non-string security settings', async () => {
    const { client, pool } = makePool();

    await expect(
      withPgClient(
        pool,
        { 'jwt.claims.user_id': null } as unknown as Record<string, string>,
        async (): Promise<void> => undefined
      )
    ).rejects.toThrow(
      "PostgreSQL context setting 'jwt.claims.user_id' must be a string"
    );

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and releases when the batched context is rejected', async () => {
    const { client, pool } = makePool();
    (client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('invalid role'))
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      withPgClient(
        pool,
        { role: 'missing_role' },
        async (): Promise<void> => undefined
      )
    ).rejects.toThrow('invalid role');

    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('preserves callback failures while rolling back and releasing', async () => {
    const { client, pool } = makePool();
    const original = new Error('callback failed');

    await expect(
      withPgClient(pool, { role: 'tenant_runtime' }, async () => {
        throw original;
      })
    ).rejects.toBe(original);

    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('uses the same single context batch for the one-query API', async () => {
    const { client, pool } = makePool();
    (client.query as jest.Mock).mockImplementation(async (query: unknown) => ({
      rows: [
        query === 'SELECT tenant_id FROM documents'
          ? { tenant_id: 'a' }
          : undefined,
      ].filter(Boolean),
    }));

    await pgQueryContext({
      client: pool,
      context: { role: 'tenant_runtime', 'jwt.claims.tenant_id': 'a' },
      query: 'SELECT tenant_id FROM documents',
    });

    expect(client.query).toHaveBeenNthCalledWith(2, SETTINGS_SQL, [
      JSON.stringify([
        ['role', 'tenant_runtime'],
        ['jwt.claims.tenant_id', 'a'],
      ]),
    ]);
    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rejects transaction-local context through a pool without a transaction', async () => {
    const { pool } = makePool();

    await expect(
      withPgClient(
        pool,
        { role: 'tenant_runtime' },
        async (): Promise<void> => undefined,
        { skipTransaction: true }
      )
    ).rejects.toMatchObject({
      name: UnsafePooledContextError.name,
      code: UNSAFE_POOLED_CONTEXT_ERROR_CODE,
    });

    expect(pool.connect).not.toHaveBeenCalled();

    await expect(
      pgQueryContext({
        client: pool,
        context: { 'jwt.claims.tenant_id': 'tenant-a' },
        query: 'SELECT 1',
        skipTransaction: true,
      })
    ).rejects.toBeInstanceOf(UnsafePooledContextError);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('allows transaction-free pooled execution only when no context is requested', async () => {
    const { client, pool } = makePool();

    await expect(
      withPgClient(pool, {}, async () => 'ok', { skipTransaction: true })
    ).resolves.toBe('ok');

    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
