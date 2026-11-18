// What plan_app's builds did in a project, in one record at
// `.constructive/build.json`: the database the build ran on, what the app
// means by that database's tables (the overlay, by metaschema id), the sample
// rows that landed with their ids, the steps of the last build that finished,
// and the screens gen made. The next plan_app renders the spec from the live
// database and this record, and verify_app reads it after a restart as it
// does in-session. Each step writes the whole record atomically; a read
// checks its shape.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { type Static, Type } from 'typebox';
import { Value } from 'typebox/value';

import type { LiveModel } from '../app-spec/live-model';
import type { IntentOverlay } from '../app-spec/overlay';
import { decodeLanded } from '../app-spec/seed-ids';
import type { AppSpec } from '../app-spec/types';
import { normalizeKey } from '../extensions/db-tools/live-meta-index';
import type { GenResource } from './gen';
import { writeJsonFileAtomic } from './json-file';

/** Project-relative and in git's spelling, for the file and for `git status`. */
export const BUILD_RECORD = '.constructive/build.json';

const VERSION = 3;

// What a renderer reads first, so a hand-edited or torn record can't pass as one.
const OverlayShape = Type.Unsafe<IntentOverlay>(
  Type.Object({
    app: Type.Object({
      name: Type.String(),
      backend: Type.Union([
        Type.Object({ kind: Type.Literal('custom') }),
        Type.Object({ kind: Type.Literal('blueprint'), slug: Type.String() }),
      ]),
    }),
    owned: Type.Array(Type.String()),
    tables: Type.Record(
      Type.String(),
      Type.Object({ fields: Type.Record(Type.String(), Type.Object({})) }),
    ),
  }),
);

// An older record's spec, checked as loosely as its version checked it.
const SpecShape = Type.Object({
  version: Type.Literal(1),
  name: Type.String(),
  backend: Type.Union([
    Type.Object({ kind: Type.Literal('custom'), entities: Type.Array(Type.Object({})) }),
    Type.Object({ kind: Type.Literal('blueprint'), slug: Type.String() }),
  ]),
});

