// Approvals over the run log.
//
// The gate needs a human, and a Job has no socket to one: it writes the request
// into the log and reads the answer back out of it. Both directions are rows, so
// a browser hours later still sees the pending request — the log *is* the
// approval UI's state — and the run resumes the moment the resolution lands.
//
// `@agentic-kit/harness` already owns the waiting (`pollingApprovalChannel`);
// this is only its two ends bound to a `RunLogStore`.

import type {
  ApprovalChannel,
  ApprovalOutcome,
  ApprovalRequest,
  PollingApprovalChannelOptions
} from '@agentic-kit/harness';
import { pollingApprovalChannel } from '@agentic-kit/harness';
import type {
  ApprovalResolutionInput,
  PiSessionEntry,
  RunEventRecord,
  RunLogCursor,
  RunLogStore
} from '@agentic-kit/run-log';
import {
  APPROVAL_RESOLUTION_TYPE,
  approvalRequestMessage,
  approvalResolutionMessage,
  assertPiSessionEntry,
  isPiMessageEntry,
  PI_TRANSCRIPT_FORMAT,
  readAll,
  START
} from '@agentic-kit/run-log';

export interface RunLogApprovalsOptions {
  store: RunLogStore;
  runId: string;
  /** Poll delay while a request is outstanding. */
  intervalMs?: number;
  /** Give up after this long; omit to wait as long as a human takes. */
  timeoutMs?: number;
  /** Verdict on timeout. The gate defaults it to `deny`. */
  onTimeout?: 'deny' | 'allow';
  /** Records per read while polling. */
  pageLimit?: number;
  /**
   * The text a human is shown for a request. Defaults to the tool's name and
   * the policy's reason; a host that already composed a title and a message
   * for the call passes them through here.
   */
  prompt?: (request: ApprovalRequest) => string;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * The entry id an approval request is written under.
 *
 * Deterministic on the tool call, so a retried submit is the same entry and the
 * store's own idempotency drops the duplicate instead of asking a human twice.
 */
export const approvalEntryId = (toolCallId: string): string => `approval-${toolCallId}`;

/**
 * An `ApprovalChannel` whose request and answer are both records in the run's
 * log.
 */
export function runLogApprovals(options: RunLogApprovalsOptions): ApprovalChannel {
  const { store, runId } = options;
  const now = options.now ?? (() => new Date());
  const prompt = options.prompt ?? defaultPrompt;
  // Where reading resumed from last time: an approval may take hours, and
  // re-reading the whole run per poll would grow with the transcript.
  let cursor: RunLogCursor = START;
  // Resolutions seen so far, kept across pages: an answer can land many pages
  // after the request it answers.
  const resolved = new Map<string, ApprovalOutcome>();

  const refresh = async (): Promise<void> => {
    const page = await store.read(runId, cursor, options.pageLimit);
    if (page.records.length === 0) return;
    cursor = page.cursor;
    for (const record of page.records) {
      const outcome = resolutionOf(record);
      if (outcome) resolved.set(outcome.toolCallId, outcome.outcome);
    }
  };

  const channelOptions: PollingApprovalChannelOptions = {
    submit: async (request) => {
      const parentId = await leafId(store, runId, options.pageLimit);
      const entry = {
        type: 'message',
        id: approvalEntryId(request.toolCallId),
        parentId,
        timestamp: now().toISOString(),
        message: approvalRequestMessage({
          toolCallId: request.toolCallId,
          prompt: prompt(request)
        })
      } as PiSessionEntry;
      await store.append(runId, [entry]);
    },
    poll: async (request) => {
      await refresh();
      return resolved.get(request.toolCallId);
    },
    // One clock for both the entry timestamps and the timeout, so a suite that
    // fakes time fakes all of it.
    now: () => now().getTime(),
    ...(options.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.onTimeout === undefined ? {} : { onTimeout: options.onTimeout }),
    ...(options.sleep === undefined ? {} : { sleep: options.sleep })
  };

  return pollingApprovalChannel(channelOptions);
}

/**
 * Answer a pending request by appending the resolution.
 *
 * The UI writes this through the API; a local run and the tests write it here.
 * Either way it is one more entry in the same log, which is what makes "approve a
 * cloud agent from a browser tab" nothing more than an insert.
 */
export async function resolveApproval(
  store: RunLogStore,
  runId: string,
  input: ApprovalResolutionInput,
  clock: { now?: () => Date } = {}
): Promise<void> {
  const now = clock.now ?? (() => new Date());
  const parentId = await leafId(store, runId);
  const entry = {
    type: 'message',
    id: `resolution-${input.toolCallId}`,
    parentId,
    timestamp: now().toISOString(),
    message: approvalResolutionMessage(input)
  } as PiSessionEntry;
  await store.append(runId, [entry]);
}

/**
 * A record read as an approval answer, or `undefined` when it is anything else.
 *
 * The projectors surface a resolution only alongside the tool call it belongs
 * to, and a Job polling for its own answer has not necessarily logged that call
 * yet, so the answer is read straight off the record.
 */
function resolutionOf(
  record: RunEventRecord
): { toolCallId: string; outcome: ApprovalOutcome } | undefined {
  // This gate answers a pi session, so a record another harness wrote is not
  // its answer to read.
  if (record.transcriptFormat !== PI_TRANSCRIPT_FORMAT) return undefined;
  const entry = assertPiSessionEntry(record.entry);
  if (!isPiMessageEntry(entry)) return undefined;
  const message = entry.message;
  if (message.role !== 'custom' || message.customType !== APPROVAL_RESOLUTION_TYPE) {
    return undefined;
  }
  const details: Record<string, unknown> =
    typeof message.details === 'object' && message.details !== null
      ? (message.details as Record<string, unknown>)
      : {};
  const toolCallId = details.toolCallId;
  if (typeof toolCallId !== 'string' || toolCallId.length === 0) {
    throw new Error(
      `approval resolution at seq ${String(record.seq)} carries no toolCallId — the ` +
      'gate cannot tell which tool call it answers'
    );
  }
  const { reason, actorId } = details;
  return {
    toolCallId,
    outcome: {
      decision: details.decision === 'approved' ? 'allow' : 'deny',
      ...(typeof reason === 'string' ? { reason } : {}),
      ...(typeof actorId === 'string' ? { actorId } : {})
    }
  };
}

const defaultPrompt = ({ toolName, reason }: ApprovalRequest): string =>
  reason ? `${toolName}: ${reason}` : `${toolName} needs approval`;

/**
 * The log's last entry id — the parent an out-of-band entry hangs from, so the
 * rehydrated session file stays one tree rather than gaining a second root.
 *
 * Exported for the other writers of out-of-band entries (gate decisions), not
 * for the package's consumers.
 */
export async function leafId(store: RunLogStore, runId: string, pageLimit?: number): Promise<string | null> {
  const records = await readAll(store, runId, START, pageLimit);
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const entry = records[index].entry as { id?: unknown };
    if (typeof entry.id === 'string' && entry.id.length > 0) return entry.id;
  }
  return null;
}
