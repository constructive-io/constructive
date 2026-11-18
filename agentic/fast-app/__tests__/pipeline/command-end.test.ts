import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runCommand } from '../../src/pipeline/command';

const cwd = mkdtempSync(path.join(tmpdir(), 'command-end-'));

test('a command that ignores the stop is killed, and ends as timed out only', async () => {
  const abort = new AbortController();
  const run = runCommand('sh', ['-c', "trap '' TERM; sleep 30"], {
    cwd,
    timeoutMs: 100,
    signal: abort.signal,
  });
  // The caller stops it too, after the timeout: the first cause wins.
  setTimeout(() => abort.abort(), 300);
  const result = await run;
  assert.deepEqual([result.ok, result.timedOut, result.aborted], [false, true, false]);
  assert.ok(result.ms < 10_000, `ended after ${result.ms} ms`);
});
