import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { overlayOf } from '../../src/app-spec/overlay';
import type { AppSpec, SeedRow } from '../../src/app-spec/types';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { type BuildPlan, lastRecordOf, recordKindOf, resolvePlan } from '../../src/pipeline/build-plan';
import { BuildLedger, type BuildRecord, readBuildRecord } from '../../src/pipeline/build-record';
import { followUpLines } from '../../src/pipeline/result-text';
import { seedStep, type SkippedSeed } from '../../src/pipeline/seed-step';
import { liveModelOf } from '../app-spec/__fixtures__/live-model-of';
import { planOn } from './__fixtures__/plan-on';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const { tables } = JSON.parse(
  readFileSync(new URL('./__fixtures__/agent-meta.json', moduleUrl), 'utf8'),
) as { tables: LiveMetaTable[] };

const session = { endpoint: 'http://api-agent.localhost/graphql', token: 't', userId: 'owner-1' };

type Sent = { query: string; variables: Record<string, Record<string, Record<string, unknown>>> };
let sent: Sent[] = [];
let next = 0;
const realFetch = globalThis.fetch;
const json = (payload: unknown) =>
  new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
// Answers each aliased create with a fresh id, or rejects every row of the
// requests `reject` picks (counted from 1), and keeps what was sent. A count
// gets `rows` per list query (`agentThreads`), 0 when it isn't named.
function stubApi(
  reject: (request: number) => boolean = () => false,
  rows: Record<string, number> = {},
): void {
  sent = [];
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as Sent;
    if (body.query.startsWith('query SeedCounts')) {
      const counts = [...body.query.matchAll(/(c\d+): (\w+) \{ totalCount \}/g)];
      return json({
        data: Object.fromEntries(counts.map(([, a, all]) => [a, { totalCount: rows[all] ?? 0 }])),
      });
    }
    sent.push(body);
    const aliases = Object.keys(body.variables);
    const payload = reject(sent.length)
      ? { errors: aliases.map((alias) => ({ message: 'permission denied', path: [alias] })) }
      : {
        data: Object.fromEntries(
          aliases.map((alias) => {
            const [rowField] = Object.keys(body.variables[alias]);
            return [alias, { [rowField]: { id: `id-${next++}` } }];
          }),
        ),
      };
    return json(payload);
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
  sent = [];
  next = 0;
});

const threads = (...titles: string[]): SeedRow[] => titles.map((title) => ({ title }));
const app = (seed: Record<string, SeedRow[]>): AppSpec => ({
  version: 1,
  name: 'Support',
  backend: {
    kind: 'custom',
    entities: [
      { name: 'agent_thread', fields: [{ name: 'title', type: 'text' }] },
      {
        name: 'agent_message',
        fields: [{ name: 'author_role', type: 'text' }],
        belongsTo: [{ field: 'thread_id', to: 'agent_thread' }],
      },
    ],
  },
  seed,
});
const message = { thread_id: '@agent_thread[0]', author_role: 'user' };
/** The database the schema step left: the two tables, ids `t:<table>` and `f:<table>.<column>`. */
const model = liveModelOf(app({}));

/** The plan for `spec` from what the project's record says now. */
async function planFor(dir: string, spec: AppSpec): Promise<BuildPlan> {
  const read = await readBuildRecord(dir);
  // Before the first schema step, the database has no tables yet.
  const outcome = planOn(read, spec, read.kind === 'ok' ? model : null);
  assert.equal(outcome.kind, 'build');
  return (outcome as { plan: BuildPlan }).plan;
}

/** The seed step of a build of `spec`, on the record its schema step opened. */
async function seed(dir: string, spec: AppSpec): Promise<BuildRecord> {
  const plan = await planFor(dir, spec);
  const ledger = await BuildLedger.open(dir, {
    version: 3,
    kind: recordKindOf(plan),
    startedAt: new Date().toISOString(),
    database: { id: model.databaseId, name: 'support', hash: model.hash },
    overlay: overlayOf(spec, model, plan.overlay, []),
    seeded: lastRecordOf(plan)?.seeded ?? {},
    steps: { settled: true, codegen: true, seeded: false, gen: false },
    expect: [],
  });
  try {
    await seedStep({
      spec,
      plan,
      tables,
      model,
      session,
      rules: {},
      ledger,
      signal: new AbortController().signal,
      note: () => {},
    });
  } finally {
    // What the next plan_app reads, success or not.
    assert.deepEqual(
      ledger.record,
      ((await readBuildRecord(dir)) as { record: BuildRecord }).record,
    );
  }
  return ledger.record;
}

const project = () => mkdtempSync(path.join(tmpdir(), 'seed-step-'));

