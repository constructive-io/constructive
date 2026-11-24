import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { type LiveModel, mergeLiveModel } from '../../src/app-spec/live-model';
import { overlayOf } from '../../src/app-spec/overlay';
import { outsideLine } from '../../src/app-spec/schema-drift';
import type { AppSpec, CustomBackend } from '../../src/app-spec/types';
import { planFrom, prevOf } from '../../src/pipeline/build-plan';
import type { BuildRead, BuildRecord } from '../../src/pipeline/build-record';
import { staleViewText } from '../../src/pipeline/drift-text';
import {
  markSeen,
  readViewState,
  readViewText,
  seenState,
  SPEC_FILE,
  VIEW_FILE,
  writeView,
} from '../../src/pipeline/view-file';
import { type SyncDeps, syncView, type ViewSync } from '../../src/pipeline/view-sync';
import {
  addColumn,
  dropTable,
  liveModelOf,
  renameColumn,
  setRequired,
} from '../app-spec/__fixtures__/live-model-of';
import { builtRecord } from './__fixtures__/built-record';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);

/** A built project on the real view files, with the database and the record as the test sets them. */
function project(model: LiveModel) {
  const dir = mkdtempSync(path.join(tmpdir(), 'view-sync-'));
  const now = { model, record: builtRecord(built, model) as BuildRecord | null, writes: 0 };
  const deps: SyncDeps = {
    check: async () => ({
      kind: 'found',
      databaseId: now.model.databaseId,
      name: 'food-bank',
      hash: now.model.hash,
    }),
    readModel: async () => now.model,
    readRecord: async () => (now.record ? { kind: 'ok', record: now.record } : { kind: 'none' }),
    readState: readViewState,
    readViewText,
    writeView: async (cwd, spec, state) => {
      now.writes += 1;
      await writeView(cwd, spec, state);
    },
  };
  const sync = async () => {
    const result = await syncView(dir, { fallbackName: 'food-bank' }, deps);
    if (result.kind !== 'current' && result.kind !== 'refreshed') assert.fail(result.kind);
    return result as Extract<ViewSync, { kind: 'current' | 'refreshed' }>;
  };
  const file = (name: string) => JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
  return { dir, now, deps, sync, file };
}

const fieldsOf = (spec: AppSpec, table: string) =>
  (spec.backend as CustomBackend).entities.find((e) => e.name === table)?.fields.map((f) => f.name);

test('a moved hash refreshes the view and names what changed', async () => {
  const model = liveModelOf(built);
  const { now, sync, file } = project(model);
  assert.equal((await sync()).kind, 'current');

  // In the dashboard: a column renamed, one made required, a table deleted.
  now.model = dropTable(
    setRequired(renameColumn(model, 'volunteers', 'phone', 'mobile'), 'volunteers', 'mobile'),
    'availability_notes',
  );
  const refreshed = await sync();
  assert.equal(refreshed.kind, 'refreshed');
  const lines = [
    'volunteers.phone was renamed to mobile',
    'volunteers.mobile became required',
    'the table availability_notes was deleted',
  ];
  const text = staleViewText(refreshed.changes, refreshed.start.view.readOnly);
  for (const line of lines) assert.ok(text.includes(`- ${line}`), line);
  // app-spec.json says what the database has now; the old names are gone.
  const spec = file(SPEC_FILE) as AppSpec;
  assert.deepEqual(fieldsOf(spec, 'volunteers'), ['full_name', 'email', 'mobile']);
  assert.equal(fieldsOf(spec, 'availability_notes'), undefined);

  // The agent's next call plans: the changes stay listed for the card.
  const next = await sync();
  assert.equal(next.kind, 'current');
  assert.equal(next.state.outside.length, 3);
});

test('the outside changes are the database now against the last build', async () => {
  const model = liveModelOf(built);
  const { dir, now, sync, file } = project(model);
  await sync();
  const lines = ({ changes, state }: Awaited<ReturnType<typeof sync>>) => ({
    look: changes.map(outsideLine),
    outside: state.outside.map(outsideLine),
  });

  // Added outside, then deleted again: each look names its change, the card nothing.
  now.model = addColumn(model, 'shifts', 'briefing', 'text');
  await sync();
  now.model = model;
  assert.deepEqual(lines(await sync()), { look: ['shifts.briefing was deleted'], outside: [] });

  // Renamed twice: one rename, from the built name to the last.
  now.model = renameColumn(model, 'volunteers', 'phone', 'mobile');
  await sync();
  now.model = renameColumn(model, 'volunteers', 'phone', 'cell');
  assert.deepEqual(lines(await sync()), {
    look: ['volunteers.mobile was renamed to cell'],
    outside: ['volunteers.phone was renamed to cell'],
  });

  // A view.json from before the build's schema was kept adds each look's changes up.
  const { built: _built, ...old } = file(VIEW_FILE);
  writeFileSync(path.join(dir, VIEW_FILE), JSON.stringify(old));
  now.model = model;
  assert.deepEqual(lines(await sync()).outside, [
    'volunteers.phone was renamed to cell',
    'volunteers.cell was renamed to phone',
  ]);
});

test('our own schema step is not an outside change', async () => {
  const model = liveModelOf(built);
  const { dir, now, sync, file } = project(model);
  await sync();
  now.model = renameColumn(model, 'volunteers', 'phone', 'mobile');
  assert.equal((await sync()).kind, 'refreshed');

  // A build adds a column, then its schema step takes its look at the database.
  const after = addColumn(now.model, 'volunteers', 'shirt_size', 'text');
  await markSeen(dir, after);
  now.model = after;
  now.record = builtRecord(built, after);
  const synced = await sync();
  assert.equal(synced.kind, 'current');
  // Neither the build's column nor the rename it built on are listed again.
  assert.deepEqual(synced.state.outside, []);
  assert.deepEqual(file(VIEW_FILE).outside, []);
});

