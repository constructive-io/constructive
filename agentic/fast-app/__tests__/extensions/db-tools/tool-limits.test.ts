import assert from 'node:assert/strict';

import {
  ABORT_MESSAGE,
  DB_TOOL_TIMEOUT_MS,
  executeWithLimits,
  PROVISION_TIMEOUT_MS,
  timeoutFor,
  timeoutMessage,
} from '../../../src/extensions/db-tools/tool-limits';

const pending = () => new Promise<never>(() => {});

test('a call that gets no answer rejects with the timeout text', async () => {
  await assert.rejects(executeWithLimits(pending, { timeoutMs: 10 }), {
    message: timeoutMessage(10),
  });
});

test('the timeout text names the limit and tells the agent to examine the state', () => {
  assert.equal(
    timeoutMessage(DB_TOOL_TIMEOUT_MS),
    'The backend did not answer in 2 minutes. The request can still finish on the server. Examine the current state before you try again.',
  );
  assert.match(timeoutMessage(PROVISION_TIMEOUT_MS), /did not answer in 5 minutes/);
});

test('an abort during the call rejects at once with the abort text', async () => {
  const controller = new AbortController();
  const started = Date.now();
  const call = executeWithLimits(pending, { timeoutMs: 60_000, signal: controller.signal });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(call, { message: ABORT_MESSAGE });
  assert.ok(Date.now() - started < 1000);
});

test('an aborted signal rejects without calling the tool', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(
    executeWithLimits(
      async () => {
        called = true;
      },
      { timeoutMs: 60_000, signal: controller.signal },
    ),
    { message: ABORT_MESSAGE },
  );
  assert.equal(called, false);
});

test('a normal result passes through and releases the abort listener', async () => {
  const controller = new AbortController();
  let listeners = 0;
  const signal = controller.signal;
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = (...args: Parameters<typeof add>) => {
    listeners += 1;
    add(...args);
  };
  signal.removeEventListener = (...args: Parameters<typeof remove>) => {
    listeners -= 1;
    remove(...args);
  };
  const result = await executeWithLimits(async () => 'ok', { timeoutMs: 60_000, signal });
  assert.equal(result, 'ok');
  assert.equal(listeners, 0);
});

test('a tool error passes through unchanged', async () => {
  await assert.rejects(
    executeWithLimits(
      async () => {
        throw new Error('HTTP 500');
      },
      { timeoutMs: 60_000 },
    ),
    { message: 'HTTP 500' },
  );
});

test('provisioning, blueprint builds and codegen keep 5 minutes, every other tool gets 2', () => {
  assert.equal(timeoutFor('provision_database'), PROVISION_TIMEOUT_MS);
  assert.equal(timeoutFor('provision_blueprint'), PROVISION_TIMEOUT_MS);
  assert.equal(timeoutFor('add_relation'), PROVISION_TIMEOUT_MS);
  assert.equal(timeoutFor('apply_template'), PROVISION_TIMEOUT_MS);
  assert.equal(timeoutFor('run_codegen'), PROVISION_TIMEOUT_MS);
  assert.equal(timeoutFor('describe_schema'), DB_TOOL_TIMEOUT_MS);
  assert.equal(timeoutFor('describe_live_schema'), DB_TOOL_TIMEOUT_MS);
  assert.equal(DB_TOOL_TIMEOUT_MS, 2 * 60 * 1000);
  assert.equal(PROVISION_TIMEOUT_MS, 5 * 60 * 1000);
});