const RECORD_SCHEMA = Type.Object({
  version: Type.Literal(VERSION),
  /** A first build, or a follow-up on a built app. */
  kind: Type.Union([Type.Literal('build'), Type.Literal('update')]),
  /** When the build started (ISO); a build commit after it means it was committed. */
  startedAt: Type.String(),
  /** The database the build ran on, with its hash after the build's schema step. */
  database: Type.Object({ id: Type.String(), name: Type.String(), hash: Type.String() }),
  /** What the spec says that the database can't: labels, UI hints, kinds, by table and field id. */
  overlay: OverlayShape,
  /**
   * By table id: the spec's rows the database has, in order from the first,
   * their columns by field id and their references as "@#<table id>[i]", and
   * their ids (null where a row stands for one the database kept).
   */
  seeded: Type.Record(
    Type.String(),
    Type.Object({
      rows: Type.Array(Type.Record(Type.String(), Type.Unknown())),
      ids: Type.Array(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  /** The steps of this build that finished. */
  steps: Type.Object({
    settled: Type.Boolean(),
    codegen: Type.Boolean(),
    seeded: Type.Boolean(),
    gen: Type.Boolean(),
  }),
  /** What `_meta` must show for this schema; a build after a wait that timed out waits for it too. */
  expect: Type.Array(
    Type.Object({
      table: Type.String(),
      column: Type.Optional(Type.String()),
      present: Type.Boolean(),
    }),
  ),
  /** What gen made from it: the resources, and the junctions edited through their parents. */
  screens: Type.Optional(
    Type.Object({
      resources: Type.Array(
        Type.Unsafe<GenResource>(
          Type.Object({ name: Type.String(), route: Type.String(), table: Type.String() }),
        ),
      ),
      junctions: Type.Array(Type.String()),
    }),
  ),
  /** The database the SDK was generated from: its hash and a digest of `_meta`'s names. */
  sdk: Type.Optional(
    Type.Object({ hash: Type.String(), meta: Type.Union([Type.String(), Type.Null()]) }),
  ),
  /**
   * Until the schema step reads the database back: the spec this build makes
   * there, on a database no record described before (a first build, a
   * rebuild). Its tables have no ids yet, so its labels, kinds and screens
   * carry over by name, as a version 2 record's spec did, and a look leaves
   * app-spec.json as the build had it.
   */
  intent: Type.Optional(Type.Unsafe<AppSpec>(SpecShape)),
});

export type BuildRecord = Static<typeof RECORD_SCHEMA>;

export type BuildRead =
  | { kind: 'none' }
  | { kind: 'ok'; record: BuildRecord }
  /** A record an older desktop wrote; a version 2 one keeps the spec it built. */
  | { kind: 'legacy'; version: 1 | 2; spec?: AppSpec }
  /** Torn, edited, or from a newer version: not "no earlier build". */
  | { kind: 'unreadable'; reason: string };

export async function readBuildRecord(cwd: string): Promise<BuildRead> {
  let text: string;
  try {
    text = await readFile(path.join(cwd, BUILD_RECORD), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'none' };
    return { kind: 'unreadable', reason: (err as Error).message };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: 'unreadable', reason: 'it is not valid JSON' };
  }
  const version = (value as { version?: unknown } | null)?.version;
  if (version === 1) return { kind: 'legacy', version };
  if (version === 2) {
    const spec = (value as { spec?: unknown }).spec;
    return {
      kind: 'legacy',
      version,
      ...(Value.Check(SpecShape, spec) && { spec: spec as AppSpec }),
    };
  }
  if (version !== VERSION) {
    return {
      kind: 'unreadable',
      reason: `it has version ${JSON.stringify(version)}, and this desktop reads version ${VERSION}`,
    };
  }
  if (!Value.Check(RECORD_SCHEMA, value)) {
    const [first] = Value.Errors(RECORD_SCHEMA, value);
    const where = first ? ` (${first.instancePath || '/'} ${first.message})` : '';
    return { kind: 'unreadable', reason: `it is not a whole build record${where}` };
  }
  return { kind: 'ok', record: value };
}

/** What the record's schema step still expects of the database, when it didn't settle. */
export const unsettledExpect = (record: BuildRecord | null): BuildRecord['expect'] =>
  record && !record.steps.settled ? record.expect : [];

type RecordPatch = Partial<Pick<BuildRecord, 'seeded' | 'screens' | 'sdk'>> & {
  steps?: Partial<BuildRecord['steps']>;
};

/**
 * One build's record: opened by the schema step, then patched as each later
 * step lands. Every write is the whole record, atomic and in call order, so
 * the steps that run side by side never lose each other's patch.
 */
export class BuildLedger {
  private current: BuildRecord;
  private readonly file: string;

  private constructor(file: string, record: BuildRecord) {
    this.file = file;
    this.current = record;
  }

  /** Writes the build's first record over the last build's. */
  static async open(cwd: string, record: BuildRecord): Promise<BuildLedger> {
    const ledger = new BuildLedger(path.join(cwd, BUILD_RECORD), record);
    await ledger.write();
    return ledger;
  }

  get record(): BuildRecord {
    return this.current;
  }

  /** Merges the patch (the steps one by one) and writes the record; the patch is copied. */
  update(patch: RecordPatch): Promise<void> {
    const { steps, ...rest } = structuredClone(patch);
    this.current = { ...this.current, ...rest, steps: { ...this.current.steps, ...steps } };
    return this.write();
  }

  private write(): Promise<void> {
    return writeJsonFileAtomic(this.file, this.current);
  }
}

/** The landed ids per normalized table key as the database names the tables now, for "@table[i]" references and detail routes. */
export function idsOf(
  seeded: BuildRecord['seeded'],
  model: LiveModel,
): Record<string, Array<string | null>> {
  return Object.fromEntries(
    Object.entries(decodeLanded(seeded, model).ids).map(([table, ids]) => [
      normalizeKey(table),
      ids,
    ]),
  );
}