test('an unchanged database leaves app-spec.json alone', async () => {
  const model = liveModelOf(built);
  const { now, sync, file } = project(model);
  await sync();
  const written = now.writes;
  const before = file(SPEC_FILE);
  assert.equal((await sync()).kind, 'current');
  assert.equal(now.writes, written);

  // A change no spec can name (an index, a policy) moves the hash only: no refusal.
  now.model = { ...model, hash: 'h9' };
  const moved = await sync();
  assert.deepEqual([moved.kind, moved.changes], ['current', []]);
  assert.deepEqual(file(SPEC_FILE), before);
});

test('a built database with no record of it is written into app-spec.json once, then built on', async () => {
  const model = liveModelOf(built);
  const { dir, now, deps, sync, file } = project(model);
  // The record is gone; the last look stayed from when it was there.
  now.record = null;
  await markSeen(dir, model);
  const adopted = await syncView(dir, { fallbackName: 'food-bank' }, deps);
  assert.equal(adopted.kind, 'adopted');
  assert.deepEqual(fieldsOf(file(SPEC_FILE) as AppSpec, 'volunteers'), [
    'full_name',
    'email',
    'phone',
  ]);

  // The agent's next call starts from that file, so it is planned; also after
  // a change no spec can name moved the hash.
  const next = await sync();
  assert.deepEqual([next.kind, next.start.record], ['current', null]);
  now.model = { ...model, hash: 'h9' };
  assert.equal((await sync()).kind, 'current');
  assert.equal((await sync()).kind, 'current');
});

test('a build stopped before it read its new database back keeps app-spec.json, and the next plan seeds it', async () => {
  const model = liveModelOf(built);
  const { dir, now, deps, file } = project(model);
  // What a first build or a rebuild leaves when its read-back fails after its
  // calls: a record that names the database and keeps the spec it makes.
  const empty = mergeLiveModel({
    schema: { databaseId: model.databaseId, hash: '', tables: [] },
    meta: null,
  });
  now.record = {
    version: 3,
    kind: 'build',
    startedAt: '2026-11-16T05:08:00.000Z',
    database: { id: model.databaseId, name: 'food-bank-0cfi', hash: '' },
    overlay: overlayOf(built, empty, null, []),
    seeded: {},
    steps: { settled: false, codegen: false, seeded: false, gen: false },
    expect: [],
    intent: built,
  };
  await writeView(dir, built, seenState(empty));
  const before = file(SPEC_FILE);

  // The background look of a new chat: no adoption, nothing written.
  const look = await syncView(dir, { fallbackName: 'food-bank' }, deps);
  if (look.kind !== 'current') assert.fail(look.kind);
  assert.equal(now.writes, 0);
  assert.deepEqual(file(SPEC_FILE), before);

  // plan_app on that file: the tables are there, the rows aren't, and the
  // name the database alone can't give stays.
  const outcome = planFrom(look.start, built, look.model);
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  const rows = Object.values(built.seed ?? {}).reduce((sum, list) => sum + list.length, 0);
  assert.deepEqual(outcome.plan.delta.additions, []);
  assert.equal(outcome.plan.delta.seed.rows, rows);
  assert.equal(prevOf(outcome.plan)?.name, built.name);
});

test('a follow-up stopped before its read-back names none of its own changes as outside, and the next plan finishes it', async () => {
  const model = liveModelOf(built);
  const { dir, now, deps } = project(model);
  const last = builtRecord(built, model);
  // The follow-up adds volunteers.shirt_size; its call landed, then the read-back failed.
  const next = structuredClone(built);
  const volunteers = (next.backend as CustomBackend).entities.find((e) => e.name === 'volunteers');
  volunteers?.fields.push({ name: 'shirt_size', type: 'text', label: 'Shirt size' });
  now.model = addColumn(model, 'volunteers', 'shirt_size', 'text');
  // What every build now writes before its calls: the last build's record, pending this spec.
  now.record = {
    ...last,
    kind: 'update',
    startedAt: '2026-11-16T09:00:00.000Z',
    overlay: overlayOf(next, model, last.overlay, []),
    intent: next,
  };
  const look = await syncView(dir, { fallbackName: 'food-bank' }, deps);
  if (look.kind !== 'current') assert.fail(look.kind);
  assert.deepEqual(look.changes, []);

  const outcome = planFrom(look.start, next, look.model);
  if (outcome.kind === 'refused') assert.fail(outcome.text);
  // Nothing is made twice, and the label the follow-up gave carries over.
  assert.deepEqual(outcome.plan.delta.additions, []);
  const shirt = (prevOf(outcome.plan)?.backend as CustomBackend).entities
    .find((e) => e.name === 'volunteers')
    ?.fields.find((f) => f.name === 'shirt_size');
  assert.equal(shirt?.label, 'Shirt size');
});

test("with no database, a record that can't be read refuses the build instead of a first build", async () => {
  const { dir, deps } = project(liveModelOf(built));
  const unbound = (read: BuildRead): SyncDeps => ({
    ...deps,
    check: async () => ({ kind: 'unbound' }),
    readRecord: async () => read,
  });
  const torn = await syncView(
    dir,
    { fallbackName: 'food-bank' },
    unbound({ kind: 'unreadable', reason: 'it is not valid JSON' }),
  );
  if (torn.kind !== 'unbound') assert.fail(torn.kind);
  assert.equal(torn.start.kind, 'refused');
  // With no record at all, the project never had an app: a first build.
  const none = await syncView(dir, { fallbackName: 'food-bank' }, unbound({ kind: 'none' }));
  assert.deepEqual(none, { kind: 'unbound', start: { kind: 'first' } });
});
