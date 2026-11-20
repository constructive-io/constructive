import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { LiveModel } from '../../src/app-spec/live-model';
import { liveSpec } from '../../src/app-spec/live-spec';
import {
  plannedScopeTree,
  recordedScopes,
  scopeTreeFrom,
  withPlannedScopes,
} from '../../src/app-spec/scope-tree';
import type { BlueprintTable } from '../../src/app-spec/translate';
import type { AppSpec } from '../../src/app-spec/types';
import { rebuildOf, recordKindOf } from '../../src/pipeline/build-plan';
import type { BuildRead } from '../../src/pipeline/build-record';
import type { DatabaseState } from '../../src/pipeline/db-check';
import {
  describeRebuild,
  type GoneDatabase,
  nameTakenStep,
  notRebuiltOf,
  offersRebuild,
  rebuildPlan,
  recordedEntityTypes,
} from '../../src/pipeline/reprovision';
import { seenState } from '../../src/pipeline/view-file';
import {
  addColumn,
  liveModelOf,
  setAccess,
} from '../app-spec/__fixtures__/live-model-of';
import { builtRecord } from './__fixtures__/built-record';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// A project whose database is gone gets the app back in a new database from
// app-spec.json, after the user approves a card that says what can't come back.

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);
const gone: GoneDatabase = { kind: 'missing', databaseId: 'db-1', name: 'food-bank' };
const account = { email: 'owner@example.com', savedPassword: false, canRemember: true };

// The database as the last build left it, with what the spec can't describe added outside.
const lastLook = () => {
  let model = liveModelOf(built);
  const record = builtRecord(built, model);
  model = addColumn(model, 'locations', 'area', 'geometry');
  model = addColumn(model, 'locations', 'code', 'text', {
    default: { kind: 'expression', sql: 'upper(left(md5(random()::text), 6))' },
  });
  model = setAccess(model, 'shifts', 'custom');
  return { model, read: { kind: 'ok', record } as BuildRead };
};

test('a rebuild plans all of app-spec.json against nothing, with every sample row that landed', () => {
  const { model, read } = lastLook();
  if (read.kind !== 'ok') assert.fail(read.kind);
  // app-spec.json as the desktop wrote it from the old database.
  const view = liveSpec({
    model,
    overlay: read.record.overlay,
    seeded: read.record.seeded,
    fallbackName: 'food-bank',
  });
  const spec: AppSpec = JSON.parse(JSON.stringify(view.spec));

  const outcome = rebuildPlan(spec, gone, 'food-bank-x7k2');
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  const { plan } = outcome;
  assert.equal(plan.live, null);
  assert.deepEqual(plan.mode, {
    kind: 'rebuild',
    replaces: 'db-1',
    oldName: 'food-bank',
    databaseName: 'food-bank-x7k2',
  });
  // A follow-up to the commit and the next plan_app: the app and its design pass are there.
  assert.equal(recordKindOf(plan), 'update');
  const landed = Object.values(view.landed).reduce((sum, rows) => sum + rows.length, 0);
  assert.equal(landed, 8);
  assert.equal(plan.delta.seed.rows, landed);
  assert.ok(Object.values(plan.delta.seed.from).every((from) => from === 0));
  assert.equal(plan.delta.uiOnly, false);
});

test('the rebuild card names the gone database and what app-spec.json left out of it', () => {
  const { model, read } = lastLook();
  // view.json keeps the last look by id; the card reads what it couldn't describe from it.
  const notRebuilt = notRebuiltOf(seenState(model), read, gone, 'food-bank');
  const prompt = describeRebuild(built, gone, notRebuilt, account, 'food-bank-2');

  assert.deepEqual(prompt.oldDatabase, { name: 'food-bank' });
  assert.equal(prompt.newDatabaseName, 'food-bank-2');
  // Four entities and the volunteers-shifts link table; eight sample rows.
  assert.deepEqual(prompt.rebuilds, { tables: 5, seedRows: 8 });
  assert.deepEqual(prompt.notRebuilt, [
    'locations.area (geometry)',
    'the default of locations.code (upper(left(md5(random()::text), 6)))',
    'who sees the rows of shifts (its own policies)',
  ]);

  // A last look at another database says nothing about this one.
  const other = seenState({ ...model, databaseId: 'db-2' });
  assert.deepEqual(notRebuiltOf(other, read, gone, 'food-bank'), []);
  assert.deepEqual(notRebuiltOf(null, read, gone, 'food-bank'), []);
});

