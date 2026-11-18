import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { diffSnapshots, outsideLine, snapshotOf } from '../../src/app-spec/schema-drift';
import type { AppSpec } from '../../src/app-spec/types';
import {
  dropTable,
  liveModelOf,
  renameColumn,
  renameTable,
  setAccess,
  setRequired,
  setValues,
} from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const built: AppSpec = JSON.parse(
  readFileSync(new URL('./__fixtures__/food-bank.spec.json', moduleUrl), 'utf8'),
);

test('same id, new name is a rename', () => {
  const model = liveModelOf(built);
  const after = renameTable(
    renameColumn(model, 'volunteers', 'phone', 'mobile'),
    'locations',
    'sites',
  );
  const changes = diffSnapshots(snapshotOf(model), snapshotOf(after));
  // shifts.location_id still points at the same table, under its new name.
  assert.deepEqual(changes, [
    { kind: 'table_renamed', from: 'locations', to: 'sites' },
    { kind: 'column_renamed', table: 'volunteers', from: 'phone', to: 'mobile' },
  ]);
  assert.deepEqual(changes.map(outsideLine), [
    'the table locations was renamed to sites',
    'volunteers.phone was renamed to mobile',
  ]);
});

test('a deleted table, a required column, fewer enum values and another access mode each show once', () => {
  const model = liveModelOf(built);
  let after = dropTable(model, 'availability_notes');
  after = setRequired(after, 'volunteers', 'phone');
  after = setValues(after, 'shifts', 'status', ['open', 'full']);
  after = setAccess(after, 'locations', 'private');
  const changes = diffSnapshots(snapshotOf(model), snapshotOf(after));
  assert.deepEqual(changes.map(outsideLine), [
    'locations became private (it was shared)',
    'volunteers.phone became required',
    'shifts.status allows "open", "full" now (it allowed "open", "full", "cancelled")',
    'the table availability_notes was deleted',
  ]);
  assert.deepEqual(diffSnapshots(snapshotOf(after), snapshotOf(after)), []);
});

test('a column added with SQL shows as added with SQL, and a look without `_meta` never calls it deleted', () => {
  const model = liveModelOf(built);
  const after = liveModelOf(built, { sql: { added: [['volunteers', 'shirt_size']] } });
  const changes = diffSnapshots(snapshotOf(model), snapshotOf(after));
  assert.deepEqual(changes, [
    { kind: 'column_added', table: 'volunteers', column: 'shirt_size', viaSql: true },
  ]);
  assert.equal(outsideLine(changes[0]), 'volunteers.shirt_size was added with SQL');

  // `_meta` didn't answer: metaschema's columns are all there is to see.
  const blind = {
    ...after,
    metaRead: false,
    tables: after.tables.map((t) => ({ ...t, columns: t.columns.filter((c) => c.id) })),
  };
  assert.deepEqual(diffSnapshots(snapshotOf(after), snapshotOf(blind)), []);
});
