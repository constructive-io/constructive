import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { runSeed, type SeedStep } from '../../src/pipeline/seed';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const { tables } = JSON.parse(
  readFileSync(new URL('./__fixtures__/agent-meta.json', moduleUrl), 'utf8'),
) as { tables: LiveMetaTable[] };

const session = { endpoint: 'http://api-agent.localhost/graphql', token: 't', userId: 'owner-1' };

// Answers each aliased create with a fresh id and keeps what was sent.
let sent: Array<{ query: string; variables: Record<string, Record<string, unknown>> }> = [];
const realFetch = globalThis.fetch;
function stubApi(): void {
  let next = 0;
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as (typeof sent)[number];
    sent.push(body);
    const data: Record<string, unknown> = {};
    for (const [alias, input] of Object.entries(body.variables)) {
      const [rowField] = Object.keys(input);
      data[alias] = { [rowField]: { id: `id-${next++}` } };
    }
    return new Response(JSON.stringify({ data }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
  sent = [];
});

const steps = (message: Record<string, unknown>): SeedStep[] => [
  { table: 'agent_thread', rows: [{ title: 'Refund request' }] },
  { table: 'agent_message', rows: [{ thread_id: '@agent_thread[0]', ...message }] },
];

test('a snake_case seed column goes out under its _meta name on a first and a repeated call', async () => {
  for (let call = 0; call < 2; call += 1) {
    stubApi();
    const result = await runSeed(
      steps({ author_role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      tables,
      session,
    );
    assert.equal(result.inserted, 2);
    const message = sent[1].variables.r0.agentMessage as Record<string, unknown>;
    assert.equal(message.authorRole, 'user');
    assert.equal(message.threadId, result.ids.agentthread[0]);
    assert.ok(!('author_role' in message));
    globalThis.fetch = realFetch;
    sent = [];
  }
});

test('an unknown column in a later table fails before any row is written', async () => {
  for (const bad of [{ author_author_role: 'user', author_role: 'user' }, { role: 'user' }]) {
    stubApi();
    await assert.rejects(
      runSeed(steps(bad), tables, session),
      /seed column "agent_message\.(author_author_role|role)" is not a field of AgentMessage/,
    );
    assert.equal(sent.length, 0);
  }
});

test('a follow-up inserts only its new rows, and they can point at rows inserted before', async () => {
  stubApi();
  const result = await runSeed(
    [
      { table: 'agent_thread', from: 1, rows: [{ title: 'Login loop' }] },
      {
        table: 'agent_message',
        from: 2,
        rows: [
          { thread_id: '@agent_thread[0]', author_role: 'user' }, // an earlier thread
          { thread_id: '@agent_thread[1]', author_role: 'user' }, // the new one
        ],
      },
    ],
    tables,
    session,
    { seeded: { agentthread: ['old-thread'], agentmessage: ['old-m0', 'old-m1'] } },
  );

  assert.equal(result.inserted, 3);
  const threads = sent[0].variables;
  assert.deepEqual(
    Object.values(threads).map((v) => (v.agentThread as { title: string }).title),
    ['Login loop'],
  );
  const messages = Object.values(sent[1].variables).map(
    (v) => (v.agentMessage as { threadId: string }).threadId,
  );
  assert.deepEqual(messages, ['old-thread', result.ids.agentthread[1]]);
  assert.deepEqual(result.ids.agentthread, ['old-thread', 'id-0']);
  assert.deepEqual(result.ids.agentmessage.slice(0, 2), ['old-m0', 'old-m1']);
  assert.equal(result.ids.agentmessage.length, 4);
});

test('a level with a rejected row records the rows before it, and the error names the row', async () => {
  // r0 and r2 land; r1 (threads[1]) is rejected.
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as (typeof sent)[number];
    sent.push(body);
    return new Response(
      JSON.stringify({
        data: { r0: { agentThread: { id: 't-0' } }, r1: null, r2: { agentThread: { id: 't-2' } } },
        errors: [{ message: 'value too long', path: ['r1'] }],
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  const landed: unknown[] = [];
  await assert.rejects(
    runSeed(
      [{ table: 'agent_thread', rows: [{ title: 'a' }, { title: 'b' }, { title: 'c' }] }],
      tables,
      session,
      { onLevel: (rows) => void landed.push(...rows) },
    ),
    /agent_thread\[1\]: value too long/,
  );
  // threads[2] is in too, but the record keeps a table's rows as a prefix.
  assert.deepEqual(landed, [{ table: 'agent_thread', from: 0, ids: ['t-0'] }]);
});
