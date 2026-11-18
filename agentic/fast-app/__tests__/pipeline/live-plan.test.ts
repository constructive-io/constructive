import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { configureHost } from '@agentic-kit/db-tools';

import { type LiveModel, mergeLiveModel, type SchemaColumnInput } from '../../src/app-spec/live-model';
import { liveSpec } from '../../src/app-spec/live-spec';
import type { BlueprintTable } from '../../src/app-spec/translate';
import type { AppSpec, CustomBackend, SpecEntity } from '../../src/app-spec/types';
import { type BuildPlan, keepsSdk, lastRecordOf, planBuild, prevOf } from '../../src/pipeline/build-plan';
import { BuildLedger, type BuildRead } from '../../src/pipeline/build-record';
import { type FollowUp, sdkMoved, startOn } from '../../src/pipeline/plan-live';
import {
  entityTypeInput,
  liveModelOf,
  renameColumn,
} from '../app-spec/__fixtures__/live-model-of';
import { builtRecord } from './__fixtures__/built-record';
import { basisOn, planOn } from './__fixtures__/plan-on';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// plan_app plans from the database as it is now, rendered with what the build
// record remembers about it, never from the spec the last build applied.

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);
const model = liveModelOf(built);
const agentApp: AppSpec = {
  version: 1,
  name: 'Agent Review',
  backend: { kind: 'blueprint', slug: 'agent' },
};

