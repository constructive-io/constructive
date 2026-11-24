import assert from 'node:assert/strict';

import { DATABASE_EXTENSIONS, headlessExtensions, toolNamesOf } from '../../src/headless/extensions';
import { headlessSystemPrompt } from '../../src/headless/prompt';

// Snake-case words the text writes as code that are columns or values, not tools.
const NOT_TOOLS = new Set(['created_at', 'entity_id', 'owner_id', 'set_null', 'shift_id', 'updated_at', 'volunteer_id', 'volunteer_shifts']);

const codeNames = (text: string) =>
  [...text.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)].map((match) => match[1]).filter((name) => !NOT_TOOLS.has(name));

test('every tool the section names is one the run registers', async () => {
  const prompt = await headlessSystemPrompt();
  const tools = new Set(await toolNamesOf(headlessExtensions(async () => {})));
  assert.match(prompt, /^## Building an app/);
  assert.ok(codeNames(prompt).includes('plan_app'));
  assert.deepEqual(codeNames(prompt).filter((name) => !tools.has(name)), []);
});

test('the database tools paragraph names exactly the database tools the run has', async () => {
  const prompt = await headlessSystemPrompt();
  const paragraph = prompt.slice(prompt.indexOf('## Database and schema tools'));
  // The list is the first sentence; the next ones name plan_app and the skill.
  const list = (paragraph.split('\n').find((line) => line.startsWith('These tools are')) ?? '').split('. They are')[0];
  const named = codeNames(list);
  const registered = await toolNamesOf(DATABASE_EXTENSIONS);
  assert.deepEqual(named, registered);
  for (const absent of ['provision_database', 'create_api_key', 'run_preflight']) {
    assert.equal(paragraph.includes(absent), false, absent);
  }
  assert.ok(registered.includes('describe_schema') && registered.includes('list_blueprints'));
});

