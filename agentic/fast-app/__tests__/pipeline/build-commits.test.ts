import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildCommitMessage, commitPhase, readBuildHistory } from '../../src/pipeline/build-commits';

function repo(): {
  dir: string;
  git: (...args: string[]) => string;
  write: (file: string) => void;
  } {
  const dir = mkdtempSync(path.join(tmpdir(), 'build-commits-'));
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const write = (file: string) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), `${file}\n`);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  write('README.md');
  git('add', 'README.md');
  git('commit', '-q', '-m', 'init');
  return { dir, git, write };
}

test('the app commit takes only its paths; what the user staged elsewhere stays staged', async () => {
  const { dir, git, write } = repo();
  write('notes.md');
  git('add', 'notes.md');
  write('packages/app/src/page.tsx');
  write('.constructive/app-spec.json');

  const sha = await commitPhase(dir, buildCommitMessage('Shifts'));

  assert.ok(sha);
  assert.deepEqual(git('show', '--name-only', '--format=', 'HEAD').split('\n').sort(), [
    '.constructive/app-spec.json',
    'packages/app/src/page.tsx',
  ]);
  assert.equal(git('diff', '--cached', '--name-only'), 'notes.md');
  assert.deepEqual(await readBuildHistory(dir), {
    builds: 1,
    last: { sha, at: Number(git('log', '-1', '--format=%ct')) * 1000 },
    since: 0,
  });

  // Nothing of the app's changed: no commit, and the staged file is still left alone.
  assert.equal(await commitPhase(dir, 'feat(app): update Shifts'), null);
  assert.equal(git('diff', '--cached', '--name-only'), 'notes.md');
});

test('a project in a folder of a larger repo commits its app the same way', async () => {
  const { dir, git, write } = repo();
  write('project/packages/app/src/page.tsx');
  const sha = await commitPhase(path.join(dir, 'project'), buildCommitMessage('Shifts'));
  assert.ok(sha);
  assert.equal(
    git('show', '--name-only', '--format=', 'HEAD'),
    'project/packages/app/src/page.tsx',
  );
});
