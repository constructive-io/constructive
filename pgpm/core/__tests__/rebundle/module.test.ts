import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { packageModule } from '../../src/packaging/package';
import { rebundleModule } from '../../src/rebundle';

let sourceDir: string;
let outputDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # users
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # billing schema
schemas/billing/tables/invoices [schemas/billing/schema schemas/auth/tables/users] 2024-01-01T00:00:03Z Dev <dev@example.com> # invoices
@v1.0.0 2024-01-01T00:00:04Z Dev <dev@example.com> # release
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);',
  'schemas/billing/schema': 'CREATE SCHEMA billing;',
  'schemas/billing/tables/invoices':
    'CREATE TABLE billing.invoices (id int PRIMARY KEY, user_id int REFERENCES auth.users(id));',
};

const REVERT: Record<string, string> = {
  'schemas/auth/schema': 'DROP SCHEMA auth;',
  'schemas/auth/tables/users': 'DROP TABLE auth.users;',
  'schemas/billing/schema': 'DROP SCHEMA billing;',
  'schemas/billing/tables/invoices': 'DROP TABLE billing.invoices;',
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-rb-src-'));
  outputDir = mkdtempSync(join(tmpdir(), 'pgpm-rb-out-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(join(sourceDir, 'my-module.control'), `default_version = '0.0.1'\n`);
  writeFileSync(join(sourceDir, 'package.json'), JSON.stringify({ name: 'my-module', version: '0.0.1' }));

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

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
  rmSync(outputDir, { recursive: true, force: true });
});

describe('rebundleModule', () => {
  it('writes one merged migration per chunk and a chunk-quotient plan', async () => {
    const result = await rebundleModule(sourceDir, { outputDir, overwrite: true });

    expect(result.chunks.map(c => c.name)).toEqual(['auth', 'billing']);
    for (const chunk of ['auth', 'billing']) {
      expect(existsSync(join(outputDir, 'deploy', `${chunk}.sql`))).toBe(true);
      expect(existsSync(join(outputDir, 'revert', `${chunk}.sql`))).toBe(true);
      expect(existsSync(join(outputDir, 'verify', `${chunk}.sql`))).toBe(true);
    }

    const plan = readFileSync(join(outputDir, 'pgpm.plan'), 'utf-8');
    expect(plan).toContain('%project=my-module');
    expect(plan).toMatch(/^auth$/m);
    expect(plan).toMatch(/^billing \[auth\]/m);
    // Tag remapped onto its chunk (invoices was the last billing member).
    expect(plan).toContain('@v1.0.0');
  });

  it('copies control/Makefile metadata but regenerates the plan', async () => {
    await rebundleModule(sourceDir, { outputDir, overwrite: true });
    expect(existsSync(join(outputDir, 'my-module.control'))).toBe(true);
    expect(readFileSync(join(outputDir, 'my-module.control'), 'utf-8')).toContain("default_version = '0.0.1'");
  });

  it('merges members into a single transaction per chunk', async () => {
    await rebundleModule(sourceDir, { outputDir, overwrite: true });
    const authDeploy = readFileSync(join(outputDir, 'deploy', 'auth.sql'), 'utf-8');
    // Exactly one BEGIN/COMMIT wrapping both merged statements.
    expect(authDeploy.match(/BEGIN;/g)).toHaveLength(1);
    expect(authDeploy.match(/COMMIT;/g)).toHaveLength(1);
    expect(authDeploy).toContain('CREATE SCHEMA auth');
    expect(authDeploy).toContain('CREATE TABLE auth.users');
    // Verify chunk rolls back rather than commits.
    const authVerify = readFileSync(join(outputDir, 'verify', 'auth.sql'), 'utf-8');
    expect(authVerify).toContain('ROLLBACK;');
  });

  it('is byte-identical: packageModule(source) === packageModule(output)', async () => {
    const result = await rebundleModule(sourceDir, { outputDir, overwrite: true });
    expect(result.invariant.ok).toBe(true);

    const src = await packageModule(sourceDir);
    const out = await packageModule(outputDir);
    expect(out.sql).toEqual(src.sql);
  });

  it('is byte-identical for the single-chunk dial position', async () => {
    const result = await rebundleModule(sourceDir, { outputDir, overwrite: true, boundary: 'none' });
    expect(result.chunks).toHaveLength(1);
    expect(result.invariant.ok).toBe(true);
  });

  it('refuses to overwrite a non-empty output dir without overwrite', async () => {
    writeFileSync(join(outputDir, 'sentinel'), 'x');
    await expect(rebundleModule(sourceDir, { outputDir })).rejects.toThrow(/not empty/);
  });
});
