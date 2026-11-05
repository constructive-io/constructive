/**
 * e2e for `pgpm diff` against live Postgres.
 *
 * v1 -> v2 covers: new table, new column, dropped column, changed function
 * body, new policy, dropped index, changed constraint. The emitted migration
 * deploys on top of v1 to a catalog equivalent to v2, its verify passes, and
 * its revert returns to v1. Dial-invariance is proven by diffing v1 against
 * its consolidated transform (empty diff), and --verify exercises the oracle.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { readBundleArchiveFile } from '@pgpmjs/core';
import { loadDiffSideFromDisk } from '@pgpmjs/diff';
import { diffCatalogSnapshots, diffChangeSets, loadModule, snapshotCatalog, withoutColumnOrder } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(180000);

afterAll(async () => {
  await teardownPgPools();
});

const WS = 'diff-ws';

interface ChangeSpec {
  name: string;
  deps?: string[];
  deploy: string;
}

const V1: ChangeSpec[] = [
  { name: 'schemas/dfx/schema', deploy: 'CREATE SCHEMA dfx;' },
  {
    name: 'schemas/dfx/tables/products/table',
    deps: ['schemas/dfx/schema'],
    deploy: [
      'CREATE TABLE dfx.products (',
      '  id serial PRIMARY KEY,',
      '  price int NOT NULL,',
      '  CONSTRAINT price_positive CHECK (price > 0),',
      '  nickname text',
      ');'
    ].join('\n')
  },
  {
    name: 'schemas/dfx/procedures/product_count',
    deps: ['schemas/dfx/tables/products/table'],
    deploy:
      'CREATE FUNCTION dfx.product_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM dfx.products $$;'
  },
  {
    name: 'schemas/dfx/tables/products/indexes/products_price_idx',
    deps: ['schemas/dfx/tables/products/table'],
    deploy: 'CREATE INDEX products_price_idx ON dfx.products (price);'
  }
];

const V2: ChangeSpec[] = [
  { name: 'schemas/dfx/schema', deploy: 'CREATE SCHEMA dfx;' },
  {
    // changed constraint, dropped column (nickname), new column (sku)
    name: 'schemas/dfx/tables/products/table',
    deps: ['schemas/dfx/schema'],
    deploy: [
      'CREATE TABLE dfx.products (',
      '  id serial PRIMARY KEY,',
      '  price int NOT NULL,',
      '  CONSTRAINT price_positive CHECK (price >= 0),',
      '  sku text',
      ');'
    ].join('\n')
  },
  {
    // changed function body
    name: 'schemas/dfx/procedures/product_count',
    deps: ['schemas/dfx/tables/products/table'],
    deploy:
      'CREATE FUNCTION dfx.product_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(1) FROM dfx.products $$;'
  },
  {
    // new table
    name: 'schemas/dfx/tables/orders/table',
    deps: ['schemas/dfx/tables/products/table'],
    deploy: 'CREATE TABLE dfx.orders (id serial PRIMARY KEY, product_id int NOT NULL REFERENCES dfx.products (id));'
  },
  {
    // new policy
    name: 'schemas/dfx/tables/products/policies/products_read',
    deps: ['schemas/dfx/tables/products/table'],
    deploy: [
      'ALTER TABLE dfx.products ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY products_read ON dfx.products FOR SELECT USING (true);'
    ].join('\n')
  }
  // dropped index: products_price_idx exists only in v1
];

const writeModule = (moduleDir: string, name: string, changes: ChangeSpec[]) => {
  fs.mkdirSync(moduleDir, { recursive: true });
  const planLines = changes.map((c, i) => {
    const deps = c.deps && c.deps.length > 0 ? ` [${c.deps.join(' ')}]` : '';
    return `${c.name}${deps} 2024-01-0${(i % 9) + 1}T00:00:00Z test <test@example.com> # add ${c.name}`;
  });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n%uri=https://github.com/test/${name}\n\n${planLines.join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${name}.control`),
    `comment = 'Diff e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  for (const c of changes) {
    const filePath = path.join(moduleDir, 'deploy', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `-- Deploy ${c.name} to pg\n\nBEGIN;\n\n${c.deploy}\n\nCOMMIT;\n`);
    const revertPath = path.join(moduleDir, 'revert', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(revertPath), { recursive: true });
    fs.writeFileSync(revertPath, `-- Revert ${c.name} from pg\n\nBEGIN;\n\n-- noop\n\nCOMMIT;\n`);
    const verifyPath = path.join(moduleDir, 'verify', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(verifyPath), { recursive: true });
    fs.writeFileSync(verifyPath, `-- Verify ${c.name} on pg\n\nBEGIN;\n\nROLLBACK;\n`);
  }
};

describe('pgpm diff e2e', () => {
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
    writeModule(path.join(wsDir, 'diff-v1'), 'diff-v1', V1);
    writeModule(path.join(wsDir, 'diff-v2'), 'diff-v2', V2);

    v1Db = await fixture.setupTestDatabase();
    v2Db = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-v1
      pgpm deploy --database ${v1Db.name} --package diff-v1 --yes
      `,
      { database: v1Db.name }
    );
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-v2
      pgpm deploy --database ${v2Db.name} --package diff-v2 --yes
      `,
      { database: v2Db.name }
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('diffs a module against itself as identical, dial-invariantly', async () => {
    const v1 = loadDiffSideFromDisk(path.join(wsDir, 'diff-v1'));
    expect(diffChangeSets(v1.changes, v1.changes).identical).toBe(true);

    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-v1
      pgpm transform --granularity consolidated
      `,
      {}
    );
    const consolidated = loadDiffSideFromDisk(path.join(wsDir, 'diff-v1-consolidated'));
    expect(diffChangeSets(v1.changes, consolidated.changes).identical).toBe(true);
  });

  it('emits a migration that deploys v1 to v2, verifies, and reverts back to v1', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-v1 diff-v2 --emit-migration . --pkg diff-migration --allow-data-loss
      `,
      {}
    );
    const migrationDir = path.join(wsDir, 'diff-migration');
    expect(fs.existsSync(path.join(migrationDir, 'pgpm.plan'))).toBe(true);

    // deploy v1 fresh, then the migration on top -> catalog equivalent to v2
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-v1
      pgpm deploy --database ${testDb.name} --package diff-v1 --yes
      cd ../diff-migration
      pgpm deploy --database ${testDb.name} --package diff-migration --yes
      `,
      { database: testDb.name }
    );

    const snapMigrated = await snapshotCatalog(testDb);
    const snapV2 = await snapshotCatalog(v2Db);
    // column order is physical: drop+add cannot reproduce fresh ordinals
    expect(diffCatalogSnapshots(withoutColumnOrder(snapMigrated), withoutColumnOrder(snapV2))).toEqual([]);

    // the migration's own verify passes
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-migration
      pgpm verify --database ${testDb.name} --package diff-migration --yes
      `,
      { database: testDb.name }
    );

    // revert returns to v1
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-migration
      pgpm revert --database ${testDb.name} --package diff-migration --yes
      `,
      { database: testDb.name }
    );
    const snapReverted = await snapshotCatalog(testDb);
    const snapV1 = await snapshotCatalog(v1Db);
    expect(diffCatalogSnapshots(withoutColumnOrder(snapReverted), withoutColumnOrder(snapV1))).toEqual([]);
  });

  it('composes module, linear SQL, and bundle projections from one run', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-v1 diff-v2 --emit-module . --pkg diff-compose --emit-sql migration.sql --emit-bundle migration.bundle.tar.gz --allow-data-loss
      `,
      {}
    );

    // module projection
    const moduleDir = path.join(wsDir, 'diff-compose');
    expect(fs.existsSync(path.join(moduleDir, 'pgpm.plan'))).toBe(true);

    // linear SQL projection: one consolidated file, statements in plan order
    const sql = fs.readFileSync(path.join(wsDir, 'migration.sql'), 'utf-8');
    expect(sql).toMatch(/CREATE TABLE dfx\.orders/);
    expect(sql).toMatch(/DROP INDEX/i);

    // bundle projection: a readable content-addressed archive of the changes
    const bundle = readBundleArchiveFile(path.join(wsDir, 'migration.bundle.tar.gz'));
    expect(bundle.changes.length).toBeGreaterThan(0);
  });

  it('appends the delta into an existing module and fresh-deploys to the v2 catalog', async () => {
    // A standalone module with v1's schema (named so pgpm can deploy it), so
    // the shared diff-v1 module is untouched.
    const appendDir = path.join(wsDir, 'diff-append');
    writeModule(appendDir, 'diff-append', V1);
    const originalChangeCount = V1.length;
    // existing change scripts must be left byte-for-byte untouched
    const sentinel = 'schemas/dfx/tables/products/table';
    const deployBefore = fs.readFileSync(path.join(appendDir, 'deploy', `${sentinel}.sql`), 'utf-8');

    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-append diff-v2 --append-module diff-append --allow-data-loss
      `,
      {}
    );

    // existing changes are preserved (names + untouched scripts) and new ones appended
    const planAfter = fs.readFileSync(path.join(appendDir, 'pgpm.plan'), 'utf-8');
    for (const c of V1) expect(planAfter).toContain(c.name);
    const changeLines = planAfter
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('%') && !l.startsWith('@'));
    expect(changeLines.length).toBeGreaterThan(originalChangeCount);
    expect(fs.readFileSync(path.join(appendDir, 'deploy', `${sentinel}.sql`), 'utf-8')).toBe(deployBefore);

    // the appended module (v1 + delta) fresh-deploys to a v2-equivalent catalog
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-append
      pgpm deploy --database ${testDb.name} --package diff-append --yes
      `,
      { database: testDb.name }
    );
    const snapAppended = await snapshotCatalog(testDb);
    const snapV2 = await snapshotCatalog(v2Db);
    expect(diffCatalogSnapshots(withoutColumnOrder(snapAppended), withoutColumnOrder(snapV2))).toEqual([]);
  });

  it.each(['atomic', 'object', 'consolidated'])(
    'emits a %s-granularity migration that reaches the same v2 catalog (dial parity)',
    async granularity => {
      const pkg = `diff-mig-${granularity}`;
      await fixture.runTerminalCommands(
        `
        cd ${WS}
        pgpm diff diff-v1 diff-v2 --emit-migration . --pkg ${pkg} --granularity ${granularity} --allow-data-loss
        `,
        {}
      );
      expect(fs.existsSync(path.join(wsDir, pkg, 'pgpm.plan'))).toBe(true);

      // deploy v1 fresh, then this dial's migration -> catalog equivalent to v2,
      // regardless of how atomic/consolidated the emitted changes are.
      const testDb = await fixture.setupTestDatabase();
      await fixture.runTerminalCommands(
        `
        cd ${WS}/diff-v1
        pgpm deploy --database ${testDb.name} --package diff-v1 --yes
        cd ../${pkg}
        pgpm deploy --database ${testDb.name} --package ${pkg} --yes
        `,
        { database: testDb.name }
      );

      const snapMigrated = await snapshotCatalog(testDb);
      const snapV2 = await snapshotCatalog(v2Db);
      expect(diffCatalogSnapshots(withoutColumnOrder(snapMigrated), withoutColumnOrder(snapV2))).toEqual([]);
    }
  );

  it('emits an alteration-change-granularity migration that reaches the same v2 catalog', async () => {
    const pkg = 'diff-mig-alteration';
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-v1 diff-v2 --emit-migration . --pkg ${pkg} --granularity atomic --change-granularity alteration --allow-data-loss
      `,
      {}
    );
    expect(fs.existsSync(path.join(wsDir, pkg, 'pgpm.plan'))).toBe(true);

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/diff-v1
      pgpm deploy --database ${testDb.name} --package diff-v1 --yes
      cd ../${pkg}
      pgpm deploy --database ${testDb.name} --package ${pkg} --yes
      `,
      { database: testDb.name }
    );

    const snapMigrated = await snapshotCatalog(testDb);
    const snapV2 = await snapshotCatalog(v2Db);
    expect(diffCatalogSnapshots(withoutColumnOrder(snapMigrated), withoutColumnOrder(snapV2))).toEqual([]);
  });

  it('--verify proves the emitted migration is a catalog-level oracle match', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-v1 diff-v2 --verify --allow-data-loss
      `,
      {}
    );
  });

  it('diffs a module against a raw .sql file', async () => {
    const flat = V2.map(c => c.deploy).join('\n\n');
    fs.writeFileSync(path.join(wsDir, 'v2-flat.sql'), flat);
    const v1 = loadDiffSideFromDisk(path.join(wsDir, 'diff-v1'));
    const v2File = loadDiffSideFromDisk(path.join(wsDir, 'v2-flat.sql'));
    const v2Module = loadDiffSideFromDisk(path.join(wsDir, 'diff-v2'));

    // module-vs-file and module-vs-module agree
    expect(diffChangeSets(v2Module.changes, v2File.changes).identical).toBe(true);
    const result = diffChangeSets(v1.changes, v2File.changes);
    expect(result.identical).toBe(false);
    expect(result.objects.map(o => `${o.delta} ${o.path}`).sort()).toEqual(
      diffChangeSets(v1.changes, v2Module.changes).objects.map(o => `${o.delta} ${o.path}`).sort()
    );
  });
});

/**
 * Dependency order across the whole delta. v1 -> v2 covers: objects added on
 * a NEW column of an existing table (view, index, policy, function), an FK
 * cycle between a new table and an existing table's new column, a replaced
 * view that stops using a dropped column, a same-signature function body
 * change under an existing view, a column type change under an unchanged
 * view, a dropped table, and a PL/pgSQL body reference to a table created
 * later (late, must not constrain order).
 */
