/**
 * e2e for the `pgpm diff` review follow-ups against live Postgres: enum values
 * inserted at the head of the list, a composite attribute inserted mid-list,
 * a removed MINVALUE (implied START), a removed `REVOKE ALL FROM PUBLIC`, a
 * column rename on a table renamed in the same diff, and references to a
 * renamed table from comments, views, policies and functions. Each migration
 * deploys on v1 to the catalog of v2 and reverts back to v1.
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

const WS = 'fu-ws';

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
    `comment = 'Diff follow-ups e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  fs.writeFileSync(path.join(moduleDir, 'deploy', 'init.sql'), `-- Deploy init to pg\n\nBEGIN;\n\n${sql}\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'revert', 'init.sql'), `-- Revert init from pg\n\nBEGIN;\n\nDROP SCHEMA fu CASCADE;\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'verify', 'init.sql'), `-- Verify init on pg\n\nBEGIN;\n\nROLLBACK;\n`);
};

interface Case {
  name: string;
  v1: string;
  v2: string;
  flags: string;
  rows?: string;
  deployed: RegExp[];
  notDeployed?: RegExp[];
  /** Catalog differences that remain after the revert (Postgres cannot remove enum values). */
  revertResidual?: RegExp[];
  /** Catalog differences that remain after the forward migration (documented, reported as incomplete). */
  forwardResidual?: RegExp[];
}

