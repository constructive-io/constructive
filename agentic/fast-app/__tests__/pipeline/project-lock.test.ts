import assert from 'node:assert/strict';

import { acquireForBuild, ProjectLocks } from '../../src/pipeline/project-lock';

test('a second build in the same project is refused until the first releases', () => {
  const locks = new ProjectLocks();
  const first = locks.acquire('/projects/food-bank');
  assert.ok(first);
  assert.equal(locks.acquire('/projects/food-bank/'), null);
  assert.ok(locks.acquire('/projects/agent-desk'), 'another project is independent');

  first();
  first(); // a second release is harmless and frees nothing else
  const again = locks.acquire('/projects/food-bank');
  assert.ok(again);
  assert.equal(locks.acquire('/projects/food-bank'), null);
});

test('a build waits for the database check that holds the lock, but not for another build', async () => {
  const locks = new ProjectLocks();
  const check = locks.acquire('/projects/food-bank', 'check');
  assert.ok(check);
  const waiting = acquireForBuild(locks, '/projects/food-bank', { waitMs: 1_000 });
  setTimeout(check, 10);
  assert.equal(typeof (await waiting), 'function', 'the build takes the lock once the check ends');
  // A build holds it now: the next one is told so at once.
  assert.equal(await acquireForBuild(locks, '/projects/food-bank', { waitMs: 1_000 }), 'build');

  // A check that outlasts the wait is named as one, never as a build.
  assert.ok(locks.acquire('/projects/agent-desk', 'check'));
  assert.equal(await acquireForBuild(locks, '/projects/agent-desk', { waitMs: 20 }), 'check');

  // Stop ends the wait at once, not after the 30 s.
  const stop = new AbortController();
  const stopped = acquireForBuild(locks, '/projects/agent-desk', { signal: stop.signal });
  stop.abort();
  assert.equal(await stopped, 'stopped');
});
