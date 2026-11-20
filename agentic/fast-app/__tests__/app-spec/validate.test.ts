import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AppSpec, CustomBackend } from '../../src/app-spec/types';
import {
  type AppSpecError,
  formatAppSpecErrors,
  TEMPLATE_SPEC_SCHEMA_FILE,
  validateAppSpec,
} from '../../src/app-spec/validate';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => readFileSync(url, 'utf8');
const contract = (name: string) => read(new URL(`../../src/app-spec/contract/${name}`, moduleUrl));
const schema = JSON.parse(contract('app-spec.schema.json'));
const foodBank = (): AppSpec =>
  JSON.parse(read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl)));

// The contract ships with the template, and `pnpm sync:app-spec` vendors it.
// With CONSTRUCTIVE_TEMPLATE_DIR set (a sandbox-templates checkout), both
// vendored files must match the checkout's.
const templateDir = process.env.CONSTRUCTIVE_TEMPLATE_DIR;
const templateGen = templateDir
  ? path.dirname(path.join(templateDir, TEMPLATE_SPEC_SCHEMA_FILE))
  : null;

// Skipped when CONSTRUCTIVE_TEMPLATE_DIR has no AppSpec contract.
const withTemplate = templateGen && existsSync(templateGen) ? test : test.skip;

withTemplate("the vendored contract is the template's", () => {
  const fromTemplate = (name: string) => readFileSync(path.join(templateGen!, name), 'utf8');
  const resync = `run pnpm sync:app-spec ${templateDir}`;
  assert.deepEqual(schema, JSON.parse(fromTemplate('app-spec.schema.json')), resync);
  assert.equal(contract('app-spec.types.ts'), fromTemplate('app-spec.types.ts'), resync);
});

function errorsOf(spec: unknown): AppSpecError[] {
  const result = validateAppSpec(spec, schema);
  if (!('errors' in result)) assert.fail('expected the spec to fail');
  return result.errors;
}

test('the food-bank spec is valid', () => {
  const result = validateAppSpec(foodBank(), schema);
  if ('errors' in result) assert.fail(formatAppSpecErrors(result.errors));
});

test('schema errors give the path and the allowed values, and only for the chosen backend', () => {
  const spec = foodBank() as unknown as Record<string, never> & { backend: CustomBackend };
  spec.backend.entities[2].fields[0].type = 'datetime' as never;
  spec.backend.entities[0].name = 'Locations';
  (spec.backend.entities[1] as Record<string, unknown>).owner = 'me';

  assert.deepEqual(errorsOf(spec), [
    { path: 'backend.entities[0].name', message: '"Locations" must match ^[a-z][a-z0-9_]*$' },
    {
      path: 'backend.entities[1].owner',
      message: 'is not a property the AppSpec knows; remove it',
    },
    {
      path: 'backend.entities[2].fields[0].type',
      message:
        'must be one of "text", "long_text", "integer", "decimal", "money", "boolean", "date", "timestamp", "email", "url", "uuid", "json", not "datetime"',
    },
  ]);
  assert.deepEqual(errorsOf({ version: 1, name: 'CRM', backend: { kind: 'blueprint' } }), [
    { path: 'backend', message: 'missing the required property "slug"' },
  ]);
  const tiles = foodBank();
  tiles.ui = {
    dashboard: {
      tiles: [
        { kind: 'count', resource: 'shifts', filters: { status: 'open' } },
        { kind: 'recent', resource: 'shifts', limit: 50 },
      ],
    },
  };
  assert.deepEqual(errorsOf(tiles), [
    { path: 'ui.dashboard.tiles[1].limit', message: 'must be <= 20' },
  ]);
  assert.deepEqual(errorsOf({ version: 1, name: 'CRM', backend: { kind: 'crm' } }), [
    { path: 'backend.kind', message: 'must be one of "blueprint", "custom", not "crm"' },
  ]);
});

test('names that must exist and seed rows that must fit are checked against the spec', () => {
  const spec = foodBank();
  const backend = spec.backend as CustomBackend;
  backend.entities[3].belongsTo![0].to = 'members';
  backend.links!.push({ between: ['shifts', 'shifts'] });
  spec.seed!.volunteers[0] = { full_name: 'Ana Lima', mail: 'ana@example.com' };
  spec.seed!.shifts[1].status = 'closed';
  spec.seed!.volunteer_shifts[1].shift_id = '@shifts[5]';

  assert.deepEqual(errorsOf(spec), [
    {
      path: 'backend.entities[3].belongsTo[0].to',
      message:
        'no entity is named "members"; the entities are "locations", "volunteers", "shifts", "availability_notes"',
    },
    { path: 'backend.links[1].between', message: 'a link needs two different entities' },
    {
      path: 'seed.volunteer_shifts[1].shift_id',
      message: '@shifts[5] is past the end of seed.shifts, which has 2 row(s)',
    },
    {
      path: 'seed.shifts[1].status',
      message: '"closed" is not one of "open", "full", "cancelled"',
    },
    {
      path: 'seed.volunteers[0].mail',
      message: 'volunteers has no column "mail"; its columns are "full_name", "email", "phone"',
    },
    { path: 'seed.volunteers[0]', message: 'missing "email", which is required' },
  ]);
});

test("landed rows aren't re-checked after a column became required outside", () => {
  const spec = foodBank();
  // The view after volunteers.phone became required in the dashboard.
  (spec.backend as CustomBackend).entities[1].fields[2].required = true;
  const landed = { volunteers: structuredClone(spec.seed!.volunteers) };
  const result = validateAppSpec(spec, schema, { landed });
  if ('errors' in result) assert.fail(formatAppSpecErrors(result.errors));

  spec.seed!.volunteers.push({ full_name: 'Cy Park', email: 'cy@example.com' });
  const added = validateAppSpec(spec, schema, { landed });
  assert.deepEqual('errors' in added && added.errors, [
    { path: 'seed.volunteers[2]', message: 'missing "phone", which is required' },
  ]);
});

test("a link's table is refused where the app shows a page", () => {
  const spec = foodBank();
  spec.ui = {
    nav: ['shifts', 'volunteers', 'volunteer_shifts'],
    resources: { volunteer_shifts: { label: 'Assignments' } },
    dashboard: { tiles: [{ kind: 'count', resource: 'volunteer-shifts' }] },
  };
  const why =
    '"volunteer_shifts" is the link between volunteers and shifts; a link shows as chips on both records and gets no page, so';
  assert.deepEqual(errorsOf(spec), [
    { path: 'ui.nav[2]', message: `${why} leave it out of the sidebar` },
    {
      path: 'ui.resources.volunteer_shifts',
      message: `${why} it takes no page settings; remove this entry`,
    },
    {
      path: 'ui.dashboard.tiles[0].resource',
      message: `${why} no tile can show it; point the tile at volunteers or shifts`,
    },
  ]);
});