const CASES: Case[] = [
  {
    name: 'enum-head',
    v1: `CREATE SCHEMA fu; CREATE TYPE fu.status AS ENUM ('a'); CREATE TABLE fu.t (id int PRIMARY KEY, s fu.status);`,
    v2: `CREATE SCHEMA fu; CREATE TYPE fu.status AS ENUM ('x', 'y', 'a'); CREATE TABLE fu.t (id int PRIMARY KEY, s fu.status);`,
    flags: '--allow-incomplete',
    deployed: [/ADD VALUE 'x' BEFORE 'a'/, /ADD VALUE 'y' AFTER 'x'/],
    revertResidual: [/types: fu\.status differs/]
  },
  {
    name: 'composite-mid',
    v1: `CREATE SCHEMA fu; CREATE TYPE fu.pt AS (a int, b int); CREATE TABLE fu.t (id int PRIMARY KEY, p fu.pt);`,
    v2: `CREATE SCHEMA fu; CREATE TYPE fu.pt AS (a int, c int, b int); CREATE TABLE fu.t (id int PRIMARY KEY, p fu.pt);`,
    flags: '--allow-incomplete',
    deployed: [/ALTER TYPE fu\.pt ADD ATTRIBUTE c/],
    // ADD ATTRIBUTE appends: the attribute order differs from v2 and pgpm says so (incomplete).
    forwardResidual: [/types: fu\.pt differs/]
  },
  {
    name: 'sequence-minvalue',
    v1: `CREATE SCHEMA fu; CREATE SEQUENCE fu.s MINVALUE 5 MAXVALUE 1000 CACHE 10;`,
    v2: `CREATE SCHEMA fu; CREATE SEQUENCE fu.s;`,
    flags: '',
    deployed: [/NO MINVALUE/, /START (WITH )?1\b/]
  },
  {
    name: 'revoke-public',
    v1: [
      'CREATE SCHEMA fu; CREATE TABLE fu.t (id int PRIMARY KEY); REVOKE ALL ON TABLE fu.t FROM PUBLIC;',
      'CREATE FUNCTION fu.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; REVOKE ALL ON FUNCTION fu.f() FROM PUBLIC;'
    ].join('\n'),
    v2: `CREATE SCHEMA fu; CREATE TABLE fu.t (id int PRIMARY KEY); CREATE FUNCTION fu.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;`,
    flags: '',
    deployed: [/GRANT ALL ON FUNCTION fu\.f\(\) TO PUBLIC/],
    notDeployed: [/GRANT ALL ON (TABLE )?fu\.t TO PUBLIC/]
  },
  {
    name: 'rename-table-and-column',
    v1: `CREATE SCHEMA fu; CREATE TABLE fu.old (id int PRIMARY KEY, col text);`,
    v2: `CREATE SCHEMA fu; CREATE TABLE fu.new (id int PRIMARY KEY, name text);`,
    flags: '--rename fu.old=fu.new --rename fu.old.col=fu.new.name',
    rows: `INSERT INTO fu.old VALUES (1, 'kept')`,
    deployed: [/ALTER TABLE fu\.old RENAME TO new/, /RENAME (COLUMN )?col TO name/],
    notDeployed: [/DROP COLUMN/, /DROP TABLE/]
  },
  {
    name: 'rename-references',
    v1: [
      'CREATE SCHEMA fu; CREATE TABLE fu.old (id int PRIMARY KEY, col text);',
      "COMMENT ON TABLE fu.old IS 'the table'; COMMENT ON COLUMN fu.old.col IS 'the col';",
      'GRANT SELECT ON TABLE fu.old TO PUBLIC;',
      'ALTER TABLE fu.old ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fu.old FOR SELECT USING (true);',
      'CREATE VIEW fu.v AS SELECT old.id, old.col FROM fu.old;',
      'CREATE FUNCTION fu.f() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM fu.old $$;'
    ].join('\n'),
    v2: [
      'CREATE SCHEMA fu; CREATE TABLE fu.new (id int PRIMARY KEY, col text);',
      "COMMENT ON TABLE fu.new IS 'the table'; COMMENT ON COLUMN fu.new.col IS 'the col';",
      'GRANT SELECT ON TABLE fu.new TO PUBLIC;',
      'ALTER TABLE fu.new ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fu.new FOR SELECT USING (true);',
      'CREATE VIEW fu.v AS SELECT new.id, new.col FROM fu.new;',
      'CREATE FUNCTION fu.f() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM fu.new $$;'
    ].join('\n'),
    flags: '--rename fu.old=fu.new',
    deployed: [/ALTER TABLE fu\.old RENAME TO new/, /CREATE OR REPLACE FUNCTION fu\.f\(\)/],
    notDeployed: [/COMMENT ON/, /DROP VIEW/, /DROP POLICY/, /REVOKE/]
  },
  {
    name: 'rename-rebuild',
    v1: 'CREATE SCHEMA fu; CREATE TABLE fu.old (id int PRIMARY KEY, col text); CREATE VIEW fu.v AS SELECT old.id, old.col FROM fu.old;',
    v2: 'CREATE SCHEMA fu; CREATE TABLE fu.new (id int PRIMARY KEY, col int); CREATE VIEW fu.v AS SELECT new.id, new.col FROM fu.new;',
    flags: '--rename fu.old=fu.new --allow-data-loss',
    deployed: [/ALTER TABLE fu\.old RENAME TO new/, /DROP VIEW fu\.v/, /ALTER COLUMN col TYPE int/, /CREATE VIEW fu\.v/]
  },
  {
    name: 'rename-alias',
    v1: 'CREATE SCHEMA fu; CREATE TABLE fu.old (id int PRIMARY KEY); CREATE TABLE fu.other (id int PRIMARY KEY, n int); CREATE VIEW fu.v AS SELECT old.id, old.n FROM fu.other AS old;',
    v2: 'CREATE SCHEMA fu; CREATE TABLE fu.new (id int PRIMARY KEY); CREATE TABLE fu.other (id int PRIMARY KEY, n int); CREATE VIEW fu.v AS SELECT old.id, old.n FROM fu.other AS old;',
    flags: '--rename fu.old=fu.new',
    deployed: [/ALTER TABLE fu\.old RENAME TO new/],
    notDeployed: [/VIEW/]
  }
];

