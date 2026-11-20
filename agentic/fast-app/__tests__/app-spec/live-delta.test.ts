import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { type DeltaCall, type DeltaOptions, planDelta } from '../../src/app-spec/delta';
import { liveColumns, type LiveModel } from '../../src/app-spec/live-model';
import { liveSpec, type RenderedView } from '../../src/app-spec/live-spec';
import { type IntentOverlay, overlayOf } from '../../src/app-spec/overlay';
import type { SeededById } from '../../src/app-spec/seed-ids';
import type { AppSpec, CustomBackend, SpecEntity } from '../../src/app-spec/types';
import { formatAppSpecErrors, validateAppSpec } from '../../src/app-spec/validate';
import type { BlueprintJson } from '../../src/extensions/blueprint-summary';
import { deltaOf } from './__fixtures__/delta-of';
import {
  addColumn,
  dropTable,
  landedOf,
  liveModelOf,
  renameColumn,
  setAccess,
} from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// A follow-up as plan_app plans it from the live database: the agent edits
// the rendered view, and the planner measures that against the view.

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const built: AppSpec = read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl));
const blueprints: Record<string, BlueprintJson> = {
  agent: read(new URL('../../src/blueprints/agent.json', moduleUrl)),
};

type Build = { model: LiveModel; overlay: IntentOverlay; seeded: SeededById };

function buildOf(spec: AppSpec, registry: Record<string, BlueprintJson> = {}): Build {
  const model = liveModelOf(spec, { blueprints: registry });
  const ids = model.tables.map((t) => t.id);
  return { model, overlay: overlayOf(spec, model, null, ids), seeded: landedOf(spec, model) };
}

const viewOf = ({ overlay, seeded }: Build, model: LiveModel, registry = {}) =>
  liveSpec({ model, overlay, seeded, fallbackName: 'food-bank', blueprints: registry });

// The agent's spec: the view, changed by `edit`, and valid as plan_app checks it.
function edited(view: RenderedView, edit: (spec: AppSpec) => void, registry = {}): AppSpec {
  const spec = structuredClone(view.spec);
  edit(spec);
  const result = validateAppSpec(spec, schema, { blueprints: registry, landed: view.landed });
  if ('errors' in result) assert.fail(formatAppSpecErrors(result.errors));
  return spec;
}

const options = (view: RenderedView, model: LiveModel, registry = {}): DeltaOptions => ({
  blueprints: registry,
  live: liveColumns(model),
  protect: view.protect,
});

