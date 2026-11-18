// The schema step of every build: a first build's curated blueprint, then the
// plan's calls, then the build record that the later steps patch, then the
// wait for `_meta` to show the schema. The record and the desktop's look at
// the database are written from the database as the calls left it, also when
// a call failed, so the next plan_app starts from what landed and never takes
// this build's own changes for changes made outside the app. Once `_meta`
// shows the schema, app-spec.json is written from the database: gen reads it.

import {
  type AppSpec,
  columnNamed,
  type LiveModel,
  liveSpec,
  mergeLiveModel,
  overlayOf,
  tableNamed,
} from '../app-spec';
import { applyCuratedBlueprint } from '../extensions/blueprint-tools';
import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { recordActivity } from './activity';
import { keepsSdk, lastRecordOf, prevOf, recordKindOf, schemaExpectations } from './build-plan';
import { BuildLedger, type BuildRecord, unsettledExpect } from './build-record';
import { probeBinding, readLiveModel } from './db-port';
import { getFastAppHost, type OwnerSession } from './host';
import { settleOwnerMeta } from './owner-meta';
import { errorMessage, PhaseError } from './progress';
import type { Note, RunContext } from './run-context';
import { runSchemaCalls } from './schema-calls';
import {
  expectationKey,
  expectedSchema,
  type SchemaExpectation,
  tablesPresent,
} from './schema-settle';
import { isNotReady, isRebuildAnswer, retryTransient, retryTransientOnce } from './transient';
import { markSeen, seenState, writeView } from './view-file';

// A first build's provision_blueprint fails on the spec's own entities.
const ENTITIES_FIX =
  'Fix backend.entities in the AppSpec (names, types, belongsTo targets), then call plan_app again.';

/** The tables the API must show before codegen and the seed: the spec's entities and seed tables. */
export function expectedTables(spec: AppSpec): string[] {
  const declared = spec.backend.kind === 'custom' ? spec.backend.entities.map((e) => e.name) : [];
  return [...new Set([...declared, ...Object.keys(spec.seed ?? {})])];
}

/** What the schema step leaves the later phases: the tables the API lists, the build's record, and the database. */
export type BuiltSchema = { tables: LiveMetaTable[]; ledger: BuildLedger; model: LiveModel };

export async function schemaPhase(
  run: RunContext,
  session: OwnerSession,
  note: Note,
): Promise<BuiltSchema> {
  const { plan, spec } = run;
  const prev = prevOf(plan);
  const calls = run.resolved.calls;
  await guardUnchanged(run);
  // Every build names its database and its spec before its calls: a stop, or
  // a read-back that fails, would otherwise leave the next look a database
  // that changed with no record of why. It would take a first build's tables
  // for an app made outside, and a follow-up's own changes for outside ones.
  await BuildLedger.open(run.cwd, intentRecord(run, session));
  let failure: unknown = null;
  try {
    if (!prev && spec.backend.kind === 'blueprint') {
      await applyTemplate(run, spec.backend.slug, note);
    }
    if (prev && !calls.length) note('The database has nothing to change.');
    const fix = !prev && spec.backend.kind === 'custom' ? ENTITIES_FIX : undefined;
    await runSchemaCalls(calls, { cwd: run.cwd, signal: run.signal }, note, fix);
  } catch (err) {
    failure = err;
  }

  // `_meta` lags our own calls by a second or two, and the settle below waits
  // for it, so this read doesn't wait to tell that lag from SQL. After a
  // failed call nothing settles, and the record's expectations come from it.
  const model = await readBack(run, note, failure, { recheckSkew: failure !== null });
  const planned = schemaExpectations(plan, calls, model);
  // After a failed call, only what the database has can come to show in `_meta`.
  const expect = failure ? planned.filter((e) => holds(e, model)) : planned;
  const ledger = await BuildLedger.open(
    run.cwd,
    recordOf(run, model, session.databaseName, expect),
  );
  await markSeen(run.cwd, model);
  if (failure) throw failure;

  // Codegen and the seed start next and read the API, which shows a table or
  // a change only once it has rebuilt its schema. A timeout tells what this
  // build made (all of a first build's schema, else its calls' changes) from
  // what the wait covered beside it (settle-timeout.ts).
  const ownKeys = new Set(expectedSchema(calls).map(expectationKey));
  const tables = await recordActivity(
    { kind: 'fact', label: 'Waited for the API to list the changes' },
    () =>
      settleOwnerMeta(
        session,
        [...tablesPresent(expectedTables(spec)), ...expect],
        (expectation) => !prev || ownKeys.has(expectationKey(expectation)),
        note,
        run.signal,
      ),
    (listed) => ({ detail: `${listed.length} tables listed` }),
  );
  await ledger.update({ steps: { settled: true } });
  // `_meta` shows the schema now, so a second read has its allowed values
  // too: the spec gen reads next, and the look the next plan_app compares with.
  const settled = await readBack(run, note, null).catch(() => model);
  await writeBuiltView(run.cwd, settled, ledger.record);
  return { tables, ledger, model: settled };
}

