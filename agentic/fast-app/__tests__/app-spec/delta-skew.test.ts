import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { liveColumns, skewOf } from '../../src/app-spec/live-model';
import { liveSpec } from '../../src/app-spec/live-spec';
import { overlayOf } from '../../src/app-spec/overlay';
import type { AppSpec, CustomBackend, SpecEntity } from '../../src/app-spec/types';
import { formatAppSpecErrors, validateAppSpec } from '../../src/app-spec/validate';
import { deltaOf } from './__fixtures__/delta-of';
import { landedOf, liveModelOf } from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// Raw SQL changes the database but not the platform's schema records, which
// the schema tools work from. plan_app skips any call on a column SQL added.
// A column only the records list reads the same as an API that hasn't caught
// up, so it counts as there.

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const built: AppSpec = read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl));

const entity = (spec: AppSpec, name: string): SpecEntity => {
  const found = (spec.backend as CustomBackend).entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

test('a column added with SQL is kept and protected; one the API does not list yet counts as there', () => {
  const clean = liveModelOf(built);
  const overlay = overlayOf(
    built,
    clean,
    null,
    clean.tables.map((t) => t.id),
  );
  const model = liveModelOf(built, {
    sql: {
      added: [['volunteers', 'shirt_size']],
      dropped: [
        ['volunteers', 'phone'],
        ['availability_notes', 'volunteer_id'],
      ],
    },
  });
  const view = liveSpec({
    model,
    overlay,
    seeded: landedOf(built, clean),
    fallbackName: 'food-bank',
  });
  // app-spec.json still shows the ones `_meta` lacks, with their values.
  assert.deepEqual(
    entity(view.spec, 'volunteers').fields.map((f) => f.name),
    ['full_name', 'email', 'phone'],
  );
  assert.deepEqual(entity(view.spec, 'availability_notes').belongsTo, [
    { field: 'volunteer_id', to: 'volunteers', onDelete: 'set_null' },
  ]);
  assert.equal(view.landed.volunteers[1].phone, '555-0102');
  assert.deepEqual(view.readOnly, [
    { kind: 'column', table: 'volunteers', column: 'shirt_size', reason: 'added with SQL' },
  ]);

  // The user asks for a shirt size: no call, and no claim that SQL removed phone.
  const next = structuredClone(view.spec);
  entity(next, 'volunteers').fields.push({ name: 'shirt_size', type: 'text' });
  const checked = validateAppSpec(next, schema, { blueprints: {}, landed: view.landed });
  if ('errors' in checked) assert.fail(formatAppSpecErrors(checked.errors));
  const options = {
    blueprints: {},
    live: liveColumns(model),
    protect: view.protect,
    skew: skewOf(model),
  };
  const delta = deltaOf(view.spec, next, options);
  assert.deepEqual(delta.calls, []);
  assert.deepEqual(delta.additions, []);
  assert.equal(delta.uiOnly, true);
  assert.deepEqual(delta.warnings, [
    "volunteers.shirt_size is in the database but not in the platform's schema records (changed with SQL); plan_app left it as it is.",
  ]);

  // Removing phone plans its call: if SQL did drop it, the call fails with the database's error.
  const without = structuredClone(view.spec);
  const volunteers = entity(without, 'volunteers');
  volunteers.fields = volunteers.fields.filter((f) => f.name !== 'phone');
  assert.deepEqual(
    deltaOf(view.spec, without, options).destructive.map((c) => c.call),
    [{ tool: 'delete_field', params: { table_name: 'volunteers', field_name: 'phone' } }],
  );
});