const DEP_V1: ChangeSpec[] = [
  { name: 'schemas/dep/schema', deploy: 'CREATE SCHEMA dep;' },
  {
    name: 'schemas/dep/tables/a/table',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE TABLE dep.a (id int PRIMARY KEY, n int, y int);'
  },
  {
    name: 'schemas/dep/tables/c/table',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE TABLE dep.c (id int PRIMARY KEY);'
  },
  {
    name: 'schemas/dep/views/av/view',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE VIEW dep.av AS SELECT a.id, a.y FROM dep.a a;'
  },
  {
    name: 'schemas/dep/views/nv/view',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE VIEW dep.nv AS SELECT a.n FROM dep.a a;'
  },
  {
    name: 'schemas/dep/procedures/f/procedure',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE FUNCTION dep.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;'
  },
  {
    name: 'schemas/dep/views/fv/view',
    deps: ['schemas/dep/procedures/f/procedure'],
    deploy: 'CREATE VIEW dep.fv AS SELECT dep.f() AS v;'
  }
];

const DEP_V2: ChangeSpec[] = [
  { name: 'schemas/dep/schema', deploy: 'CREATE SCHEMA dep;' },
  {
    // n: int -> bigint (under unchanged view nv); +x (unique); -y
    name: 'schemas/dep/tables/a/table',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE TABLE dep.a (id int PRIMARY KEY, n bigint, x int UNIQUE);'
  },
  {
    // new table, FK -> existing table's new column
    name: 'schemas/dep/tables/b/table',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE TABLE dep.b (id int PRIMARY KEY, a_x int REFERENCES dep.a (x));'
  },
  {
    // existing table gains an FK -> the new table (cycle with the one above)
    name: 'schemas/dep/tables/a/constraints/a_b_id_fkey/constraint',
    deps: ['schemas/dep/tables/a/table', 'schemas/dep/tables/b/table'],
    deploy: 'ALTER TABLE dep.a ADD COLUMN b_id int;\nALTER TABLE dep.a ADD CONSTRAINT a_b_id_fkey FOREIGN KEY (b_id) REFERENCES dep.b (id);'
  },
  {
    // replaced view: stops using y, starts using x
    name: 'schemas/dep/views/av/view',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE VIEW dep.av AS SELECT a.id, a.x FROM dep.a a;'
  },
  {
    name: 'schemas/dep/views/nv/view',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE VIEW dep.nv AS SELECT a.n FROM dep.a a;'
  },
  {
    // same signature, new body, under existing view fv
    name: 'schemas/dep/procedures/f/procedure',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE FUNCTION dep.f() RETURNS int LANGUAGE sql AS $$ SELECT 2 $$;'
  },
  {
    name: 'schemas/dep/views/fv/view',
    deps: ['schemas/dep/procedures/f/procedure'],
    deploy: 'CREATE VIEW dep.fv AS SELECT dep.f() AS v;'
  },
  {
    name: 'schemas/dep/tables/a/indexes/a_x_idx',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE INDEX a_x_idx ON dep.a (x);'
  },
  {
    name: 'schemas/dep/tables/a/policies/a_read',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'ALTER TABLE dep.a ENABLE ROW LEVEL SECURITY;\nCREATE POLICY a_read ON dep.a FOR SELECT USING (x > 0);'
  },
  {
    name: 'schemas/dep/procedures/sum_x/procedure',
    deps: ['schemas/dep/tables/a/table'],
    deploy: 'CREATE FUNCTION dep.sum_x() RETURNS bigint LANGUAGE sql AS $$ SELECT sum(x) FROM dep.a $$;'
  },
  {
    // PL/pgSQL body references dep.late_t, which is created after it
    name: 'schemas/dep/procedures/count_late/procedure',
    deps: ['schemas/dep/schema'],
    deploy:
      'CREATE FUNCTION dep.count_late() RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN RETURN (SELECT count(*) FROM dep.late_t); END $$;'
  },
  {
    name: 'schemas/dep/tables/late_t/table',
    deps: ['schemas/dep/schema'],
    deploy: 'CREATE TABLE dep.late_t (id int PRIMARY KEY);'
  }
  // dropped table: dep.c exists only in v1
];

