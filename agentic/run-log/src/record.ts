/**
 * The run log record: five platform-owned fields around a verbatim harness entry.
 *
 * The wrapper exists to give an entry identity (which run), order (which
 * position) and readability (which transcript) across hosts — nothing else. It
 * deliberately does not re-encode a harness's semantics, because a harness
 * already versions and migrates its own session format; `transcriptFormat` says
 * which reader can parse the entry, and `transcriptVersion` says which version
 * that reader must migrate from.
 */

import { type TranscriptEntry } from './transcripts/entry';
import { PI_TRANSCRIPT_FORMAT, type TranscriptFormat } from './transcripts/format';
import type { TranscriptReaderRegistry } from './transcripts/reader';
import { transcriptReaders } from './transcripts/registry';

/** Version of the wrapper itself — bumped only if these fields change. */
export const RUN_LOG_WRAPPER_VERSION = 1;

export interface RunEventRecord {
  /** The run this entry belongs to. */
  runId: string;
  /** 1-based position within the run. Gapless and strictly increasing. */
  seq: number;
  /** When the platform durably recorded the entry (ISO 8601). */
  recordedAt: string;
  /** The transcript the entry is encoded in, e.g. `pi`. */
  transcriptFormat: TranscriptFormat;
  /** That transcript's format version at write time. */
  transcriptVersion: number;
  /** The harness's session entry, byte-for-byte as it was produced. */
  entry: TranscriptEntry;
}

export interface WrapEntryOptions {
  runId: string;
  seq: number;
  entry: TranscriptEntry;
  recordedAt?: string;
  transcriptFormat?: TranscriptFormat;
  transcriptVersion?: number;
  /** Readers used to validate the entry. Defaults to the process registry. */
  readers?: TranscriptReaderRegistry;
}

export function wrapEntry(options: WrapEntryOptions): RunEventRecord {
  if (!options.runId) throw new TypeError('a run log record needs a runId');
  if (!Number.isInteger(options.seq) || options.seq < 1) {
    throw new TypeError(`run log seq must be a positive integer, received ${String(options.seq)}`);
  }
  const format = options.transcriptFormat ?? PI_TRANSCRIPT_FORMAT;
  const reader = (options.readers ?? transcriptReaders).require(format);
  return {
    runId: options.runId,
    seq: options.seq,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
    transcriptFormat: format,
    transcriptVersion: options.transcriptVersion ?? reader.version,
    // The entry is validated by the format's own reader: what makes an entry
    // well-formed is the transcript's rule, not the wrapper's.
    entry: reader.assertEntry(options.entry)
  };
}

/**
 * Narrow an untrusted record (database row, HTTP body). Throws on anything
 * unreadable — a log that cannot be parsed must fail loudly, never silently
 * render as an empty conversation.
 */
export function assertRunEventRecord(
  value: unknown,
  readers: TranscriptReaderRegistry = transcriptReaders
): RunEventRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`run log record must be an object, received ${typeof value}`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.runId !== 'string' || record.runId.length === 0) {
    throw new TypeError('run log record must carry a non-empty runId');
  }
  if (!Number.isInteger(record.seq) || (record.seq as number) < 1) {
    throw new TypeError(`run log record ${record.runId} has an invalid seq: ${String(record.seq)}`);
  }
  if (typeof record.recordedAt !== 'string') {
    throw new TypeError(`run log record ${record.runId}#${String(record.seq)} must carry recordedAt`);
  }
  if (typeof record.transcriptFormat !== 'string' || record.transcriptFormat.length === 0) {
    throw new TypeError(
      `run log record ${record.runId}#${String(record.seq)} must carry a non-empty transcriptFormat`
    );
  }
  if (!Number.isInteger(record.transcriptVersion)) {
    throw new TypeError(
      `run log record ${record.runId}#${String(record.seq)} must carry an integer transcriptVersion`
    );
  }
  return {
    runId: record.runId,
    seq: record.seq as number,
    recordedAt: record.recordedAt,
    transcriptFormat: record.transcriptFormat,
    transcriptVersion: record.transcriptVersion as number,
    entry: readers.require(record.transcriptFormat).assertEntry(record.entry)
  };
}

/**
 * The de-duplication key for an append. Transcript entry ids are unique within a
 * session, so a retried append (a Job restart re-emitting its tail, a
 * reconnecting writer) is recognised rather than duplicated.
 */
export function idempotencyKey(runId: string, entry: TranscriptEntry): string {
  // An opening entry may carry no id; there is exactly one per session.
  const id = typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : 'header';
  return `${runId}:${entry.type}:${id}`;
}

/** Records must be contiguous and in order before anything projects them. */
export function assertOrdered(records: readonly RunEventRecord[]): void {
  for (let i = 1; i < records.length; i += 1) {
    const previous = records[i - 1];
    const current = records[i];
    if (current.runId !== previous.runId) {
      throw new Error(
        `run log records mix runs: ${previous.runId} then ${current.runId} at index ${String(i)}`
      );
    }
    if (current.seq <= previous.seq) {
      throw new Error(
        `run log records out of order in ${current.runId}: seq ${String(previous.seq)} followed by ${String(current.seq)}`
      );
    }
  }
}
