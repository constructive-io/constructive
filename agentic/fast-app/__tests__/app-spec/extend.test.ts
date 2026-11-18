import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { DeltaCall } from '../../src/app-spec/delta';
import type { AppSpec, BlueprintExtend, SpecEntity, SpecField } from '../../src/app-spec/types';
import { type AppSpecError, validateAppSpec } from '../../src/app-spec/validate';
import type { BlueprintJson } from '../../src/extensions/blueprint-summary';
import { deltaOf } from './__fixtures__/delta-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
// The shipped curated blueprint: its tables are owner-only.
const blueprints: Record<string, BlueprintJson> = {
  agent: read(new URL('../../src/blueprints/agent.json', moduleUrl)),
};

const agentApp = (extend: BlueprintExtend, seed?: AppSpec['seed']): AppSpec => ({
  version: 1,
  name: 'Agent Review',
  backend: { kind: 'blueprint', slug: 'agent', extend },
  ...(seed && { seed }),
});

function errorsOf(spec: AppSpec): AppSpecError[] {
  const result = validateAppSpec(spec, schema, { blueprints });
  return 'errors' in result ? result.errors : [];
}

const priority: SpecField = {
  name: 'priority',
  type: 'text',
  enum: ['low', 'normal', 'high'],
  default: 'normal',
};

const reviewNotes: SpecEntity = {
  name: 'review_notes',
  fields: [{ name: 'body', type: 'long_text', required: true }],
  belongsTo: [{ field: 'task_id', to: 'agent_task', onDelete: 'cascade' }],
};

test("extend lands on the blueprint's real tables and never reuses a name", () => {
  assert.deepEqual(
    errorsOf(
      agentApp({
        entities: [{ name: 'agent_task', fields: [{ name: 'title', type: 'text' }] }],
        fields: {
          agent_tasks: [{ name: 'priority', type: 'text' }],
          agent_task: [
            { name: 'status', type: 'text' },
            { name: 'due_on', type: 'date', required: true },
          ],
        },
        belongsTo: { agent_task: [{ field: 'reviewer_id', to: 'reviewers' }] },
      }),
    ),
    [
      {
        path: 'backend.extend.entities[0].name',
        message:
          '"agent_task" is a table of the agent blueprint already; add columns to it under extend.fields, or name the new table for what it holds',
      },
      {
        path: 'backend.extend.fields.agent_tasks',
        message:
          'agent has no table "agent_tasks"; did you mean "agent_task"? A new table goes in extend.entities.',
      },
      {
        path: 'backend.extend.fields.agent_task[0].name',
        message: 'agent_task has a column "status" already; pick another name',
      },
      {
        path: 'backend.extend.fields.agent_task[1].required',
        message: 'agent_task has rows already, so a new column must be optional or have a default',
      },
      {
        path: 'backend.extend.belongsTo.agent_task[0].to',
        message:
          'no table is named "reviewers"; the tables are "agent_thread", "agent_message", "agent_task"',
      },
    ],
  );
});

test('seed rows fill the columns and tables extend adds, with their values checked', () => {
  const extend: BlueprintExtend = { fields: { agent_task: [priority] }, entities: [reviewNotes] };
  const thread = { title: 'Refund for order 1042' };
  const task = { thread_id: '@agent_thread[0]', description: 'Check the refund' };
  assert.deepEqual(
    errorsOf(
      agentApp(extend, {
        agent_thread: [thread],
        agent_task: [{ ...task, priority: 'urgent' }],
        review_notes: [{ task_id: '@agent_task[0]' }],
      }),
    ),
    [
      { path: 'seed.review_notes[0]', message: 'missing "body", which is required' },
      {
        path: 'seed.agent_task[0].priority',
        message: '"urgent" is not one of "low", "normal", "high"',
      },
    ],
  );
  assert.deepEqual(
    errorsOf(
      agentApp(extend, {
        agent_thread: [thread],
        agent_task: [{ ...task, priority: 'high' }],
        review_notes: [{ task_id: '@agent_task[0]', body: 'Looks right' }],
      }),
    ),
    [],
  );
});

const tools = (calls: DeltaCall[]) =>
  calls.map((c) =>
    c.tool === 'provision_blueprint'
      ? `provision_blueprint ${c.params.definition.tables.map((t) => t.table_name).join(',')} | ${(c.params.definition.relations ?? []).map((r) => `${r.source_table}.${r.field_name}→${r.target_table}`).join(',')}`
      : `${c.tool} ${c.params.table_name}${'field_name' in c.params ? `.${c.params.field_name}` : ''}`,
  );

test('an extended blueprint adds its columns and tables after the blueprint, and warns about a shared child of an owner-only table', () => {
  const spec = agentApp({
    fields: { agent_task: [priority, { name: 'reviewed', type: 'boolean', default: false }] },
    belongsTo: { agent_task: [{ field: 'note_id', to: 'review_notes', onDelete: 'set_null' }] },
    entities: [reviewNotes],
  });
  assert.deepEqual(errorsOf(spec), []);
  const delta = deltaOf(null, spec, { blueprints });
  assert.deepEqual(delta.destructive, []);
  assert.deepEqual(tools(delta.calls), [
    'create_field agent_task.reviewed',
    'secure_table_provision agent_task',
    'provision_blueprint review_notes | agent_task.note_id→review_notes,review_notes.task_id→agent_task',
  ]);
  assert.deepEqual(delta.warnings, [
    'backend.extend.entities[0]: review_notes is shared, but it belongs to agent_task, which only some members can see; every member will read every review_notes row. Make it "private" if those rows are personal.',
  ]);
});

test("a follow-up removes only what extend added; the blueprint's own tables stay", () => {
  const before = agentApp({ fields: { agent_task: [priority] }, entities: [reviewNotes] });
  const after = agentApp({});
  assert.deepEqual(errorsOf(after), []);
  const delta = deltaOf(before, after, { blueprints });
  assert.deepEqual(
    delta.destructive.map((d) => [d.id, d.call.tool]),
    [
      ['drop_field:agent_task.priority', 'delete_field'],
      ['drop_table:review_notes', 'delete_table'],
    ],
  );
  assert.deepEqual(delta.calls, []);
});
