/**
 * DB-backed tests for the generic data export (export-data.ts):
 * column introspection with catalog-based volatile-default detection,
 * deterministic INSERT emission, and deploy/revert/verify script assembly.
 */
import type { PgTestClient } from 'pgsql-test';
import { getConnections, seed } from 'pgsql-test';

import {
  buildDataDeployScript,
  buildDataRevertScript,
  buildDataVerifyScript,
  exportTableData,
  exportTablesData,
  getDataExportColumns,
  isVolatileTimestampColumn
} from '../src/export-data';

let pg: PgTestClient;
let teardown: () => Promise<void>;

const SETUP_SQL = `
CREATE SCHEMA app_routing_public;

CREATE TABLE app_routing_public.apis (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  dbname text NOT NULL DEFAULT current_database(),
  is_public boolean NOT NULL DEFAULT true,
  labels text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observed_at timestamptz DEFAULT clock_timestamp(),
  expires_at timestamptz DEFAULT now() + '2 days'::interval,
  fixed_at timestamptz DEFAULT '2020-01-01T00:00:00Z'::timestamptz
);

CREATE TABLE app_routing_public.api_schemas (
  id uuid PRIMARY KEY,
  api_id uuid NOT NULL REFERENCES app_routing_public.apis (id),
  schema_name text NOT NULL
);

CREATE TABLE app_routing_public.settings (
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO app_routing_public.apis (id, name) VALUES
  ('00000000-0000-0000-0000-00000000000b', 'beta'),
  ('00000000-0000-0000-0000-00000000000a', 'alpha');

INSERT INTO app_routing_public.api_schemas (id, api_id, schema_name) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'public');

INSERT INTO app_routing_public.settings (key, value) VALUES
  ('theme', '{"dark": true}');
`;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({}, [
    seed.fn(async ({ pg }) => {
      await pg.query(SETUP_SQL);
    })
  ]));
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await pg.beforeEach();
});

afterEach(async () => {
  await pg.afterEach();
});

describe('getDataExportColumns', () => {
  it('detects volatile defaults from the catalog, not by expression regex', async () => {
    const columns = await getDataExportColumns(pg, 'app_routing_public', 'apis');
    const byName = Object.fromEntries(columns.map(c => [c.name, c]));

    // Wall-clock timestamp defaults — all volatile
    expect(byName.created_at.volatileDefault).toBe(true);
    expect(byName.updated_at.volatileDefault).toBe(true);
    expect(byName.observed_at.volatileDefault).toBe(true);
    expect(byName.expires_at.volatileDefault).toBe(true);

    // Constant timestamp default — immutable, kept
    expect(byName.fixed_at.volatileDefault).toBe(false);

    // Environment-specific but non-timestamp — flagged volatile-dependent
    // (current_database() is stable) but NOT a timestamp column
    expect(byName.dbname.volatileDefault).toBe(true);

    // No default / constant defaults
    expect(byName.id.volatileDefault).toBe(false);
    expect(byName.is_public.volatileDefault).toBe(false);

    expect(byName.created_at.type).toBe('timestamp with time zone');
    expect(byName.name.type).toBe('text');
  });

  it('isVolatileTimestampColumn only excludes timestamp columns', async () => {
    const columns = await getDataExportColumns(pg, 'app_routing_public', 'apis');
    const excluded = columns.filter(isVolatileTimestampColumn).map(c => c.name).sort();
    expect(excluded).toEqual(['created_at', 'expires_at', 'observed_at', 'updated_at']);
    // dbname has a non-immutable default but is text — not excluded here
    expect(excluded).not.toContain('dbname');
    // constant timestamp default survives
    expect(excluded).not.toContain('fixed_at');
  });
});

