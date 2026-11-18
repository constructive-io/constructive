import assert from 'node:assert/strict';

import {
  APPROVAL_REQUEST_TYPE,
  approvalResolutionMessage,
  MemoryRunLogStore,
  type PiSessionEntry
} from '@agentic-kit/run-log';

import { runLogPlanCards, STOPPED_REASON } from '../../src/headless/plan-card';
import type { AppPlanPrompt } from '../../src/pipeline/app-plan';
import type { CardRequest } from '../../src/pipeline/host';

const RUN = 'run-1';

const PLAN: AppPlanPrompt = {
  name: 'Food bank',
  databaseName: 'food-bank',
  backend: { kind: 'custom', entities: [], links: [] },
  seedRows: 3,
  nav: ['volunteers'],
  account: { email: 'owner@example.com', savedPassword: false, canRemember: false },
  warnings: []
};

function request(patch: Partial<CardRequest> = {}): CardRequest {
  return {
    chatId: 'chat-1',
    toolCallId: 'call-1',
    projectId: undefined,
    account: { userId: 'user-1', email: 'owner@example.com' },
    title: 'Update Food bank',
    message: 'Update Food bank',
    card: { kind: 'app-plan', plan: PLAN },
    destructive: [{ id: 'drop-notes' }, { id: 'drop-shifts', requires: ['drop-links'] }, { id: 'drop-links' }],
    signal: undefined,
    ...patch
  };
}

// A client's answer, the way the desktop's Cloud UI writes it.
function answer(id: string, details: Record<string, unknown>): PiSessionEntry {
  return {
    type: 'message',
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      ...approvalResolutionMessage({ toolCallId: 'call-1', decision: 'approved' }),
      details: { toolCallId: 'call-1', ...details }
    }
  } as PiSessionEntry;
}

type Harness = { store: MemoryRunLogStore; flushes: number; clock: { t: number } };

// A card on a memory store, with a fake clock: each sleep moves time on and,
// on its `at`-th call, lets `onSleep` write what a client would.
function cards(h: Harness, options: { timeoutMs?: number; onSleep?: (n: number) => Promise<void> } = {}) {
  let sleeps = 0;
  return runLogPlanCards({
    store: h.store,
    runId: RUN,
    flush: async () => {
      h.flushes += 1;
    },
    timeoutMs: options.timeoutMs ?? 60_000,
    intervalMs: 1_000,
    now: () => new Date(h.clock.t),
    sleep: async (ms) => {
      sleeps += 1;
      h.clock.t += ms;
      await options.onSleep?.(sleeps);
    }
  });
}

const harness = (): Harness => ({ store: new MemoryRunLogStore(), flushes: 0, clock: { t: 1_000_000 } });

function requestRows(store: MemoryRunLogStore) {
  return store
    .snapshot(RUN)
    .map((record) => record.entry as PiSessionEntry & { message?: { customType?: string; details?: any } })
    .filter((entry) => entry.message?.customType === APPROVAL_REQUEST_TYPE);
}

test('the request row carries the card, hangs from the newest entry, and comes after a flush', async () => {
  const h = harness();
  await h.store.append(RUN, [
    { type: 'message', id: 'assistant-1', parentId: null, timestamp: new Date().toISOString(), message: { role: 'user', content: 'hi', timestamp: 1 } } as PiSessionEntry
  ]);
  const ask = cards(h, { onSleep: async () => void (await h.store.append(RUN, [answer('resolution-call-1', { decision: 'approved' })])) });
  await ask.ask(request());
  const [row] = requestRows(h.store);
  assert.equal(h.flushes, 1);
  assert.equal(row.id, 'approval-call-1');
  assert.equal(row.parentId, 'assistant-1');
  assert.equal((row.message as { content: string }).content, 'plan_app: Update Food bank');
  assert.deepEqual(row.message?.details, {
    toolCallId: 'call-1',
    card: { kind: 'app-plan', plan: PLAN, title: 'Update Food bank', message: 'Update Food bank' }
  });
});