const entity = (spec: AppSpec, name: string): SpecEntity => {
  const found = (spec.backend as CustomBackend).entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

function planned(read: BuildRead, spec: AppSpec, live = model): BuildPlan {
  const outcome = planOn(read, spec, live);
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  return outcome.plan;
}

// A new database, as metaschema lists it: the platform's own users table only.
const emptyDatabase = (databaseId: string) =>
  mergeLiveModel({
    schema: {
      databaseId,
      hash: 'h0',
      tables: [
        {
          id: 'platform-users',
          name: 'users',
          access: 'custom',
          columns: [{ id: 'u1', name: 'id', type: 'uuid', isRequired: true, default: null }],
          foreignKeys: [],
        },
      ],
    },
    meta: [],
  });

test("a follow-up is measured against the live database with the record's overlay", () => {
  const record = builtRecord(built, model);
  const renamed = renameColumn(model, 'volunteers', 'phone', 'mobile');
  // The agent starts from app-spec.json, which the desktop rendered from the
  // database, and adds a field.
  const view = liveSpec({
    model: renamed,
    overlay: record.overlay,
    seeded: record.seeded,
    fallbackName: 'food-bank',
  });
  const spec = structuredClone(view.spec);
  entity(spec, 'volunteers').fields.push({ name: 'shirt_size', type: 'text' });

  const plan = planned({ kind: 'ok', record }, spec, renamed);
  assert.equal(plan.mode.kind, 'follow-up');
  assert.equal(lastRecordOf(plan), record);
  // The rename made outside isn't re-created, and nothing is offered for removal.
  assert.deepEqual(
    plan.delta.additions.map((a) => a.id),
    ['add_field:volunteers.shirt_size'],
  );
  assert.deepEqual(plan.delta.destructive, []);
  assert.equal(plan.delta.seed.rows, 0);
  // The record's overlay keeps what the database can't say.
  const address = entity(prevOf(plan), 'locations').fields.find((f) => f.name === 'address');
  assert.equal(address?.type, 'long_text');
});

test('a record of another database is ignored', () => {
  const copied = { kind: 'ok', record: builtRecord(built, model) } as const;
  // A worktree with a database of its own: a first build there.
  const own = planned(copied, built, emptyDatabase('db-2'));
  assert.equal(own.mode.kind, 'first');
  assert.equal(own.delta.seed.rows, 8);

  // A database with tables of its own is adopted, never planned from the copied record.
  const other = { ...model, databaseId: 'db-2' };
  const start = startOn(copied, other, { fallbackName: 'food-bank' }) as FollowUp;
  assert.deepEqual(
    [start.kind, start.adopted, start.record, start.overlay],
    ['follow-up', true, null, null],
  );
});

test('a v1, torn or missing record on a built database plans a follow-up from live', () => {
  const reads: BuildRead[] = [
    { kind: 'none' },
    { kind: 'legacy', version: 1 },
    { kind: 'unreadable', reason: 'it is not valid JSON' },
    { kind: 'legacy', version: 2, spec: built },
  ];
  for (const read of reads) {
    // The agent starts from app-spec.json as the desktop wrote it from the
    // database, adds a field, and asks for the first build's rows again.
    const { view } = startOn(read, model, { fallbackName: 'food-bank' }) as FollowUp;
    const spec = { ...structuredClone(view.spec), seed: built.seed };
    entity(spec, 'volunteers').fields.push({ name: 'shirt_size', type: 'text' });

    const plan = planned(read, spec);
    assert.equal(plan.mode.kind, 'adopted', read.kind);
    assert.deepEqual(
      plan.delta.additions.map((a) => a.id),
      ['add_field:volunteers.shirt_size'],
    );
    assert.deepEqual(plan.delta.destructive, []);
    // No row the desktop knows of is in: each table gets its rows only while empty.
    assert.deepEqual(plan.seedIfEmpty.sort(), Object.keys(built.seed ?? {}).sort());
  }
  // A version 2 record's spec still gives what the database can't say.
  const v2 = planned({ kind: 'legacy', version: 2, spec: built }, built);
  const address = entity(prevOf(v2), 'locations').fields.find((f) => f.name === 'address');
  assert.equal(address?.type, 'long_text');
});

test('an empty database is a first build whatever the backend', () => {
  const empty = emptyDatabase('db-1');
  // The platform's users table is no app's: it isn't a table to build on.
  assert.deepEqual(empty.tables, []);
  const read = { kind: 'ok', record: builtRecord(built, model) } as const;
  for (const spec of [built, agentApp]) {
    const plan = planned(read, spec, empty);
    assert.equal(plan.mode.kind, 'first');
  }
});

test('the SDK is regenerated when the database moved since codegen or the app env names another database', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'live-plan-'));
  // Codegen stamped the record with the database it ran on.
  const record = { ...builtRecord(built, model), sdk: { hash: model.hash, meta: 'm0' } };
  await BuildLedger.open(dir, record);
  writeFileSync(path.join(dir, '.env'), 'DATABASE_ID=db-1\nDATABASE_NAME=food-bank\n');
  mkdirSync(path.join(dir, 'packages', 'app'), { recursive: true });
  const appEnv = (name: string) =>
    writeFileSync(path.join(dir, 'packages', 'app', '.env.local'), `NEXT_PUBLIC_DB_NAME=${name}\n`);

  // A label change on app-spec.json as the desktop rendered it: no schema change.
  const sdkStep = async (live: LiveModel) => {
    const { view } = startOn({ kind: 'ok', record }, live, {
      fallbackName: 'food-bank',
    }) as FollowUp;
    const spec = structuredClone(view.spec);
    entity(spec, 'locations').label = 'Sites';
    const outcome = await planBuild(dir, spec, await basisOn(dir, live));
    if (outcome.kind === 'refused') assert.fail(outcome.text);
    assert.equal(outcome.plan.delta.uiOnly, true);
    const { plan } = outcome;
    if (keepsSdk(plan)) return 'keep';
    return sdkMoved(lastRecordOf(plan), plan.live) ? 'database moved' : 'again';
  };

  appEnv('food-bank');
  const stamped = { ...model, metaDigest: 'm0' };
  assert.equal(await sdkStep(stamped), 'keep');
  // Changed outside the app in a way the spec doesn't show, an index say: the hash moved.
  assert.equal(await sdkStep({ ...stamped, hash: 'h1' }), 'database moved');
  // `_meta` names other columns than when codegen ran: changed with SQL.
  assert.equal(await sdkStep({ ...stamped, metaDigest: 'm1' }), 'database moved');
  // A worktree sharing the database, whose app env codegen wrote for another one.
  appEnv('food-bank-2');
  assert.equal(await sdkStep(stamped), 'again');
});

test("the app env check reads the database from the host's values when the project has no .env", async () => {
  // A cloud Job's clone: no .env, the host gives the run's database.
  const dir = mkdtempSync(path.join(tmpdir(), 'live-plan-hosted-'));
  const record = { ...builtRecord(built, model), sdk: { hash: model.hash, meta: 'm0' } };
  await BuildLedger.open(dir, record);
  mkdirSync(path.join(dir, 'packages', 'app'), { recursive: true });
  const appEnv = (name: string) =>
    writeFileSync(path.join(dir, 'packages', 'app', '.env.local'), `NEXT_PUBLIC_DB_NAME=${name}\n`);
  configureHost({
    account: () => null,
    backendConfig: () => null,
    contextSource: (cwd) => (cwd === dir ? { CONSTRUCTIVE_DATABASE_NAME: 'food-bank' } : null)
  });
  try {
    const stamped = { ...model, metaDigest: 'm0' };
    const keeps = async () => {
      const { view } = startOn({ kind: 'ok', record }, stamped, { fallbackName: 'food-bank' }) as FollowUp;
      const spec = structuredClone(view.spec);
      entity(spec, 'locations').label = 'Sites';
      const outcome = await planBuild(dir, spec, await basisOn(dir, stamped));
      if (outcome.kind === 'refused') assert.fail(outcome.text);
      return keepsSdk(outcome.plan);
    };

    appEnv('food-bank');
    assert.equal(await keeps(), true);
    appEnv('food-bank-2');
    assert.equal(await keeps(), false);
  } finally {
    configureHost({ account: () => null, backendConfig: () => null });
  }
});

