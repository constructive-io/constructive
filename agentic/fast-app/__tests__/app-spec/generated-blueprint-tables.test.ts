import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  liveColumns,
  type LiveModel,
  type LiveTable,
  mergeLiveModel,
  type SchemaColumnInput
} from '../../src/app-spec/live-model';
import { liveSpec } from '../../src/app-spec/live-spec';
import { overlayOf } from '../../src/app-spec/overlay';
import type { AppSpec } from '../../src/app-spec/types';
import { formatAppSpecErrors, validateAppSpec } from '../../src/app-spec/validate';
import { CURATED_BLUEPRINTS } from '../../src/blueprints/curated';
import { describeBlueprint } from '../../src/extensions/blueprint-summary';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { deltaOf } from './__fixtures__/delta-of';
import { liveModelOf } from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const meta: LiveMetaTable[] = read(
  new URL('../pipeline/__fixtures__/blueprint-generated-meta.json', moduleUrl),
);

const crm: AppSpec = {
  version: 1,
  name: 'VC CRM',
  backend: { kind: 'blueprint', slug: 'agentic_crm' },
};

function chunk(
  parent: string,
  parentTable: LiveTable | undefined,
  textColumn = 'content',
): LiveTable {
  const name = `${parent}_chunks`;
  const { tables } = mergeLiveModel({
    schema: {
      databaseId: 'db-1',
      hash: 'h0',
      tables: [
        {
          id: `t:${name}`,
          name,
          access: 'custom',
          columns: [
            [`${parent}_id`, 'uuid'],
            [textColumn, 'text'],
            ['chunk_index', 'integer'],
            ['embedding', 'vector'],
            ['metadata', 'jsonb'],
          ].map(([column, type]): SchemaColumnInput => ({
            id: column,
            name: column,
            type,
            isRequired: true,
            default: null,
          })),
          foreignKeys: parentTable
            ? [
              {
                columnIds: [`${parent}_id`],
                targetTableId: parentTable.id,
                targetTable: parentTable.name,
                onDelete: 'cascade',
              },
            ]
            : [],
        },
      ],
    },
    meta,
  });
  return tables[0];
}

test('an adopted CRM keeps its blueprint and ignores generated chunks, but keeps ordinary tables named chunks', () => {
  const live = liveModelOf(crm, { blueprints: CURATED_BLUEPRINTS });
  const parent = live.tables.find((table) => table.name === 'companies');
  assert.ok(parent);
  const generated = chunk('companies', parent);
  const orgResource = { id: 'non-app-org-resource', name: 'org_agent_resource' } as LiveTable;
  // Captured seed-round view: the parent is core, has a body column, and neither it nor its chunk is in _meta.
  const unexposed = chunk('org_agent_resource', orgResource, 'body');
  const appTable = chunk('notes', undefined);
  const model = { ...live, tables: [...live.tables, generated, unexposed, appTable] };

  const view = liveSpec({ model, overlay: null, seeded: {}, fallbackName: crm.name });
  assert.equal(view.spec.backend.kind, 'blueprint');
  assert.equal(view.spec.backend.slug, 'agentic_crm');
  assert.deepEqual(
    view.spec.backend.extend?.entities?.map((table) => table.name),
    ['notes_chunks'],
  );
  assert.deepEqual(
    view.readOnly.filter((item) => item.kind === 'table'),
    [
      { kind: 'table', table: 'companies_chunks', reason: 'search chunks' },
      { kind: 'table', table: 'org_agent_resource_chunks', reason: 'search chunks' },
    ],
  );

  const next = structuredClone(view.spec);
  assert.equal(next.backend.kind, 'blueprint');
  next.backend.extend.fields = { deals: [{ name: 'priority', type: 'text', default: 'medium' }] };
  const validated = validateAppSpec(next, schema);
  if ('errors' in validated) assert.fail(formatAppSpecErrors(validated.errors));
  const delta = deltaOf(view.spec, next, { live: liveColumns(model), protect: view.protect });
  assert.deepEqual(delta.destructive, []);
  assert.deepEqual(
    delta.calls.map((call) => call.tool),
    ['create_field'],
  );
});

test('existing UI hints for generated chunks are removed when a spec is rendered again', () => {
  const live = liveModelOf(crm, { blueprints: CURATED_BLUEPRINTS });
  const parent = live.tables.find((table) => table.name === 'companies');
  assert.ok(parent);
  const model: LiveModel = { ...live, tables: [...live.tables, chunk('companies', parent)] };
  const spec: AppSpec = {
    ...crm,
    ui: {
      nav: ['companies', 'companies_chunks'],
      resources: { companies: { label: 'Companies' }, companies_chunks: { label: 'Chunks' } },
      dashboard: { tiles: [{ kind: 'count', resource: 'companies_chunks' }] },
    },
  };
  const view = liveSpec({
    model,
    overlay: overlayOf(spec, model, null, []),
    seeded: {},
    fallbackName: crm.name,
  });
  assert.deepEqual(view.spec.ui, {
    nav: ['companies'],
    resources: { companies: { label: 'Companies' } },
  });
});