/** app-spec.json and the look it was rendered from, from the database and the build's record. */
export async function writeBuiltView(
  cwd: string,
  model: LiveModel,
  record: BuildRecord,
): Promise<void> {
  const { spec } = liveSpec({
    model,
    overlay: record.overlay,
    seeded: record.seeded,
    fallbackName: record.overlay.app.name,
  });
  await writeView(cwd, spec, seenState(model));
}

// The plan was measured against the database as plan_app read it before the
// card; a change made while the card was open could make its calls wrong.
async function guardUnchanged(run: RunContext): Promise<void> {
  const { live } = run.plan;
  if (!live?.hash) return;
  const probe = await probeBinding(live.databaseId).catch((): null => null);
  if (probe?.status === 'found' && probe.hash && probe.hash !== live.hash) {
    throw new PhaseError(
      'schema',
      'The database changed while the card was open; nothing was changed.',
      'Call plan_app again: it reads the database first and says what changed.',
    );
  }
}

async function readBack(
  run: RunContext,
  note: Note,
  failure: unknown,
  read: { recheckSkew?: boolean } = {},
): Promise<LiveModel> {
  try {
    // The changes are in: a record needs this read, so it waits out a schema rebuild.
    return await retryTransient(() => readLiveModel(run.cwd, read), {
      note,
      signal: run.signal,
      retries: 3,
      transient: isRebuildAnswer,
    });
  } catch (err) {
    if (failure) throw failure;
    throw new PhaseError(
      'schema',
      `The schema changed, but reading it back failed: ${errorMessage(err)}`,
      'Wait a minute, then call plan_app again.',
    );
  }
}

function holds(expectation: SchemaExpectation, model: LiveModel): boolean {
  const table = tableNamed(model, expectation.table);
  const there =
    expectation.column === undefined
      ? Boolean(table)
      : Boolean(table && columnNamed(table, expectation.column));
  return there === expectation.present;
}

// What every record of this build has: its kind and start, and what the last
// build's record knew (its sample rows, screens and SDK stamp).
function carriedOver(
  run: RunContext,
): Omit<BuildRecord, 'database' | 'overlay' | 'steps' | 'expect'> {
  const last = lastRecordOf(run.plan);
  return {
    version: 3,
    kind: recordKindOf(run.plan),
    startedAt: run.startedAt,
    seeded: last?.seeded ?? {},
    ...(last?.screens && { screens: last.screens }),
    ...(last?.sdk && { sdk: last.sdk }),
  };
}

// The record before the calls: its spec says what the new tables will mean.
function intentRecord(run: RunContext, session: OwnerSession): BuildRecord {
  const { plan } = run;
  const live =
    plan.live ??
    mergeLiveModel({
      schema: { databaseId: session.databaseId, hash: '', tables: [] },
      meta: null,
    });
  return {
    ...carriedOver(run),
    database: { id: session.databaseId, name: session.databaseName, hash: plan.live?.hash ?? '' },
    overlay: overlayOf(run.spec, live, plan.overlay, []),
    steps: { settled: false, codegen: false, seeded: false, gen: false },
    expect: unsettledExpect(lastRecordOf(plan)),
    intent: run.spec,
  };
}

function recordOf(
  run: RunContext,
  model: LiveModel,
  databaseName: string,
  expect: SchemaExpectation[],
): BuildRecord {
  const { plan } = run;
  const before = new Set(plan.live?.tables.map((t) => t.id) ?? []);
  const created = model.tables.filter((t) => !before.has(t.id)).map((t) => t.id);
  return {
    ...carriedOver(run),
    database: { id: model.databaseId, name: databaseName, hash: model.hash },
    overlay: overlayOf(run.spec, model, plan.overlay, created),
    steps: { settled: false, codegen: keepsSdk(plan), seeded: false, gen: false },
    expect,
  };
}

async function applyTemplate(run: RunContext, slug: string, note: Note): Promise<void> {
  const fix = `Check the blueprint slug "${slug}" (list_blueprints), then call plan_app again.`;
  const result = await recordActivity(
    { kind: 'call', label: 'apply_blueprint', args: `${slug} · curated`, params: { slug } },
    () =>
      retryTransientOnce(
        () => applyCuratedBlueprint(slug, { cwd: run.cwd, signal: run.signal, onProgress: note }),
        { note, signal: run.signal },
      ),
  ).catch((err: Error) => {
    throw isNotReady(err.message) ? err : new PhaseError('schema', err.message, fix);
  });
  if (result.status === 'failed') throw new PhaseError('schema', result.error ?? result.text, fix);
  getFastAppHost().events?.dbChanged({ kind: 'schema', cwd: run.cwd });
}
