import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AppSpec, CustomBackend } from '../../src/app-spec/types';
import { buildCommitMessage } from '../../src/pipeline/build-commits';
import {
  type BuildPlan,
  cardChanges,
  keepsSdk,
  lastRecordOf,
  planBuild,
  prevOf,
  resolvePlan,
  schemaExpectations,
} from '../../src/pipeline/build-plan';
import { BUILD_RECORD, BuildLedger, type BuildRecord } from '../../src/pipeline/build-record';
import { unmetSchema } from '../../src/pipeline/schema-settle';
import { deltaOf } from '../app-spec/__fixtures__/delta-of';
import { liveModelOf } from '../app-spec/__fixtures__/live-model-of';
import { builtRecord } from './__fixtures__/built-record';
import { basisOn, planOn } from './__fixtures__/plan-on';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);
const NONE = { blueprints: {} };
/** The database the food bank's first build left. */
const model = liveModelOf(built);

function next(edit: (spec: AppSpec & { backend: CustomBackend }) => void): AppSpec {
  const spec = structuredClone(built) as AppSpec & { backend: CustomBackend };
  edit(spec);
  return spec;
}
const entity = (spec: AppSpec & { backend: CustomBackend }, name: string) => {
  const found = spec.backend.entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

// A follow-up from the built app to `spec`, after a build that left `steps`.
const followUp = (spec: AppSpec, steps: Partial<BuildRecord['steps']> = {}): BuildPlan => ({
  mode: { kind: 'follow-up', prev: built, record: builtRecord(built, model, steps) },
  spec,
  live: model,
  overlay: null,
  readOnly: [],
  outside: [],
  seedIfEmpty: [],
  sdkCurrent: true,
  delta: deltaOf(built, spec, NONE),
});

const project = () => mkdtempSync(path.join(tmpdir(), 'build-plan-'));

test('a first build is the delta from nothing: every table in one call, every row', async () => {
  const dir = project();
  const outcome = await planBuild(dir, built, await basisOn(dir, null));
  assert.equal(outcome.kind, 'build');
  const { plan } = outcome as { plan: BuildPlan };
  assert.equal(plan.mode.kind, 'first');

  const [call] = plan.delta.calls;
  assert.equal(plan.delta.calls.length, 1);
  assert.equal(call.tool, 'provision_blueprint');
  assert.deepEqual(
    call.tool === 'provision_blueprint' && call.params.definition.tables.map((t) => t.table_name),
    ['locations', 'volunteers', 'shifts', 'availability_notes', 'volunteer_shifts'],
  );
  assert.equal(plan.delta.seed.rows, 8);
  assert.equal(keepsSdk(plan), false);
  const resolved = resolvePlan(plan, []);
  assert.deepEqual(resolved.calls, plan.delta.calls);
  assert.equal(resolved.spec, built);
});

test('a follow-up is measured against the live database, not app-spec.json', async () => {
  const dir = project();
  await BuildLedger.open(dir, builtRecord(built, model));
  // An app-spec.json edited by hand plays no part.
  writeFileSync(path.join(dir, '.constructive', 'app-spec.json'), JSON.stringify({ name: 'x' }));
  const added = next((spec) =>
    entity(spec, 'volunteers').fields.push({ name: 'shirt_size', type: 'text' }),
  );
  const outcome = await planBuild(dir, added, await basisOn(dir, model));
  assert.equal(outcome.kind, 'build');
  const { plan } = outcome as { plan: BuildPlan };
  assert.deepEqual(
    plan.delta.additions.map((a) => a.id),
    ['add_field:volunteers.shirt_size'],
  );
  assert.equal(plan.delta.seed.rows, 0);
});

test('plan_app again after a first build that never committed is still a first build', async () => {
  const dir = project();
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  // The first build's schema step wrote the record, then gen failed.
  await BuildLedger.open(dir, builtRecord(built, model, { gen: false }));

  const retry = await planBuild(dir, built, await basisOn(dir, model));
  if (retry.kind !== 'build') assert.fail('expected a plan');
  // It still ends with the design pass and a build commit...
  assert.equal(retry.plan.mode.kind, 'first-again');
  // ...while the schema step measures against the database, so nothing is made twice.
  assert.ok(prevOf(retry.plan));
  assert.equal(retry.plan.delta.uiOnly, true);

  // A commit without the build's mark (the agent's own) doesn't end the build.
  git('add', BUILD_RECORD);
  git('commit', '-q', '-m', 'wip');
  const unmarked = await planBuild(dir, built, await basisOn(dir, model));
  assert.equal(unmarked.kind === 'build' && unmarked.plan.mode.kind, 'first-again');

  git('commit', '-q', '--allow-empty', '-m', buildCommitMessage(built.name));
  const after = await planBuild(dir, built, await basisOn(dir, model));
  assert.equal(after.kind === 'build' && after.plan.mode.kind, 'follow-up');
});

test("a record that can't say what the database has adopts it, and refuses only with no database to read", async () => {
  for (const [text, readable] of [
    [JSON.stringify({ version: 1, backend: 'custom:', seedHash: 'h', seededIds: {} }), true],
    [JSON.stringify({ version: 2, kind: 'build', spec: built, seeded: {} }), true],
    ['{"version": 3, "kind": "bu', false],
    [JSON.stringify({ ...builtRecord(built, model), steps: undefined }), false],
  ] as const) {
    const dir = project();
    mkdirSync(path.join(dir, '.constructive'));
    writeFileSync(path.join(dir, BUILD_RECORD), text);
    // On the built database: a follow-up on what it has, never a second build of it.
    const outcome = await planBuild(dir, built, await basisOn(dir, model));
    if (outcome.kind === 'refused') assert.fail(outcome.text);
    const { plan } = outcome;
    assert.equal(plan.mode.kind, 'adopted');
    assert.deepEqual(plan.delta.calls, []);
    // Unbound, a record that can't be read can't say the project had no database.
    const unbound = await planBuild(dir, built, await basisOn(dir, null));
    assert.equal(unbound.kind, readable ? 'build' : 'refused');
    if (unbound.kind === 'refused') {
      assert.match(
        unbound.text,
        /^plan_app can't build here: .*build\.json.* Nothing was changed\./s,
      );
    }
  }
});

test('a removal runs only when ticked, after the additions; unticked, nothing removes it', () => {
  const plan = followUp(
    next((spec) => {
      const volunteers = entity(spec, 'volunteers');
      volunteers.fields = volunteers.fields.filter((f) => f.name !== 'phone');
      // Another type, so it isn't read as a rename of phone.
      volunteers.fields.push({ name: 'years_helping', type: 'integer' });
    }),
  );
  const { delta } = plan;
  const [drop] = delta.destructive;
  assert.ok(drop, 'the removal is offered');
  assert.equal(drop.kind, 'drop_field');
  assert.ok(delta.calls.length > 0, 'the new column is an addition');
  assert.deepEqual(cardChanges(delta).destructive[0], {
    id: drop.id,
    kind: 'drop_field',
    table: 'volunteers',
    column: 'phone',
    title: drop.title,
    lost: drop.loses,
    ...(drop.rows === undefined ? {} : { rows: drop.rows }),
    ...(drop.requires?.length ? { requires: drop.requires } : {}),
  });

  const ticked = resolvePlan(plan, [drop.id]);
  assert.deepEqual(ticked.calls, [...delta.calls, drop.call]);
  assert.deepEqual(
    ticked.ran.map((c) => c.id),
    [drop.id],
  );
  assert.deepEqual([ticked.kept, ticked.left], [[], []]);

  const unticked = resolvePlan(plan, []);
  assert.ok(!unticked.calls.includes(drop.call));
  assert.deepEqual(unticked.ran, []);
  // The column goes back into the spec, so the database and the spec agree on it.
  assert.equal(unticked.kept.length, 1);
  assert.deepEqual(resolvePlan(plan, ['not-offered']).calls, unticked.calls);
});

test('a change plan_app cannot apply is refused before the card, with where and why', () => {
  const read = { kind: 'ok', record: builtRecord(built, model) } as const;
  const outcome = planOn(
    read,
    { ...built, backend: { kind: 'blueprint', slug: 'agent' } } as AppSpec,
    model,
  );
  if (outcome.kind !== 'refused') assert.fail('expected a refusal');
  assert.match(outcome.text, /^plan_app can't apply this change/);
  assert.match(outcome.text, /- backend: /);
  assert.equal(planOn(read, built, model).kind, 'build');
});

test('a UI-only follow-up keeps the SDK only after a build whose codegen finished', () => {
  const relabel = next((spec) => {
    entity(spec, 'locations').label = 'Sites';
  });
  const uiOnly = followUp(relabel);
  assert.equal(uiOnly.delta.uiOnly, true);
  assert.equal(keepsSdk(uiOnly), true);
  // The last build stopped after its schema step (benchmark c-d): the SDK on disk is older.
  assert.equal(keepsSdk(followUp(relabel, { codegen: false })), false);

  const added = next((spec) =>
    entity(spec, 'volunteers').fields.push({ name: 'shirt_size', type: 'text' }),
  );
  assert.equal(keepsSdk(followUp(added)), false);
});

test('plan_app again after a settle timeout still waits for it, then runs codegen', () => {
  const relabel = next((spec) => {
    entity(spec, 'locations').label = 'Sites';
  });
  // What the last build's schema step recorded before its wait timed out.
  const plan = followUp(relabel, { settled: false, codegen: false });
  const record = lastRecordOf(plan);
  if (!record) assert.fail('expected a record');
  record.expect = [{ table: 'volunteers', column: 'phone', present: false }];
  assert.equal(keepsSdk(plan), false);
  const stale = [{ name: 'Volunteer', tableName: 'volunteers', fields: [{ name: 'phone' }] }];
  assert.deepEqual(unmetSchema(stale, schemaExpectations(plan, [])), ['volunteers.phone removed']);

  // Once a build's wait saw it, a UI-only follow-up waits for nothing and keeps the SDK.
  const settled = followUp(relabel);
  assert.deepEqual(schemaExpectations(settled, []), []);
  assert.equal(keepsSdk(settled), true);

  // A stale API that doesn't list a column the database has: codegen would miss it, so the wait covers it.
  const behind = liveModelOf(built, { sql: { dropped: [['locations', 'capacity']] } });
  assert.deepEqual(schemaExpectations(settled, [], behind), [
    { table: 'locations', column: 'capacity', present: true },
  ]);
});
