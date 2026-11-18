import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

import { runTogether } from '../../src/pipeline/run-together';

test('a failed step aborts the other, and the run returns once both ended, with the first failure', async () => {
  const run = new AbortController();
  const seedFailed = new Error('seed rows were rejected');
  let codegenEnded = false;
  const together = runTogether(run, [
    // Like db-tools' codegen: it sees the abort, but takes a while to stop.
    async () => {
      await new Promise((resolve) => run.signal.addEventListener('abort', resolve, { once: true }));
      await delay(30);
      codegenEnded = true;
      throw new Error('codegen stopped');
    },
    async () => {
      await delay(5);
      throw seedFailed;
    },
  ]);
  await assert.rejects(together, (err) => err === seedFailed);
  assert.equal(codegenEnded, true, 'nothing the run started is still running');
  assert.equal(run.signal.aborted, true);
});