const entity = (spec: AppSpec, name: string): SpecEntity => {
  const found = (spec.backend as CustomBackend).entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

const tools = (calls: DeltaCall[]) =>
  calls.map((c) =>
    c.tool === 'provision_blueprint'
      ? `provision_blueprint ${c.params.definition.tables.map((t) => t.table_name).join(',')}`
      : `${c.tool} ${c.params.table_name}${'field_name' in c.params ? `.${c.params.field_name}` : ''}`,
  );

test('a column renamed outside is not re-created', () => {
  const build = buildOf(built);
  const model = renameColumn(build.model, 'volunteers', 'phone', 'mobile');
  const view = viewOf(build, model);
  // The landed row keeps its value under the new name.
  assert.deepEqual(view.landed.volunteers[1], {
    full_name: 'Ben Okafor',
    email: 'ben@example.com',
    mobile: '555-0102',
  });
  const next = edited(view, (s) =>
    entity(s, 'volunteers').fields.push({ name: 'skill', type: 'text' }),
  );
  // Measured against the build record, phone came back as an empty column.
  const delta = deltaOf(view.spec, next, options(view, model));
  assert.deepEqual(tools(delta.calls), ['create_field volunteers.skill']);
  assert.deepEqual(delta.destructive, []);
  assert.equal(delta.seed.rows, 0);
});

test('a table deleted outside stays deleted', () => {
  const build = buildOf(built);
  const model = dropTable(build.model, 'shifts');
  const view = viewOf(build, model);
  assert.equal(
    (view.spec.backend as CustomBackend).entities.some((e) => e.name === 'shifts'),
    false,
  );
  // The link lost a side, so it's a table with a plain uuid column now, and
  // its landed rows keep only the references that still point somewhere.
  assert.deepEqual(entity(view.spec, 'volunteer_shifts').fields, [
    { name: 'shift_id', type: 'uuid', required: true },
  ]);
  assert.deepEqual(view.landed.volunteer_shifts, [
    { volunteer_id: '@volunteers[1]' },
    { volunteer_id: '@volunteers[0]' },
  ]);
  const next = edited(view, (s) =>
    entity(s, 'locations').fields.push({ name: 'opens_at', type: 'text' }),
  );
  const delta = deltaOf(view.spec, next, options(view, model));
  assert.deepEqual(tools(delta.calls), ['create_field locations.opens_at']);
  assert.deepEqual(delta.destructive, []);
  assert.equal(delta.seed.rows, 0);
});

test("a spec can't take over a read-only column or change custom policies", () => {
  const build = buildOf(built);
  let model = addColumn(build.model, 'locations', 'area', 'geometry');
  model = addColumn(model, 'availability_notes', 'search', 'tsvector');
  model = setAccess(model, 'volunteers', 'custom');
  const view = viewOf(build, model);

  const next = edited(view, (s) => {
    entity(s, 'locations').fields.push({ name: 'area', type: 'text' });
    entity(s, 'volunteers').access = 'private';
  });
  const plan = planDelta(view.spec, next, options(view, model));
  assert.deepEqual(plan.ok === false && plan.refused, [
    {
      path: 'backend.entities[0].fields[3]',
      message:
        "locations.area is a column app-spec.json can't describe (geometry), and plan_app keeps it as it is. Use another name, or ask the user before changing it with the schema tools.",
    },
    {
      path: 'backend.entities[1].access',
      message:
        "volunteers has policies app-spec.json can't describe, so plan_app can't change who sees its rows. Leave access out for it.",
    },
  ]);

  // Deleting a table says it takes the columns the spec doesn't show with it.
  const dropped = edited(view, (s) => {
    (s.backend as CustomBackend).entities.pop();
  });
  const delta = deltaOf(view.spec, dropped, options(view, model));
  assert.deepEqual(
    delta.destructive.map((d) => d.loses),
    [
      "every row in availability_notes and its columns app-spec.json can't describe (search), for good. Leave it unticked to keep the data and hide the table",
    ],
  );
});

test('extend on a curated table deleted outside is refused', () => {
  const spec: AppSpec = {
    version: 1,
    name: 'Agent Review',
    backend: {
      kind: 'blueprint',
      slug: 'agent',
      extend: {
        entities: [
          {
            name: 'review_notes',
            fields: [{ name: 'body', type: 'long_text', required: true }],
            belongsTo: [{ field: 'task_id', to: 'agent_task', onDelete: 'cascade' }],
          },
        ],
      },
    },
  };
  const build = buildOf(spec, blueprints);
  const model = dropTable(build.model, 'agent_task');
  const view = viewOf(build, model, blueprints);
  assert.deepEqual(view.readOnly, [{ kind: 'curated-gone', table: 'agent_task', slug: 'agent' }]);
  // Leaving the table alone plans as usual.
  assert.equal(deltaOf(view.spec, view.spec, options(view, model, blueprints)).uiOnly, true);

  const next = edited(
    view,
    (s) => {
      if (s.backend.kind === 'blueprint')
        s.backend.extend.fields = {
          agent_task: [{ name: 'reviewed', type: 'boolean', default: false }],
        };
    },
    blueprints,
  );
  const plan = planDelta(view.spec, next, options(view, model, blueprints));
  assert.deepEqual(plan.ok === false && plan.refused, [
    {
      path: 'backend.extend.fields.agent_task',
      message:
        "agent_task, a table of the agent blueprint, was deleted outside the app; plan_app can't add to it or recreate it.",
    },
  ]);
});
