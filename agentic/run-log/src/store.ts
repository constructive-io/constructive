/**
 * The storage contract. A run log is append-only and read by cursor, so the
 * interfaces are deliberately two: a writer (the agent host) and a reader
 * (every UI surface, the resume path, the usage rollup). Concrete stores live
 * with their storage — Postgres in constructive-db, JSONL in `./file-store`,
 * memory here for tests and for a run that has not been persisted yet.
 */

import type { PiSessionEntry } from './pi-entry';
import {
  assertOrdered,
  idempotencyKey,
  type RunEventRecord,
  SUPPORTED_PI_SESSION_VERSION,
  wrapEntry
} from './record';

/** Read position: `afterSeq` is exclusive, so `0` means "from the start". */
export interface RunLogCursor {
  afterSeq: number;
}

export const START: RunLogCursor = { afterSeq: 0 };

export const cursorAfter = (records: readonly RunEventRecord[], from: RunLogCursor = START): RunLogCursor =>
  records.length === 0 ? from : { afterSeq: records[records.length - 1].seq };

export interface RunLogPage {
  records: RunEventRecord[];
  cursor: RunLogCursor;
}

export interface AppendOptions {
  /** pi session format version the entries were produced under. */
  piSessionVersion?: number;
  recordedAt?: string;
}

export interface RunLogAppendStore {
  /**
   * Append entries to a run, returning the records actually written. Entries
   * already present (matched by pi entry id) are skipped, which makes an append
   * safe to retry.
   */
  append(runId: string, entries: readonly PiSessionEntry[], options?: AppendOptions): Promise<RunEventRecord[]>;
}

export interface RunLogReadStore {
  read(runId: string, cursor?: RunLogCursor, limit?: number): Promise<RunLogPage>;
}

export type RunLogStore = RunLogAppendStore & RunLogReadStore;

/** In-memory store: the reference implementation and the test double. */
export class MemoryRunLogStore implements RunLogStore {
  private readonly runs = new Map<string, RunEventRecord[]>();
  private readonly seen = new Map<string, Set<string>>();

  async append(
    runId: string,
    entries: readonly PiSessionEntry[],
    options: AppendOptions = {}
  ): Promise<RunEventRecord[]> {
    const records = this.runs.get(runId) ?? [];
    const seen = this.seen.get(runId) ?? new Set<string>();
    const written: RunEventRecord[] = [];

    for (const entry of entries) {
      const key = idempotencyKey(runId, entry);
      if (seen.has(key)) continue;
      const record = wrapEntry({
        runId,
        seq: records.length + written.length + 1,
        entry,
        ...(options.recordedAt ? { recordedAt: options.recordedAt } : {}),
        piSessionVersion: options.piSessionVersion ?? SUPPORTED_PI_SESSION_VERSION
      });
      written.push(record);
      seen.add(key);
    }

    this.runs.set(runId, records.concat(written));
    this.seen.set(runId, seen);
    return written;
  }

  async read(runId: string, cursor: RunLogCursor = START, limit?: number): Promise<RunLogPage> {
    const all = this.runs.get(runId) ?? [];
    const after = all.filter((record) => record.seq > cursor.afterSeq);
    const records = typeof limit === 'number' ? after.slice(0, limit) : after;
    assertOrdered(records);
    return { records, cursor: cursorAfter(records, cursor) };
  }

  /** Test/debug helper: every record of a run, ignoring cursors. */
  snapshot(runId: string): RunEventRecord[] {
    return (this.runs.get(runId) ?? []).slice();
  }

  runIds(): string[] {
    return Array.from(this.runs.keys());
  }
}
