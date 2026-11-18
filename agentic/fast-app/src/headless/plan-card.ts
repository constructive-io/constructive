import {
  approvalRequestMessage,
  type PiSessionEntry,
  readAll,
  type RunEventRecord,
  type RunLogCursor,
  type RunLogStore,
  START
} from '@agentic-kit/run-log';
import { approvalEntryId } from '@agentic-kit/run-log-gate';

import type { AppPlanPrompt } from '../pipeline/app-plan';
import type { CardAnswer, CardRequest, FastAppAccount, PlanCards } from '../pipeline/host';
import { answerOf, type ApprovalAnswer, leafIdOf } from './run-log';

/** The desktop's words for a card a stop answered (session/confirm-bridge.ts). */
export const STOPPED_REASON = 'the user stopped the run before answering';

const POLL_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;

export const ASKED_ALREADY =
  'the plan card could not be shown: the run already holds an approval request for this tool call (the gate\'s, or an earlier turn\'s with the same call id). Call plan_app again to ask with a new card';

const entryId = (record: RunEventRecord): unknown => (record.entry as { id?: unknown }).id;

const carriesCard = (record: RunEventRecord): boolean => {
  const details = (record.entry as { message?: { details?: { card?: unknown } } }).message?.details;
  return typeof details?.card === 'object' && details.card !== null;
};

export type RunLogCardsOptions = {
  store: RunLogStore;
  runId: string;
  flush: () => Promise<void>;
  timeoutMs: number;
  intervalMs?: number;
  now?: () => Date;
  /** Must end early when `signal` aborts. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  warn?: (message: string) => void;
};

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
  });
}

export function waitText(ms: number): string {
  const minutes = ms / 60_000;
  if (Number.isInteger(minutes)) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const seconds = Math.round(ms / 1000);
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

/**
 * As the desktop's card (plan-approvals.ts): only the offered changes count,
 * and a tick without a change it requires is refused, not guessed.
 */
export function tickedChanges(
  offered: CardRequest['destructive'],
  payload: unknown
): { ticked: string[] } | { refused: string } {
  const ids = (payload as { destructive?: unknown } | null | undefined)?.destructive;
  const sent = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  const requires = new Map(offered.map((item) => [item.id, item.requires ?? []]));
  const ticked = [...new Set(sent)].filter((id) => requires.has(id));
  for (const id of ticked) {
    const missing = (requires.get(id) ?? []).filter((needed) => !ticked.includes(needed));
    if (missing.length) {
      return { refused: `the answer ticked ${id} without ${missing.join(', ')}, which go together` };
    }
  }
  return { ticked };
}

function cardAnswer(request: CardRequest, answer: ApprovalAnswer): CardAnswer {
  if (!answer.approved) return { approved: false, reason: answer.reason };
  const ticks = tickedChanges(request.destructive, answer.payload);
  if ('refused' in ticks) return { approved: false, reason: ticks.refused };
  return {
    approved: true,
    destructive: ticks.ticked,
    credential: { email: request.account.email }
  };
}

export function runLogPlanCards(options: RunLogCardsOptions): PlanCards {
  const { store, runId } = options;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? wait;
  const intervalMs = options.intervalMs ?? POLL_MS;
  const warn = options.warn ?? ((message: string) => console.warn(message));

  const account = async (
    _projectId: string | undefined,
    signedIn: FastAppAccount
  ): Promise<AppPlanPrompt['account']> => ({
    email: signedIn.email,
    savedPassword: false,
    canRemember: false
  });

  const ask = async (request: CardRequest): Promise<CardAnswer> => {
    const { signal, toolCallId } = request;
    const stopped = (): CardAnswer => ({ approved: false, reason: STOPPED_REASON });
    if (signal?.aborted) return stopped();
    const rowId = approvalEntryId(toolCallId);
    // The tool call must reach the log before its card.
    await options.flush();
    const records = await readAll(store, runId);
    // The gate writes the same ids, and the store drops an id it has.
    if (records.some((record) => entryId(record) === rowId)) return { approved: false, reason: ASKED_ALREADY };
    const entry = {
      type: 'message',
      id: rowId,
      parentId: leafIdOf(records),
      timestamp: now().toISOString(),
      message: {
        ...approvalRequestMessage({ toolCallId, prompt: `plan_app: ${request.title}` }),
        details: {
          toolCallId,
          card: { ...request.card, title: request.title, message: request.message }
        }
      }
    } as PiSessionEntry;
    await store.append(runId, [entry]);

    let cursor: RunLogCursor =
      records.length > 0 ? { afterSeq: records[records.length - 1].seq } : START;
    let ownSeq: number | null = null;
    let failedReads = 0;
    const deadline = now().getTime() + options.timeoutMs;
    for (;;) {
      if (signal?.aborted) return stopped();
      let fresh: RunEventRecord[] = [];
      try {
        fresh = await readAll(store, runId, cursor);
        failedReads = 0;
      } catch (err) {
        // Keep waiting: giving up would lose the user's answer.
        failedReads += 1;
        warn(
          `[fast-app] reading the run log for the plan card of ${toolCallId} failed (${failedReads} in a row); polling again: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (fresh.length > 0) cursor = { afterSeq: fresh[fresh.length - 1].seq };
      for (const record of fresh) {
        if (ownSeq === null) {
          if (entryId(record) !== rowId) continue;
          if (!carriesCard(record)) return { approved: false, reason: ASKED_ALREADY };
          ownSeq = record.seq;
          continue;
        }
        const answer = answerOf(record);
        if (answer?.toolCallId === toolCallId) return cardAnswer(request, answer);
      }
      const left = deadline - now().getTime();
      if (left <= 0) {
        return {
          approved: false,
          reason: `nobody answered the plan card within ${waitText(options.timeoutMs)}`
        };
      }
      const delay = failedReads ? Math.min(intervalMs * 2 ** failedReads, MAX_BACKOFF_MS) : intervalMs;
      await sleep(Math.min(delay, left), signal);
    }
  };

  return { account, ask };
}
