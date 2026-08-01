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
      pgpm diff diff-v1 diff-v2 --emit-migration . --pkg diff-migration
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

  it('--verify proves the emitted migration is a catalog-level oracle match', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm diff diff-v1 diff-v2 --verify
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
