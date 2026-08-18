/**
 * The transcript reader registry: one place per format that knows how to read
 * it, looked up by the format a record was written under.
 *
 * A reader is registered *by value*, like an entry type, so a second harness
 * ships its reader with its adapter and neither this package nor a renderer is
 * released to support it. A record names its format, so a run that changed
 * harness mid-flight still projects as one ordered log.
 */

import { assertTranscriptEntry, type TranscriptEntry } from './entry';
import type { TranscriptEvent } from './event';
import type { TranscriptFormat } from './format';

export interface TranscriptReader {
  format: TranscriptFormat;
  /** The format version this reader projects without migration. */
  version: number;
  /** Narrow an untrusted entry of this format. Throws on anything unreadable. */
  assertEntry: (value: unknown) => TranscriptEntry;
  /**
   * What the entry means, in order. One entry may mean several things — a pi
   * assistant message is a model response plus its text plus its tool calls.
   */
  toEvents: (entry: TranscriptEntry) => TranscriptEvent[];
}

export class TranscriptReaderRegistry {
  private readonly readers = new Map<TranscriptFormat, TranscriptReader>();

  constructor(readers: readonly TranscriptReader[] = []) {
    for (const reader of readers) this.register(reader);
  }

  register(reader: TranscriptReader): this {
    this.readers.set(reader.format, reader);
    return this;
  }

  get(format: TranscriptFormat): TranscriptReader | undefined {
    return this.readers.get(format);
  }

  has(format: TranscriptFormat): boolean {
    return this.readers.has(format);
  }

  formats(): TranscriptFormat[] {
    return Array.from(this.readers.keys()).sort();
  }

  /**
   * The reader for a format, or a loud failure. A log whose format nothing can
   * read must not render as an empty conversation — the missing piece is an
   * unregistered adapter, and saying so is the only useful outcome.
   */
  require(format: TranscriptFormat): TranscriptReader {
    const reader = this.readers.get(format);
    if (!reader) {
      const known = this.formats();
      throw new Error(
        `no transcript reader registered for format "${format}"` +
        (known.length === 0 ? '' : `; this registry reads ${known.join(', ')}`)
      );
    }
    return reader;
  }
}

/**
 * A reader for a format whose entries the platform stores but cannot interpret.
 *
 * Every entry becomes an `unknown` event, which is enough to keep a log
 * append-only, ordered and inspectable while its adapter is still being written.
 */
export function passthroughReader(format: TranscriptFormat, version = 1): TranscriptReader {
  return {
    format,
    version,
    assertEntry: assertTranscriptEntry,
    toEvents: (entry) => [
      {
        kind: 'unknown',
        entryType: entry.type,
        entry,
        ...(typeof entry.id === 'string' ? { entryId: entry.id } : {}),
        ...(typeof entry.timestamp === 'string' ? { at: entry.timestamp } : {})
      }
    ]
  };
}
