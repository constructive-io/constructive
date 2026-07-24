import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  applyEnvelope,
  BundleEnvelope,
  bundleFromModule,
  createEnvelope,
  EnvelopeApplyError,
  previewEnvelopeApply
} from '../../src/bundle';
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

const DATA_PART = {
  name: 'seed-users',
  deploy: 'INSERT INTO auth.users (id) VALUES (1), (2);\n',
  revert: 'DELETE FROM auth.users WHERE id IN (1, 2);\n',
  verify: 'SELECT 1 / (count(*) >= 2)::int FROM auth.users;\n'
};

const FIXTURE_PART = {
  name: 'fixture-users',
  deploy: 'INSERT INTO auth.users (id) VALUES (99);\n'
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function makeSource(): void {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-apply-env-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\n${REVERT[change]}\nCOMMIT;\n`);
    write(`verify/${change}.sql`, `-- Verify ${change}\nBEGIN;\nSELECT 1;\nROLLBACK;\n`);
  }
}

function makeEnvelope(): BundleEnvelope {
  return createEnvelope({
    version: '1.0.0',
    schema: bundleFromModule(sourceDir),
    data: [DATA_PART],
    fixtures: [FIXTURE_PART],
    provenance: { sourceDatabase: 'db-test' }
  });
}

describe('previewEnvelopeApply (pure)', () => {
  beforeEach(makeSource);
  afterEach(() => rmSync(sourceDir, { recursive: true, force: true }));

  it('reports identity, part order, and the layered rollback plan', () => {
    const preview = previewEnvelopeApply(makeEnvelope());
    expect(preview.name).toBe('shop');
    expect(preview.version).toBe('1.0.0');
    expect(preview.envelopeIssues).toEqual([]);
    expect(preview.schema.bundleIssues).toEqual([]);
    expect(preview.partOrder).toEqual([
      { kind: 'data', name: 'seed-users' },
      { kind: 'fixtures', name: 'fixture-users' }
    ]);
    expect(preview.rollbackPlan.parts).toEqual([
      { kind: 'fixtures', name: 'fixture-users', hasRevert: false },
      { kind: 'data', name: 'seed-users', hasRevert: true }
    ]);
    expect(preview.rollbackPlan.schema).toEqual([
      'schemas/auth/tables/users',
      'schemas/auth/schema'
    ]);
  });
});

describe('applyEnvelope gates (no database access)', () => {
  beforeEach(makeSource);
  afterEach(() => rmSync(sourceDir, { recursive: true, force: true }));

  const fakeConfig = { database: 'unused' } as any;

  it('dry-run returns the preview and never executes', async () => {
    const result = await applyEnvelope(makeEnvelope(), {
      config: fakeConfig,
      dryRun: true
    });
    expect(result.dryRun).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.schema).toBeUndefined();
    expect(result.parts).toEqual([]);
    expect(result.preview.partOrder).toHaveLength(2);
  });

  it('refuses a tampered envelope before touching the database', async () => {
    const envelope = makeEnvelope();
    envelope.data[0].deploy = 'DROP TABLE auth.users;';
    await expect(applyEnvelope(envelope, { config: fakeConfig })).rejects.toBeInstanceOf(
      EnvelopeApplyError
    );
  });

  it('refuses a tampered schema bundle inside the envelope', async () => {
    const envelope = makeEnvelope();
    envelope.schema.changes[0].deploy!.sql = 'DROP DATABASE prod;';
    await expect(applyEnvelope(envelope, { config: fakeConfig })).rejects.toThrow(
      /failed integrity verification/
    );
  });
});

describe('applyEnvelope integration', () => {
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

  it('applies schema then replays data and fixtures parts in order', async () => {
    const result = await applyEnvelope(makeEnvelope(), {
      config: db.config,
      verify: true,
      verifyParts: true
    });

    expect(result.executed).toBe(true);
    expect(result.schema!.deploy!.deployed).toEqual([
      'schemas/auth/schema',
      'schemas/auth/tables/users'
    ]);
    expect(result.parts).toEqual([
      expect.objectContaining({ kind: 'data', name: 'seed-users', executed: true, verified: true }),
      expect.objectContaining({ kind: 'fixtures', name: 'fixture-users', executed: true })
    ]);
    // fixture part has no verify script → verified stays unset
    expect(result.parts[1].verified).toBeUndefined();

    const rows = await db.query('SELECT id FROM auth.users ORDER BY id');
    expect(rows.rows.map((r: any) => r.id)).toEqual([1, 2, 99]);
  });

  it('rolls back all part data when a part fails, schema stays applied', async () => {
    const envelope = createEnvelope({
      version: '1.0.0',
      schema: bundleFromModule(sourceDir),
      data: [DATA_PART],
      fixtures: [{ name: 'bad-part', deploy: 'INSERT INTO auth.missing VALUES (1);' }]
    });

    await expect(applyEnvelope(envelope, { config: db.config })).rejects.toThrow(
      /Part fixtures\/bad-part .* failed/
    );

    // schema applied, but the data part's rows rolled back with the failed transaction
    expect(await db.exists('table', 'auth.users')).toBe(true);
    const rows = await db.query('SELECT count(*)::int AS n FROM auth.users');
    expect(rows.rows[0].n).toBe(0);
  });

  it('transformPartSql seam rewrites part SQL before execution', async () => {
    const result = await applyEnvelope(makeEnvelope(), {
      config: db.config,
      transformPartSql: (sql, ctx) =>
        ctx.kind === 'fixtures' ? sql.replace('(99)', '(42)') : sql
    });

    expect(result.parts).toHaveLength(2);
    const rows = await db.query('SELECT id FROM auth.users ORDER BY id');
    expect(rows.rows.map((r: any) => r.id)).toEqual([1, 2, 42]);
  });
});
