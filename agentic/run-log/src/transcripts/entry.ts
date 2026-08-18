/**
 * A harness's own session entry, as the log stores it.
 *
 * The log is deliberately not a re-encoding of a harness's transcript — an
 * entry is kept byte-for-byte so the run stays resumable in the harness that
 * wrote it. All the wrapper knows structurally is that an entry is an object
 * with a `type`; what that type *means* is the reader's business, selected by
 * the record's `transcriptFormat`.
 */

export interface TranscriptEntry {
  /** The format's own entry discriminator, e.g. pi's `message`. */
  type: string;
  [key: string]: unknown;
}

export const isEntryRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Narrow an untrusted value (a JSONB column, an HTTP body) to the structure
 * every transcript shares. A format's own reader validates the rest.
 */
export function assertTranscriptEntry(value: unknown): TranscriptEntry {
  if (!isEntryRecord(value)) {
    throw new TypeError(`transcript entry must be an object, received ${typeof value}`);
  }
  if (typeof value.type !== 'string' || value.type.length === 0) {
    throw new TypeError('transcript entry must carry a non-empty string `type`');
  }
  return value as TranscriptEntry;
}
