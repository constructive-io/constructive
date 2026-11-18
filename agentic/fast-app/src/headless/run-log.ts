// The run log as the headless host uses it: the flush of the session's lane,
// the entry an out-of-band row hangs from, and the answer rows a client writes
// (brief 4.4). The rows are @agentic-kit/run-log's pi entries.

import {
  APPROVAL_RESOLUTION_TYPE,
  assertPiSessionEntry,
  isPiMessageEntry,
  PI_TRANSCRIPT_FORMAT,
  type RunEventRecord
} from '@agentic-kit/run-log';

/**
 * Sends the session's entries to the run log, one flush at a time. A flush
 * asked for while one runs goes after it, so it sends what was appended
 * meanwhile; asks that wait together share one flush. A failed flush is
 * reported and never thrown: the entries go with the lane's next drain.
 */
export function laneFlusher(
  flush: () => Promise<void>,
  warn: (message: string) => void = (message) => console.warn(message)
): () => Promise<void> {
  let running: Promise<void> = Promise.resolve();
  let waiting: Promise<void> | null = null;
  return () => {
    if (waiting) return waiting;
    const next = running.then(() => {
      waiting = null;
      running = flush().catch((err: unknown) => {
        warn(`[fast-app] flushing the run log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
      return running;
    });
    waiting = next;
    return next;
  };
}

/**
 * The newest entry id in the log: the parent of a row written beside the
 * session, so a session rebuilt from the log stays one tree.
 */
export function leafIdOf(records: readonly RunEventRecord[]): string | null {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const id = (records[index].entry as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

/** An answer row, as a client wrote it. `payload` is the plan card's, when it sent one. */
export type ApprovalAnswer = {
  toolCallId: string;
  approved: boolean;
  reason?: string;
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The answer a record carries, or null when it is any other record. */
export function answerOf(record: RunEventRecord): ApprovalAnswer | null {
  // A pi session asks, so only a pi entry answers it.
  if (record.transcriptFormat !== PI_TRANSCRIPT_FORMAT) return null;
  let entry;
  try {
    entry = assertPiSessionEntry(record.entry);
  } catch {
    return null;
  }
  if (!isPiMessageEntry(entry)) return null;
  const { message } = entry;
  if (message.role !== 'custom' || message.customType !== APPROVAL_RESOLUTION_TYPE) return null;
  const details = isRecord(message.details) ? message.details : {};
  if (typeof details.toolCallId !== 'string' || !details.toolCallId) return null;
  return {
    toolCallId: details.toolCallId,
    approved: details.decision === 'approved',
    ...(typeof details.reason === 'string' && details.reason ? { reason: details.reason } : {}),
    ...('payload' in details ? { payload: details.payload } : {})
  };
}

/** The first answer to `toolCallId` among the records: a later one, from any client, is dropped. */
export function firstAnswer(
  records: readonly RunEventRecord[],
  toolCallId: string
): ApprovalAnswer | null {
  for (const record of records) {
    const answer = answerOf(record);
    if (answer?.toolCallId === toolCallId) return answer;
  }
  return null;
}