test('only a missing database is offered a rebuild', () => {
  const states: DatabaseState[] = [
    { kind: 'missing', databaseId: 'db-1' },
    { kind: 'suspended', databaseId: 'db-1' },
    { kind: 'other-account', databaseId: 'db-1' },
    { kind: 'unreachable', cause: 'network', detail: 'fetch failed' },
    { kind: 'found', databaseId: 'db-1', name: 'food-bank', hash: 'h0' },
    { kind: 'unbound' },
  ];
  assert.deepEqual(
    states.filter(offersRebuild).map((s) => s.kind),
    ['missing'],
  );
});

test("this account's database holding the name is bound only on an unbound project's first build", () => {
  const yours = { databaseId: 'db-old', yours: true };
  const firstBuild = { mode: { kind: 'first' }, live: null as LiveModel | null } as const;
  assert.deepEqual(nameTakenStep(yours, firstBuild), { kind: 'adopt', databaseId: 'db-old' });
  // One made outside the desktop has no `api-<name>` host, so binding it would strand the project.
  assert.deepEqual(nameTakenStep(yours, firstBuild, false), { kind: 'rename' });
  // A rebuild, or a project bound to an empty database, never takes it over.
  assert.deepEqual(
    nameTakenStep(yours, {
      ...firstBuild,
      mode: { kind: 'rebuild', replaces: 'db-1', databaseName: 'food-bank-x7k2' },
    }),
    {
      kind: 'held',
      databaseId: 'db-old',
    },
  );
  assert.deepEqual(nameTakenStep(yours, { mode: { kind: 'first' }, live: liveModelOf(built) }), {
    kind: 'held',
    databaseId: 'db-old',
  });
  // Another account's database, or none that is still there: a new name.
  assert.deepEqual(nameTakenStep({ databaseId: 'db-x', yours: false }, firstBuild), {
    kind: 'rename',
  });
  assert.deepEqual(nameTakenStep(undefined, firstBuild), { kind: 'rename' });
});

test("a rebuild makes the gone database's own entity types again, before the schema adds to their tables", () => {
  const tree = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'properties' }],
    storages: [{ scope: 'properties' }],
    entityTypes: [
      { prefix: 'properties', parentEntity: 'org', tableName: 'propertiess', membershipType: 3 },
    ],
  });
  const spec: AppSpec = {
    version: 1,
    name: 'Steadfast',
    backend: {
      kind: 'custom',
      entities: [
        {
          name: 'propertiess',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'address_line', type: 'text' },
          ],
        },
        {
          name: 'units',
          access: { scope: 'properties' },
          fields: [{ name: 'unit_label', type: 'text', required: true }],
          belongsTo: [{ field: 'property_id', to: 'propertiess', onDelete: 'cascade' }],
        },
      ],
    },
  };
  // manage_entity_types made the type; the last look at the database recorded it.
  const state = seenState(liveModelOf(spec, { scopes: tree }));
  const recorded = recordedEntityTypes(state, gone, spec.backend);
  assert.deepEqual(
    recorded.map((type) => [type.prefix, type.table, type.parentEntity]),
    [['properties', 'propertiess', 'org']],
  );
  // A curated blueprint's own entity types come back with the blueprint.
  const fundraise: AppSpec['backend'] = { kind: 'blueprint', slug: 'fundraise' };
  const withRooms = {
    ...state,
    basis: {
      ...state.basis,
      entityTypes: [{ ...recorded[0]!, prefix: 'data_room', table: 'data_rooms' }],
    },
  };
  assert.deepEqual(recordedEntityTypes(withRooms, gone, fundraise), []);

  // The card lists nothing the rebuild makes: the key to the type's table and the scoped access come back.
  const model = liveModelOf(spec, { scopes: tree });
  const read: BuildRead = { kind: 'ok', record: builtRecord(spec, model) };
  assert.deepEqual(notRebuiltOf(seenState(model), read, gone, 'steadfast'), []);

  const scopes = withPlannedScopes(recordedScopes(recorded), plannedScopeTree(undefined));
  const outcome = rebuildPlan(spec, gone, 'steadfast-x1', recorded, scopes);
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  assert.deepEqual(rebuildOf(outcome.plan)?.entityTypes, recorded);
  const call = outcome.plan.delta.calls.find((c) => c.tool === 'provision_blueprint');
  const tables = (call?.params as { definition: { tables: BlueprintTable[] } }).definition.tables;
  const properties = tables.find((table) => table.table_name === 'propertiess');
  // Only its columns: the type it is made again as owns, and guards, the table.
  assert.deepEqual(properties?.policies, []);
  assert.deepEqual(
    properties?.fields?.map((f) => f.name),
    ['name', 'address_line'],
  );
  assert.deepEqual(
    tables.find((table) => table.table_name === 'units')?.policies.map((p) => p.$type),
    ['AuthzEntityMembership'],
  );
});
