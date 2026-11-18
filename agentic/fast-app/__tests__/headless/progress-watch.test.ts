import assert from 'node:assert/strict';

import { APP_BUILD_PROGRESS_TYPE, runLogProgress } from '../../src/headless/progress-watch';
import { laneFlusher } from '../../src/headless/run-log';
import type { AppBuildDetails } from '../../src/pipeline/app-plan';

function details(patch: Partial<AppBuildDetails> = {}): AppBuildDetails {
  return {
    kind: 'app-build',
    name: 'Food bank',
    stage: 'building',
    phases: [
      {
        phase: 'provision',
        status: 'running',
        activity: [{ kind: 'command', label: 'pnpm install', output: 'lots of output' }]
      },
      { phase: 'schema', status: 'pending' }
    ],
    ...patch
  };
}

function watch() {
  const entries: Array<{ customType: string; data: any }> = [];
  let flushes = 0;
  const reporter = runLogProgress(async () => {
    flushes += 1;
  })('call-1', (customType, data) => entries.push({ customType, data }));
  return { entries, reporter, flushes: () => flushes };
}

test('each phase change writes one progress entry, then flushes the lane', () => {
  const { entries, reporter, flushes } = watch();
  reporter.update?.(details());
  // A note on the running step is not a phase change.
  reporter.update?.(details({ phases: [{ phase: 'provision', status: 'running', note: 'Checking' }, { phase: 'schema', status: 'pending' }] }));
  reporter.update?.(details({ phases: [{ phase: 'provision', status: 'done' }, { phase: 'schema', status: 'running' }] }));
  reporter.update?.(details({ stage: 'failed' }));
  assert.equal(entries.length, 3);
  assert.equal(flushes(), 3);
  assert.ok(entries.every((entry) => entry.customType === APP_BUILD_PROGRESS_TYPE));
  assert.deepEqual(
    entries.map((entry) => [entry.data.toolCallId, entry.data.details.stage]),
    [['call-1', 'building'], ['call-1', 'building'], ['call-1', 'failed']]
  );
});

test('an entry has no command output', () => {
  const { entries, reporter } = watch();
  reporter.update?.(details());
  const sent = entries[0].data.details as AppBuildDetails;
  assert.deepEqual(sent.phases[0].activity, [{ kind: 'command', label: 'pnpm install' }]);
});

test('flushes run one at a time, and asks that wait together share one', async () => {
  let running = 0;
  let most = 0;
  let calls = 0;
  const release: Array<() => void> = [];
  const flush = laneFlusher(
    () =>
      new Promise<void>((resolve) => {
        calls += 1;
        running += 1;
        most = Math.max(most, running);
        release.push(() => {
          running -= 1;
          resolve();
        });
      })
  );
  const first = flush();
  await Promise.resolve();
  await Promise.resolve();
  const second = flush();
  const third = flush();
  assert.equal(second, third);
  release.shift()?.();
  await first;
  await new Promise((resolve) => setImmediate(resolve));
  release.shift()?.();
  await second;
  assert.equal(calls, 2);
  assert.equal(most, 1);
});

test('a failed flush is reported, never thrown', async () => {
  const warnings: string[] = [];
  const flush = laneFlusher(async () => {
    throw new Error('lane gone');
  }, (message) => warnings.push(message));
  await flush();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /flushing the run log failed, so other clients see this build's progress late: lane gone/);
});