test("a spec entity on an entity type's table adds only the columns it lacks, with no owner or access of its own", () => {
  // manage_entity_types made the table: the app schema model leaves it out,
  // and the modules API names it with its columns.
  const properties = (more: string[] = []) =>
    mergeLiveModel({
      schema: { databaseId: 'db-1', hash: 'h0', tables: [] },
      meta: [],
      scopes: {
        sprtTables: {},
        entityTypes: [entityTypeInput('properties', 'propertiess', more)],
      },
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
            { name: 'status', type: 'text', enum: ['active', 'sold'] },
          ],
        },
      ],
    },
  };
  const plan = (live: LiveModel, next = spec) => planOn({ kind: 'none' }, next, live);

  const first = plan(properties());
  if (first.kind === 'refused') assert.fail(first.text);
  const call = first.plan.delta.calls.find((c) => c.tool === 'provision_blueprint');
  const [table] = (call?.params as { definition: { tables: BlueprintTable[] } }).definition.tables;
  assert.equal(table.table_name, 'propertiess');
  // No owner stamped from the session, and no policy beside the entity type's own.
  assert.deepEqual(
    table.nodes.map((node) => (typeof node === 'string' ? node : node.$type)),
    ['DataStatusField'],
  );
  assert.deepEqual(table.policies, []);
  assert.deepEqual(
    table.fields?.map((field) => field.name),
    ['address_line'],
  );

  // Once the table has them, a repeat plans nothing for it.
  const built = plan(properties(['address_line', 'status']));
  if (built.kind === 'refused') assert.fail(built.text);
  assert.deepEqual(built.plan.delta.calls, []);
  assert.deepEqual(built.plan.delta.additions, []);

  // Its members decide who sees each row.
  const scoped = structuredClone(spec);
  entity(scoped, 'propertiess').access = 'private';
  const refused = plan(properties(), scoped);
  assert.equal(refused.kind, 'refused');
  assert.match(refused.kind === 'refused' ? refused.text : '', /leave access out/);
});

test("a key from an app table to an entity type's table stays in app-spec.json, so the same spec plans nothing", () => {
  const column = (name: string, isRequired = true): SchemaColumnInput => ({
    id: `f:units.${name}`,
    name,
    type: name.endsWith('_id') || name === 'id' ? 'uuid' : 'text',
    isRequired,
    default: null,
  });
  const live = mergeLiveModel({
    schema: {
      databaseId: 'db-1',
      hash: 'h1',
      tables: [
        {
          id: 't:units',
          name: 'units',
          access: 'shared',
          columns: ['id', 'owner_id', 'unit_label', 'property_id'].map((name) => column(name)),
          foreignKeys: [
            {
              columnIds: ['f:units.property_id'],
              targetTableId: 't:propertiess',
              targetTable: 'propertiess',
              onDelete: 'cascade',
            },
          ],
        },
      ],
    },
    meta: null,
    scopes: {
      sprtTables: {},
      entityTypes: [entityTypeInput('properties', 'propertiess', ['address_line'])],
    },
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
          fields: [{ name: 'unit_label', type: 'text', required: true }],
          belongsTo: [{ field: 'property_id', to: 'propertiess', onDelete: 'cascade' }],
        },
      ],
    },
  };
  const record = builtRecord(spec, live);
  const view = liveSpec({ model: live, overlay: record.overlay, seeded: {}, fallbackName: 'x' });
  assert.deepEqual(entity(view.spec, 'units').belongsTo, [
    { field: 'property_id', to: 'propertiess', onDelete: 'cascade' },
  ]);

  for (const next of [spec, view.spec]) {
    const outcome = planOn({ kind: 'ok', record }, next, live);
    if (outcome.kind === 'refused') assert.fail(outcome.text);
    assert.deepEqual(outcome.plan.delta.additions, []);
    assert.deepEqual(outcome.plan.delta.calls, []);
  }
});