test('an approval with ticks builds the ticked changes the card offered, with the email and no password', async () => {
  const h = harness();
  const ask = cards(h, {
    onSleep: async () =>
      void (await h.store.append(RUN, [
        answer('resolution-call-1', {
          decision: 'approved',
          payload: { destructive: ['drop-notes', 'not-offered', 'drop-notes'] }
        })
      ]))
  });
  assert.deepEqual(await ask.ask(request()), {
    approved: true,
    destructive: ['drop-notes'],
    credential: { email: 'owner@example.com' }
  });
});

test('an approval with no payload ticks no destructive change', async () => {
  const h = harness();
  const ask = cards(h, {
    onSleep: async () => void (await h.store.append(RUN, [answer('resolution-call-1', { decision: 'approved' })]))
  });
  const result = await ask.ask(request());
  assert.equal(result.approved, true);
  assert.deepEqual(result.approved && result.destructive, []);
});

test('a tick without the change it requires declines, and says what goes together', async () => {
  const h = harness();
  const ask = cards(h, {
    onSleep: async () =>
      void (await h.store.append(RUN, [
        answer('resolution-call-1', { decision: 'approved', payload: { destructive: ['drop-shifts'] } })
      ]))
  });
  assert.deepEqual(await ask.ask(request()), {
    approved: false,
    reason: 'the answer ticked drop-shifts without drop-links, which go together'
  });
});

test('a decline comes back with its reason', async () => {
  const h = harness();
  const ask = cards(h, {
    onSleep: async () =>
      void (await h.store.append(RUN, [answer('resolution-call-1', { decision: 'rejected', reason: 'not now' })]))
  });
  assert.deepEqual(await ask.ask(request()), { approved: false, reason: 'not now' });
});

test('no answer within the wait declines with the reason, after the full timeout', async () => {
  const h = harness();
  const started = h.clock.t;
  const ask = cards(h, { timeoutMs: 5_000 });
  assert.deepEqual(await ask.ask(request()), {
    approved: false,
    reason: 'nobody answered the plan card within 5 seconds'
  });
  assert.equal(h.clock.t - started, 5_000);
});

test('a stop answers the card as stopped, while it waits and before it asks', async () => {
  const h = harness();
  const stop = new AbortController();
  const ask = cards(h, { onSleep: async (n) => void (n === 2 && stop.abort()) });
  assert.deepEqual(await ask.ask(request({ signal: stop.signal })), {
    approved: false,
    reason: STOPPED_REASON
  });
  const before = harness();
  const stopped = new AbortController();
  stopped.abort();
  assert.deepEqual(await cards(before).ask(request({ signal: stopped.signal })), {
    approved: false,
    reason: STOPPED_REASON
  });
  assert.equal(requestRows(before.store).length, 0);
});

test('the first answer stands: a second one from another client is dropped', async () => {
  const h = harness();
  const ask = cards(h, {
    onSleep: async () =>
      void (await h.store.append(RUN, [
        answer('resolution-call-1', { decision: 'rejected', reason: 'first' }),
        answer('resolution-call-1-other', { decision: 'approved' })
      ]))
  });
  assert.deepEqual(await ask.ask(request()), { approved: false, reason: 'first' });
});

test('a retried call writes no second request, and takes the answer the log already has', async () => {
  const h = harness();
  await cards(h, {
    onSleep: async () => void (await h.store.append(RUN, [answer('resolution-call-1', { decision: 'approved' })]))
  }).ask(request());
  const again = await cards(h).ask(request());
  assert.equal(again.approved, true);
  assert.equal(requestRows(h.store).length, 1);
});

test("an answer to another call is not this card's", async () => {
  const h = harness();
  const other = answer('resolution-call-2', { decision: 'approved' });
  (other as { message: { details: { toolCallId: string } } }).message.details.toolCallId = 'call-2';
  const ask = cards(h, {
    timeoutMs: 3_000,
    onSleep: async (n) => void (n === 1 && (await h.store.append(RUN, [other])))
  });
  assert.equal((await ask.ask(request())).approved, false);
});

test("the card's account line has the email and no password to keep", async () => {
  const line = await cards(harness()).account(undefined, { userId: 'user-1', email: 'owner@example.com' });
  assert.deepEqual(line, { email: 'owner@example.com', savedPassword: false, canRemember: false });
});
