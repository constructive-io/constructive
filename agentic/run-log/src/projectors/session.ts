/**
 * Session projection: run log records → a pi session file.
 *
 * This is what makes a run resumable anywhere. The log is the source of truth;
 * a `.jsonl` session is a derived artifact, so a run that started in the cloud
 * can be continued locally (and vice versa) by projecting the log back into the
 * only format pi's `SessionManager` reads.
 *
 * Returns a string rather than writing a file: the projection is pure, and the
 * node-side write lives in `@agentic-kit/run-log/file-store`.
 *
 * Unlike the other projectors this one is deliberately *not* neutral:
 * re-emitting a transcript in its native encoding is per-format work, so a
 * second harness ships its own session projection beside its reader rather than
 * reusing this. The neutral half of "read a log" is `../transcripts/event`.
 */

import { assertOrdered, type RunEventRecord } from '../record';
import {
  assertTranscriptFormat,
  PI_TRANSCRIPT_FORMAT,
  SUPPORTED_PI_TRANSCRIPT_VERSION
} from '../transcripts/format';
import { isPiSessionHeader, type PiSessionEntry } from '../transcripts/pi-entry';

export interface SessionProjectionOptions {
  /** Used when the log carries no session header (a run logged headerless). */
  sessionId?: string;
  cwd?: string;
  timestamp?: string;
}

export interface SessionProjection {
  /** The full session file contents, newline-terminated. */
  jsonl: string;
  /** Entries in file order, header first. */
  entries: PiSessionEntry[];
  transcriptVersion: number;
}

/**
 * Project records into a pi session file. Throws when the records cannot form a
 * loadable session — an unresumable session must fail at projection time, not
 * when pi later reads a truncated tree.
 */
export function projectSession(
  records: readonly RunEventRecord[],
  options: SessionProjectionOptions = {}
): SessionProjection {
  assertOrdered(records);
  assertTranscriptFormat(records, PI_TRANSCRIPT_FORMAT);

  const versions = new Set(records.map((record) => record.transcriptVersion));
  if (versions.size > 1) {
    throw new Error(
      `run log mixes pi session versions (${Array.from(versions).sort().join(', ')}); migrate the older entries before projecting a session`
    );
  }
  const transcriptVersion = records[0]?.transcriptVersion ?? SUPPORTED_PI_TRANSCRIPT_VERSION;

  // Safe: every record was just asserted to carry the pi transcript format.
  const entries = records.map((record) => record.entry as PiSessionEntry);
  const headerIndex = entries.findIndex(isPiSessionHeader);
  if (headerIndex > 0) {
    throw new Error(
      `run log carries a session header at position ${String(headerIndex)}; a pi session file requires it first`
    );
  }

  const body = headerIndex === 0 ? entries.slice(1) : entries;
  const header: PiSessionEntry =
    headerIndex === 0
      ? entries[0]
      : {
        type: 'session',
        version: transcriptVersion,
        id: options.sessionId ?? records[0]?.runId ?? 'run-log',
        timestamp: options.timestamp ?? records[0]?.recordedAt ?? new Date().toISOString(),
        ...(options.cwd ? { cwd: options.cwd } : {})
      };

  const ordered = [header, ...body];
  return {
    entries: ordered,
    transcriptVersion,
    jsonl: ordered.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
  };
}

/** Parse a pi session file into entries — the inverse, for importing a session. */
export function parseSessionJsonl(jsonl: string): PiSessionEntry[] {
  const entries: PiSessionEntry[] = [];
  const lines = jsonl.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    try {
      entries.push(JSON.parse(line) as PiSessionEntry);
    } catch (error) {
      throw new Error(
        `pi session line ${String(i + 1)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return entries;
}