describe('exportTableData', () => {
  it('emits a deterministic INSERT ordered by id, excluding volatile timestamps and excludeColumns', async () => {
    const result = await exportTableData(
      pg,
      { schema: 'app_routing_public', table: 'apis' },
      { excludeColumns: ['dbname'] }
    );

    expect(result.rowCount).toBe(2);
    expect(result.ids).toEqual([
      '00000000-0000-0000-0000-00000000000a',
      '00000000-0000-0000-0000-00000000000b'
    ]);
    const insert = result.insert as string;
    expect(insert).toContain('INSERT INTO app_routing_public.apis');
    expect(insert).toContain('fixed_at');
    expect(insert).not.toContain('created_at');
    expect(insert).not.toContain('updated_at');
    expect(insert).not.toContain('dbname');
    // alpha (lower id) sorts first
    expect(insert.indexOf("'alpha'")).toBeLessThan(insert.indexOf("'beta'"));
    expect(insert).toContain('::uuid');
    expect(insert).toContain('AS timestamp with time zone');

    // Deterministic: exporting twice yields identical SQL
    const again = await exportTableData(
      pg,
      { schema: 'app_routing_public', table: 'apis' },
      { excludeColumns: ['dbname'] }
    );
    expect(again.insert).toBe(insert);
  });

  it('supports equality filters and conflictDoNothing', async () => {
    const result = await exportTableData(
      pg,
      {
        schema: 'app_routing_public',
        table: 'api_schemas',
        filter: { column: 'api_id', value: '00000000-0000-0000-0000-00000000000a' }
      },
      { conflictDoNothing: true }
    );
    expect(result.rowCount).toBe(1);
    expect(result.insert).toContain('ON CONFLICT DO NOTHING');

    const none = await exportTableData(pg, {
      schema: 'app_routing_public',
      table: 'api_schemas',
      filter: { column: 'api_id', value: '00000000-0000-0000-0000-00000000000b' }
    });
    expect(none.rowCount).toBe(0);
    expect(none.insert).toBeNull();
  });

  it('exports tables without an id column (no ids, ordered by all columns)', async () => {
    const result = await exportTableData(pg, {
      schema: 'app_routing_public',
      table: 'settings'
    });
    expect(result.rowCount).toBe(1);
    expect(result.ids).toBeNull();
    expect(result.insert).toMatch(/\bkey\b/);
  });
});

describe('script assembly', () => {
  it('deploy/revert/verify round-trip against the database', async () => {
    const exports = await exportTablesData(
      pg,
      [
        { schema: 'app_routing_public', table: 'apis' },
        { schema: 'app_routing_public', table: 'api_schemas' }
      ],
      { excludeColumns: ['dbname'] }
    );

    const deploySql = buildDataDeployScript(exports);
    const revertSql = buildDataRevertScript(exports);
    const verifySql = buildDataVerifyScript(exports);

    expect(deploySql).toContain('SET session_replication_role TO replica;');
    expect(deploySql).toContain('SET session_replication_role TO DEFAULT;');

    // verify passes while the data is present
    await pg.query(verifySql);

    // revert removes the exported rows (children deleted before parents)
    expect(revertSql.indexOf('api_schemas')).toBeLessThan(revertSql.indexOf('.apis'));
    await pg.query(revertSql);
    const gone = await pg.query('SELECT count(*)::int AS n FROM app_routing_public.apis');
    expect(gone.rows[0].n).toBe(0);

    // verify now fails (division by zero)
    await pg.query('SAVEPOINT verify_fail');
    await expect(pg.query(verifySql)).rejects.toThrow(/division by zero/);
    await pg.query('ROLLBACK TO SAVEPOINT verify_fail');

    // deploy restores the exported rows
    await pg.query(deploySql);
    const back = await pg.query('SELECT count(*)::int AS n FROM app_routing_public.apis');
    expect(back.rows[0].n).toBe(2);
    await pg.query(verifySql);

    // re-deploy would violate the PK; conflictDoNothing makes replay idempotent
    const idempotent = await exportTablesData(
      pg,
      [
        { schema: 'app_routing_public', table: 'apis' },
        { schema: 'app_routing_public', table: 'api_schemas' }
      ],
      { excludeColumns: ['dbname'], conflictDoNothing: true }
    );
    await pg.query(buildDataDeployScript(idempotent));
    await pg.query(verifySql);
  });

  it('revert skips tables without ids with a comment', async () => {
    const exports = await exportTablesData(pg, [
      { schema: 'app_routing_public', table: 'settings' }
    ]);
    const revertSql = buildDataRevertScript(exports);
    expect(revertSql).toContain('rows not reverted');
    expect(revertSql).not.toContain('DELETE FROM');
  });
});
