// Where a build starts from: the live database, rendered with what the build
// record remembers about it (live-spec.ts). The record counts only for the
// database it was written on, so a worktree with a database of its own, or a
// project bound to another database, never plans from a copied record. A
// database with no app tables is a first build, whatever the record says. One
// whose tables no readable record of it describes (an app built before build
// records, by hand, or with a record that is torn or of another database) is
// adopted: rendered from the database alone, and built on as a follow-up.
//
// Pure.

import type { LiveModel } from '../app-spec/live-model';
import { detectBlueprint, liveSpec, type RenderedView } from '../app-spec/live-spec';
import { type IntentOverlay, overlayOf } from '../app-spec/overlay';
import type { CuratedBlueprint } from '../blueprints/curated';
import type { BuildRead, BuildRecord } from './build-record';
import { unreadableRecordText } from './result-text';

/** The app the database holds, as it is now. */
export type FollowUp = {
  kind: 'follow-up';
  /** The last build's record of this database; null when the app is adopted. */
  record: BuildRecord | null;
  /** What the record remembers, or what an older record's spec still says; null when nothing does. */
  overlay: IntentOverlay | null;
  view: RenderedView;
  /** No build record describes the database: the view comes from it alone. */
  adopted: boolean;
};

export type BuildStart = { kind: 'first' } | FollowUp | { kind: 'refused'; text: string };

export type StartOptions = {
  /** The app's name when the record has none to give. */
  fallbackName: string;
  blueprints?: Readonly<Record<string, CuratedBlueprint>>;
};

// A version 2 record kept the spec it built, and a build that stopped before
// it read the database back keeps the one it makes: their labels, kinds and
// screens carry over to the database's tables by name.
function overlayFor(read: BuildRead, record: BuildRecord | null, live: LiveModel) {
  if (record?.intent) return overlayOf(record.intent, live, record.overlay, []);
  if (read.kind === 'legacy' && read.spec) return overlayOf(read.spec, live, null, []);
  return record?.overlay ?? null;
}

/** The starting point on a database the check just read (view-sync.ts); plan_app plans from it. */
export function startOn(
  read: BuildRead,
  live: LiveModel,
  opts: StartOptions,
): Exclude<BuildStart, { kind: 'refused' }> {
  if (!live.tables.length && !detectBlueprint(live, opts.blueprints)) return { kind: 'first' };
  const record =
    read.kind === 'ok' && read.record.database.id === live.databaseId ? read.record : null;
  const overlay = overlayFor(read, record, live);
  const view = liveSpec({
    model: live,
    overlay,
    seeded: record?.seeded ?? {},
    fallbackName: opts.fallbackName,
    ...(opts.blueprints && { blueprints: opts.blueprints }),
  });
  return { kind: 'follow-up', record, overlay, view, adopted: !record };
}

/** The starting point of a project with no database yet. */
export function startUnbound(read: BuildRead): Exclude<BuildStart, FollowUp> {
  // With no database to read, a record that can't be read can't say whether
  // the project had one: a first build could make the app a second time.
  if (read.kind === 'unreadable')
    return { kind: 'refused', text: unreadableRecordText(read.reason) };
  return { kind: 'first' };
}

/** Whether the database moved since codegen stamped the record: its hash, or the names `_meta` shows. */
export function sdkMoved(record: BuildRecord | null, live: LiveModel | null): boolean {
  const sdk = record?.sdk;
  return Boolean(sdk && live && (sdk.hash !== live.hash || sdk.meta !== live.metaDigest));
}

/**
 * Whether the SDK on disk was made from the database as it is now: codegen
 * stamped the record on it, nothing moved since, and the app's env, which
 * codegen writes and git ignores, names the project's database. A worktree
 * that shares its parent's database has the record but not that env.
 */
export const sdkCurrent = (
  record: BuildRecord | null,
  live: LiveModel | null,
  appEnvBound: boolean,
): boolean => Boolean(record?.sdk && live && appEnvBound && !sdkMoved(record, live));
