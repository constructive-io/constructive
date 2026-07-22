import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { rebundleWorkspace } from '../../src/rebundle';

let sourceDir: string;
let outputDir: string;

const PLAN = `%syntax-version=1.0.0
%project=shop
%uri=shop

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
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-ws-src-'));
  outputDir = mkdtempSync(join(tmpdir(), 'pgpm-ws-out-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(join(sourceDir, 'shop.control'), `default_version = '0.0.1'\n`);
  writeFileSync(join(sourceDir, 'package.json'), JSON.stringify({ name: 'shop', version: '0.0.1' }));

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

describe('rebundleWorkspace', () => {
  it('emits one module per chunk under packages/, in deploy order', async () => {
    const result = await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });

    expect(result.packages.map(p => p.name)).toEqual(['auth', 'billing']);
    for (const pkg of ['auth', 'billing']) {
      const dir = join(outputDir, 'packages', pkg);
      expect(existsSync(join(dir, 'deploy', `${pkg}.sql`))).toBe(true);
      expect(existsSync(join(dir, 'revert', `${pkg}.sql`))).toBe(true);
      expect(existsSync(join(dir, 'verify', `${pkg}.sql`))).toBe(true);
      expect(existsSync(join(dir, `${pkg}.control`))).toBe(true);
      expect(existsSync(join(dir, 'pgpm.plan'))).toBe(true);
    }
    expect(existsSync(join(outputDir, 'pgpm-workspace.json'))).toBe(true);
  });

  it('control-only (default): cross-chunk dep lives in control requires, not the plan', async () => {
    await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });

    const billingControl = readFileSync(join(outputDir, 'packages', 'billing', 'billing.control'), 'utf-8');
    expect(billingControl).toContain("requires = 'auth'");

    const billingPlan = readFileSync(join(outputDir, 'packages', 'billing', 'pgpm.plan'), 'utf-8');
    // Single change line, no plan cross-reference.
    expect(billingPlan).toMatch(/^billing$/m);
    expect(billingPlan).not.toContain('auth:');
  });

  it('change mode: cross-chunk dep also recorded as a plan cross-reference', async () => {
    await rebundleWorkspace(sourceDir, { outputDir, overwrite: true, crossChunkDepMode: 'change' });

    const billingControl = readFileSync(join(outputDir, 'packages', 'billing', 'billing.control'), 'utf-8');
    expect(billingControl).toContain("requires = 'auth'");

    const billingPlan = readFileSync(join(outputDir, 'packages', 'billing', 'pgpm.plan'), 'utf-8');
    expect(billingPlan).toMatch(/^billing \[auth:auth\]/m);
  });

  it('auth module has no dependencies', async () => {
    const result = await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });
    const auth = result.packages.find(p => p.name === 'auth')!;
    expect(auth.dependencies).toEqual([]);
    const authControl = readFileSync(join(outputDir, 'packages', 'auth', 'auth.control'), 'utf-8');
    expect(authControl).not.toContain('requires =');
  });

  it('remaps tags onto the sealing chunk-module', async () => {
    await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });
    // @v1.0.0 anchored invoices → last member of billing.
    const billingPlan = readFileSync(join(outputDir, 'packages', 'billing', 'pgpm.plan'), 'utf-8');
    expect(billingPlan).toContain('@v1.0.0');
  });

  it('is byte-identical: merged workspace deploy === merged source deploy', async () => {
    const result = await rebundleWorkspace(sourceDir, { outputDir, overwrite: true });
    expect(result.invariant.ok).toBe(true);
  });

  it('is byte-identical in change mode too', async () => {
    const result = await rebundleWorkspace(sourceDir, {
      outputDir,
      overwrite: true,
      crossChunkDepMode: 'change',
    });
    expect(result.invariant.ok).toBe(true);
  });

  it('refuses to overwrite a non-empty output dir without overwrite', async () => {
    writeFileSync(join(outputDir, 'sentinel'), 'x');
    await expect(rebundleWorkspace(sourceDir, { outputDir })).rejects.toThrow(/not empty/);
  });
});
