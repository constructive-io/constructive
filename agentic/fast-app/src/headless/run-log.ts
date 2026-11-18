import {
  APPROVAL_RESOLUTION_TYPE,
  assertPiSessionEntry,
  isPiMessageEntry,
  PI_TRANSCRIPT_FORMAT,
  type RunEventRecord
} from '@agentic-kit/run-log';

/**
 * A flush asked for while one runs goes after it, so it also sends what was
 * appended meanwhile. A failed flush is never thrown: the lane's next drain
 * sends the entries.
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
        warn(
          `[fast-app] flushing the run log failed, so other clients see this build's progress late: ${err instanceof Error ? err.message : String(err)}. The lane's next drain sends it.`
        );
      });
      return running;
    });
    waiting = next;
    return next;
  };
}

/** A row written beside the session hangs from this, so a session rebuilt from the log stays one tree. */
export function leafIdOf(records: readonly RunEventRecord[]): string | null {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const id = (records[index].entry as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

export type ApprovalAnswer = {
  toolCallId: string;
  approved: boolean;
  reason?: string;
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function answerOf(record: RunEventRecord): ApprovalAnswer | null {
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
