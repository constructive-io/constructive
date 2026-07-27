import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { bundleFromModule, diffBundles } from '../src';

function buildModule(changes: Record<string, string>, order: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'pgpm-diff-'));
  const planLines = order.map(
    (name, i) => `${name} 2024-01-01T00:00:0${i}Z Dev <dev@example.com> # ${name}`
  );
  writeFileSync(
    join(dir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=shop\n%uri=shop\n\n${planLines.join('\n')}\n`
  );
  for (const [name, sql] of Object.entries(changes)) {
    const file = join(dir, 'deploy', `${name}.sql`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `-- Deploy ${name}\nBEGIN;\n${sql}\nCOMMIT;\n`);
  }
  return dir;
}

const dirs: string[] = [];
function mod(changes: Record<string, string>, order: string[]) {
  const dir = buildModule(changes, order);
  dirs.push(dir);
  return bundleFromModule(dir);
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

const BASE = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);'
};
const ORDER = ['schemas/auth/schema', 'schemas/auth/tables/users'];

describe('diffBundles', () => {
  it('reports identical bundles as identical with no changes', () => {
    const diff = diffBundles(mod(BASE, ORDER), mod(BASE, ORDER));
    expect(diff.identical).toBe(true);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.reordered).toBe(false);
  });

  it('detects an added change', () => {
    const to = {
      ...BASE,
      'schemas/auth/tables/orgs': 'CREATE TABLE auth.orgs (id int PRIMARY KEY);'
    };
    const diff = diffBundles(mod(BASE, ORDER), mod(to, [...ORDER, 'schemas/auth/tables/orgs']));
    expect(diff.identical).toBe(false);
    expect(diff.added).toEqual(['schemas/auth/tables/orgs']);
    expect(diff.removed).toEqual([]);
  });

  it('detects a removed change', () => {
    const from = {
      ...BASE,
      'schemas/auth/tables/orgs': 'CREATE TABLE auth.orgs (id int PRIMARY KEY);'
    };
    const diff = diffBundles(mod(from, [...ORDER, 'schemas/auth/tables/orgs']), mod(BASE, ORDER));
    expect(diff.removed).toEqual(['schemas/auth/tables/orgs']);
    expect(diff.added).toEqual([]);
  });

  it('detects a modified change with per-script detail', () => {
    const to = {
      ...BASE,
      'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY, name text);'
    };
    const diff = diffBundles(mod(BASE, ORDER), mod(to, ORDER));
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].name).toBe('schemas/auth/tables/users');
    expect(diff.modified[0].scripts!.deploy).toBe('modified');
    expect(diff.modified[0].scripts!.revert).toBe('unchanged');
  });

  it('detects a pure reorder over an identical change set', () => {
    const diff = diffBundles(mod(BASE, ORDER), mod(BASE, [...ORDER].reverse()));
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.reordered).toBe(true);
  });
});
