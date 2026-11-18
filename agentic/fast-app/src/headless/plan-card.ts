// The cloud plan card and rebuild card (FastAppHost.card, brief 4.4): the ask
// is a request row in the run log that carries the card, and the answer is
// the resolution row a client writes back. There is no password: the owner's
// session comes from the owner key. The card waits until the answer comes,
// the call is stopped, or the wait times out.

import {
  approvalRequestMessage,
  type PiSessionEntry,
  readAll,
  type RunLogCursor,
  type RunLogStore,
  START
} from '@agentic-kit/run-log';
import { approvalEntryId } from '@agentic-kit/run-log-gate';

import type { AppPlanPrompt } from '../pipeline/app-plan';
import type { CardAnswer, CardRequest, FastAppAccount, PlanCards } from '../pipeline/host';
import { type ApprovalAnswer, firstAnswer, leafIdOf } from './run-log';

/** The desktop's words for a card a stop answered (session/confirm-bridge.ts). */
export const STOPPED_REASON = 'the user stopped the run before answering';

const POLL_MS = 2_000;

export type RunLogCardsOptions = {
  store: RunLogStore;
  runId: string;
  /** Sends the session's entries so far to the log, so the call is there before its card. */
  flush: () => Promise<void>;
  timeoutMs: number;
  intervalMs?: number;
  now?: () => Date;
  /** Waits `ms`, or less when `signal` aborts. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
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

/** "30 minutes", "90 seconds": the wait in the decline reason. */
export function waitText(ms: number): string {
  const minutes = ms / 60_000;
  if (Number.isInteger(minutes)) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const seconds = Math.round(ms / 1000);
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

/**
 * The changes the answer ticked, as the desktop's card takes them
 * (plan-approvals.ts): only the ones the card offered count, and each needs
 * the ones it requires. A missing `payload` ticks none. A tick without its
 * requirement is refused: the reason says what to tick together.
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

/** The plan card over the run log. */
export function runLogPlanCards(options: RunLogCardsOptions): PlanCards {
  const { store, runId } = options;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? wait;
  const intervalMs = options.intervalMs ?? POLL_MS;

  // The account row: no password field, so none is kept and none can be.
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
    // The call and the card's approval stage reach the log before the row.
    await options.flush();
    const records = await readAll(store, runId);
    // A retried call asks with the same row; an answer it already has stands.
    const earlier = firstAnswer(records, toolCallId);
    if (earlier) return cardAnswer(request, earlier);
    const entry = {
      type: 'message',
      id: approvalEntryId(toolCallId),
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
    // The store drops an entry id it has, so a retry never asks twice.
    await store.append(runId, [entry]);

    let cursor: RunLogCursor =
      records.length > 0 ? { afterSeq: records[records.length - 1].seq } : START;
    const deadline = now().getTime() + options.timeoutMs;
    for (;;) {
      if (signal?.aborted) return stopped();
      const fresh = await readAll(store, runId, cursor);
      if (fresh.length > 0) cursor = { afterSeq: fresh[fresh.length - 1].seq };
      const answer = firstAnswer(fresh, toolCallId);
      if (answer) return cardAnswer(request, answer);
      const left = deadline - now().getTime();
      if (left <= 0) {
        return {
          approved: false,
          reason: `nobody answered the plan card within ${waitText(options.timeoutMs)}`
        };
      }
      await sleep(Math.min(intervalMs, left), signal);
    }
  };

  return { account, ask };
}
