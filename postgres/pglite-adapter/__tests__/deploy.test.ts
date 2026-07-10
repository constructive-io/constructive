import { PgpmMigrate } from '@pgpmjs/core';
import { join } from 'path';
import { registerPgPoolFactory } from 'pg-cache';

import { type PgliteAdapterHandle, registerPglite } from '../src';

const MODULE = join(__dirname, 'fixtures', 'module');
const pgConfig = { user: 'postgres', password: 'x', host: 'localhost', port: 5432, database: 'postgres' };

describe('pglite-adapter: unmodified pgpm engine deploys into in-process PGlite', () => {
  let handle: PgliteAdapterHandle;

  beforeAll(async () => {
    handle = await registerPglite();
  });

  afterAll(async () => {
    await handle.close();
    registerPgPoolFactory(undefined);
  });

  it('bootstraps the pgpm_migrate schema in PGlite', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    await migrate.initialize();
    const res = await handle.db.query<{ schema_name: string }>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'pgpm_migrate'"
    );
    expect(res.rows).toHaveLength(1);
  });

  it('deploys the plan change-by-change (transactional path)', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    // useTransaction defaults to true: a single in-process PGlite session backs
    // both the txn client and pool.query, so there is no cross-connection deadlock.
    const result = await migrate.deploy({ modulePath: MODULE });
    expect(result.deployed).toEqual(['schema', 'table', 'index']);
    expect(result.failed).toBeUndefined();
  });

  it('verifies every deployed change', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    const result = await migrate.verify({ modulePath: MODULE });
    expect(result.verified).toEqual(['schema', 'table', 'index']);
    expect(result.failed).toEqual([]);
  });

  it('runs real data through the pgpm-deployed schema', async () => {
    await handle.db.query(
      'INSERT INTO test_app.users(name, email) VALUES ($1, $2)',
      ['ada', 'ada@example.com']
    );
    const rows = (
      await handle.db.query<{ name: string }>('SELECT name FROM test_app.users ORDER BY name')
    ).rows;
    expect(rows).toEqual([{ name: 'ada' }]);
  });

  it('records deployed changes in the pgpm registry', async () => {
    const changes = (
      await handle.db.query<{ change_name: string }>(
        'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
      )
    ).rows.map((r) => r.change_name);
    expect(changes).toEqual(['index', 'schema', 'table']);
  });

  it('reverts the full plan and empties the registry', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    await migrate.revert({ modulePath: MODULE });
    const changes = (
      await handle.db.query<{ change_name: string }>(
        'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
      )
    ).rows.map((r) => r.change_name);
    expect(changes).toEqual([]);
    const gone = await handle.db.query<{ t: string | null }>(
      "SELECT to_regclass('test_app.users') AS t"
    );
    expect(gone.rows[0].t).toBeNull();
  });
});
