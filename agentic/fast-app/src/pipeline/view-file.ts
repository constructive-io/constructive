// The two files the desktop writes from the live database: the spec the agent
// reads (`.constructive/app-spec.json`, the database rendered with the build
// record's overlay), and `.constructive/view.json`, the last look at the
// database by id. The last look, and the schema the last build left, are kept
// only to say what changed outside the app; the planner never reads them.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LiveModel } from '../app-spec/live-model';
import {
  type OutsideChange,
  type SchemaSnapshot,
  snapshotOf,
} from '../app-spec/schema-drift';
import type { AppSpec } from '../app-spec/types';
import { writeJsonFileAtomic } from './json-file';

/** Project-relative and in git's spelling, like the build record. */
export const SPEC_FILE = '.constructive/app-spec.json';
export const VIEW_FILE = '.constructive/view.json';

export type ViewState = {
  version: 1;
  databaseId: string;
  hash: string;
  writtenAt: string;
  /** The database as the desktop last saw it, by table and field id. */
  basis: SchemaSnapshot;
  /** What changed outside the app since the last build's schema step: `built` against this look. */
  outside: OutsideChange[];
  /**
   * The database `outside` is measured from: as the last build's schema step
   * left it, or as a look found it with nothing changed outside. Absent in a
   * view.json from before it was kept, whose `outside` adds up each look's changes.
   */
  built?: SchemaSnapshot;
  /** No build record described the database, so app-spec.json was rendered from it alone. */
  adopted?: true;
};

/**
 * The state after a look at `model`, carrying the outside changes not yet
 * built on and the database they are measured from. With none, the look is
 * where they start.
 */
export function seenState(
  model: LiveModel,
  outside: OutsideChange[] = [],
  adopted = false,
  built?: SchemaSnapshot,
): ViewState {
  const basis = snapshotOf(model);
  const since = built ?? (outside.length ? undefined : basis);
  return {
    version: 1,
    databaseId: model.databaseId,
    hash: model.hash,
    writtenAt: new Date().toISOString(),
    basis,
    outside,
    ...(since && { built: since }),
    ...(adopted && { adopted: true }),
  };
}

const readText = (cwd: string, file: string) =>
  readFile(path.join(cwd, file), 'utf8').catch((): null => null);

/** The last look, or null when there is none or it isn't one. */
export async function readViewState(cwd: string): Promise<ViewState | null> {
  const text = await readText(cwd, VIEW_FILE);
  if (text === null) return null;
  try {
    const value = JSON.parse(text) as Partial<ViewState> | null;
    const whole =
      value?.version === 1 &&
      typeof value.databaseId === 'string' &&
      typeof value.hash === 'string' &&
      typeof value.basis?.tables === 'object' &&
      Array.isArray(value.outside) &&
      (value.built === undefined || typeof value.built?.tables === 'object');
    return whole ? (value as ViewState) : null;
  } catch {
    return null;
  }
}

/** app-spec.json as it is on disk, or null. */
export const readViewText = (cwd: string) => readText(cwd, SPEC_FILE);

/** The spec's text as writeView writes it, to tell whether app-spec.json already says it. */
export const specText = (spec: AppSpec) => JSON.stringify(spec, null, 2);

/** Writes the rendered spec, then the look it was rendered from; each atomically. */
export async function writeView(cwd: string, spec: AppSpec, state: ViewState): Promise<void> {
  await writeJsonFileAtomic(path.join(cwd, SPEC_FILE), spec);
  await writeJsonFileAtomic(path.join(cwd, VIEW_FILE), state);
}

/**
 * Records a look at the database after the app's own schema change, so that
 * change never reads as one made outside; the outside changes so far are
 * built on now, and the list starts again.
 */
export function markSeen(cwd: string, model: LiveModel): Promise<void> {
  return writeJsonFileAtomic(path.join(cwd, VIEW_FILE), seenState(model));
}