describe('pgpm diff e2e: review follow-ups', () => {
  let fixture: CLIDeployTestFixture;
  let wsDir: string;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  for (const c of CASES) {
    it(`${c.name}: migrates v1 to v2 and reverts to v1`, async () => {
      const v1 = `${c.name}-v1`;
      const v2 = `${c.name}-v2`;
      const mig = `${c.name}-mig`;
      writeModule(path.join(wsDir, v1), v1, c.v1);
      writeModule(path.join(wsDir, v2), v2, c.v2);
      const v2Db = await fixture.setupTestDatabase();
      const testDb = await fixture.setupTestDatabase();
      for (const [db, pkg] of [[v2Db, v2], [testDb, v1]] as const) {
        await fixture.runTerminalCommands(`
          cd ${WS}/${pkg}
          pgpm deploy --database ${db.name} --package ${pkg} --yes
        `, { database: db.name });
      }
      const v1Catalog = withoutColumnOrder(await snapshotCatalog(testDb));
      if (c.rows) await testDb.query(c.rows);

      await fixture.runTerminalCommands(`
        cd ${WS}
        pgpm diff ${v1} ${v2} ${c.flags} --emit-migration . --pkg ${mig}
      `, {});
      const migrationDir = path.join(wsDir, mig);
      const deployed = fs.readdirSync(path.join(migrationDir, 'deploy'), { recursive: true })
        .map(String).filter(f => f.endsWith('.sql'))
        .map(f => fs.readFileSync(path.join(migrationDir, 'deploy', f), 'utf-8')).join('\n');
      for (const re of c.deployed) expect(deployed).toMatch(re);
      for (const re of c.notDeployed ?? []) expect(deployed).not.toMatch(re);

      await fixture.runTerminalCommands(`
        cd ${WS}/${mig}
        pgpm deploy --database ${testDb.name} --package ${mig} --yes
      `, { database: testDb.name });
      const forward = diffCatalogSnapshots(withoutColumnOrder(await snapshotCatalog(testDb)), withoutColumnOrder(await snapshotCatalog(v2Db)));
      expect(forward).toEqual((c.forwardResidual ?? []).map(re => expect.stringMatching(re)));
      if (c.rows) {
        const rows = await testDb.query('SELECT id, name FROM fu.new ORDER BY id');
        expect(rows.rows).toEqual([{ id: 1, name: 'kept' }]);
      }

      await fixture.runTerminalCommands(`
        cd ${WS}/${mig}
        pgpm revert --database ${testDb.name} --package ${mig} --yes --no-recursive
      `, { database: testDb.name });
      const back = diffCatalogSnapshots(withoutColumnOrder(await snapshotCatalog(testDb)), v1Catalog);
      expect(back).toEqual((c.revertResidual ?? []).map(re => expect.stringMatching(re)));
    });
  }

  it('an enum value added and used in the same migration is named: Postgres cannot use it before the transaction commits', async () => {
    const v1 = 'enum-used-v1';
    const v2 = 'enum-used-v2';
    writeModule(path.join(wsDir, v1), v1, `CREATE SCHEMA fu; CREATE TYPE fu.status AS ENUM ('a', 'b'); CREATE TABLE fu.t (id int PRIMARY KEY, s fu.status NOT NULL DEFAULT 'a');`);
    writeModule(path.join(wsDir, v2), v2, `CREATE SCHEMA fu; CREATE TYPE fu.status AS ENUM ('a', 'b', 'c'); CREATE TABLE fu.t (id int PRIMARY KEY, s fu.status NOT NULL DEFAULT 'c');`);
    await fixture.runTerminalCommands(`
      cd ${WS}
      pgpm diff ${v1} ${v2} --allow-incomplete --emit-migration . --pkg enum-used-mig
    `, {});
    const deployed = fs.readdirSync(path.join(wsDir, 'enum-used-mig', 'deploy'), { recursive: true })
      .map(String).filter(f => f.endsWith('.sql'))
      .map(f => fs.readFileSync(path.join(wsDir, 'enum-used-mig', 'deploy', f), 'utf-8')).join('\n');
    expect(deployed).toMatch(/--no-tx/);
    // Without a transaction per deploy, the migration applies and reaches v2.
    const v2Db = await fixture.setupTestDatabase();
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(`
      cd ${WS}/${v2}
      pgpm deploy --database ${v2Db.name} --package ${v2} --yes
    `, { database: v2Db.name });
    await fixture.runTerminalCommands(`
      cd ${WS}/${v1}
      pgpm deploy --database ${testDb.name} --package ${v1} --yes
    `, { database: testDb.name });
    await fixture.runTerminalCommands(`
      cd ${WS}/enum-used-mig
      pgpm deploy --database ${testDb.name} --package enum-used-mig --yes --no-tx
    `, { database: testDb.name });
    const forward = diffCatalogSnapshots(withoutColumnOrder(await snapshotCatalog(testDb)), withoutColumnOrder(await snapshotCatalog(v2Db)));
    expect(forward).toEqual([]);
  });
});
