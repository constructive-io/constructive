import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { seedPlan, SeedPlanError } from '../../src/app-spec/seed-plan';
import type { AppSpec } from '../../src/app-spec/types';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const foodBank = (): AppSpec =>
  JSON.parse(readFileSync(new URL('./__fixtures__/food-bank.spec.json', moduleUrl), 'utf8'));

test('tables come after the tables their references point at, link keys as columns', () => {
  const steps = seedPlan(foodBank());

  // The fixture lists the link table first and locations last.
  assert.deepEqual(
    steps.map((s) => s.table),
    ['volunteers', 'locations', 'shifts', 'volunteer_shifts'],
  );
  assert.deepEqual(steps.at(-1)?.rows, [
    { volunteer_id: '@volunteers[1]', shift_id: '@shifts[0]' },
    { volunteer_id: '@volunteers[0]', shift_id: '@shifts[1]' },
  ]);
  assert.equal(steps[2].rows[1].location_id, '@locations[1]');
});

test("a curated blueprint's foreign keys from _meta put parents first", () => {
  const spec: AppSpec = {
    version: 1,
    name: 'CRM',
    backend: { kind: 'blueprint', slug: 'agentic_crm' },
    seed: { deals: [{ name: 'Seed round' }], categories: [{ name: 'Fintech' }] },
  };
  const meta: LiveMetaTable[] = [
    {
      name: 'Deal',
      query: { all: 'deals' },
      relations: {
        belongsTo: [
          {
            fieldName: 'category',
            isUnique: false,
            type: 'Category',
            keys: [{ name: 'categoryId' }],
            references: { name: 'Category' },
          },
        ],
        has: [],
        hasOne: [],
        hasMany: [],
        manyToMany: [],
      },
    },
    // A naive plural: only the SQL name matches the seed key.
    { name: 'Category', tableName: 'categories', query: { all: 'categorys' } },
  ];

  assert.deepEqual(
    seedPlan(spec).map((s) => s.table),
    ['deals', 'categories'],
  );
  assert.deepEqual(
    seedPlan(spec, meta).map((s) => s.table),
    ['categories', 'deals'],
  );
});

test('a reference cycle or a reference to the same table names the rows to change', () => {
  const cyclic = foodBank();
  (cyclic.seed!.locations[0] as Record<string, unknown>).manager = '@shifts[0]';
  assert.throws(
    () => seedPlan(cyclic),
    (err: unknown) =>
      err instanceof SeedPlanError &&
      err.path === 'seed' &&
      /between shifts, locations form a cycle/.test(err.reason),
  );

  const selfRef = foodBank();
  (selfRef.seed!.locations[1] as Record<string, unknown>).parent = '@locations[0]';
  assert.throws(
    () => seedPlan(selfRef),
    (err: unknown) => err instanceof SeedPlanError && err.path === 'seed.locations[1].parent',
  );
});
