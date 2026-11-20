import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { AppSpec } from '../../src/app-spec/types';
import { type AppSpecError, validateAppSpec } from '../../src/app-spec/validate';
import type { BlueprintJson } from '../../src/extensions/blueprint-summary';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
// The shipped curated blueprint, as list_blueprints describes it.
const blueprints: Record<string, BlueprintJson> = {
  agent: read(new URL('../../src/blueprints/agent.json', moduleUrl)),
};

const agentApp = (seed: AppSpec['seed']): AppSpec => ({
  version: 1,
  name: 'Agent Review',
  backend: { kind: 'blueprint', slug: 'agent' },
  seed,
});

function errorsOf(spec: AppSpec): AppSpecError[] {
  const result = validateAppSpec(spec, schema, { blueprints });
  return 'errors' in result ? result.errors : [];
}

test("a curated blueprint's seed is checked against its own tables and columns", () => {
  const thread = { title: 'Refund for order 1042', status: 'active' };
  assert.deepEqual(
    errorsOf(
      agentApp({
        agent_thread: [thread],
        agent_message: [
          { thread_id: '@agent_thread[0]', author_role: 'user', parts: [] },
          // a-final-3's mistake: a doubled word next to the right column.
          { thread_id: '@agent_thread[0]', author_author_role: 'user', author_role: 'user' },
        ],
        agent_tasks: [{ thread_id: '@agent_thread[0]', description: 'Refund' }],
      }),
    ),
    [
      {
        path: 'seed.agent_message[1].author_author_role',
        message:
          'agent_message has no column "author_author_role"; did you mean "author_role"? This row sets "author_role" already, so remove "author_author_role"',
      },
      {
        path: 'seed.agent_tasks',
        message: 'agent has no table "agent_tasks"; did you mean "agent_task"?',
      },
    ],
  );

  // The columns the nodes add are known too, and a correct seed passes.
  assert.deepEqual(
    errorsOf(
      agentApp({
        agent_thread: [{ ...thread, entity_id: '01a15222-99fe-7a0f-8701-c4ba7605073a' }],
        agent_task: [{ thread_id: '@agent_thread[0]', description: 'Refund', status: 'pending' }],
      }),
    ),
    [],
  );
});

test('an unknown slug names the blueprints there are', () => {
  const spec: AppSpec = {
    version: 1,
    name: 'CRM',
    backend: { kind: 'blueprint', slug: 'agentic_crm' },
  };
  assert.deepEqual(errorsOf(spec), [
    {
      path: 'backend.slug',
      message: 'no curated blueprint is named "agentic_crm"; the blueprints are "agent"',
    },
  ]);
});

function fundraiseApp(stages: NonNullable<AppSpec['seed']>[string]): AppSpec {
  return {
    version: 1,
    name: 'Fundraise',
    backend: { kind: 'blueprint', slug: 'fundraise' },
    seed: {
      projects: [{ name: 'Seed round' }],
      project_stages: stages,
    },
  };
}

test('fundraise seed rows require the listed project key and stage name before approval', () => {
  const result = validateAppSpec(
    fundraiseApp([
      { name: 'Introduced' },
      { name: 'Diligence', project_id: null },
      { project_id: '@projects[0]' },
    ]),
    schema,
  );
  assert.equal(result.ok, false);
  if ('errors' in result) {
    assert.deepEqual(result.errors, [
      {
        path: 'seed.project_stages[0].project_id',
        message: 'missing "project_id", a required key; use a reference like "@projects[0]"',
      },
      {
        path: 'seed.project_stages[1].project_id',
        message: 'missing "project_id", a required key; use a reference like "@projects[0]"',
      },
      {
        path: 'seed.project_stages[2].name',
        message: 'missing "name", which is required',
      },
    ]);
  }
});

test('curated seed validation keeps landed placeholders and lets the database fill defaults', () => {
  const next = { name: 'Introduced', project_id: '@projects[0]' };
  const result = validateAppSpec(fundraiseApp([{}, next]), schema, {
    landed: { project_stages: [{}] },
  });
  assert.equal(result.ok, true);

  const appended = validateAppSpec(fundraiseApp([{}, { name: 'Diligence' }]), schema, {
    landed: { project_stages: [{}] },
  });
  assert.equal(appended.ok, false);
  if ('errors' in appended) {
    assert.deepEqual(
      appended.errors.map(({ path }) => path),
      ['seed.project_stages[1].project_id'],
    );
  }
});
