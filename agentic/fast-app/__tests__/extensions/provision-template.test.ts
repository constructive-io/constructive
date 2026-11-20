import assert from 'node:assert/strict';

import {
  type BlueprintPort,
  type Construction,
  ConstructionRejected,
  constructionRejection,
  type CuratedBlueprint,
  provisionTemplate,
} from '../../src/extensions/provision-template';

const BP: CuratedBlueprint = {
  name: 'data_room',
  display_name: 'Data Room',
  entity_types: [{ name: 'Data Room', prefix: 'data_room' }],
};

// A construction the backend records: its status, and the coded error of a
// failed one.
type Outcome = { status: string; reason?: string };

type FakeOptions = {
  existing?: Construction[];
  // What each construct call does: append a construction row, answer with a
  // backend error, or neither (a dropped request that never finishes).
  outcomes: Array<Outcome | ConstructionRejected | null>;
  pollFails?: boolean;
  entityTypes?: () => Promise<Awaited<ReturnType<BlueprintPort['entityTypes']>>>;
};

function fakePort({ existing = [], outcomes, pollFails = false, entityTypes }: FakeOptions) {
  const rows: Construction[] = [...existing];
  const reasons = new Map<string, string>();
  let constructs = 0;
  let polls = 0;
  const port: BlueprintPort = {
    findBlueprintId: async () => (existing.length ? 'bp-1' : undefined),
    createBlueprint: async () => 'bp-1',
    constructions: async () => {
      // The first read of an attempt counts rows; later reads are polls.
      if (pollFails && polls++ > 0) throw new Error('502 Bad Gateway');
      return [...rows];
    },
    construct: async () => {
      const outcome = outcomes[constructs++];
      if (outcome instanceof ConstructionRejected) throw outcome;
      if (!outcome) return;
      const id = `con-${constructs}`;
      rows.push({ id, status: outcome.status });
      if (outcome.reason) reasons.set(id, outcome.reason);
    },
    failureReason: async (id) => reasons.get(id) ?? 'the backend gave no reason',
    entityTypes:
      entityTypes ??
      (async () => [{ prefix: 'data_room', membershipType: 3, entityTableName: 'data_rooms' }]),
  };
  return { port, constructs: () => constructs };
}

// A clock that only moves when the flow sleeps, so deadlines run instantly.
function fakeTime() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number): Promise<void> => void (t += ms) };
}

test('lock and statement timeouts are retried, and the backend error of every attempt is reported', async () => {
  const time = fakeTime();
  const { port, constructs } = fakePort({
    outcomes: [
      new ConstructionRejected('canceling statement due to lock timeout'),
      new ConstructionRejected('canceling statement due to statement timeout'),
      new ConstructionRejected('BLUEPRINT_MODULE_NOT_INSTALLED (agent)'),
    ],
  });
  const result = await provisionTemplate(port, BP, time);

  // The third error is not contention or load, so it ends the call at once
  // instead of waiting for the 4-minute deadline.
  assert.equal(result.status, 'failed');
  assert.equal(constructs(), 3);
  assert.equal(time.now(), 60_000);
  assert.equal(
    result.error,
    'attempt 1: canceling statement due to lock timeout; attempt 2: canceling statement due to statement timeout; attempt 3: BLUEPRINT_MODULE_NOT_INSTALLED (agent)',
  );
});

test('a queued build that fails reports the coded error of each attempt', async () => {
  const { port, constructs } = fakePort({
    outcomes: [
      { status: 'failed', reason: '57014: canceling statement due to statement timeout' },
      { status: 'failed', reason: 'BLUEPRINT_MODULE_NOT_INSTALLED {"module":"agent"}' },
    ],
  });
  const result = await provisionTemplate(port, BP, fakeTime());

  // A statement timeout is load, so it is built again; the module error is not.
  assert.equal(result.status, 'failed');
  assert.equal(constructs(), 2);
  assert.equal(
    result.error,
    'attempt 1: 57014: canceling statement due to statement timeout; attempt 2: BLUEPRINT_MODULE_NOT_INSTALLED {"module":"agent"}',
  );
});

test('a dropped construct request is followed by polling until the blueprint is built', async () => {
  const { port } = fakePort({ outcomes: [] });
  let polls = 0;
  port.constructions = async () => (++polls > 3 ? [{ id: 'con-1', status: 'constructed' }] : []);
  port.construct = async () => {
    throw new Error('HTTP 504: Gateway Timeout');
  };
  const result = await provisionTemplate(port, BP, fakeTime());

  assert.equal(result.status, 'constructed');
});