test('a first build whose second level was rejected inserts only that level again', async () => {
  const dir = project();
  const spec = app({ agent_thread: threads('Refund request'), agent_message: [message] });

  stubApi((request) => request === 2);
  await assert.rejects(seed(dir, spec), /agent_message\[0\]: permission denied/);
  const failed = (await readBuildRecord(dir)) as { record: BuildRecord };
  // By id, so the rows follow a rename made outside the app.
  assert.deepEqual(failed.record.seeded, {
    't:agent_thread': { rows: [{ 'f:agent_thread.title': 'Refund request' }], ids: ['id-0'] },
  });
  assert.equal(failed.record.steps.seeded, false);

  stubApi();
  const done = await seed(dir, spec);
  assert.equal(sent.length, 1, 'the threads are not inserted twice');
  assert.deepEqual(
    Object.values(sent[0].variables).map((v) => v.agentMessage.threadId),
    ['id-0'],
  );
  assert.deepEqual(done.seeded['t:agent_message'], {
    rows: [
      { 'f:agent_message.thread_id': '@#t:agent_thread[0]', 'f:agent_message.author_role': 'user' },
    ],
    ids: ['id-1'],
  });
  assert.equal(done.steps.seeded, true);
});

test("a follow-up whose new rows didn't land inserts them on the next plan_app", async () => {
  const dir = project();
  stubApi();
  await seed(dir, app({ agent_thread: threads('Refund request') }));
  const more = app({ agent_thread: threads('Refund request', 'Login loop') });

  stubApi(() => true);
  await assert.rejects(seed(dir, more), /agent_thread\[1\]: permission denied/);
  // The rows that didn't land are still to insert, though the schema step ran.
  assert.equal((await planFor(dir, more)).delta.seed.rows, 1);

  stubApi();
  const done = await seed(dir, more);
  assert.deepEqual(
    sent.flatMap((request) => Object.values(request.variables).map((v) => v.agentThread.title)),
    ['Login loop'],
  );
  assert.deepEqual(done.seeded['t:agent_thread'].ids, ['id-0', 'id-1']);
  assert.equal((await planFor(dir, more)).delta.uiOnly, true);
});

test('rows go only into empty tables; tables that point at a skipped one skip too', async () => {
  const spec = app({ agent_thread: threads('Refund request'), agent_message: [message] });
  // No build record: an app built before records, adopted from its database.
  const outcome = planOn({ kind: 'none' }, spec, model);
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  const { plan } = outcome;
  assert.deepEqual(plan.seedIfEmpty, ['agent_thread', 'agent_message']);
  // The seed of that plan, with `rows` per list query already in the database.
  async function adoptedSeed(rows: Record<string, number>) {
    const ledger = await BuildLedger.open(project(), {
      version: 3,
      kind: 'update',
      startedAt: new Date().toISOString(),
      database: { id: model.databaseId, name: 'support', hash: model.hash },
      overlay: overlayOf(spec, model, null, []),
      seeded: {},
      steps: { settled: true, codegen: true, seeded: false, gen: false },
      expect: [],
    });
    stubApi(() => false, rows);
    const result = await seedStep({
      spec,
      plan,
      tables,
      model,
      session,
      rules: {},
      ledger,
      signal: new AbortController().signal,
      note: () => {},
    });
    return { ...result, record: ledger.record };
  }
  const reasons = (skipped: SkippedSeed[]) => skipped.map(({ table, why, at }) => [table, why, at]);

  // People added threads: none of the sample rows go in, the messages
  // because they point at a sample thread.
  const threadsIn = await adoptedSeed({ agentThreads: 2 });
  assert.deepEqual(reasons(threadsIn.skipped), [
    ['agent_thread', 'has-rows', undefined],
    ['agent_message', 'points-at', 'agent_thread'],
  ]);
  assert.deepEqual([threadsIn.seeded, sent], [[], []]);
  // The skipped rows count as kept by the database: no later build inserts them.
  assert.deepEqual(threadsIn.record.seeded['t:agent_thread'].ids, [null]);
  assert.deepEqual(threadsIn.record.seeded['t:agent_message'].ids, [null]);
  const after = planOn({ kind: 'ok', record: threadsIn.record }, spec, model);
  assert.equal(after.kind === 'build' && after.plan.delta.seed.rows, 0);

  // Only messages: the empty threads table gets its row, the messages none.
  const messagesIn = await adoptedSeed({ agentMessages: 5 });
  assert.deepEqual(reasons(messagesIn.skipped), [['agent_message', 'has-rows', undefined]]);
  assert.deepEqual(messagesIn.seeded, ['agent_thread']);
  assert.deepEqual(messagesIn.record.seeded['t:agent_thread'].ids, ['id-0']);
  // The result says what was left out, and counts only the row that went in.
  const lines = followUpLines(plan.delta, resolvePlan(plan, []), [], messagesIn.skipped);
  assert.ok(lines.includes('Inserted 1 new sample rows.'));
  assert.ok(lines.includes('Sample rows skipped: agent_message (has rows).'));
});
