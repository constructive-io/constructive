import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { liveColumns } from '../../src/app-spec/live-model';
import { liveSpec } from '../../src/app-spec/live-spec';
import { overlayOf } from '../../src/app-spec/overlay';
import type { AppSpec, CustomBackend, SpecEntity } from '../../src/app-spec/types';
import { formatAppSpecErrors, validateAppSpec } from '../../src/app-spec/validate';
import type { BlueprintJson } from '../../src/extensions/blueprint-summary';
import { deltaOf } from './__fixtures__/delta-of';
import {
  addColumn,
  landedOf,
  liveModelOf,
  setAccess,
  setType,
} from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const foodBank = (): AppSpec & { backend: CustomBackend } =>
  read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl));
const blueprints: Record<string, BlueprintJson> = {
  agent: read(new URL('../../src/blueprints/agent.json', moduleUrl)),
};

function assertValid(spec: AppSpec, options: Parameters<typeof validateAppSpec>[2] = {}) {
  const result = validateAppSpec(spec, schema, { blueprints: {}, ...options });
  if ('errors' in result) assert.fail(formatAppSpecErrors(result.errors));
}

const entity = (spec: AppSpec, name: string) =>
  (spec.backend as CustomBackend).entities.find((e) => e.name === name);

test('a built spec rendered back from its database plans nothing', () => {
  const built = foodBank();
  const [locations, volunteers, shifts] = built.backend.entities;
  volunteers.label = 'People';
  volunteers.fields[0].label = 'Name';
  shifts.belongsTo[0].label = 'Where';
  built.ui.resources = {
    shifts: {
      titleField: 'starts_at',
      columns: ['starts_at', 'status'],
      fields: { notes: { hidden: true } },
    },
    locations: { icon: 'map-pin', fields: { capacity: { label: 'Seats' } } },
  };
  built.ui.dashboard = {
    tiles: [{ kind: 'count', resource: 'shifts', filters: { status: 'open' } }],
  };
  // The opt-in scope screens come back as written.
  built.ui.workspace = { scope: 'org' };
  built.ui.access = ['app', 'org'];
  built.ui.resources.locations.panels = { scope: 'site', show: ['members'] };
  assert.equal(locations.fields[1].type, 'long_text');

  const model = liveModelOf(built);
  const overlay = overlayOf(
    built,
    model,
    null,
    model.tables.map((t) => t.id),
  );
  const view = liveSpec({
    model,
    overlay,
    seeded: landedOf(built, model),
    fallbackName: 'food-bank',
  });
  assert.deepEqual(view.readOnly, []);
  // Labels, long_text, keys, the link and the UI hints all come back.
  assert.deepEqual(view.spec.backend, built.backend);
  assert.deepEqual(view.spec.ui, built.ui);
  assertValid(view.spec, { landed: view.landed });

  const delta = deltaOf(view.spec, built, {
    blueprints: {},
    live: liveColumns(model),
    protect: view.protect,
  });
  assert.deepEqual(delta.calls, []);
  assert.deepEqual(delta.destructive, []);
  assert.deepEqual(delta.seed.kept, []);
  assert.equal(delta.uiOnly, true);
});

test("an older build's link table is left out of the view's UI", () => {
  const built = foodBank();
  built.ui = {
    nav: ['shifts', 'volunteer_shifts', 'volunteers'],
    resources: { volunteer_shifts: { label: 'Assignments' }, shifts: { icon: 'calendar' } },
    dashboard: {
      tiles: [
        { kind: 'count', resource: 'volunteer_shifts' },
        { kind: 'count', resource: 'shifts' },
      ],
    },
  };
  const model = liveModelOf(built);
  const overlay = overlayOf(
    built,
    model,
    null,
    model.tables.map((t) => t.id),
  );
  const view = liveSpec({
    model,
    overlay,
    seeded: landedOf(built, model),
    fallbackName: 'food-bank',
  });
  // The next plan_app starts from this view, so it must pass the check that refuses the link.
  assert.deepEqual(view.spec.ui, {
    nav: ['shifts', 'volunteers'],
    resources: { shifts: { icon: 'calendar' } },
    dashboard: { tiles: [{ kind: 'count', resource: 'shifts' }] },
  });
  assertValid(view.spec, { landed: view.landed });
});

