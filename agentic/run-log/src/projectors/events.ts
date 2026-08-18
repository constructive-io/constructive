/**
 * The step every projector shares: records → neutral events, in log order.
 *
 * Each record names its own transcript format, so this is also where a mixed
 * log stops being a special case: the reader is chosen per record, and a run
 * that changed harness projects as one conversation.
 */

import type { RunEventRecord } from '../record';
import type { TranscriptEvent } from '../transcripts/event';
import type { TranscriptReaderRegistry } from '../transcripts/reader';
import { transcriptReaders } from '../transcripts/registry';

export interface ProjectionOptions {
  /** Readers to interpret the records with. Defaults to the process registry. */
  readers?: TranscriptReaderRegistry;
}

/** What one record meant, tagged with its position in the run. */
export interface EventGroup {
  seq: number;
  events: TranscriptEvent[];
}

/** One event, tagged with the position of the record it came from. */
export interface SequencedEvent {
  seq: number;
  event: TranscriptEvent;
}

/**
 * Read every record with the reader its format names. Grouped by record because
 * a span asks when the *previous entry* was written, which the flattened stream
 * can no longer tell you.
 */
export function toEventGroups(
  records: readonly RunEventRecord[],
  options: ProjectionOptions = {}
): EventGroup[] {
  const readers = options.readers ?? transcriptReaders;
  return records.map((record) => ({
    seq: record.seq,
    events: readers.require(record.transcriptFormat).toEvents(record.entry)
  }));
}

export function toEvents(
  records: readonly RunEventRecord[],
  options: ProjectionOptions = {}
): SequencedEvent[] {
  return toEventGroups(records, options).flatMap(({ seq, events }) =>
    events.map((event) => ({ seq, event }))
  );
}
