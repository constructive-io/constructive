import { execFileSync } from 'child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { resolveBundleArtifactPath, writeBundleArtifact } from '../../src/bundle/artifact';
import { PgpmPackage } from '../../src/core/class/pgpm';
import {
  addDependents,
  changedFiles,
  checkModuleArtifact,
  checkPackages,
  enumerateModules,
  mapFilesToModules,
  ModuleRef,
} from '../../src/packaging/check';
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

/**
 * Change detection, over a throwaway git repo shaped like a workspace. The two
 * cases that used to be wrong before this moved to `git-changed`: a module whose
 * files are all untracked (git reports the *directory* without `-uall`), and a
 * deleted `deploy/` file (dropped as "no longer on disk", though a deletion
 * makes the bundle just as stale as an edit).
 */
describe('package check (git change detection)', () => {
  const repos: string[] = [];
  let dir: string;
  let modules: ModuleRef[];

  const git = (...args: string[]): void => {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  };

  const write = (rel: string): void => {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, '-- sql\n');
  };

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'pgpm-check-git-')));
    repos.push(dir);
    modules = ['first', 'second'].map((name) => ({
      name,
      dir: join(dir, 'packages', name),
    }));

    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    write('packages/first/deploy/schema.sql');
    git('add', '.');
    git('commit', '-qm', 'base');
  });

  afterAll(() => {
    for (const repo of repos) rmSync(repo, { recursive: true, force: true });
  });

  it('sees every file of an entirely untracked module', () => {
    write('packages/second/deploy/schema.sql');
    expect(mapFilesToModules(changedFiles(dir, 'main'), modules)).toEqual(['second']);
  });

  it('sees a deleted deploy file, which makes the bundle stale too', () => {
    git('checkout', '-q', '-b', 'feature');
    git('rm', '-q', 'packages/first/deploy/schema.sql');
    git('commit', '-qm', 'drop schema');

    expect(mapFilesToModules(changedFiles(dir, 'main'), modules)).toEqual(['first']);
  });

  it('does not attribute base-branch commits to the branch', () => {
    git('checkout', '-q', '-b', 'feature');
    write('packages/second/deploy/schema.sql');
    git('add', '.');
    git('commit', '-qm', 'second');

    git('checkout', '-q', 'main');
    write('packages/first/deploy/other.sql');
    git('add', '.');
    git('commit', '-qm', 'unrelated work on main');
    git('checkout', '-q', 'feature');

    expect(mapFilesToModules(changedFiles(dir, 'main'), modules)).toEqual(['second']);
  });

  it('sees a path with a space and a non-ASCII character', () => {
    // git quotes and C-escapes such a path by default ("caf\303\251 dir/x.sql");
    // a consumer that only strips the quotes silently loses the whole module.
    write('packages/second/deploy/café dir/x.sql');
    expect(mapFilesToModules(changedFiles(dir, 'main'), modules)).toEqual(['second']);
  });

  it('sees a committed path with a space and a non-ASCII character', () => {
    git('checkout', '-q', '-b', 'feature');
    write('packages/second/deploy/café dir/x.sql');
    git('add', '.');
    git('commit', '-qm', 'accented');

    const changed = changedFiles(dir, 'main');
    expect(changed).toContain(join(dir, 'packages/second/deploy/café dir/x.sql'));
    expect(mapFilesToModules(changed, modules)).toEqual(['second']);
  });

  it('sees a deleted non-ASCII path, which no longer exists in either form', () => {
    write('packages/second/deploy/café dir/x.sql');
    git('add', '.');
    git('commit', '-qm', 'accented');
    git('checkout', '-q', '-b', 'feature');
    git('rm', '-q', '-r', 'packages/second/deploy/café dir');
    git('commit', '-qm', 'drop accented');

    const changed = changedFiles(dir, 'main');
    expect(changed).toContain(join(dir, 'packages/second/deploy/café dir/x.sql'));
  });

  it('reports the destination of a rename', () => {
    git('checkout', '-q', '-b', 'feature');
    git('mv', 'packages/first/deploy/schema.sql', 'packages/first/deploy/renamed.sql');
    git('commit', '-qm', 'rename');

    expect(changedFiles(dir, 'main')).toContain(
      join(dir, 'packages/first/deploy/renamed.sql')
    );
  });

  it('resolves paths against the git root when the workspace is a subdirectory', () => {
    // `cwd` is the pgpm workspace root, nested below the git root: git reports
    // repo-root-relative paths, so resolving them against `cwd` would be wrong.
    const workspace = join(dir, 'workspace');
    const nested = ['first', 'second'].map((name) => ({
      name,
      dir: join(workspace, 'packages', name),
    }));
    write('workspace/packages/first/deploy/schema.sql');
    git('add', '.');
    git('commit', '-qm', 'workspace');

    git('checkout', '-q', '-b', 'feature');
    write('workspace/packages/second/deploy/schema.sql');
    git('add', '.');
    git('commit', '-qm', 'second');

    const changed = changedFiles(workspace, 'main');
    expect(changed).toContain(join(workspace, 'packages/second/deploy/schema.sql'));
    expect(mapFilesToModules(changed, nested)).toEqual(['second']);
  });

  it('rejects an explicit --since that does not resolve', async () => {
    await expect(checkPackages({ cwd: dir, since: 'origin/nope' })).rejects.toThrow(
      /Could not diff against 'origin\/nope'/
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
