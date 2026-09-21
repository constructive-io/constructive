/**
 * The run view: everything a surface draws, derived from the log and nothing
 * else.
 *
 * Kept as a pure reducer over records so the rendering layer holds no
 * transcript logic of its own — the same reduction runs in a React panel, a
 * test, or a CLI tail. Records are merged by `seq` rather than appended, which
 * is what makes a reconnect safe: catching up re-reads a window that may overlap
 * what is already held, and an overlapping read must be idempotent rather than
 * duplicating turns.
 */

import {
  type Conversation,
  projectParts,
  projectToolState,
  projectUsage,
  type RunEventRecord,
  type RunLogCursor,
  type RunUsage,
  START,
  type ToolStateProjection,
  type TranscriptReaderRegistry,
} from '@agentic-kit/run-log';

import { isTerminalStatus, type RunSummary } from './client';

export type RunViewPhase = 'loading' | 'live' | 'terminal' | 'error';

export interface RunView {
  run?: RunSummary;
  /** Records held, by ascending `seq`, without duplicates. */
  records: RunEventRecord[];
  cursor: RunLogCursor;
  conversation: Conversation;
  tools: ToolStateProjection;
  usage: RunUsage;
  phase: RunViewPhase;
  /** Set when a read or a subscription failed; never hidden behind an empty view. */
  error?: string;
}

/**
 * Which transcript formats this view can read. Absent means the default
 * registry, so a surface that only ever sees one format configures nothing;
 * a host wired to a second harness passes its registry and the same reducers
 * project its records.
 */
export interface RunViewProjection {
  readers?: TranscriptReaderRegistry;
}

const project = (
  records: RunEventRecord[],
  run: RunSummary | undefined,
  phase: RunViewPhase,
  error?: string,
  projection: RunViewProjection = {}
): RunView => ({
  run,
  records,
  cursor:
    records.length > 0
      ? { afterSeq: records[records.length - 1].seq }
      : START,
  conversation: projectParts(records, projection),
  tools: projectToolState(records, projection),
  usage: projectUsage(records, projection),
  phase,
  error,
});

export const emptyRunView = (): RunView => project([], undefined, 'loading');

/**
 * Merge by `seq`: a later read of the same position replaces the earlier copy
 * (the row is immutable, so they are the same record), and order is by position
 * rather than arrival.
 */
export function mergeRecords(
  existing: readonly RunEventRecord[],
  incoming: readonly RunEventRecord[]
): RunEventRecord[] {
  if (incoming.length === 0) return [...existing];
  const bySeq = new Map<number, RunEventRecord>();
  for (const record of existing) bySeq.set(record.seq, record);
  for (const record of incoming) bySeq.set(record.seq, record);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

const phaseFor = (run: RunSummary | undefined): RunViewPhase =>
  run && isTerminalStatus(run.status) ? 'terminal' : 'live';

export function applyRecords(
  view: RunView,
  incoming: readonly RunEventRecord[],
  projection?: RunViewProjection
): RunView {
  const records = mergeRecords(view.records, incoming);
  return project(records, view.run, phaseFor(view.run), view.error, projection);
}

export function applyRun(
  view: RunView,
  run: RunSummary,
  projection?: RunViewProjection
): RunView {
  return project(view.records, run, phaseFor(run), view.error, projection);
}

/**
 * A failed read is a visible error, not an empty transcript: a surface that
 * cannot reach the log must say so, because "no events yet" and "I could not
 * read your events" look identical to a user otherwise.
 */
export function applyError(
  view: RunView,
  error: unknown,
  projection?: RunViewProjection
): RunView {
  return project(
    view.records,
    view.run,
    'error',
    error instanceof Error ? error.message : String(error),
    projection
  );
}

/** True while the run may still append — the only reason to keep following. */
export const isFollowable = (view: RunView): boolean =>
  view.phase === 'live' || view.phase === 'loading';