test('a blueprint app renders as its slug plus its extend', () => {
  const reviewNotes: SpecEntity = {
    name: 'review_notes',
    fields: [{ name: 'body', type: 'long_text', required: true }],
    belongsTo: [{ field: 'task_id', to: 'agent_task', onDelete: 'cascade' }],
  };
  const spec: AppSpec = {
    version: 1,
    name: 'Agent Review',
    backend: {
      kind: 'blueprint',
      slug: 'agent',
      extend: {
        entities: [reviewNotes],
        fields: {
          agent_task: [
            { name: 'priority', type: 'text', enum: ['low', 'normal', 'high'], default: 'normal' },
            { name: 'reviewed', type: 'boolean', default: false },
          ],
        },
        belongsTo: { agent_task: [{ field: 'note_id', to: 'review_notes', onDelete: 'set_null' }] },
      },
    },
  };
  const model = liveModelOf(spec, { blueprints });
  const overlay = overlayOf(spec, model, null, []);
  const view = liveSpec({ model, overlay, seeded: {}, fallbackName: 'agent-review', blueprints });
  assert.deepEqual(view.spec.backend, spec.backend);
  assert.deepEqual(view.readOnly, []);
  const delta = deltaOf(view.spec, spec, {
    blueprints,
    live: liveColumns(model),
    protect: view.protect,
  });
  assert.equal(delta.uiOnly, true);

  // With no record of the build, the blueprint is found by its tables.
  const adopted = liveSpec({
    model,
    overlay: null,
    seeded: {},
    fallbackName: 'agent-review',
    blueprints,
  });
  const expected = structuredClone(spec.backend);
  if (expected.kind === 'blueprint') expected.extend.entities[0].fields[0].type = 'text';
  assert.equal(adopted.adopted, true);
  assert.deepEqual(adopted.spec.backend, expected);
  assertValid(adopted.spec, { blueprints });
});

test('without an overlay the database alone gives a valid spec', () => {
  const model = liveModelOf(foodBank());
  const view = liveSpec({
    model,
    overlay: null,
    seeded: {},
    fallbackName: 'qf-foodbank',
    blueprints: {},
  });
  assertValid(view.spec);
  assert.equal(view.adopted, true);
  assert.equal(view.spec.name, 'qf-foodbank');
  const backend = view.spec.backend as CustomBackend;
  assert.deepEqual(backend.links, [{ between: ['volunteers', 'shifts'] }]);
  assert.equal(entity(view.spec, 'availability_notes').access, 'private');
  assert.deepEqual(entity(view.spec, 'shifts').fields[2], {
    name: 'status',
    type: 'text',
    enum: ['open', 'full', 'cancelled'],
    default: 'open',
  });
});

test("what the spec can't describe is left out and listed", () => {
  let model = liveModelOf(foodBank());
  model = addColumn(model, 'locations', 'area', 'geometry');
  model = addColumn(model, 'locations', 'code', 'text', {
    default: { kind: 'expression', sql: 'upper(left(md5(random()::text), 6))' },
  });
  model = addColumn(model, 'volunteers', 'user_id', 'uuid', {
    key: { to: 'platform-users', toName: 'users', onDelete: 'set_null' },
  });
  model = setAccess(model, 'shifts', 'custom');

  const view = liveSpec({
    model,
    overlay: null,
    seeded: {},
    fallbackName: 'qf-foodbank',
    blueprints: {},
  });
  assert.deepEqual(view.readOnly, [
    { kind: 'column', table: 'locations', column: 'area', reason: 'geometry' },
    {
      kind: 'default',
      table: 'locations',
      column: 'code',
      sql: 'upper(left(md5(random()::text), 6))',
    },
    { kind: 'column', table: 'volunteers', column: 'user_id', reason: 'key to users' },
    { kind: 'access', table: 'shifts' },
  ]);
  assertValid(view.spec);
  // The column with the default the spec can't spell is shown without one.
  assert.deepEqual(entity(view.spec, 'locations').fields.at(-1), { name: 'code', type: 'text' });
  assert.equal(entity(view.spec, 'shifts').access, undefined);
  assert.deepEqual(
    [...view.protect.columns].map(([table, columns]) => [table, [...columns.keys()]]),
    [
      ['locations', ['area']],
      ['volunteers', ['user_id']],
    ],
  );
  assert.deepEqual([...view.protect.access], ['shifts']);
});

test("the next build's overlay drops a label the spec removed and keeps one it can't show", () => {
  const built = foodBank();
  built.backend.entities[1].fields[0].label = 'Name';
  built.backend.entities[1].fields[2].label = 'Mobile';
  const model = liveModelOf(built);
  const prior = overlayOf(built, model, null, []);
  // phone got a type the spec can't describe, and the agent dropped the other label.
  const exotic = setType(model, 'volunteers', 'phone', 'citext');
  const view = liveSpec({
    model: exotic,
    overlay: prior,
    seeded: {},
    fallbackName: 'x',
    blueprints: {},
  });
  const next = structuredClone(view.spec);
  delete entity(next, 'volunteers').fields[0].label;
  const overlay = overlayOf(next, exotic, prior, []);

  // Once phone is text again, its label is back and the dropped one stays dropped.
  const back = liveSpec({ model, overlay, seeded: {}, fallbackName: 'x', blueprints: {} });
  assert.deepEqual(
    entity(back.spec, 'volunteers').fields.map((f) => f.label),
    [undefined, undefined, 'Mobile'],
  );
});