const dataRoom: AppSpec = {
  version: 1,
  name: 'Acquisition Room',
  backend: {
    kind: 'blueprint',
    slug: 'data_room',
    extend: {
      entities: [
        {
          name: 'folders',
          access: 'private',
          fields: [{ name: 'name', type: 'text' }],
          belongsTo: [{ field: 'room_id', to: 'data_rooms', onDelete: 'cascade' }],
        },
      ],
      links: [{ between: ['folders', 'data_rooms'] }],
    },
  },
};

test('a data-room extension can link to rooms and retain that key when the room is core', () => {
  const result = validateAppSpec(dataRoom, schema);
  if ('errors' in result) assert.fail(formatAppSpecErrors(result.errors));
  const initial = deltaOf(null, dataRoom);
  assert.ok(
    initial.calls.some(
      (call) =>
        call.tool === 'provision_blueprint' &&
        call.params.definition.relations?.some(
          (relation) => relation.target_table === 'data_rooms',
        ),
    ),
  );

  const built = liveModelOf(dataRoom, { blueprints: CURATED_BLUEPRINTS });
  const model = mergeLiveModel({ schema: { databaseId: 'db-1', hash: 'h0', tables: [] }, meta });
  const view = liveSpec({
    model: { ...model, tables: built.tables.filter((table) => table.name !== 'data_rooms') },
    overlay: overlayOf(dataRoom, built, null, []),
    seeded: {},
    fallbackName: dataRoom.name,
  });
  assert.deepEqual(view.spec.backend, dataRoom.backend);
  assert.ok(view.readOnly.some((item) => item.kind === 'table' && item.table === 'data_rooms'));
});

test("a room's page keeps its UI hints though its table is outside the app schema", () => {
  const spec: AppSpec = {
    ...dataRoom,
    ui: {
      nav: ['data_rooms', 'folders'],
      resources: {
        data_rooms: {
          icon: 'folder-lock',
          panels: { scope: 'data_room', show: ['members', 'files'] },
          fields: { name: { label: 'Room name' } },
        },
      },
    },
  };
  // The membership module makes the rooms table: only `_meta` lists it.
  const built = liveModelOf(spec, { blueprints: CURATED_BLUEPRINTS });
  const api = mergeLiveModel({ schema: { databaseId: 'db-1', hash: 'h0', tables: [] }, meta });
  const model = { ...api, tables: built.tables.filter((table) => table.name !== 'data_rooms') };
  const view = liveSpec({
    model,
    overlay: overlayOf(spec, model, null, []),
    seeded: {},
    fallbackName: spec.name,
  });
  assert.deepEqual(view.spec.ui, spec.ui);
});

test('plan_app leaves rooms unseeded and points the agent to add_records after the build', () => {
  const result = validateAppSpec(
    {
      ...dataRoom,
      seed: { data_rooms: [{ name: 'Test room' }] },
    },
    schema,
  );
  assert.ok('errors' in result);
  assert.match(formatAppSpecErrors(result.errors), /seed\.data_rooms:.*add_records/i);

  const unseededRoom = validateAppSpec(
    {
      ...dataRoom,
      seed: { folders: [{ name: 'Diligence', room_id: '@data_rooms[0]' }] },
    },
    schema,
  );
  assert.ok('errors' in unseededRoom);
  assert.match(formatAppSpecErrors(unseededRoom.errors), /seed\.folders\[0\].*add_records/i);

  // A required key to rooms can't be filled from the seed either, so the
  // message mustn't ask for the reference the check above refuses.
  const keyless = validateAppSpec(
    { ...dataRoom, seed: { folders: [{ name: 'Diligence' }] } },
    schema,
  );
  assert.ok('errors' in keyless);
  const message = formatAppSpecErrors(keyless.errors);
  assert.match(message, /room_id.*data_rooms.*add_records/i);
  assert.doesNotMatch(message, /@data_rooms\[0\]/);
});

test('a blueprint with no named tables gives a complete validation error', () => {
  const result = validateAppSpec(
    {
      ...dataRoom,
      backend: {
        kind: 'blueprint',
        slug: 'empty',
        extend: { fields: { mystery: [{ name: 'status', type: 'text' }] } },
      },
      seed: { mystery: [{ status: 'ok' }] },
    },
    schema,
    { blueprints: { empty: { name: 'empty', display_name: 'Empty' } } },
  );
  assert.ok('errors' in result);
  assert.match(
    formatAppSpecErrors(result.errors),
    /empty has no table "mystery"; it has no named tables\./,
  );
  assert.doesNotMatch(formatAppSpecErrors(result.errors), /its tables are\s*(?:$|A new table)/m);
});

test('list_blueprints tells the agent which room table to reference and how to create rows', () => {
  const description = describeBlueprint(CURATED_BLUEPRINTS.data_room);
  assert.match(description, /data_rooms.*reference.*add_records/i);
  assert.match(description, /storage.*(no screens|without screens)/i);
});
