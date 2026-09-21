/**
 * The follower a run surface subscribes to: one view per change, until the run
 * is terminal or the caller aborts.
 *
 * This is a loop of its own rather than `@agentic-kit/run-log`'s `follow`
 * because a surface follows two things, not one: the log *and* the run row.
 * Status, the attached execution and the head commit live on the row, and a run
 * that goes idle or finishes emits no event announcing it — so a follower that
 * only tailed events would show a finished run as still running.
 *
 * Catch-up needs no special path. Every read is `seq > cursor`, so a client that
 * was asleep for an hour resumes with the same call it makes when live, and the
 * view merges by `seq` so an overlapping read cannot duplicate a turn.
 */

import type { RunEventRecord, RunLogCursor } from '@agentic-kit/run-log';
import { START } from '@agentic-kit/run-log';

import type { GraphqlRunLogClient } from './client';
import {
  applyError,
  applyRecords,
  applyRun,
  emptyRunView,
  isFollowable,
  type RunView,
} from './view';

export interface FollowRunOptions {
  cursor?: RunLogCursor;
  /** Delay between reads when no wakeup arrives. */
  pollIntervalMs?: number;
  /** Records per read; a backlog is drained in pages, not in one query. */
  limit?: number;
  /** From `createRealtimeWakeup`, when the app has DataRealtime on the table. */
  waitForChange?: (signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /**
   * Reads after a terminal status, so the tail written as a run finishes is not
   * lost to a race between the last append and the status update.
   */
  drainReads?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_LIMIT = 200;
const DEFAULT_DRAIN_READS = 1;

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
 * Yield a view whenever the run changes. The first yield is the run's whole
 * history, so a caller renders once rather than animating a backlog.
 */
export async function* followRun(
  client: GraphqlRunLogClient,
  runId: string,
  options: FollowRunOptions = {}
): AsyncGenerator<RunView, void, void> {
  const sleep = options.sleep ?? defaultSleep;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const drainReads = options.drainReads ?? DEFAULT_DRAIN_READS;
  // The formats this client can read are the formats the view can project: a
  // surface following a run written by a second harness renders it with no
  // configuration of its own.
  const projection = { readers: client.readers };

  let view = emptyRunView();
  let cursor = options.cursor ?? START;
  let drainsLeft = drainReads;

  while (!options.signal?.aborted) {
    let batch: RunEventRecord[] = [];
    try {
      view = applyRun(view, await client.getRun(runId), projection);
      // Drain the backlog before yielding: a run with a thousand events should
      // render once, not a thousand times.
      for (;;) {
        const page = await client.read(runId, cursor, limit);
        if (page.records.length === 0) break;
        cursor = page.cursor;
        batch = batch.concat(page.records);
        if (page.records.length < limit) break;
      }
    } catch (error) {
      // Yielded, not thrown: a surface that loses the API for a moment should
      // show that it did, and the caller decides whether to abort.
      yield applyError(view, error, projection);
      if (options.signal?.aborted) return;
      await sleep(pollIntervalMs, options.signal);
      continue;
    }

    // A successful pass clears a previous failure: the surface is reading again.
    view = applyRecords({ ...view, error: undefined }, batch, projection);
    yield view;

    if (!isFollowable(view)) {
      if (drainsLeft <= 0) return;
      drainsLeft -= 1;
    } else {
      drainsLeft = drainReads;
    }

    if (options.signal?.aborted) return;
    if (options.waitForChange) {
      await Promise.race([
        options.waitForChange(options.signal),
        sleep(pollIntervalMs, options.signal),
      ]);
    } else {
      await sleep(pollIntervalMs, options.signal);
    }
  }
}
