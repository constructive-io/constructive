// Gate decisions into the run log.
//
// An `ask` verdict is already durable — the request and its answer are records
// (see `approvals.ts`). A *policy* verdict is not: a rule that denies `bash`
// blocks the call, tells the model why, and leaves no trace, so "which tool
// calls did the gate block, and on whose authority" is unanswerable after the
// run. The gate already offers every settled decision through `onDecision`; this
// binds that callback to the log, which makes the transcript the audit trail for
// refusals as well as for approvals.
//
// The callback is synchronous and an append is not, so writes are queued onto one
// chain: ordering is preserved, the agent loop is never blocked on a log write,
// and the first failure is re-thrown from `flush()` rather than vanishing into an
// unhandled rejection.

import type { RunGateDecisionRecord } from '@agentic-kit/harness';
import type { PiSessionEntry, RunLogStore } from '@agentic-kit/run-log';
import { gateDecisionMessage } from '@agentic-kit/run-log';

import { leafId } from './approvals';

export interface RunLogGateDecisionsOptions {
  store: RunLogStore;
  runId: string;
  /** Records per read while looking up the parent entry. */
  pageLimit?: number;
}

export interface RunLogGateDecisions {
  /** Hand this to the gate as its `onDecision`. */
  onDecision: (record: RunGateDecisionRecord) => void;
  /**
   * Wait for the queued writes and throw the first failure. A host calls this
   * before it settles the run: a decision that never reached the log is a hole
   * in the audit trail, not a detail.
   */
  flush(): Promise<void>;
}

/**
 * The entry id a decision is written under.
 *
 * Deterministic on the tool call, so a retried execution that re-evaluates the
 * same call writes the same entry and the store's idempotency drops the
 * duplicate instead of logging the decision twice.
 */
export const gateDecisionEntryId = (toolCallId: string): string => `gate-${toolCallId}`;

export function runLogGateDecisions(options: RunLogGateDecisionsOptions): RunLogGateDecisions {
  const { store, runId } = options;
  let queue: Promise<void> = Promise.resolve();
  let failure: unknown;

  const append = async (record: RunGateDecisionRecord): Promise<void> => {
    const parentId = await leafId(store, runId, options.pageLimit);
    const entry = {
      type: 'message',
      id: gateDecisionEntryId(record.toolCallId),
      parentId,
      timestamp: record.decidedAt,
      message: gateDecisionMessage({
        toolCallId: record.toolCallId,
        toolName: record.toolName,
        verdict: record.verdict.decision,
        decision: record.decision,
        ...(record.reason === undefined ? {} : { reason: record.reason }),
        ...(record.actorId === undefined ? {} : { actorId: record.actorId }),
        decidedAt: record.decidedAt
      })
    } as PiSessionEntry;
    await store.append(runId, [entry]);
  };

  return {
    onDecision: (record) => {
      queue = queue.then(async () => {
        try {
          await append(record);
        } catch (error) {
          // Keep the first failure: it is the one with the cause, and a later
          // write failing for the same reason would only bury it.
          failure ??= error;
        }
      });
    },
    flush: async () => {
      await queue;
      if (failure !== undefined) {
        const error = failure;
        failure = undefined;
        throw error;
      }
    }
  };
}
