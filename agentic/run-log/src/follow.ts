/**
 * Following a run log.
 *
 * Every surface — a desktop chat pane, a web execution view, a CLI tail, the
 * resume path — is the same reader: hold a cursor, ask for what came after it.
 * That is what makes local and cloud runs indistinguishable to a UI, so this is
 * the only reader loop in the system.
 *
 * A push wakeup (LISTEN/NOTIFY, IPC, websocket) is an optimisation, not a
 * requirement: `waitForChange` short-circuits the delay when it resolves, and
 * without one the loop degrades to polling at `pollIntervalMs`.
 */

import type { RunEventRecord } from './record';
import { cursorAfter, type RunLogCursor, type RunLogReadStore, START } from './store';

export interface FollowOptions {
  cursor?: RunLogCursor;
  /** Polling delay when no wakeup arrives. */
  pollIntervalMs?: number;
  /** Records per read. */
  limit?: number;
  /** Resolves when the run may have new records; races the poll delay. */
  waitForChange?: (signal?: AbortSignal) => Promise<void>;
  /** Stop following once this returns true for the batch just yielded. */
  isTerminal?: (records: readonly RunEventRecord[]) => boolean;
  signal?: AbortSignal;
  /** Injectable for tests; defaults to `setTimeout`. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const defaultSleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

/**
 * Yield every batch of new records until the run reaches a terminal state or
 * the caller aborts. Batches are yielded as read, so a caller can project
 * incrementally rather than re-projecting the whole run per frame.
 */
export async function* follow(
  store: RunLogReadStore,
  runId: string,
  options: FollowOptions = {}
): AsyncGenerator<RunEventRecord[], void, void> {
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  let cursor = options.cursor ?? START;

  while (!options.signal?.aborted) {
    const page = await store.read(runId, cursor, options.limit);
    if (page.records.length > 0) {
      cursor = cursorAfter(page.records, cursor);
      yield page.records;
      if (options.isTerminal?.(page.records)) return;
      // Drain before waiting: a burst of tool output should not be paced by the
      // poll interval.
      continue;
    }

    if (options.waitForChange) {
      await Promise.race([
        options.waitForChange(options.signal),
        sleep(pollIntervalMs, options.signal)
      ]);
    } else {
      await sleep(pollIntervalMs, options.signal);
    }
  }
}

/** Read a run to its current end in one pass. */
export async function readAll(
  store: RunLogReadStore,
  runId: string,
  cursor: RunLogCursor = START,
  pageLimit = 500
): Promise<RunEventRecord[]> {
  const records: RunEventRecord[] = [];
  let position = cursor;
  for (;;) {
    const page = await store.read(runId, position, pageLimit);
    if (page.records.length === 0) return records;
    records.push(...page.records);
    position = cursorAfter(page.records, position);
    if (page.records.length < pageLimit) return records;
  }
}
