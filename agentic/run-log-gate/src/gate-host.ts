// The harness's `GateHost`, with the run log as its UI.
//
// `createConfirmGate` asks a host to confirm a call and tells it when a repeat
// of a declined call was skipped. Here both are records: the request goes into
// the run's log as a `constructive.approval.request` entry, the answer is read
// back as the `constructive.approval.resolution` a human wrote — from any
// surface that projects the log — and the outcome is filed as a
// `constructive.gate.decision`, the same audit entry a policy verdict leaves.
// So a desktop run, a cloud Job and the agentic lane ask and are answered in the
// one place, and nothing executes on the strength of a click: the decision is
// what was persisted and read back.
//
// `notifyToolSkipped` returns void, so its write is queued and `drain()` —
// awaited when the turn ends — rethrows the first failure rather than losing it.

import type { ApprovalRequest, GateHost } from '@agentic-kit/harness';

import type { RunLogApprovalsOptions } from './approvals';
import { runLogApprovals } from './approvals';
import { runLogGateDecisions } from './gate-decisions';

export interface RunLogGateRequest {
  toolCallId: string;
  title: string;
  message: string;
}

export interface RunLogGateDecision {
  toolCallId: string;
  allowed: boolean;
  reason?: string;
  actorId?: string;
}

export interface RunLogGateHostOptions extends Omit<RunLogApprovalsOptions, 'prompt'> {
  /** Told when a request is pending, so a host with a window can surface it. */
  onRequested?: (request: RunLogGateRequest) => void;
  /** Told what the log settled on, so a host can stop asking. */
  onDecided?: (decision: RunLogGateDecision) => void;
}

export interface RunLogGateHost extends GateHost {
  /**
   * Wait for the queued writes and throw the first failure. Awaited once the
   * turn ends: a decision that never reached the log is a hole in the audit
   * trail, not a detail.
   */
  drain(): Promise<void>;
}

/** The text a human sees: the harness's title, then its message. */
export const gatePrompt = (title: string, message: string): string => `${title}\n\n${message}`;

/** Reason filed for a repeat of a declined call the gate skipped without asking. */
export const SKIPPED_REASON = 'skipped: a repeat of a tool call the user already declined';

export function createRunLogGateHost(options: RunLogGateHostOptions): RunLogGateHost {
  const { onRequested, onDecided, ...channelOptions } = options;
  const { store, runId } = options;
  const now = options.now ?? (() => new Date());

  // Prompts are composed per call and the channel writes one per request, so
  // the title and message travel by tool call id rather than through the
  // channel's request shape.
  const prompts = new Map<string, string>();
  const channel = runLogApprovals({
    ...channelOptions,
    prompt: (request: ApprovalRequest) => prompts.get(request.toolCallId) ?? request.toolName
  });
  const decisions = runLogGateDecisions({
    store,
    runId,
    ...(options.pageLimit === undefined ? {} : { pageLimit: options.pageLimit })
  });

  return {
    hasUI: true,

    async confirmTool(toolCallId, title, message) {
      prompts.set(toolCallId, gatePrompt(title, message));
      onRequested?.({ toolCallId, title, message });
      try {
        const outcome = await channel.request({
          runId,
          toolCallId,
          toolName: title,
          input: {},
          reason: message,
          requestedAt: now().toISOString()
        });
        decisions.onDecision({
          runId,
          toolCallId,
          toolName: title,
          input: {},
          verdict: { decision: 'ask' },
          decision: outcome.decision,
          ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
          ...(outcome.actorId === undefined ? {} : { actorId: outcome.actorId }),
          decidedAt: now().toISOString()
        });
        onDecided?.({
          toolCallId,
          allowed: outcome.decision === 'allow',
          ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
          ...(outcome.actorId === undefined ? {} : { actorId: outcome.actorId })
        });
        return outcome.decision === 'allow';
      } finally {
        prompts.delete(toolCallId);
      }
    },

    notifyToolSkipped(toolCallId) {
      // The harness names only the call, and the tool it repeats is in the
      // transcript beside it; the projector attributes the entry by call id.
      decisions.onDecision({
        runId,
        toolCallId,
        toolName: '',
        input: {},
        verdict: { decision: 'deny', reason: SKIPPED_REASON },
        decision: 'deny',
        reason: SKIPPED_REASON,
        decidedAt: now().toISOString()
      });
    },

    drain: () => decisions.flush()
  };
}
