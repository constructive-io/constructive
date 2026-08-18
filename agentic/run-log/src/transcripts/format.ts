/**
 * Which transcript a record's entry is encoded in.
 *
 * The log stores a harness's own entries verbatim, so a reader cannot know how
 * to project a record without being told what it is looking at. The format is
 * therefore carried *per record*, not per run: a run resumed under a different
 * harness, or migrated between them, stays one ordered log.
 *
 * Deliberately a string rather than a closed union — a format is a value that
 * ships with an adapter, so adding one must not require a release of this
 * package. Known formats are declared as constants here.
 */

export type TranscriptFormat = string;

/** pi's session-file entries (`@earendil-works/pi-coding-agent`). */
export const PI_TRANSCRIPT_FORMAT = 'pi';

/** The pi session format version this package projects without migration. */
export const SUPPORTED_PI_TRANSCRIPT_VERSION = 3;

/**
 * Narrow a record's format before projecting it. A projector reads one format;
 * handing it another must fail loudly rather than render an empty conversation
 * out of entries it did not understand.
 */
export function assertTranscriptFormat(
  records: readonly { transcriptFormat: TranscriptFormat }[],
  expected: TranscriptFormat
): void {
  const formats = new Set(records.map((record) => record.transcriptFormat));
  formats.delete(expected);
  if (formats.size === 0) return;
  throw new Error(
    `run log carries transcript format(s) ${Array.from(formats).sort().join(', ')}; ` +
    `this projector reads "${expected}" entries only`
  );
}
