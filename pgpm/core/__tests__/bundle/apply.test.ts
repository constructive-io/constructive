import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  applyBundle,
  BundleApplyError,
  bundleFromModule,
  previewBundleApply
} from '../../src/bundle';
import { PgpmMigrate } from '../../src/migrate/client';
import { MigrateTestFixture, teardownAllPools, TestDatabase } from '../../test-utils';

let sourceDir: string;

const PLAN = `%syntax-version=1.0.0
%project=shop
%uri=shop

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # users
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);'
};

const REVERT: Record<string, string> = {
  'schemas/auth/schema': 'DROP SCHEMA auth CASCADE;',
  'schemas/auth/tables/users': 'DROP TABLE auth.users;'
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function makeSource(): void {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-apply-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\n${REVERT[change]}\nCOMMIT;\n`);
    write(`verify/${change}.sql`, `-- Verify ${change}\nBEGIN;\nSELECT 1;\nROLLBACK;\n`);
  }
}

describe('previewBundleApply (pure)', () => {
  beforeEach(makeSource);
  afterEach(() => rmSync(sourceDir, { recursive: true, force: true }));

  it('reports deploy order, clean integrity, and the rollback plan', () => {
    const preview = previewBundleApply(bundleFromModule(sourceDir));
    expect(preview.name).toBe('shop');
    expect(preview.deployOrder).toEqual(['schemas/auth/schema', 'schemas/auth/tables/users']);
    expect(preview.bundleIssues).toEqual([]);
    expect(preview.rollbackPlan).toEqual(['schemas/auth/tables/users', 'schemas/auth/schema']);
    expect(preview.namespaceViolations).toEqual([]);
  });

  it('surfaces namespace violations from a caller-supplied validator', () => {
    const bundle = bundleFromModule(sourceDir);
    const preview = previewBundleApply(bundle, {
      // pretend only the `tenant` namespace is allowed
      validateReferences: sql => (/\bauth\b/.test(sql) ? ['auth'] : [])
    });
    expect(preview.namespaceViolations.length).toBeGreaterThan(0);
    expect(preview.namespaceViolations[0].references).toContain('auth');
  });
});

describe('applyBundle gates (no database access)', () => {
  beforeEach(makeSource);
  afterEach(() => rmSync(sourceDir, { recursive: true, force: true }));

  const fakeConfig = { database: 'unused' } as any;

  it('dry-run returns the preview and never executes', async () => {
    const result = await applyBundle(bundleFromModule(sourceDir), {
      config: fakeConfig,
      dryRun: true
    });
    expect(result.dryRun).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.deploy).toBeUndefined();
    expect(result.preview.rollbackPlan).toHaveLength(2);
  });

  it('refuses a tampered bundle before touching the database', async () => {
    const bundle = bundleFromModule(sourceDir);
    bundle.changes[0].deploy!.sql = 'DROP DATABASE prod;';
    await expect(applyBundle(bundle, { config: fakeConfig })).rejects.toBeInstanceOf(
      BundleApplyError
    );
  });

  it('refuses when references fall outside the target namespace', async () => {
    await expect(
      applyBundle(bundleFromModule(sourceDir), {
        config: fakeConfig,
        validateReferences: sql => (/\bauth\b/.test(sql) ? ['auth'] : [])
      })
    ).rejects.toThrow(/outside the target namespace/);
  });
});

describe('applyBundle deploy integration', () => {
  let fixture: MigrateTestFixture;
  let db: TestDatabase;

  beforeEach(async () => {
    makeSource();
    fixture = new MigrateTestFixture();
    db = await fixture.setupTestDatabase();
  });

  afterEach(async () => {
    await fixture.cleanup();
    rmSync(sourceDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await teardownAllPools();
  });

  it('materializes and deploys a bundle atomically, then verifies', async () => {
    const bundle = bundleFromModule(sourceDir);
    const result = await applyBundle(bundle, { config: db.config, verify: true });

    expect(result.executed).toBe(true);
    expect(result.deploy!.deployed).toEqual(['schemas/auth/schema', 'schemas/auth/tables/users']);
    expect(result.deploy!.failed).toBeUndefined();
    expect(result.verify!.verified.length).toBe(2);

    expect(await db.exists('schema', 'auth')).toBe(true);
    expect(await db.exists('table', 'auth.users')).toBe(true);
  });

  it('re-applying skips already-deployed changes', async () => {
    const bundle = bundleFromModule(sourceDir);
    const client = new PgpmMigrate(db.config);
    await client.deploy({ modulePath: sourceDir });

    const result = await applyBundle(bundle, { config: db.config });
    expect(result.deploy!.deployed).toEqual([]);
    expect(result.deploy!.skipped).toEqual(['schemas/auth/schema', 'schemas/auth/tables/users']);
  });
});
