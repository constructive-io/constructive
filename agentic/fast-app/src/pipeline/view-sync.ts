// The check plan_app and verify_app start with: can the project's database be
// used, and does app-spec.json still say what it has? The spec is rendered
// from the live database and the build record every time; when the database
// changed outside the app since the desktop last looked, the files are written
// again and the changes are named, so plan_app can ask the agent to start from
// the new spec instead of planning from the old one. A database no build
// record describes is adopted the same way: the first look writes the files
// from the database alone, and the agent starts from them.
//
// Its reads and writes come in as dependencies (db-port.ts wires the real
// ones), so the tests give their own. The caller holds the project lock.

import type { LiveModel } from '../app-spec/live-model';
import { diffSnapshots, type OutsideChange, snapshotOf } from '../app-spec/schema-drift';
import type { AppSpec } from '../app-spec/types';
import type { BuildRead, BuildRecord } from './build-record';
import type { DatabaseState } from './db-check';
import { type BuildStart, type FollowUp, startOn, startUnbound } from './plan-live';
import { seenState, specText, type ViewState } from './view-file';

export type SyncDeps = {
  check(cwd: string, projectId?: string): Promise<DatabaseState>;
  readModel(cwd: string): Promise<LiveModel>;
  readRecord(cwd: string): Promise<BuildRead>;
  readState(cwd: string): Promise<ViewState | null>;
  readViewText(cwd: string): Promise<string | null>;
  writeView(cwd: string, spec: AppSpec, state: ViewState): Promise<void>;
};

/**
 * What the check found, with where the next build starts (plan-live.ts):
 * plan_app plans from that start and never reads the record again.
 */
export type ViewSync =
  /** No database yet: a first build, unless a record that can't be read refuses it. */
  | { kind: 'unbound'; start: Exclude<BuildStart, FollowUp> }
  /** Gone, suspended, or the backend didn't say. */
  | { kind: 'unavailable'; database: Exclude<DatabaseState, { kind: 'unbound' | 'found' }> }
  /** A database with no app tables yet: the next build is a first build. */
  | { kind: 'empty'; model: LiveModel; start: { kind: 'first' } }
  /** No build record describes the database's tables, and app-spec.json was just written from them. */
  | { kind: 'adopted'; model: LiveModel; start: FollowUp; state: ViewState }
  | ({ kind: 'current' } & AppLook)
  /** The database changed outside the app since the last look, and app-spec.json was written again. */
  | ({ kind: 'refreshed' } & AppLook);

/** A built app's database as the check found it. */
type AppLook = {
  model: LiveModel;
  /** The app the database holds; its record is null for an app adopted from its database. */
  start: FollowUp;
  state: ViewState;
  /** What changed since the last look. */
  changes: OutsideChange[];
};

/** The checks plan_app plans a build from; the others end it before the card. */
export type PlanBasis = Extract<ViewSync, { kind: 'unbound' | 'empty' | 'current' }>;

/**
 * Whether the database changed outside the app since the last look: a change
 * the spec or the card can name. A moved hash alone (an index, a policy's
 * wording) changes nothing the agent works from. With no look at this
 * database, only the build's own hash can tell.
 */
export function staleness(
  state: ViewState | null,
  record: BuildRecord | null,
  model: LiveModel,
): { stale: boolean; changes: OutsideChange[] } {
  if (state?.databaseId === model.databaseId) {
    const changes = diffSnapshots(state.basis, snapshotOf(model));
    return { stale: changes.length > 0, changes };
  }
  return { stale: record !== null && record.database.hash !== model.hash, changes: [] };
}

/**
 * What changed outside since the last build: the database now against the one
 * it left, so a change undone since is none and two renames are one. A
 * view.json from before that was kept adds this look's changes to its list.
 */
function outsideSince(
  kept: ViewState | null,
  model: LiveModel,
  changes: OutsideChange[],
): OutsideChange[] {
  if (kept?.built) return diffSnapshots(kept.built, snapshotOf(model));
  return [...(kept?.outside ?? []), ...changes];
}

export async function syncView(
  cwd: string,
  opts: { projectId?: string; fallbackName: string },
  deps: SyncDeps,
): Promise<ViewSync> {
  const database = await deps.check(cwd, opts.projectId);
  if (database.kind === 'unbound') {
    return { kind: 'unbound', start: startUnbound(await deps.readRecord(cwd)) };
  }
  if (database.kind !== 'found') return { kind: 'unavailable', database };
  let model: LiveModel;
  try {
    model = await deps.readModel(cwd);
  } catch (err) {
    const detail = `reading the schema failed: ${err instanceof Error ? err.message : String(err)}`;
    return { kind: 'unavailable', database: { kind: 'unreachable', cause: 'error', detail } };
  }
  const start = startOn(await deps.readRecord(cwd), model, { fallbackName: opts.fallbackName });
  if (start.kind === 'first') return { kind: 'empty', model, start };

  const { record, view, adopted } = start;
  const last = await deps.readState(cwd);
  const kept = last?.databaseId === model.databaseId ? last : null;
  // A build stopped before it read this database back: app-spec.json is still
  // the spec it makes, which a render without its ids and rows would lose.
  if (record?.intent) {
    return { kind: 'current', model, start, state: kept ?? seenState(model), changes: [] };
  }
  // The agent's spec came from a file the desktop didn't render from the
  // database alone (or from none): it starts again from the one written now.
  if (adopted && !kept?.adopted) {
    const state = seenState(model, [], true);
    await deps.writeView(cwd, view.spec, state);
    return { kind: 'adopted', model, start, state };
  }
  const { stale, changes } = staleness(last, record, model);
  const state =
    kept && !stale && kept.hash === model.hash
      ? kept
      : seenState(model, outsideSince(kept, model, changes), adopted, kept?.built);
  // Also when only the file is behind: after a build that stopped past its
  // schema step, or an edit by hand.
  if (state !== kept || (await deps.readViewText(cwd)) !== specText(view.spec)) {
    await deps.writeView(cwd, view.spec, state);
  }
  const look: AppLook = { model, start, state, changes };
  return stale ? { kind: 'refreshed', ...look } : { kind: 'current', ...look };
}
