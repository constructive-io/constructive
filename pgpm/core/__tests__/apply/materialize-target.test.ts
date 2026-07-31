import { existsSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join, relative } from 'path';

import { PgpmPackage } from '../../src';
import { materializeWorkspaceTarget } from '../../src/apply';
import { TestFixture } from '../../test-utils/TestFixture';

const listFiles = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(dir, full).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out.sort();
};

describe('materializeWorkspaceTarget', () => {
  let fixture: TestFixture;
  let workspacePath: string;
  let moduleMap: ReturnType<PgpmPackage['getModuleMap']>;
  const outDirs: string[] = [];

  beforeAll(() => {
    fixture = new TestFixture('apply', 'portability');
    workspacePath = fixture.fixturePath();
    moduleMap = new PgpmPackage(workspacePath).getModuleMap();
  });

  afterAll(() => {
    for (const dir of outDirs) rmSync(dir, { recursive: true, force: true });
    fixture.cleanup();
  });

  const outDir = (name: string): string => {
    const dir = fixture.fixturePath('materialized', name);
    outDirs.push(dir);
    return dir;
  };

  it('writes a plain, deployable module (no pgpm.apply.json) with transforms baked in', async () => {
    const dir = outDir('secure-a');
    const { bundle, spec } = await materializeWorkspaceTarget({
      workspacePath,
      moduleMap,
      target: 'secure-a',
      outDir: dir
    });

    expect(spec.source.module).toBe('secure-module');
    // It is a normal module tree, not a proxy.
    expect(existsSync(join(dir, 'pgpm.apply.json'))).toBe(false);
    expect(existsSync(join(dir, 'pgpm.plan'))).toBe(true);
    const files = listFiles(dir);
    expect(files.some(f => f.startsWith('deploy/'))).toBe(true);

    // Transforms are baked into the emitted SQL.
    const fn = bundle.changes.find(c => c.name === 'schemas/vault_a/functions/hash_pw')!;
    expect(fn.deploy!.sql).toContain('vault_a.hash_pw');
    expect(fn.deploy!.sql).toMatch(/extensions\.crypt/);
    expect(fn.deploy!.sql).toMatch(/TO anon\b/);
    expect(fn.deploy!.sql).not.toMatch(/\banonymous\b/);
  });

  it('is deterministic — two materializations are byte-identical', async () => {
    const a = outDir('secure-a-1');
    const b = outDir('secure-a-2');
    await materializeWorkspaceTarget({ workspacePath, moduleMap, target: 'secure-a', outDir: a });
    await materializeWorkspaceTarget({ workspacePath, moduleMap, target: 'secure-a', outDir: b });

    const filesA = listFiles(a);
    expect(listFiles(b)).toEqual(filesA);
    for (const file of filesA) {
      expect(readFileSync(join(b, file)).equals(readFileSync(join(a, file)))).toBe(true);
    }
  });

  it('rejects an unknown target', async () => {
    await expect(
      materializeWorkspaceTarget({ workspacePath, moduleMap, target: 'nope', outDir: outDir('nope') })
    ).rejects.toThrow(/not found in the workspace/);
  });

  it('rejects a non-proxy module', async () => {
    await expect(
      materializeWorkspaceTarget({
        workspacePath,
        moduleMap,
        target: 'secure-module',
        outDir: outDir('secure-module')
      })
    ).rejects.toThrow(/not an apply proxy/);
  });
});
