import assert from 'node:assert/strict';

import { mergeLiveModel, type SchemaTableInput } from '../../src/app-spec/live-model';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { idsOf } from '../../src/pipeline/build-record';
import {
  NIL_ID,
  recordScreensOf,
  routesFromPageFiles,
  sampleIdsFor,
  sampleParam,
} from '../../src/pipeline/routes';
import { detailPages } from '../../src/pipeline/verify';
import { gapsOf } from '../../src/pipeline/verify-gaps';

test('page files become URL paths, groups dropped and params filled per resource', () => {
  const ids: Record<string, string> = { shifts: 'shift-1' };
  const routes = routesFromPageFiles(
    [
      'src/app/(app)/page.tsx',
      'src/app/(app)/account/page.tsx',
      'src/app/(app)/shifts/page.tsx',
      'src/app/(app)/shifts/[id]/page.tsx',
      'src/app/(app)/volunteers/[id]/page.tsx',
      'src/app/(auth)/sign-in/page.tsx',
      'src/app/(app)/layout.tsx',
      'src/app/docs/[...slug]/page.tsx',
      'src/app/@modal/page.tsx',
      'src/components/page.tsx',
    ],
    (segments) => ids[segments[segments.length - 1]] ?? 'none',
  );

  assert.deepEqual(
    routes.map((r) => r.path),
    ['/', '/account', '/shifts', '/shifts/shift-1', '/sign-in', '/volunteers/none'],
  );
});

test("a seeded id reaches its resource's detail route, though the two name the table apart", () => {
  const tables: LiveMetaTable[] = [
    { name: 'Shift', tableName: 'shifts' },
    // An older backend shows the SQL name only in the primary key.
    {
      name: 'VolunteerShift',
      constraints: {
        primaryKey: { name: 'volunteer_shifts_pkey', fields: [] },
        unique: [],
        foreignKey: [],
      },
    },
    { name: 'Account', tableName: 'account' },
  ];
  const resources = [
    { name: 'shifts', route: '/shifts', table: 'Shift' },
    { name: 'volunteer-shifts', route: '/volunteer-shifts', table: 'VolunteerShift' },
    // A reserved name gets a route of its own.
    { name: 'account', route: '/account-records', table: 'Account' },
    { name: 'volunteers', route: '/volunteers', table: 'Volunteer' },
  ];
  // The record keys its rows by table id, named as the database names them
  // now; null is a row the database kept.
  const table = (id: string, name: string): SchemaTableInput => ({
    id,
    name,
    access: 'shared' as const,
    columns: [],
    foreignKeys: [],
  });
  const model = mergeLiveModel({
    schema: {
      databaseId: 'db-1',
      hash: 'h0',
      tables: [table('t1', 'shifts'), table('t2', 'volunteer_shifts'), table('t3', 'account')],
    },
    meta: null,
  });
  const seeded = idsOf(
    {
      t1: { rows: [{}], ids: ['shift-1'] },
      t2: { rows: [{}, {}], ids: [null, 'vs-2'] },
      t3: { rows: [{}], ids: ['account-1'] },
    },
    model,
  );

  const routes = routesFromPageFiles(
    [
      'src/app/(app)/shifts/[id]/page.tsx',
      'src/app/(app)/volunteer-shifts/[id]/page.tsx',
      'src/app/(app)/account-records/[id]/page.tsx',
      'src/app/(app)/volunteers/[id]/page.tsx',
    ],
    sampleParam(sampleIdsFor(resources, tables, seeded)),
  );

  assert.deepEqual(
    routes.map((r) => r.path),
    [
      '/account-records/account-1',
      '/shifts/shift-1',
      '/volunteer-shifts/vs-2',
      `/volunteers/${NIL_ID}`,
    ],
  );
});

test('verify opens one detail page per screen on its sample row; a screen with no row is a gap', () => {
  const ids = { shifts: 'shift-1' };
  const routes = routesFromPageFiles(
    [
      'src/app/(app)/shifts/page.tsx',
      'src/app/(app)/shifts/[id]/page.tsx',
      'src/app/(app)/shifts/[id]/edit/page.tsx',
      'src/app/(app)/volunteers/[id]/page.tsx',
      'src/app/[slug]/page.tsx',
    ],
    sampleParam(ids),
  ).filter((r) => r.file.includes('['));

  const detail = detailPages(routes, ids);
  assert.deepEqual(detail, { open: ['/shifts/shift-1'], noRow: ['volunteers'] });
  assert.deepEqual(gapsOf({ render: { pages: 4 }, detail, crud: { readOnly: [], leftover: [] } }), {
    detailPages: { rendered: 1, noRow: ['volunteers'] },
  });
});

test("a static export's record page is <screen>/view/, opened with the sample id in the query", () => {
  const ids = { shifts: 'shift 1' };
  const screens = recordScreensOf([
    { name: 'shifts', route: '/shifts' },
    { name: 'volunteers', route: '/volunteers' },
  ]);
  const routes = routesFromPageFiles(
    [
      'src/app/(app)/shifts/page.tsx',
      'src/app/(app)/shifts/view/page.tsx',
      'src/app/(app)/volunteers/view/page.tsx',
      // A page of the app's own named view, under no screen: an ordinary route.
      'src/app/(app)/reports/view/page.tsx',
    ],
    sampleParam(ids),
    undefined,
    screens,
  );

  assert.deepEqual(
    routes.map((r) => [r.path, r.record]),
    [
      ['/reports/view', undefined],
      ['/shifts', undefined],
      ['/shifts/view/?id=shift%201', 'shifts'],
      [`/volunteers/view/?id=${NIL_ID}`, 'volunteers'],
    ],
  );
  assert.deepEqual(detailPages(routes, ids), {
    open: ['/shifts/view/?id=shift%201'],
    noRow: ['volunteers'],
  });
});
