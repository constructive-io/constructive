import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { AppSpec } from '../../src/app-spec/types';
import { formatAppSpecErrors, validateAppSpec } from '../../src/app-spec/validate';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// The backend compares uuid columns without their key suffix
// (metaschema_public.field's databases_field_uniq_names_idx), so these specs
// fail in the schema phase after the database is made unless plan_app refuses
// them first. The first is the spec a live data-room round sent.
const schema = JSON.parse(
  readFileSync(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl), 'utf8'),
);

function errorsOf(spec: AppSpec): string {
  const result = validateAppSpec(spec, schema);
  return 'errors' in result ? formatAppSpecErrors(result.errors) : '';
}

const custom = (
  entities: Extract<AppSpec['backend'], { kind: 'custom' }>['entities'],
): AppSpec => ({
  version: 1,
  name: 'Data Room',
  backend: { kind: 'custom', entities, links: [] },
});

test('a text field named for the owner clashes with the owner_id every table has', () => {
  const message = errorsOf(
    custom([
      {
        name: 'diligence_items',
        access: 'shared',
        fields: [
          { name: 'title', type: 'text' },
          { name: 'owner', type: 'text' },
        ],
      },
    ]),
  );
  assert.match(message, /fields\[1\]\.name.*"owner" clashes with "owner_id".*"owner_name"/);
});

test('a field named like a key the same table declares is the one to rename', () => {
  const message = errorsOf(
    custom([
      { name: 'data_rooms', access: 'shared', fields: [{ name: 'name', type: 'text' }] },
      {
        name: 'documents',
        access: 'shared',
        fields: [
          { name: 'title', type: 'text' },
          { name: 'room', type: 'text' },
        ],
        belongsTo: [{ field: 'room_id', to: 'data_rooms' }],
      },
    ]),
  );
  assert.match(message, /entities\[1\]\.fields\[1\]\.name.*"room" clashes with "room_id"/);
  assert.doesNotMatch(message, /belongsTo\[0\]/);
});

test('a field added to a blueprint table is checked against its keys', () => {
  const message = errorsOf({
    version: 1,
    name: 'VC CRM',
    backend: {
      kind: 'blueprint',
      slug: 'agentic_crm',
      extend: { fields: { deals: [{ name: 'company', type: 'text' }] } },
    },
  });
  assert.match(message, /extend\.fields\.deals\[0\]\.name.*"company" clashes with "company_id"/);
});

test('names that only share a prefix with a key stay valid', () => {
  assert.equal(
    errorsOf(
      custom([
        {
          name: 'documents',
          access: 'shared',
          fields: [
            { name: 'owner_name', type: 'text' },
            { name: 'room_label', type: 'text' },
            { name: 'ownership', type: 'text' },
          ],
        },
      ]),
    ),
    '',
  );
});
