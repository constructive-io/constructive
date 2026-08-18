/**
 * Mirroring a harness's session into the run log.
 *
 * The harness owns the session: it appends entries to its own append-only
 * transcript. Harnesses generally expose no "entry appended" event to subscribe
 * to, so the mirror drains instead — after anything that could have appended, it
 * takes the entries it has not seen yet and appends them to the run log
 * verbatim. Index-based draining is sound precisely because the transcript is
 * append-only: entries are never rewritten or removed, only branched from.
 *
 * A switch/fork/new-session replaces the entry list under the same source, so the
 * read position is keyed to the session header's id and resets when that id
 * changes; entries carried into the new session are absorbed by the store's
 * idempotency (entry ids).
 *
 * Harness-neutral: the adapter owns only the subscription that calls `drain()`
 * and the format the entries are validated as, so this is testable without a
 * running agent.
 */

import type { RunEventRecord } from './record';
import type { RunLogAppendStore } from './store';
import type { TranscriptFormat } from './transcripts/format';
import { assertPiSessionEntry, type PiSessionEntry } from './transcripts/pi-entry';

/** The slice of a harness session manager the mirror needs. */
export interface SessionEntrySource {
  getHeader(): unknown;
  getEntries(): readonly unknown[];
}

export interface SessionMirrorOptions {
  runId: string;
  store: RunLogAppendStore;
  /**
   * Narrow each entry before it is appended. Defaults to the pi transcript
   * reader, which is the only entry shape the record currently types; an adapter
   * for another transcript supplies its own.
   */
  assertEntry?: (entry: unknown) => PiSessionEntry;
  /** Transcript format the entries are encoded in, e.g. `pi`. */
  transcriptFormat?: TranscriptFormat;
  /** Transcript format version the entries are produced under. */
  transcriptVersion?: number;
}

export class SessionMirror {
  private readonly runId: string;
  private readonly store: RunLogAppendStore;
  private readonly assertEntry: (entry: unknown) => PiSessionEntry;
  private readonly transcriptFormat: TranscriptFormat | undefined;
  private readonly transcriptVersion: number | undefined;

  private source: SessionEntrySource | null = null;
  private sessionId: string | null = null;
  private consumed = 0;
  private headerMirrored = false;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(options: SessionMirrorOptions) {
    this.runId = options.runId;
    this.store = options.store;
    this.assertEntry = options.assertEntry ?? assertPiSessionEntry;
    this.transcriptFormat = options.transcriptFormat;
    this.transcriptVersion = options.transcriptVersion;
  }

  /** Point the mirror at a session source. Safe to call on every event. */
  bind(source: SessionEntrySource): void {
    this.source = source;
  }

  /**
   * Append everything the mirror has not seen yet. Drains are serialized, so
   * concurrent callers cannot interleave batches and break run-log ordering.
   */
  drain(): Promise<RunEventRecord[]> {
    const run = this.tail.then(() => this.flushOnce());
    this.tail = run.then(
      (): void => undefined,
      (): void => undefined
    );
    return run;
  }

  private async flushOnce(): Promise<RunEventRecord[]> {
    const source = this.source;
    if (!source) return [];

    const header = source.getHeader();
    const sessionId = headerSessionId(header);
    if (sessionId !== null && sessionId !== this.sessionId) {
      this.sessionId = sessionId;
      this.consumed = 0;
      this.headerMirrored = false;
    }

    const batch: PiSessionEntry[] = [];
    if (!this.headerMirrored && header !== null && header !== undefined) batch.push(this.assertEntry(header));

    const entries = source.getEntries();
    const upto = entries.length;
    for (let i = this.consumed; i < upto; i += 1) batch.push(this.assertEntry(entries[i]));
    if (batch.length === 0) return [];

    const written = await this.store.append(this.runId, batch, {
      ...(this.transcriptFormat === undefined ? {} : { transcriptFormat: this.transcriptFormat }),
      ...(this.transcriptVersion === undefined ? {} : { transcriptVersion: this.transcriptVersion })
    });

    // Advance only after a successful append: a failed drain is retried whole.
    this.headerMirrored = true;
    this.consumed = upto;
    return written;
  }
}

function headerSessionId(header: unknown): string | null {
  if (typeof header !== 'object' || header === null) return null;
  const id = (header as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
