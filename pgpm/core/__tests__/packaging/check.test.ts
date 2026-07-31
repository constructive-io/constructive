import { readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
  addDependents,
  checkModuleArtifact,
  checkPackages,
  enumerateModules,
  mapFilesToModules,
} from '../../src/packaging/check';
import { resolveBundleArtifactPath, writeBundleArtifact } from '../../src/bundle/artifact';
import { PgpmPackage } from '../../src/core/class/pgpm';
import { TestFixture } from '../../test-utils';

const MODULES = ['my-first', 'my-second', 'my-third'] as const;

/**
 * `pgpm package --check`: verify a committed bundle artifact still matches its
 * `deploy/`. Read + sha256 only — no DDL, no database — so these are pure,
 * DB-free unit tests over the fixture workspace.
 */
describe('package check (artifact drift verification)', () => {
  let fixture: TestFixture;
  let root: string;

  const moduleDir = (name: string): string => fixture.fixturePath('packages', name);

  const emitAll = async (): Promise<void> => {
    for (const name of MODULES) {
      const dir = moduleDir(name);
      const version = require(join(dir, 'package.json')).version as string;
      await writeBundleArtifact(dir, version);
    }
  };

  beforeEach(() => {
    fixture = new TestFixture('sqitch', 'simple-w-tags');
    root = fixture.fixturePath();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it('reports no drift for a freshly packaged module', async () => {
    await emitAll();
    expect(checkModuleArtifact(moduleDir('my-first'), 'my-first')).toBeNull();
  });

  it('flags a missing artifact', () => {
    const drift = checkModuleArtifact(moduleDir('my-first'), 'my-first');
    expect(drift?.reason).toBe('missing-artifact');
  });

  it('flags an artifact whose deploy/ has changed (out of sync)', async () => {
    await emitAll();
    const dir = moduleDir('my-first');
    const deployFile = join(dir, 'deploy', 'schema_myfirstapp.sql');
    writeFileSync(deployFile, `${readFileSync(deployFile, 'utf-8')}\n-- drift\n`);

    const drift = checkModuleArtifact(dir, 'my-first');
    expect(drift?.reason).toBe('out-of-sync');
  });

  it('flags a corrupt artifact archive', async () => {
    await emitAll();
    writeFileSync(resolveBundleArtifactPath(moduleDir('my-second'))!, 'not-an-archive');
    const drift = checkModuleArtifact(moduleDir('my-second'), 'my-second');
    expect(drift?.reason).toBe('unreadable-artifact');
  });

  it('checkPackages --all verifies every module and passes when in sync', async () => {
    await emitAll();
    const result = await checkPackages({ cwd: root, all: true });
    expect(new Set(result.checked)).toEqual(new Set(MODULES));
    expect(result.drifted).toHaveLength(0);
  });

  it('checkPackages --all fails fast on the first drift by default', async () => {
    await emitAll();
    // Break two modules; fail-fast should report exactly one.
    rmSync(resolveBundleArtifactPath(moduleDir('my-first'))!);
    rmSync(resolveBundleArtifactPath(moduleDir('my-second'))!);
    const result = await checkPackages({ cwd: root, all: true });
    expect(result.drifted).toHaveLength(1);
  });

  it('checkPackages --all --no-fail-fast reports every drifted module', async () => {
    await emitAll();
    rmSync(resolveBundleArtifactPath(moduleDir('my-first'))!);
    rmSync(resolveBundleArtifactPath(moduleDir('my-second'))!);
    const result = await checkPackages({ cwd: root, all: true, failFast: false });
    expect(new Set(result.drifted.map((d) => d.name))).toEqual(
      new Set(['my-first', 'my-second'])
    );
  });
});

describe('package check (workspace mapping helpers)', () => {
  let fixture: TestFixture;
  let pkg: PgpmPackage;

  beforeEach(() => {
    fixture = new TestFixture('sqitch', 'simple-w-tags');
    pkg = new PgpmPackage(fixture.fixturePath());
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it('maps a changed deploy file to its owning module', () => {
    const modules = enumerateModules(pkg);
    const changed = [fixture.fixturePath('packages', 'my-second', 'deploy', 'anything.sql')];
    expect(mapFilesToModules(changed, modules)).toEqual(['my-second']);
  });

  it('ignores files outside any module', () => {
    const modules = enumerateModules(pkg);
    expect(mapFilesToModules([fixture.fixturePath('README.md')], modules)).toEqual([]);
  });

  it('expands to transitive dependents', () => {
    // my-third requires my-second requires my-first.
    const names = new Set(['my-first']);
    addDependents(names, pkg);
    expect(names).toEqual(new Set(['my-first', 'my-second', 'my-third']));
  });
});