describe('pgpm diff e2e: dependency order across the whole delta', () => {
  const DWS = 'dep-ws';
  let fixture: CLIDeployTestFixture;
  let wsDir: string;
  let v1Db: any;
  let v2Db: any;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, DWS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    writeModule(path.join(wsDir, 'dep-v1'), 'dep-v1', DEP_V1);
    writeModule(path.join(wsDir, 'dep-v2'), 'dep-v2', DEP_V2);

    v1Db = await fixture.setupTestDatabase();
    v2Db = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/dep-v1
      pgpm deploy --database ${v1Db.name} --package dep-v1 --yes
      `,
      { database: v1Db.name }
    );
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/dep-v2
      pgpm deploy --database ${v2Db.name} --package dep-v2 --yes
      `,
      { database: v2Db.name }
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  const expectCatalog = async (db: any, oracle: any) => {
    const [actual, expected] = await Promise.all([snapshotCatalog(db), snapshotCatalog(oracle)]);
    expect(diffCatalogSnapshots(withoutColumnOrder(actual), withoutColumnOrder(expected))).toEqual([]);
  };

  /** Deploy v1 fresh, deploy `pkg` on top (must reach v2), verify it, revert it (must reach v1). */
  const migrateVerifyRevert = async (pkg: string) => {
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/dep-v1
      pgpm deploy --database ${testDb.name} --package dep-v1 --yes
      cd ../${pkg}
      pgpm deploy --database ${testDb.name} --package ${pkg} --yes
      `,
      { database: testDb.name }
    );
    await expectCatalog(testDb, v2Db);
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/${pkg}
      pgpm verify --database ${testDb.name} --package ${pkg} --yes
      pgpm revert --database ${testDb.name} --package ${pkg} --yes
      `,
      { database: testDb.name }
    );
    await expectCatalog(testDb, v1Db);
  };

  it.each([
    ['dep-mig', ''],
    ['dep-mig-atomic', '--granularity atomic'],
    ['dep-mig-consolidated', '--granularity consolidated'],
    ['dep-mig-alteration', '--granularity atomic --change-granularity alteration'],
    ['dep-mig-single', '--change-granularity single']
  ])('%s: the emitted migration deploys v1 to v2, verifies, and reverts to v1 (%s)', async (pkg, dials) => {
    await fixture.runTerminalCommands(
      `
      cd ${DWS}
      pgpm diff dep-v1 dep-v2 --emit-migration . --pkg ${pkg} ${dials} --allow-data-loss
      `,
      {}
    );
    expect(fs.existsSync(path.join(wsDir, pkg, 'pgpm.plan'))).toBe(true);
    await migrateVerifyRevert(pkg);
  });

  it('every change requires what it really depends on (graph edges, not a chain)', async () => {
    const v1 = loadDiffSideFromDisk(path.join(wsDir, 'dep-v1'));
    const v2 = loadDiffSideFromDisk(path.join(wsDir, 'dep-v2'));
    const result = diffChangeSets(v1.changes, v2.changes);
    const names = result.changes.map(c => c.name);
    const withDeploy = (needle: string) => result.changes.find(c => c.deploy.includes(needle))!;

    const addX = withDeploy('ADD COLUMN x');
    for (const needle of ['CREATE VIEW dep.av', 'CREATE INDEX a_x_idx', 'CREATE POLICY a_read', 'CREATE FUNCTION dep.sum_x']) {
      const dependent = withDeploy(needle);
      expect(names.indexOf(dependent.name)).toBeGreaterThan(names.indexOf(addX.name));
      expect(dependent.dependencies).toContain(addX.name);
    }
    const b = withDeploy('CREATE TABLE dep.b');
    const aFk = withDeploy('REFERENCES dep.b');
    expect(aFk.dependencies).toContain(b.name);
    const countLate = withDeploy('CREATE FUNCTION dep.count_late');
    expect(countLate.dependencies).not.toContain(withDeploy('CREATE TABLE dep.late_t').name);
    // same-signature body change: replace in place, never drop under dep.fv
    expect(withDeploy('CREATE OR REPLACE FUNCTION dep.f')).toBeDefined();
    expect(result.changes.some(c => c.deploy.includes('DROP FUNCTION dep.f'))).toBe(false);
  });

  it('the linear SQL projection applies on v1 and reaches v2', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${DWS}
      pgpm diff dep-v1 dep-v2 --emit-sql dep-migration.sql --emit-bundle dep-migration.bundle.tar.gz --allow-data-loss
      `,
      {}
    );
    const sql = fs.readFileSync(path.join(wsDir, 'dep-migration.sql'), 'utf-8');
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/dep-v1
      pgpm deploy --database ${testDb.name} --package dep-v1 --yes
      `,
      { database: testDb.name }
    );
    await testDb.query(sql);
    await expectCatalog(testDb, v2Db);
    expect(readBundleArchiveFile(path.join(wsDir, 'dep-migration.bundle.tar.gz')).changes.length).toBeGreaterThan(0);
  });

  it('appends the delta into a v1 module that then fresh-deploys to v2', async () => {
    const appendDir = path.join(wsDir, 'dep-append');
    writeModule(appendDir, 'dep-append', DEP_V1);
    await fixture.runTerminalCommands(
      `
      cd ${DWS}
      pgpm diff dep-append dep-v2 --append-module dep-append --allow-data-loss
      `,
      {}
    );
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${DWS}/dep-append
      pgpm deploy --database ${testDb.name} --package dep-append --yes
      `,
      { database: testDb.name }
    );
    await expectCatalog(testDb, v2Db);
  });

  it('db-vs-db sources emit the same deployable migration', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${DWS}
      pgpm diff db:${v1Db.name} db:${v2Db.name} --emit-migration . --pkg dep-dbdiff --allow-data-loss
      `,
      {}
    );
    await migrateVerifyRevert('dep-dbdiff');
  });

  it('--verify proves the migration is a catalog-level oracle match', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${DWS}
      pgpm diff dep-v1 dep-v2 --verify --allow-data-loss
      `,
      {}
    );
  });
});

const COL_V1: ChangeSpec[] = [
  { name: 'schemas/col/schema', deploy: 'CREATE SCHEMA col;' },
  {
    name: 'schemas/col/tables/p/table',
    deps: ['schemas/col/schema'],
    deploy: 'CREATE TABLE col.p (id int PRIMARY KEY);'
  },
  {
    name: 'schemas/col/tables/t/table',
    deps: ['schemas/col/tables/p/table'],
    deploy: [
      'CREATE TABLE col.t (',
      '  id int PRIMARY KEY,',
      '  a int,',
      '  b int,',
      '  CONSTRAINT t_a_check CHECK (a > 0),',
      '  CONSTRAINT t_a_b_key UNIQUE (a, b),',
      '  CONSTRAINT t_a_fkey FOREIGN KEY (a) REFERENCES col.p (id)',
      ');'
    ].join('\n')
  }
];

const COL_V2: ChangeSpec[] = [
  { name: 'schemas/col/schema', deploy: 'CREATE SCHEMA col;' },
  {
    name: 'schemas/col/tables/p/table',
    deps: ['schemas/col/schema'],
    deploy: 'CREATE TABLE col.p (id int PRIMARY KEY);'
  },
  {
    name: 'schemas/col/tables/t/table',
    deps: ['schemas/col/tables/p/table'],
    deploy: 'CREATE TABLE col.t (id int PRIMARY KEY, b int);'
  }
];

describe('pgpm diff e2e: a column removed together with the constraints on it', () => {
  const CWS = 'col-ws';
  let fixture: CLIDeployTestFixture;
  let wsDir: string;
  let v1Db: any;
  let v2Db: any;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, CWS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    writeModule(path.join(wsDir, 'col-v1'), 'col-v1', COL_V1);
    writeModule(path.join(wsDir, 'col-v2'), 'col-v2', COL_V2);

    v1Db = await fixture.setupTestDatabase();
    v2Db = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${CWS}/col-v1
      pgpm deploy --database ${v1Db.name} --package col-v1 --yes
      `,
      { database: v1Db.name }
    );
    await fixture.runTerminalCommands(
      `
      cd ${CWS}/col-v2
      pgpm deploy --database ${v2Db.name} --package col-v2 --yes
      `,
      { database: v2Db.name }
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  const expectCatalog = async (db: any, oracle: any) => {
    const [actual, expected] = await Promise.all([snapshotCatalog(db), snapshotCatalog(oracle)]);
    expect(diffCatalogSnapshots(withoutColumnOrder(actual), withoutColumnOrder(expected))).toEqual([]);
  };

  it.each([
    ['col-mig', ''],
    ['col-mig-atomic', '--granularity atomic'],
    ['col-mig-consolidated', '--granularity consolidated'],
    ['col-mig-alteration', '--granularity atomic --change-granularity alteration'],
    ['col-mig-single', '--change-granularity single']
  ])('%s: the emitted migration deploys v1 to v2, verifies, and reverts to v1 (%s)', async (pkg, dials) => {
    await fixture.runTerminalCommands(
      `
      cd ${CWS}
      pgpm diff col-v1 col-v2 --emit-migration . --pkg ${pkg} ${dials} --allow-data-loss
      `,
      {}
    );
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${CWS}/col-v1
      pgpm deploy --database ${testDb.name} --package col-v1 --yes
      cd ../${pkg}
      pgpm deploy --database ${testDb.name} --package ${pkg} --yes
      `,
      { database: testDb.name }
    );
    await expectCatalog(testDb, v2Db);
    await fixture.runTerminalCommands(
      `
      cd ${CWS}/${pkg}
      pgpm verify --database ${testDb.name} --package ${pkg} --yes
      pgpm revert --database ${testDb.name} --package ${pkg} --yes
      `,
      { database: testDb.name }
    );
    await expectCatalog(testDb, v1Db);
  });

  it('the linear SQL projection applies on v1 and reaches v2', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${CWS}
      pgpm diff col-v1 col-v2 --emit-sql col-migration.sql --allow-data-loss
      `,
      {}
    );
    const sql = fs.readFileSync(path.join(wsDir, 'col-migration.sql'), 'utf-8');
    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${CWS}/col-v1
      pgpm deploy --database ${testDb.name} --package col-v1 --yes
      `,
      { database: testDb.name }
    );
    await testDb.query(sql);
    await expectCatalog(testDb, v2Db);
  });

  it('--append-module rejects --emit-ledger like every other --emit-* flag', async () => {
    writeModule(path.join(wsDir, 'col-target'), 'col-target', COL_V1);
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = jest.fn((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit called with code ${code}`);
    }) as any;
    try {
      await expect(
        fixture.runTerminalCommands(
          `
          cd ${CWS}
          pgpm diff col-v1 col-v2 --append-module col-target --emit-ledger col-ledger.sql --ledger db:${v1Db.name} --allow-data-loss
          `,
          {}
        )
      ).rejects.toThrow(/process.exit called with code 1/);
    } finally {
      process.exit = originalExit;
    }
    expect(exitCode).toBe(1);
    expect(fs.existsSync(path.join(wsDir, 'col-ledger.sql'))).toBe(false);
  });
});
