import assert from 'node:assert/strict';

import { constructiveDbTools, toPiTools } from '@agentic-kit/pi';
// The validator pi-ai's index exports, from its public utils subpath: the
// index loads the whole library, which jest would have to compile too.
import { validateToolArguments } from '@earendil-works/pi-ai/utils/validation';

import { withHostnameSafeName } from '../../../src/extensions/db-tools/index-extension';

const provision = toPiTools(constructiveDbTools).find((t) => t.name === 'provision_database');
assert.ok(provision);
const tool = { ...provision, parameters: withHostnameSafeName(provision.parameters) };

function validate(databaseName: string) {
  return validateToolArguments(tool, {
    type: 'toolCall',
    id: 'call-1',
    name: 'provision_database',
    arguments: { database_name: databaseName },
  });
}

test('hostname-safe database names pass validation', () => {
  for (const name of ['notes', 'notes-app', 'launch-qa-notes', 'app2']) {
    assert.deepEqual(validate(name), { database_name: name });
  }
});

test('names that are not valid hostnames fail before the tool runs', () => {
  for (const name of [
    'notes_app',
    'Notes',
    '2notes',
    'notes-',
    '-notes',
    'notes--app',
    'a'.repeat(51),
  ]) {
    assert.throws(() => validate(name), /database_name/);
  }
});

test('other provision parameters stay unchanged', () => {
  assert.deepEqual(
    tool.parameters.properties?.reprovision,
    provision.parameters.properties?.reprovision,
  );
  assert.deepEqual(tool.parameters.required, ['database_name']);
});
