/**
 * A run executed by a host on the user's own machine.
 *
 * The cloud lane opens its run on the platform's side — the worker creates the
 * row, then hands the Job a callback lane to append through. A local host has no
 * worker in front of it: it authenticates as the user against the tenant API and
 * so opens its own thread and run, which is why `placement` is stated here
 * rather than defaulted, and why nothing in this file passes an identity. The
 * claims of the request's transaction are the run's owner, and RLS on
 * `agent_run`/`agent_event` is the same visibility rule a cloud run obeys.
 *
 * Kept in this package rather than in the desktop app so the host that opens a
 * local run and the reader the web UI draws it with are the same code.
 */

import type { GraphqlRunLogClient, RunSummary } from './client';

export interface OpenLocalRunOptions {
  store: GraphqlRunLogClient;
  /** Title for the thread this run opens; the first prompt makes a good one. */
  title?: string;
  /** An existing thread to append this run to, when the host already has one. */
  threadId?: string;
  repoUrl?: string;
  branch?: string;
}

export interface LocalRun {
  runId: string;
  threadId: string;
}

/**
 * Open a durable local run: a thread if the host does not already have one, then
 * a `pending` run marked `placement: 'local'`.
 */
export async function openLocalRun(
  options: OpenLocalRunOptions
): Promise<LocalRun> {
  const { store } = options;
  const threadId =
    options.threadId ??
    (await store.createThread({ title: options.title, mode: 'agent' })).id;

  const run = await store.createRun({
    threadId,
    placement: 'local',
    status: 'pending',
    ...(options.repoUrl === undefined ? {} : { repoUrl: options.repoUrl }),
    ...(options.branch === undefined ? {} : { branch: options.branch }),
  });

  if (run.placement !== 'local') {
    throw new Error(
      `run ${run.id} was opened as placement '${run.placement}', not 'local'; the tenant refused the placement this host declared`
    );
  }

  return { runId: run.id, threadId };
}

/**
 * Adopt a run this host opened earlier — the resume path, and the check that a
 * cached run id still belongs to the signed-in user. Throws when the run is gone
 * or invisible, so a stale cache cannot silently start a second history.
 */
export async function adoptLocalRun(
  store: GraphqlRunLogClient,
  runId: string
): Promise<RunSummary> {
  const run = await store.getRun(runId);
  if (run.placement !== 'local') {
    throw new Error(
      `run ${runId} has placement '${run.placement}'; a local host must not take over a cloud run`
    );
  }
  return run;
}

/** The host has picked the run up and is about to drive the model. */
export async function markLocalRunRunning(
  store: GraphqlRunLogClient,
  runId: string,
  now: Date = new Date()
): Promise<void> {
  await store.updateRun(runId, {
    status: 'running',
    startedAt: now.toISOString(),
  });
}

/**
 * The turn finished and the host is waiting for the user. `idle` rather than
 * `succeeded` for the same reason a cloud chat run goes idle: the session can be
 * prompted again, and only a closed session is terminal.
 */
export async function markLocalRunIdle(
  store: GraphqlRunLogClient,
  runId: string
): Promise<void> {
  await store.updateRun(runId, { status: 'idle' });
}

/** The turn failed. The message is recorded on the run before it is rethrown. */
export async function markLocalRunFailed(
  store: GraphqlRunLogClient,
  runId: string,
  error: unknown,
  now: Date = new Date()
): Promise<void> {
  await store.updateRun(runId, {
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
    finishedAt: now.toISOString(),
  });
}
