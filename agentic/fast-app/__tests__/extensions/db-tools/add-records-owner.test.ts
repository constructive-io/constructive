import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { withOwnerColumns } from '../../../src/extensions/db-tools/add-records-owner';
import type { LiveMetaTable } from '../../../src/extensions/db-tools/live-meta';
import { MetaIndex } from '../../../src/extensions/db-tools/live-meta-index';

// `_meta` captured from a live fundraise app: the blueprint's room table keys
// rows by a required owner_id, its CRM tables by a required entity_id.
const tables = (
  JSON.parse(
    readFileSync(
      path.join(__dirname, '__fixtures__', 'fundraise-owner-meta.json'),
      'utf8',
    ),
  ) as { _meta: { tables: LiveMetaTable[] } }
)._meta.tables;

const USER = '01a1b07e-facd-7f7b-a542-225fc6884e8c';

function filled(table: string, rows: Record<string, unknown>[], index = new MetaIndex(tables)) {
  const found = index.find(table);
  assert.ok(found, table);
  return withOwnerColumns(rows, index.ownerColumns(found), USER);
}

test('a room row the agent sends without its owner gets the signed-in user, as the app form does', () => {
  assert.deepEqual(filled('data_rooms', [{ name: 'Investor Diligence' }]), [
    { name: 'Investor Diligence', ownerId: USER },
  ]);
});

test('only required owner columns are filled, by the table’s own names', () => {
  // deals.owner_id is optional and stays empty; entity_id is the required owner key.
  assert.deepEqual(filled('deals', [{ name: 'Seed' }]), [{ name: 'Seed', entityId: USER }]);
});

test('an owner the row already gives, in either spelling, is kept', () => {
  const rows = [
    { name: 'A', owner_id: 'org-1' },
    { name: 'B', ownerId: 'org-2' },
    { name: 'C', ownerId: '' },
  ];
  assert.deepEqual(filled('DataRoom', rows), [
    { name: 'A', owner_id: 'org-1' },
    { name: 'B', ownerId: 'org-2' },
    { name: 'C', ownerId: USER },
  ]);
});

test('a $currentUserId hint in the spec marks an owner column _meta shows as optional', () => {
  const index = new MetaIndex(tables, { deals: { ownerid: { default: '$currentUserId' } } });
  assert.deepEqual(filled('deals', [{ name: 'Seed' }], index), [
    { name: 'Seed', ownerId: USER, entityId: USER },
  ]);
});
