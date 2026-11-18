import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { commitTemplate, TEMPLATE_COMMIT_MESSAGE } from '../../src/pipeline/snapshot-clone';

// No author configured anywhere, as on a new machine or a CI runner: the app's
// own commits must still succeed, with the fallback author.
const NO_IDENTITY: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: undefined,
  GIT_AUTHOR_EMAIL: undefined,
  GIT_COMMITTER_NAME: undefined,
  GIT_COMMITTER_EMAIL: undefined,
  EMAIL: undefined,
};
// commitTemplate runs git in this process, so it sees the same environment.
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
for (const key of [
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
  'EMAIL',
]) {
  delete process.env[key];
}
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=t@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    env: NO_IDENTITY,
  });

/** A new project as createProject leaves it: a repository with its first commit. */
function project(root: string): string {
  mkdirSync(root, { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(join(root, 'AGENTS.md'), '# app\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'Initial commit');
  return root;
}

function copyApp(dir: string): void {
  mkdirSync(join(dir, 'packages', 'app', 'src'), { recursive: true });
  writeFileSync(join(dir, 'packages', 'app', 'package.json'), '{}\n');
  writeFileSync(join(dir, 'packages', 'app', 'src', 'page.tsx'), 'export default 1;\n');
}

// node:test's t.after: each test's cleanups, run after it ends, failed or not.
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

test('the copied template is a commit of its own, and the project starts clean', async () => {
  const dir = project(mkdtempSync(join(tmpdir(), 'template-commit-')));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'notes.md'), 'staged by the user\n');
  git(dir, 'add', 'notes.md');
  copyApp(dir);

  assert.equal(await commitTemplate(dir), true);

  assert.equal(git(dir, 'log', '-1', '--format=%s').trim(), TEMPLATE_COMMIT_MESSAGE);
  assert.equal(git(dir, 'log', '-1', '--format=%an').trim(), 'Constructive Desktop');
  assert.deepEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n'), [
    'packages/app/package.json',
    'packages/app/src/page.tsx',
  ]);
  // What the user staged stays staged, and nothing else is left over.
  assert.equal(git(dir, 'status', '--porcelain').trim(), 'A  notes.md');

  // Once tracked, the app is never committed this way again.
  writeFileSync(join(dir, 'packages', 'app', 'src', 'page.tsx'), 'export default 2;\n');
  assert.equal(await commitTemplate(dir), false);
  assert.equal(git(dir, 'rev-list', '--count', 'HEAD').trim(), '2');
});

test('a project folder inside a larger repository is left to its owner', async () => {
  const outer = project(mkdtempSync(join(tmpdir(), 'template-outer-')));
  cleanups.push(() => rmSync(outer, { recursive: true, force: true }));
  const dir = join(outer, 'apps', 'mine');
  mkdirSync(dir, { recursive: true });
  copyApp(dir);

  assert.equal(await commitTemplate(dir), false);

  assert.equal(git(outer, 'rev-list', '--count', 'HEAD').trim(), '1');
});
