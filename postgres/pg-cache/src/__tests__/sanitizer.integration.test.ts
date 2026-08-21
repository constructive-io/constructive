import type pg from 'pg';

import { defaultPgPoolFactory, getPgCheckoutSanitizerStats } from '../pg';

const describeWithPostgres = process.env.PG_CACHE_RUN_PG_INTEGRATION === '1'
  ? describe
  : describe.skip;

describeWithPostgres('runtime checkout sanitation against PostgreSQL', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = defaultPgPoolFactory(
      { pool: { max: 1 } },
      { purpose: 'runtime', sanitizeOnCheckout: true }
    ) as pg.Pool;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('restores the startup baseline and clears poisoned prepared state', async () => {
    const poisoned = await pool.connect();
    const poisonedPid = await poisoned.query<{ pid: number }>(
      'SELECT pg_catalog.pg_backend_pid()::integer AS pid'
    );
    await poisoned.query('SET search_path TO public');
    await poisoned.query('SET row_security TO off');
    await poisoned.query('SET jit_optimize_above_cost TO 123');
    await poisoned.query("SET application_name TO 'poisoned-tenant-session'");
    await poisoned.query({ name: 'tenant_cache_canary', text: 'SELECT 1 AS value' });
    poisoned.release();
    expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
      virginFastPathCheckouts: 1,
      sanitizedReuseCheckouts: 0
    });

    const clean = await pool.connect();
    try {
      const cleanPid = await clean.query<{ pid: number }>(
        'SELECT pg_catalog.pg_backend_pid()::integer AS pid'
      );
      expect(cleanPid.rows[0]?.pid).toBe(poisonedPid.rows[0]?.pid);
      const settings = await clean.query<{
        search_path: string;
        row_security: string;
        jit_optimize_above_cost: string;
        application_name: string;
      }>(`
        SELECT
          current_setting('search_path') AS search_path,
          current_setting('row_security') AS row_security,
          current_setting('jit_optimize_above_cost') AS jit_optimize_above_cost,
          current_setting('application_name') AS application_name
      `);
      expect(settings.rows[0]).toMatchObject({
        search_path: 'pg_catalog',
        row_security: 'on',
        jit_optimize_above_cost: '-1'
      });
      expect(settings.rows[0].application_name).not.toBe('poisoned-tenant-session');

      await expect(clean.query({
        name: 'tenant_cache_canary',
        text: 'SELECT 2 AS value'
      })).resolves.toMatchObject({ rows: [{ value: 2 }] });
      expect(getPgCheckoutSanitizerStats(pool)).toMatchObject({
        virginFastPathCheckouts: 1,
        sanitizedReuseCheckouts: 1,
        sanitationFailures: 0
      });
    } finally {
      clean.release();
    }
  });

  it('proves maxUses=1 rotates the PostgreSQL backend instead of reusing it', async () => {
    const rotatingPool = defaultPgPoolFactory(
      { pool: { max: 1, maxUses: 1 } },
      { purpose: 'runtime-max-uses-one', sanitizeOnCheckout: true }
    ) as pg.Pool;
    try {
      const first = await rotatingPool.connect();
      const firstPid = await first.query<{ pid: number }>(
        'SELECT pg_catalog.pg_backend_pid()::integer AS pid'
      );
      first.release();

      const second = await rotatingPool.connect();
      try {
        const secondPid = await second.query<{ pid: number }>(
          'SELECT pg_catalog.pg_backend_pid()::integer AS pid'
        );
        expect(secondPid.rows[0]?.pid).not.toBe(firstPid.rows[0]?.pid);
      } finally {
        second.release();
      }
    } finally {
      await rotatingPool.end();
    }
  });
});
