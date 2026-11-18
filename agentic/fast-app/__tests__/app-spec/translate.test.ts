import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { BlueprintZod, expandBlueprintDefaults } from '@agentic-kit/harness';

import type { BlueprintTable } from '../../src/app-spec/translate';
import type { AppSpec, CustomBackend, SpecField } from '../../src/app-spec/types';
import { validateAppSpec } from '../../src/app-spec/validate';
import { NOW_DEFAULTS } from '../../src/app-spec/vocabulary';
import { deltaOf } from './__fixtures__/delta-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const foodBank = (): AppSpec =>
  read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl));

const table = (tables: BlueprintTable[], name: string) => {
  const found = tables.find((t) => t.table_name === name);
  assert.ok(found, `no table ${name}`);
  return found;
};

const nodeTypes = (t: BlueprintTable) => t.nodes.map((n) => (typeof n === 'string' ? n : n.$type));

// A first build's provision_blueprint call, through the delta.
function firstBuild(spec: AppSpec) {
  const [call] = deltaOf(null, spec, { blueprints: {} }).calls;
  if (call?.tool !== 'provision_blueprint') assert.fail('a first build is one provision_blueprint');
  return call.params;
}

const tablesOf = (spec: AppSpec) => firstBuild(spec).definition.tables as BlueprintTable[];

test('the definition passes provision_blueprint unchanged, nodes and policies included', () => {
  const params = firstBuild(foodBank());
  // The tool parses its parameters with this schema, which drops unknown keys.
  assert.deepEqual(BlueprintZod.parse(params), params);
  const expanded = expandBlueprintDefaults(params.definition) as { tables: BlueprintTable[] };
  for (const written of params.definition.tables as BlueprintTable[]) {
    const sent = table(expanded.tables, written.table_name);
    assert.deepEqual(sent.nodes, written.nodes, written.table_name);
    assert.deepEqual(sent.policies, written.policies, written.table_name);
  }
});

test('every "now" a date or timestamp default accepts becomes its expression; the other type\'s is refused', () => {
  const specWith = (field: SpecField): AppSpec => ({
    version: 1,
    name: 'Shifts',
    backend: { kind: 'custom', entities: [{ name: 'shifts', fields: [field] }] },
  });
  const errorsOf = (spec: AppSpec) => {
    const result = validateAppSpec(spec, schema, { blueprints: {} });
    return 'errors' in result ? result.errors : [];
  };
  for (const [type, { expression, spellings }] of Object.entries(NOW_DEFAULTS)) {
    const other = type === 'date' ? NOW_DEFAULTS.timestamp : NOW_DEFAULTS.date;
    const at = (spelling: string) =>
      specWith({ name: 'at', type: type as SpecField['type'], default: spelling });
    for (const spelling of [...spellings, ...spellings.map((s) => s.toUpperCase())]) {
      assert.deepEqual(errorsOf(at(spelling)), [], `${type} ${spelling}`);
      const [shifts] = firstBuild(at(spelling)).definition.tables;
      assert.equal(shifts.fields?.[0].default, expression, `${type} ${spelling}`);
    }
    // Before, these passed validation and became a quoted literal: a failed cast
    // after the card, or a default frozen at build time.
    for (const spelling of other.spellings.filter((s) => !spellings.includes(s))) {
      assert.deepEqual(
        errorsOf(at(spelling)).map((e) => e.path),
        ['backend.entities[0].fields[0].default'],
        `${type} ${spelling}`,
      );
    }
  }
});

test('shared entities admit any app member, a private one only its owner', () => {
  const tables = tablesOf(foodBank());

  for (const name of ['locations', 'volunteers', 'shifts', 'volunteer_shifts']) {
    const t = table(tables, name);
    assert.deepEqual(t.policies, [
      {
        $type: 'AuthzAppMembership',
        data: {},
        privileges: ['select', 'insert', 'update', 'delete'],
        policy_role: 'authenticated',
        permissive: true,
      },
    ]);
    assert.deepEqual(nodeTypes(t).slice(0, 4), [
      'DataId',
      'DataDirectOwner',
      'DataForceCurrentUser',
      'DataTimestamps',
    ]);
  }
  assert.deepEqual(table(tables, 'availability_notes').policies, [
    {
      $type: 'AuthzAppMemberOwner',
      data: { owner_field: 'owner_id' },
      privileges: ['select', 'insert', 'update', 'delete'],
      policy_role: 'authenticated',
      permissive: true,
    },
  ]);
});

test('a link to a private entity is private too', () => {
  const spec = foodBank();
  const backend = spec.backend as CustomBackend;
  backend.entities.find((e) => e.name === 'volunteers')!.access = 'private';
  const tables = tablesOf(spec);

  assert.equal(table(tables, 'volunteer_shifts').policies[0].$type, 'AuthzAppMemberOwner');
  assert.equal(table(tables, 'shifts').policies[0].$type, 'AuthzAppMembership');
});

test('fields, enums, keys and links become columns, status nodes and relations', () => {
  const { relations } = firstBuild(foodBank()).definition;
  const tables = tablesOf(foodBank());

  const shifts = table(tables, 'shifts');
  assert.deepEqual(shifts.fields, [
    { name: 'starts_at', type: 'timestamptz', is_required: true },
    { name: 'ends_at', type: 'timestamptz', is_required: true },
    { name: 'notes', type: 'text' },
  ]);
  assert.deepEqual(shifts.nodes.at(-1), {
    $type: 'DataStatusField',
    data: {
      field_name: 'status',
      allowed_values: ['open', 'full', 'cancelled'],
      is_required: false,
      default_value: { value: 'open' },
    },
  });
  assert.deepEqual(table(tables, 'locations').fields?.at(-1), {
    name: 'capacity',
    type: 'integer',
    default: '10',
  });
  assert.equal(table(tables, 'volunteers').fields?.[1].type, 'email');

  assert.deepEqual(
    relations?.map((r) => [
      r.source_table,
      r.field_name,
      r.target_table,
      r.delete_action,
      r.is_required,
    ]),
    [
      ['shifts', 'location_id', 'locations', 'c', true],
      ['availability_notes', 'volunteer_id', 'volunteers', 'n', false],
      ['volunteer_shifts', 'volunteer_id', 'volunteers', 'c', true],
      ['volunteer_shifts', 'shift_id', 'shifts', 'c', true],
    ],
  );
});
