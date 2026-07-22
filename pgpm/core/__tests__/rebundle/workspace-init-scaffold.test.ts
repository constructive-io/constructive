import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { rebundleWorkspace } from '../../src/rebundle';
import { pgpmPath } from '../../src/workspace/paths';

// initScaffold fetches the pgpm boilerplate repo over the network (same as the
// `pgpm init` template tests), so allow extra time.
jest.setTimeout(120000);

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
  outputDir = mkdtempSync(join(tmpdir(), 'pgpm-ws-init-'));
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

describe('rebundleWorkspace initScaffold', () => {
  it('scaffolds the full pgpm init shell and writes merged pgpm files on top', async () => {
    const result = await rebundleWorkspace(sourceDir, {
      outputDir,
      overwrite: true,
      initScaffold: true,
    });

    // Same chunking + byte-identical gate as the minimal writer.
    expect(result.packages.map(p => p.name)).toEqual(['auth', 'billing']);
    expect(result.invariant.ok).toBe(true);

    // Workspace-root boilerplate that the minimal writer omits.
    for (const f of ['pgpm.json', 'pnpm-workspace.yaml', 'lerna.json', 'tsconfig.json']) {
      expect(existsSync(join(outputDir, f))).toBe(true);
    }
    // Discoverable as a pgpm workspace.
    expect(pgpmPath(outputDir)).toBe(outputDir);

    for (const pkg of ['auth', 'billing']) {
      const dir = join(outputDir, 'packages', pkg);
      // pgpm files written by writeMinimalModule (merged chunk output).
      expect(existsSync(join(dir, 'pgpm.plan'))).toBe(true);
      expect(existsSync(join(dir, `${pkg}.control`))).toBe(true);
      expect(existsSync(join(dir, 'Makefile'))).toBe(true);
      expect(existsSync(join(dir, 'deploy', `${pkg}.sql`))).toBe(true);
      expect(existsSync(join(dir, 'revert', `${pkg}.sql`))).toBe(true);
      expect(existsSync(join(dir, 'verify', `${pkg}.sql`))).toBe(true);
      // Developer shell from the init boilerplate that the minimal writer omits.
      expect(existsSync(join(dir, 'package.json'))).toBe(true);
      expect(existsSync(join(dir, 'README.md'))).toBe(true);
      expect(existsSync(join(dir, 'jest.config.js'))).toBe(true);
    }

    // The scaffolded (richer) package.json is preserved, not clobbered by the
    // minimal writer, and carries the Constructive license (not MIT).
    const authPkg = JSON.parse(readFileSync(join(outputDir, 'packages', 'auth', 'package.json'), 'utf-8'));
    expect(authPkg.name).toBeTruthy();
    expect(authPkg.license).toBe('CONSTRUCTIVE');

    // control-only default still carries the cross-chunk dep via requires.
    const billingControl = readFileSync(join(outputDir, 'packages', 'billing', 'billing.control'), 'utf-8');
    expect(billingControl).toContain("requires = 'auth'");
  });
});
