import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { PgpmMigrate } from '../../src/migrate/client';
import { rebundleWorkspace } from '../../src/rebundle';
import { MigrateTestFixture, teardownAllPools, TestDatabase } from '../../test-utils';

describe('rebundleWorkspace deploy integration', () => {
  let fixture: MigrateTestFixture;
  let db: TestDatabase;
  let client: PgpmMigrate;
  let tempDir: string;
  let sourceDir: string;
  let outputDir: string;

  const PLAN = `%syntax-version=1.0.0
%project=shop
%uri=shop

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # users
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # billing schema
schemas/billing/tables/invoices [schemas/billing/schema schemas/auth/tables/users] 2024-01-01T00:00:03Z Dev <dev@example.com> # invoices
`;

  const DEPLOY: Record<string, string> = {
    'schemas/auth/schema': 'CREATE SCHEMA auth;',
    'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);',
    'schemas/billing/schema': 'CREATE SCHEMA billing;',
    'schemas/billing/tables/invoices':
      'CREATE TABLE billing.invoices (id int PRIMARY KEY, user_id int REFERENCES auth.users(id));',
  };

  const REVERT: Record<string, string> = {
    'schemas/auth/schema': 'DROP SCHEMA auth CASCADE;',
    'schemas/auth/tables/users': 'DROP TABLE auth.users;',
    'schemas/billing/schema': 'DROP SCHEMA billing CASCADE;',
    'schemas/billing/tables/invoices': 'DROP TABLE billing.invoices;',
  };

  function write(rel: string, content: string): void {
    const file = join(sourceDir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  beforeEach(async () => {
    fixture = new MigrateTestFixture();
    db = await fixture.setupTestDatabase();
    client = new PgpmMigrate(db.config);
    tempDir = join(tmpdir(), `rb-ws-deploy-${Date.now()}`);
    sourceDir = join(tempDir, 'source');
    outputDir = join(tempDir, 'workspace');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
    for (const [change, sql] of Object.entries(DEPLOY)) {
      write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    }
    for (const [change, sql] of Object.entries(REVERT)) {
      write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    }
    for (const change of Object.keys(DEPLOY)) {
      write(`verify/${change}.sql`, `-- Verify ${change}\nBEGIN;\nSELECT 1;\nROLLBACK;\n`);
    }
  });

  afterEach(async () => {
    await fixture.cleanup();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  afterAll(async () => {
    await teardownAllPools();
  });

  test('control-only workspace deploys module-by-module in deploy order', async () => {
    const result = await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });
    expect(result.invariant.ok).toBe(true);

    for (const pkgName of result.deployOrder) {
      const pkg = result.packages.find(p => p.name === pkgName)!;
      const deployResult = await client.deploy({ modulePath: join(outputDir, pkg.dir) });
      expect(deployResult.deployed.length).toBeGreaterThan(0);
    }

    expect(await db.exists('schema', 'auth')).toBe(true);
    expect(await db.exists('schema', 'billing')).toBe(true);
    expect(await db.exists('table', 'auth.users')).toBe(true);
    expect(await db.exists('table', 'billing.invoices')).toBe(true);

    // one merged change per chunk module
    const deployed = await db.getDeployedChanges();
    expect(deployed).toHaveLength(2);
  });
});
