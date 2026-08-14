/**
 * Mirroring pi's session into the run log.
 *
 * pi owns the session: it appends entries to an in-memory, append-only tree and
 * (when persisted) a JSONL file. There is no "entry appended" event to subscribe
 * to, so the mirror drains instead — after anything that could have appended, it
 * takes the entries it has not seen yet and appends them to the run log
 * verbatim. Index-based draining is sound precisely because the session is
 * append-only: entries are never rewritten or removed, only branched from.
 *
 * A switch/fork/new-session replaces the entry list under the same manager, so
 * the read position is keyed to the session header's id and resets when that id
 * changes; entries carried into the new session are absorbed by the store's
 * idempotency (pi entry ids).
 *
 * This file knows nothing about pi's extension API so it can be tested without a
 * running agent; `./extension.ts` wires it to the events.
 */

import { assertPiSessionEntry, type PiSessionEntry, type RunEventRecord, type RunLogAppendStore } from '@agentic-kit/run-log';

/** The slice of pi's `ReadonlySessionManager` the mirror needs. */
export interface SessionEntrySource {
  getHeader(): unknown;
  getEntries(): readonly unknown[];
}

export interface SessionMirrorOptions {
  runId: string;
  store: RunLogAppendStore;
  /** pi session format version the entries are produced under. */
  piSessionVersion?: number;
}

export class SessionMirror {
  private readonly runId: string;
  private readonly store: RunLogAppendStore;
  private readonly piSessionVersion: number | undefined;

  private source: SessionEntrySource | null = null;
  private sessionId: string | null = null;
  private consumed = 0;
  private headerMirrored = false;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(options: SessionMirrorOptions) {
    this.runId = options.runId;
    this.store = options.store;
    this.piSessionVersion = options.piSessionVersion;
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
    if (!this.headerMirrored && header !== null && header !== undefined) batch.push(assertPiSessionEntry(header));

    const entries = source.getEntries();
    const upto = entries.length;
    for (let i = this.consumed; i < upto; i += 1) batch.push(assertPiSessionEntry(entries[i]));
    if (batch.length === 0) return [];

    const written = await this.store.append(
      this.runId,
      batch,
      this.piSessionVersion === undefined ? undefined : { piSessionVersion: this.piSessionVersion }
    );

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
