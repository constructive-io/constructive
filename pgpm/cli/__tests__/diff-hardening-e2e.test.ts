/**
 * e2e for the `pgpm diff` hardening against live Postgres: column attribute
 * changes, USING casts on populated tables, declared renames (rows kept),
 * in-place enum/domain/sequence/composite ALTERs, comments/grants/default
 * privileges, NOT VALID constraints, materialized views, and the data-loss /
 * incompleteness policies. The migration deploys on v1 to the catalog of v2
 * (now including types, sequences, views, comments, identity/generated
 * columns and default privileges), verifies, and reverts back to v1.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { diffCatalogSnapshots, loadModule, snapshotCatalog, withoutColumnOrder } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(240000);

afterAll(async () => {
  await teardownPgPools();
});

const WS = 'hard-ws';

const V1 = `
CREATE SCHEMA hx;
CREATE TYPE hx.status AS ENUM ('a', 'b');
CREATE DOMAIN hx.email AS text CHECK (VALUE ~ '@');
CREATE TYPE hx.pt AS (x int, y int);
CREATE SEQUENCE hx.s START 1;
CREATE TABLE hx.t (
  id int PRIMARY KEY,
  code text,
  nm text,
  qty int DEFAULT 0,
  flag boolean NOT NULL DEFAULT false,
  s hx.status DEFAULT 'a',
  e hx.email,
  n bigint DEFAULT nextval('hx.s'),
  p hx.pt
);
COMMENT ON TABLE hx.t IS 'one';
COMMENT ON COLUMN hx.t.id IS 'pk';
GRANT SELECT ON hx.t TO PUBLIC;
CREATE FUNCTION hx.mk(a int) RETURNS hx.pt LANGUAGE sql AS $$ SELECT ROW(a, a)::hx.pt $$;
CREATE TABLE hx.src (id int PRIMARY KEY, v int);
CREATE MATERIALIZED VIEW hx.mv AS SELECT id FROM hx.src;
CREATE INDEX mv_idx ON hx.mv (id);
ALTER DEFAULT PRIVILEGES IN SCHEMA hx GRANT SELECT ON TABLES TO PUBLIC;
`;

const V2 = `
CREATE SCHEMA hx;
CREATE TYPE hx.status AS ENUM ('a', 'b', 'c');
CREATE DOMAIN hx.email AS text CHECK (VALUE ~ '@' AND length(VALUE) > 3);
CREATE TYPE hx.pt AS (x int, y int, z int);
CREATE SEQUENCE hx.s START 100 INCREMENT 5;
CREATE TABLE hx.t (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code int,
  name text NOT NULL DEFAULT 'x',
  qty int,
  flag boolean,
  s hx.status DEFAULT 'b',
  e hx.email,
  n bigint DEFAULT nextval('hx.s'),
  p hx.pt
);
-- NOT VALID is only meaningful as a standalone ALTER (CREATE TABLE validates inline constraints).
ALTER TABLE hx.t ADD CONSTRAINT qty_pos CHECK (qty >= 0) NOT VALID;
COMMENT ON TABLE hx.t IS 'two';
GRANT SELECT, INSERT ON hx.t TO PUBLIC;
CREATE FUNCTION hx.mk(a int) RETURNS hx.pt LANGUAGE sql AS $$ SELECT ROW(a, a, a)::hx.pt $$;
CREATE TABLE hx.src (id int PRIMARY KEY, v int);
CREATE MATERIALIZED VIEW hx.mv AS SELECT id, v FROM hx.src;
CREATE INDEX mv_idx ON hx.mv (id);
ALTER DEFAULT PRIVILEGES IN SCHEMA hx GRANT SELECT, INSERT ON TABLES TO PUBLIC;
`;

const writeModule = (moduleDir: string, name: string, sql: string) => {
  fs.mkdirSync(path.join(moduleDir, 'deploy'), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, 'revert'), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, 'verify'), { recursive: true });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n%uri=https://github.com/test/${name}\n\ninit 2024-01-01T00:00:00Z test <test@example.com> # add init\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${name}.control`),
    `comment = 'Diff hardening e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  fs.writeFileSync(path.join(moduleDir, 'deploy', 'init.sql'), `-- Deploy init to pg\n\nBEGIN;\n\n${sql}\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'revert', 'init.sql'), `-- Revert init from pg\n\nBEGIN;\n\nDROP SCHEMA hx CASCADE;\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'verify', 'init.sql'), `-- Verify init on pg\n\nBEGIN;\n\nROLLBACK;\n`);
};

const withExitThrowing = async (fn: () => Promise<unknown>): Promise<void> => {
  const originalExit = process.exit;
  process.exit = jest.fn((code?: number) => {
    throw new Error(`process.exit called with code ${code}`);
  }) as never;
  try {
    await fn();
  } finally {
    process.exit = originalExit;
  }
};

describe('pgpm diff e2e: hardening', () => {
  let fixture: CLIDeployTestFixture;
  let wsDir: string;
  let v1Db: any;
  let v2Db: any;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    writeModule(path.join(wsDir, 'hard-v1'), 'hard-v1', V1);
    writeModule(path.join(wsDir, 'hard-v2'), 'hard-v2', V2);

    v1Db = await fixture.setupTestDatabase();
    v2Db = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(`
      cd ${WS}/hard-v1
      pgpm deploy --database ${v1Db.name} --package hard-v1 --yes
    `, { database: v1Db.name });
    await fixture.runTerminalCommands(`
      cd ${WS}/hard-v2
      pgpm deploy --database ${v2Db.name} --package hard-v2 --yes
    `, { database: v2Db.name });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('refuses data loss and incompleteness by default, naming the steps', async () => {
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
    try {
      await withExitThrowing(() =>
        expect(fixture.runTerminalCommands(`
          cd ${WS}
          pgpm diff hard-v1 hard-v2 --rename hx.t.nm=hx.t.name --emit-migration . --pkg hard-refused
        `, {})).rejects.toThrow(/process.exit called with code 1/)
      );
    } finally {
      console.error = originalError;
    }
    const text = errors.join('\n');
    expect(text).toMatch(/data loss/);
    expect(text).toMatch(/hx\.t: ALTER COLUMN code TYPE/);
    expect(fs.existsSync(path.join(wsDir, 'hard-refused'))).toBe(false);
  });

  it('migrates v1 to v2 (rows kept through the rename and cast), verifies, and reverts to v1', async () => {
    await fixture.runTerminalCommands(`
      cd ${WS}
      pgpm diff hard-v1 hard-v2 --rename hx.t.nm=hx.t.name --using hx.t.code=nullif(code,'')::int --allow-data-loss --allow-incomplete --emit-migration . --pkg hard-migration
    `, {});
    const migrationDir = path.join(wsDir, 'hard-migration');
    expect(fs.existsSync(path.join(migrationDir, 'pgpm.plan'))).toBe(true);
    const deployed = fs.readdirSync(path.join(migrationDir, 'deploy'), { recursive: true })
      .map(String).filter(f => f.endsWith('.sql'))
      .map(f => fs.readFileSync(path.join(migrationDir, 'deploy', f), 'utf-8')).join('\n');
    expect(deployed).toMatch(/RENAME (COLUMN )?nm TO name/);
    expect(deployed).toMatch(/ALTER COLUMN code TYPE int(eger)? USING/);
    expect(deployed).toMatch(/ALTER TYPE hx\.status ADD VALUE 'c'/);
    expect(deployed).toMatch(/ALTER DOMAIN hx\.email/);
    expect(deployed).toMatch(/ALTER SEQUENCE hx\.s/);
    expect(deployed).toMatch(/ALTER TYPE hx\.pt ADD ATTRIBUTE z/);
    expect(deployed).toMatch(/COMMENT ON TABLE hx\.t IS 'two'/);
    expect(deployed).toMatch(/GRANT INSERT ON (TABLE )?hx\.t TO PUBLIC/);
    expect(deployed).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA hx GRANT INSERT ON TABLES TO PUBLIC/);
    expect(deployed).toMatch(/CHECK \(qty >= 0\) NOT VALID/);
    expect(deployed).not.toMatch(/DROP COLUMN nm/);
    expect(deployed).not.toMatch(/DROP TYPE hx\.status/);
    expect(deployed).not.toMatch(/DROP DOMAIN/);
    expect(deployed).not.toMatch(/DROP SEQUENCE/);

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(`
      cd ${WS}/hard-v1
      pgpm deploy --database ${testDb.name} --package hard-v1 --yes
    `, { database: testDb.name });
    await testDb.query(`INSERT INTO hx.t (id, code, nm, e, p) VALUES (1, '42', 'alice', 'a@b.cd', ROW(1, 2)), (2, '', 'bob', 'x@y.zz', NULL)`);
    await testDb.query(`INSERT INTO hx.src (id, v) VALUES (1, 10)`);

    await fixture.runTerminalCommands(`
      cd ${WS}/hard-migration
      pgpm deploy --database ${testDb.name} --package hard-migration --yes
    `, { database: testDb.name });

    const snapMigrated = await snapshotCatalog(testDb);
    const snapV2 = await snapshotCatalog(v2Db);
    expect(diffCatalogSnapshots(withoutColumnOrder(snapMigrated), withoutColumnOrder(snapV2))).toEqual([]);

    const rows = await testDb.query(`SELECT id, code, name FROM hx.t ORDER BY id`);
    expect(rows.rows).toEqual([
      { id: 1, code: 42, name: 'alice' },
      { id: 2, code: null, name: 'bob' }
    ]);

    await fixture.runTerminalCommands(`
      cd ${WS}/hard-migration
      pgpm verify --database ${testDb.name} --package hard-migration --yes
    `, { database: testDb.name });

    await fixture.runTerminalCommands(`
      cd ${WS}/hard-migration
      pgpm revert --database ${testDb.name} --package hard-migration --yes --no-recursive
    `, { database: testDb.name });
    const snapReverted = await snapshotCatalog(testDb);
    const snapV1 = await snapshotCatalog(v1Db);
    // The enum value 'c' has no inverse (reported as incomplete); everything else returns to v1.
    const residual = diffCatalogSnapshots(withoutColumnOrder(snapReverted), withoutColumnOrder(snapV1));
    expect(residual).toEqual([expect.stringMatching(/types: hx\.status differs/)]);
    const back = await testDb.query(`SELECT id, code, nm FROM hx.t ORDER BY id`);
    expect(back.rows).toEqual([
      { id: 1, code: '42', nm: 'alice' },
      { id: 2, code: null, nm: 'bob' }
    ]);
  });

  it('live-database sides diff equal to their module (type spellings, default casts, identity)', async () => {
    const runJson = async (commands: string): Promise<any> => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      let jsonCall: any[] | undefined;
      try {
        await fixture.runTerminalCommands(commands, {});
        jsonCall = spy.mock.calls.find(args => typeof args[0] === 'string' && args[0].startsWith('{'));
      } finally {
        spy.mockRestore();
      }
      expect(jsonCall).toBeDefined();
      return JSON.parse(jsonCall![0]);
    };
    for (const [module, db] of [['hard-v1', v1Db], ['hard-v2', v2Db]] as const) {
      const parsed = await runJson(`
        cd ${WS}
        pgpm diff ${module} db:${db.name} --json
      `);
      expect(parsed.objects).toEqual([]);
      expect(parsed.identical).toBe(true);
    }
  });
});
