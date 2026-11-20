import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { decodeLanded } from '../../src/app-spec/seed-ids';
import type { AppSpec } from '../../src/app-spec/types';
import {
  dropColumn,
  dropTable,
  landedOf,
  liveModelOf,
  renameColumn,
} from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const built: AppSpec = JSON.parse(
  readFileSync(new URL('./__fixtures__/food-bank.spec.json', moduleUrl), 'utf8'),
);

test('landed rows follow renames and drop columns and refs that are gone', () => {
  const model = liveModelOf(built);
  const seeded = landedOf(built, model);
  let after = renameColumn(model, 'volunteers', 'full_name', 'name');
  after = dropColumn(after, 'volunteers', 'phone');
  after = dropTable(after, 'locations');

  const { seed, ids } = decodeLanded(seeded, after);
  assert.deepEqual(Object.keys(seed), ['volunteer_shifts', 'shifts', 'volunteers']);
  assert.deepEqual(seed.volunteers, [
    { name: 'Ana Lima', email: 'ana@example.com' },
    { name: 'Ben Okafor', email: 'ben@example.com' },
  ]);
  // location_id stays a column, but the row it pointed at went with its table.
  assert.deepEqual(seed.shifts, [
    { starts_at: '2026-10-20T09:00:00Z', ends_at: '2026-10-20T13:00:00Z' },
    { starts_at: '2026-10-21T09:00:00Z', ends_at: '2026-10-21T13:00:00Z', status: 'full' },
  ]);
  // A link row's keys, however the spec named them, come back as columns.
  assert.deepEqual(seed.volunteer_shifts, [
    { volunteer_id: '@volunteers[1]', shift_id: '@shifts[0]' },
    { volunteer_id: '@volunteers[0]', shift_id: '@shifts[1]' },
  ]);
  assert.deepEqual(ids.volunteers, ['volunteers-0', 'volunteers-1']);
});