test('a status check that keeps failing is named in the timeout', async () => {
  const { port } = fakePort({ outcomes: [null], pollFails: true });
  const result = await provisionTemplate(port, BP, {
    ...fakeTime(),
    maxConstructs: 1,
    deadlineMs: 20_000,
    pollMs: 5_000,
  });

  assert.equal(result.status, 'failed');
  assert.match(result.error ?? '', /timed out waiting for the backend/);
  assert.match(result.error ?? '', /status check failed \d+ time\(s\), last: 502 Bad Gateway/);
});

test('a failure reason that throws or is empty still ends the attempt as failed at once', async () => {
  for (const [failureReason, reason] of [
    [async () => Promise.reject(new Error('HTTP 502: Bad Gateway')), 'HTTP 502: Bad Gateway'],
    [async () => '', 'the backend gave no reason'],
  ] as const) {
    const time = fakeTime();
    const { port, constructs } = fakePort({ outcomes: [{ status: 'failed' }] });
    port.failureReason = failureReason;
    const result = await provisionTemplate(port, BP, time);

    assert.equal(result.status, 'failed');
    assert.equal(result.error, `attempt 1: ${reason}`);
    assert.equal(constructs(), 1);
    assert.ok(time.now() < 240_000, 'it never polls until the deadline');
  }
});

test("an older failed construction is not this attempt's failure, also after a failed first read", async () => {
  const old: Construction = { id: 'con-0', status: 'failed' };
  const { port, constructs } = fakePort({ existing: [old], outcomes: [{ status: 'pending' }] });
  port.failureReason = async () => 'BLUEPRINT_MODULE_NOT_INSTALLED (an old build)';
  const rowsOf = port.constructions;
  let reads = 0;
  port.constructions = async (id) => {
    reads++;
    // Read 2 is the attempt's first read of the rows before it; from read 5
    // the backend has built the attempt's row.
    if (reads === 2) throw new Error('HTTP 502: Bad Gateway');
    const rows = await rowsOf(id);
    return reads < 5 ? rows : rows.map((c) => (c === old ? c : { ...c, status: 'constructed' }));
  };
  const result = await provisionTemplate(port, BP, fakeTime());

  assert.equal(result.status, 'constructed');
  assert.equal(constructs(), 1);

  // When the second read fails too, the attempt constructs nothing, and the reads are named.
  const failing = fakePort({ existing: [old], outcomes: [] });
  let failingReads = 0;
  failing.port.constructions = async () => {
    if (failingReads++ === 0) return [old];
    throw new Error('HTTP 502: Bad Gateway');
  };
  const skipped = await provisionTemplate(failing.port, BP, { ...fakeTime(), maxConstructs: 1 });
  assert.equal(skipped.status, 'failed');
  assert.equal(failing.constructs(), 0);
  assert.equal(skipped.error, 'the status check failed 2 time(s), last: HTTP 502: Bad Gateway');
});

test('a failed membership-type lookup is reported beside a successful provision', async () => {
  const { port } = fakePort({
    outcomes: [{ status: 'constructed' }],
    entityTypes: async () => {
      throw new Error('permission denied for entity_type_provision');
    },
  });
  const result = await provisionTemplate(port, BP, fakeTime());

  assert.equal(result.status, 'constructed');
  assert.match(
    result.text,
    /membership types could not be read: permission denied for entity_type_provision/,
  );
});

test('an already constructed blueprint is not constructed again', async () => {
  const { port, constructs } = fakePort({
    existing: [{ id: 'con-0', status: 'constructed' }],
    outcomes: [],
  });
  const result = await provisionTemplate(port, BP, fakeTime());

  assert.equal(result.status, 'already');
  assert.equal(constructs(), 0);
  assert.match(result.text, /data_rooms \(prefix data_room, membership_type 3\)/);
});

test('only a gateway status or a network error leaves a construct worth polling', () => {
  const sdkError = (...messages: string[]) =>
    Object.assign(new Error(messages.join('\n')), {
      name: 'GraphQLRequestError',
      errors: messages.map((message) => ({ message })),
    });

  assert.equal(
    constructionRejection(sdkError('BLUEPRINT_MODULE_NOT_INSTALLED (agent)'))?.message,
    'BLUEPRINT_MODULE_NOT_INSTALLED (agent)',
  );
  assert.equal(
    constructionRejection(sdkError('HTTP 400: Bad Request'))?.message,
    'HTTP 400: Bad Request',
  );
  assert.equal(constructionRejection(sdkError('HTTP 504: Gateway Timeout')), null);
  assert.equal(constructionRejection(new TypeError('fetch failed')), null);
});
