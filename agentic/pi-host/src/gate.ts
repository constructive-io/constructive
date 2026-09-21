// The GateHost the harness already defines, answered by the conversation.
//
// `@agentic-kit/harness` owns *what* is gated (`MUTATING_DB_TOOLS`), the prompt
// wording (`buildConfirmPrompt`) and the decline guard; a host only supplies the
// three capabilities in `GateHost`. Desktop answers `confirmTool` with a dialog.
// A Job answers it with a message: it writes the tool call into the thread at
// `approval-requested` and waits for the human to echo the part back at
// `approval-responded`. That is the same contract, resolved asynchronously —
// which is exactly why the runner reports `hasUI: true`. Reporting false would
// tell the gate no decision can ever be obtained and block every mutating tool.

import type { Inbox, ToolPart, Transcript } from '@agentic-kit/agent-conversation';
import {
  denyToolPart,
  failToolPart,
  isApprovalEvent,
  requestApproval,
  respondToApproval,
  toolPart
} from '@agentic-kit/agent-conversation';
import type { ConfirmPreview, GateHost } from '@agentic-kit/harness';

export interface ThreadGateHostOptions {
  transcript: Transcript;
  inbox: Inbox;
  /** How long a pending approval waits before it is treated as declined. */
  approvalTimeoutMs?: number;
  /** Approval ids, as a value — a suite passes a counter. */
  newApprovalId?: () => string;
  /** Called when the human asked the run to stop while an approval was pending. */
  onCancel?: (reason: string | undefined) => void;
  /** Called with every tool part the gate writes, so a caller can trace the run. */
  onToolPart?: (part: ToolPart) => void;
}

export const DEFAULT_APPROVAL_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * The harness's `GateHost` plus the drain its one synchronous method needs.
 *
 * `notifyToolSkipped` returns void, so its transcript write cannot be awaited
 * where it is called. It is queued instead, and `drain()` — awaited by the
 * composition root once the run ends — rethrows the first failure, so a write
 * that fails still fails the Job rather than disappearing into a `catch`.
 */
export type ThreadGateHost = GateHost & { drain(): Promise<void> };

/**
 * A `GateHost` whose UI is the thread.
 *
 * The pending call is one message whose single ToolPart is rewritten in place as
 * the decision arrives, so the thread reads as a conversation and the state
 * machine in `@agentic-kit/agent-conversation` is the only place the
 * lifecycle is enforced.
 */
export function createThreadGateHost(options: ThreadGateHostOptions): ThreadGateHost {
  const {
    transcript,
    inbox,
    approvalTimeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS,
    newApprovalId = () => `approval-${Math.random().toString(36).slice(2, 10)}`,
    onCancel,
    onToolPart
  } = options;

  const emit = (part: ToolPart): ToolPart => {
    onToolPart?.(part);
    return part;
  };

  const confirmTool = async (
    toolCallId: string,
    title: string,
    message: string,
    preview?: ConfirmPreview
  ): Promise<boolean> => {
    const pending = toolPart({
      toolName: 'confirm',
      toolCallId,
      input: { title, message, ...(preview ? { preview } : {}) }
    });
    const requested = emit(requestApproval(pending, newApprovalId()));
    const written = await transcript.appendToolPart(requested);

    const outcome = await inbox.waitFor(isApprovalEvent, { timeoutMs: approvalTimeoutMs });

    if (outcome.event && outcome.event.toolCallId === toolCallId) {
      // Two writes on a decline, on purpose: `approval-responded` is the human's
      // answer and `output-denied` is the call's outcome, and the transcript is
      // read as a history — collapsing them would lose who declined and why.
      const responded = respondToApproval(requested, {
        approved: outcome.event.approved,
        reason: outcome.event.reason
      });
      await transcript.updateToolPart(written.id, emit(responded));
      if (!outcome.event.approved) {
        await transcript.updateToolPart(
          written.id,
          emit(denyToolPart(responded, outcome.event.reason ?? 'Declined by the user'))
        );
      }
      return outcome.event.approved;
    }

    if (outcome.event) {
      // A decision arrived for a call this gate is not waiting on. The gate is
      // serial — one pending confirm at a time — so this is a malformed client,
      // not a race, and silently dropping it would strand the run.
      throw new Error(
        `approval for tool call ${outcome.event.toolCallId} arrived while ${toolCallId} was pending`
      );
    }

    if (outcome.cancelled) {
      onCancel?.(outcome.cancelled.reason);
      await transcript.updateToolPart(
        written.id,
        emit(denyToolPart(requested, outcome.cancelled.reason ?? 'Cancelled by the user'))
      );
      return false;
    }

    await transcript.updateToolPart(
      written.id,
      emit(failToolPart(requested, `No decision within ${Math.round(approvalTimeoutMs / 1000)}s`))
    );
    return false;
  };

  // Queued notices, serialized so the transcript keeps the order the gate saw,
  // and their first failure, kept for `drain()` to rethrow.
  let queue: Promise<void> = Promise.resolve();
  let failure: unknown;

  return {
    hasUI: true,
    confirmTool,
    notifyToolSkipped: (toolCallId: string) => {
      queue = queue.then(async () => {
        try {
          await transcript.appendText(
            `Skipped a repeat of a declined tool call (${toolCallId}).`
          );
        } catch (error) {
          failure ??= error;
        }
      });
    },
    drain: async () => {
      await queue;
      if (failure !== undefined) {
        throw new Error(
          `failed to write a skipped-tool notice to the thread: ${
            failure instanceof Error ? failure.message : String(failure)
          }`,
          { cause: failure }
        );
      }
    }
  };
}
