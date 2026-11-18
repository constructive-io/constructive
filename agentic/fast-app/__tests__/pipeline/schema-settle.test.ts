import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { AppSpecDelta } from '../../src/app-spec/delta-types';
import type { AppSpec, CustomBackend } from '../../src/app-spec/types';
import type { LiveMetaField, LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { resolvePlan } from '../../src/pipeline/build-plan';
import { expectedSchema, unmetSchema, waitForMeta } from '../../src/pipeline/schema-settle';
import { settleTimeout } from '../../src/pipeline/settle-timeout';
import { deltaOf } from '../app-spec/__fixtures__/delta-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);
const NONE = { blueprints: {} };

// The calls the schema step runs for this follow-up and these ticks.
const callsOf = (delta: AppSpecDelta, ticked: string[]) =>
  resolvePlan({ spec: built, delta }, ticked).calls;

function next(edit: (backend: CustomBackend) => void): AppSpec {
  const spec = structuredClone(built) as AppSpec & { backend: CustomBackend };
  edit(spec.backend);
  return spec;
}
const volunteersOf = (backend: CustomBackend) => {
  const found = backend.entities.find((e) => e.name === 'volunteers');
  assert.ok(found);
  return found;
};

// `_meta` names a table by its GraphQL type and a field in camelCase.
const table = (name: string, tableName: string, fields: Array<string | LiveMetaField>) =>
  ({
    name,
    tableName,
    query: { all: tableName.replace(/_(\w)/g, (_, c: string) => c.toUpperCase()) },
    fields: fields.map((field) => (typeof field === 'string' ? { name: field } : field)),
  }) satisfies LiveMetaTable;
const volunteers = (...fields: Array<string | LiveMetaField>) =>
  table('Volunteer', 'volunteers', ['id', 'fullName', 'email', ...fields]);
const notes = table('AvailabilityNote', 'availability_notes', ['id', 'note', 'weekOf']);

test('a ticked removal waits until _meta drops the column; left unticked, nothing waits for it', () => {
  const delta = deltaOf(
    built,
    next((backend) => {
      const entity = volunteersOf(backend);
      entity.fields = entity.fields.filter((f) => f.name !== 'phone');
    }),
    NONE,
  );
  const [drop] = delta.destructive;
  assert.equal(drop?.kind, 'drop_field');

  const expected = expectedSchema(callsOf(delta, [drop.id]));
  assert.deepEqual(unmetSchema([volunteers('phone'), notes], expected), [
    'volunteers.phone removed',
  ]);
  assert.deepEqual(unmetSchema([volunteers(), notes], expected), []);

  assert.deepEqual(expectedSchema(callsOf(delta, [])), []);
});

test('an addition waits for its new column, its new key and its new table', () => {
  const delta = deltaOf(
    built,
    next((backend) => {
      const entity = volunteersOf(backend);
      entity.fields.push({ name: 'shirt_size', type: 'text' });
      entity.belongsTo = [{ field: 'home_location_id', to: 'locations', onDelete: 'set_null' }];
      backend.entities.push({ name: 'donors', fields: [{ name: 'name', type: 'text' }] });
    }),
    NONE,
  );
  assert.deepEqual(delta.destructive, []);
  const expected = expectedSchema(callsOf(delta, []));

  assert.deepEqual(unmetSchema([volunteers('phone'), notes], expected).sort(), [
    'donors',
    'volunteers.home_location_id',
    'volunteers.shirt_size',
  ]);
  const settled = [
    volunteers('phone', 'shirtSize', 'homeLocationId'),
    notes,
    table('Donor', 'donors', ['id', 'name']),
  ];
  assert.deepEqual(unmetSchema(settled, expected), []);
});

test('a ticked table drop waits until _meta no longer lists the table', () => {
  const delta = deltaOf(
    built,
    next((backend) => {
      backend.entities = backend.entities.filter((e) => e.name !== 'availability_notes');
    }),
    NONE,
  );
  const drop = delta.destructive.find((c) => c.kind === 'drop_table');
  assert.ok(drop);
  const expected = expectedSchema(callsOf(delta, [drop.id]));

  assert.deepEqual(unmetSchema([volunteers('phone'), notes], expected), [
    'availability_notes removed',
  ]);
  assert.deepEqual(unmetSchema([volunteers('phone')], expected), []);
});

test('a ticked rename waits for the new name and the old one gone; unticked, only the new one', () => {
  const delta = deltaOf(
    built,
    next((backend) => {
      const phone = volunteersOf(backend).fields.find((f) => f.name === 'phone');
      assert.ok(phone);
      phone.name = 'mobile';
    }),
    NONE,
  );
  const [rename] = delta.destructive;
  assert.equal(rename?.kind, 'rename_field');

  const ticked = expectedSchema(callsOf(delta, [rename.id]));
  assert.deepEqual(unmetSchema([volunteers('phone')], ticked), [
    'volunteers.phone removed',
    'volunteers.mobile',
  ]);
  assert.deepEqual(unmetSchema([volunteers('phone', 'mobile')], ticked), [
    'volunteers.phone removed',
  ]);
  assert.deepEqual(unmetSchema([volunteers('mobile')], ticked), []);

  // Unticked, the new column is added beside the old one, which stays.
  const unticked = expectedSchema(callsOf(delta, []));
  assert.deepEqual(unmetSchema([volunteers('phone', 'mobile')], unticked), []);
});

test('a field matches by its camelCase GraphQL name or by its SQL column name', () => {
  const expected = [
    { table: 'volunteers', column: 'shirt_size', present: true },
    { table: 'volunteers', column: 'phone', present: false },
  ];
  assert.deepEqual(unmetSchema([volunteers('shirtSize')], expected), []);
  // A field whose GraphQL name differs from its column is still that column.
  assert.deepEqual(
    unmetSchema([volunteers({ name: 'size', columnName: 'shirt_size' })], expected),
    [],
  );
  assert.deepEqual(
    unmetSchema(
      [
        volunteers(
          { name: 'size', columnName: 'shirt_size' },
          { name: 'mobileNumber', columnName: 'phone' },
        ),
      ],
      expected,
    ),
    ['volunteers.phone removed'],
  );
});

const removedPhone = [{ table: 'volunteers', column: 'phone', present: false }];
const lacking = (tables: readonly LiveMetaTable[]) => {
  const unmet = unmetSchema(tables, removedPhone);
  return unmet.length ? unmet.join(', ') : null;
};

test('the wait reads _meta every 2 s until a stale schema catches up', async () => {
  const settled = [volunteers()];
  const reads = [[volunteers('phone')], [volunteers('phone')], settled];
  let clock = 0;
  const slept: number[] = [];
  const notes: string[] = [];
  const result = await waitForMeta({
    fetch: async () => reads.shift() ?? [],
    lacking,
    note: (text) => notes.push(text),
    sleep: async (ms) => {
      slept.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  assert.deepEqual(result, { tables: settled, missing: null });
  assert.deepEqual(slept, [2_000, 2_000]);
  assert.deepEqual(notes, [
    'Waiting for the API to show volunteers.phone removed…',
    'Waiting for the API to show volunteers.phone removed…',
  ]);
});

test('the wait stops after 2 min, or at a stop, with what _meta still lacks', async () => {
  let clock = 0;
  const stale = {
    fetch: async () => [volunteers('phone')],
    lacking,
    note: () => {},
    sleep: async (ms: number) => {
      clock += ms;
    },
    now: () => clock,
  };
  const timedOut = await waitForMeta(stale);
  assert.equal(timedOut.missing, 'volunteers.phone removed');
  assert.ok(clock > 120_000 && clock <= 122_000);

  clock = 0;
  const stop = new AbortController();
  stop.abort();
  assert.equal(
    (await waitForMeta({ ...stale, signal: stop.signal })).missing,
    'volunteers.phone removed',
  );
  assert.equal(clock, 0);
});

test("a timed-out wait on a column the build didn't touch says only the schema records list it", () => {
  const website = { table: 'locations', column: 'website', present: true };
  const shirtSize = { table: 'volunteers', column: 'shirt_size', present: true };
  const madeHere = (e: { column?: string }) => e.column === 'shirt_size';

  assert.deepEqual(settleTimeout([website], madeHere), {
    cause:
      "The platform's schema records list locations.website, but the API does not show it after 2 minutes.",
    fix: "The API schema may be stale, so waiting may not help. Tell the user the backend hasn't picked up locations.website yet; calling plan_app again later repeats no schema calls and finishes the build once the API shows it.",
  });
  // With the build's own change missing too, the cause names both, each as what was seen.
  assert.equal(
    settleTimeout([shirtSize, website], madeHere).cause,
    "The database has volunteers.shirt_size, but the API does not list it after 2 minutes. The platform's schema records list locations.website, but the API does not show it after 2 minutes.",
  );
});
