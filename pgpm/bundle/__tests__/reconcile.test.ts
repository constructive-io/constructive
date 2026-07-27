import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { bundleFromModule, reconcilePlan } from '../src';

function buildModule(changes: Record<string, string>, order: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'pgpm-reconcile-'));
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

const A = 'schemas/auth/schema';
const B = 'schemas/auth/tables/users';
const C = 'schemas/auth/tables/orgs';
const BASE = { [A]: 'CREATE SCHEMA auth;', [B]: 'CREATE TABLE auth.users (id int);' };

describe('reconcilePlan', () => {
  it('is a no-op for identical bundles', () => {
    const plan = reconcilePlan(mod(BASE, [A, B]), mod(BASE, [A, B]));
    expect(plan.noop).toBe(true);
    expect(plan.revert).toEqual([]);
    expect(plan.deploy).toEqual([]);
  });

  it('deploys added changes in to-order', () => {
    const to = { ...BASE, [C]: 'CREATE TABLE auth.orgs (id int);' };
    const plan = reconcilePlan(mod(BASE, [A, B]), mod(to, [A, B, C]));
    expect(plan.deploy).toEqual([C]);
    expect(plan.revert).toEqual([]);
  });

  it('reverts removed changes dependents-first (reverse from-order)', () => {
    const from = { ...BASE, [C]: 'CREATE TABLE auth.orgs (id int);' };
    const plan = reconcilePlan(mod(from, [A, B, C]), mod(BASE, [A, B]));
    expect(plan.revert).toEqual([C]);
    expect(plan.deploy).toEqual([]);
  });

  it('reverts then re-deploys a modified change', () => {
    const to = { ...BASE, [B]: 'CREATE TABLE auth.users (id int, name text);' };
    const plan = reconcilePlan(mod(BASE, [A, B]), mod(to, [A, B]));
    expect(plan.revert).toEqual([B]);
    expect(plan.deploy).toEqual([B]);
    expect(plan.noop).toBe(false);
  });

  it('orders multiple reverts deepest-first and deploys in order', () => {
    const from = { [A]: 'CREATE SCHEMA auth;', [B]: 'CREATE TABLE auth.users (id int);' };
    const plan = reconcilePlan(mod(from, [A, B]), mod({}, []));
    expect(plan.revert).toEqual([B, A]);
  });
});
