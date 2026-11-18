import assert from 'node:assert/strict';

import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { NIL_ID, routesFromPageFiles, sampleIdsFor, sampleParam } from '../../src/pipeline/routes';
import { parseSampleIds, sampleDocument } from '../../src/pipeline/sample-ids';

// verify opens each detail page on a row its table has when verify runs, not
// on one a build seeded: rows deleted or added outside the app, and an app
// adopted from its database, open real rows too.

const pk = (name: string, field: string) => ({
  primaryKey: { name, fields: [{ name: field }] },
  unique: [] as never[],
  foreignKey: [] as never[],
});

const tables: LiveMetaTable[] = [
  {
    name: 'Shift',
    tableName: 'shifts',
    query: { all: 'shifts' },
    constraints: pk('shifts_pkey', 'id'),
  },
  {
    name: 'VolunteerShift',
    tableName: 'volunteer_shifts',
    query: { all: 'volunteerShifts' },
    constraints: pk('volunteer_shifts_pkey', 'id'),
  },
  {
    name: 'Account',
    tableName: 'account',
    query: { all: 'accounts' },
    constraints: pk('account_pkey', 'rowId'),
  },
  {
    name: 'Location',
    tableName: 'locations',
    query: { all: 'locations' },
    constraints: pk('locations_pkey', 'id'),
  },
] as LiveMetaTable[];

const resources = [
  { name: 'shifts', route: '/shifts', table: 'Shift' },
  { name: 'volunteer-shifts', route: '/volunteer-shifts', table: 'VolunteerShift' },
  // A reserved name gets a route of its own; an integer key is still an id.
  { name: 'account', route: '/account-records', table: 'Account' },
  { name: 'locations', route: '/locations', table: 'Location' },
  // Deleted outside the app since gen made its screens.
  { name: 'volunteers', route: '/volunteers', table: 'Volunteer' },
];

test('a detail page opens the first row its table has now', () => {
  const query = sampleDocument(resources, tables);
  assert.ok(query);
  // One request, one row per table that is still there.
  assert.equal(
    query.document,
    'query SampleIds { s0: shifts(first: 1) { nodes { id } } s1: volunteerShifts(first: 1) { nodes { id } } s2: accounts(first: 1) { nodes { rowId } } s3: locations(first: 1) { nodes { id } } }',
  );

  // Shifts has a row; a table with none and one the API rejected open the nil id.
  const ids = parseSampleIds(
    {
      s0: { nodes: [{ id: 'shift-9' }] },
      s1: { nodes: [] },
      s2: { nodes: [{ rowId: 42 }] },
      s3: null,
    },
    query.asked,
  );
  const routes = routesFromPageFiles(
    [
      'src/app/(app)/shifts/[id]/page.tsx',
      'src/app/(app)/volunteer-shifts/[id]/page.tsx',
      'src/app/(app)/account-records/[id]/page.tsx',
      'src/app/(app)/locations/[id]/page.tsx',
      'src/app/(app)/volunteers/[id]/page.tsx',
    ],
    sampleParam(sampleIdsFor(resources, tables, ids)),
  );
  assert.deepEqual(
    routes.map((r) => r.path),
    [
      '/account-records/42',
      `/locations/${NIL_ID}`,
      '/shifts/shift-9',
      `/volunteer-shifts/${NIL_ID}`,
      `/volunteers/${NIL_ID}`,
    ],
  );
});
