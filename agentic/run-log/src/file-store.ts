/**
 * `@agentic-kit/run-log/file-store` — the node-only JSONL store.
 *
 * A separate entry point because the package's main entry is imported by
 * browsers, Electron renderers and Next client components; a `node:fs` import
 * there breaks those bundles. Same split, same reason, as `12factor-env/dotenv`.
 *
 * The file holds one wrapped record per line, so a run is recoverable with
 * `tail -f` and a partially-written last line is detectable rather than silently
 * dropped. This is the store a local run uses before (or without) a database,
 * and the one tests use when they want the log to survive a process restart.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { projectSession, type SessionProjectionOptions } from './projectors/session';
import {
  assertRunEventRecord,
  idempotencyKey,
  type RunEventRecord,
  wrapEntry
} from './record';
import {
  type AppendOptions,
  cursorAfter,
  type RunLogCursor,
  type RunLogPage,
  type RunLogStore,
  START
} from './store';
import type { PiSessionEntry } from './transcripts/pi-entry';

export interface FileRunLogStoreOptions {
  /** Absolute path of the log file. Parent directories are created. */
  path: string;
}

export class FileRunLogStore implements RunLogStore {
  private readonly path: string;

  constructor(options: FileRunLogStoreOptions) {
    this.path = options.path;
  }

  private load(): RunEventRecord[] {
    if (!existsSync(this.path)) return [];
    const contents = readFileSync(this.path, 'utf8');
    const records: RunEventRecord[] = [];
    const lines = contents.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        throw new Error(
          `run log ${this.path} line ${String(i + 1)} is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      records.push(assertRunEventRecord(parsed));
    }
    return records;
  }

  async append(
    runId: string,
    entries: readonly PiSessionEntry[],
    options: AppendOptions = {}
  ): Promise<RunEventRecord[]> {
    const existing = this.load().filter((record) => record.runId === runId);
    const seen = new Set(existing.map((record) => idempotencyKey(runId, record.entry)));
    const written: RunEventRecord[] = [];

    for (const entry of entries) {
      const key = idempotencyKey(runId, entry);
      if (seen.has(key)) continue;
      written.push(
        wrapEntry({
          runId,
          seq: existing.length + written.length + 1,
          entry,
          ...(options.recordedAt ? { recordedAt: options.recordedAt } : {}),
          ...(options.transcriptFormat === undefined ? {} : { transcriptFormat: options.transcriptFormat }),
          ...(options.transcriptVersion === undefined ? {} : { transcriptVersion: options.transcriptVersion })
        })
      );
      seen.add(key);
    }

    if (written.length === 0) return written;

    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) writeFileSync(this.path, '', { mode: 0o600 });
    appendFileSync(this.path, written.map((record) => JSON.stringify(record)).join('\n') + '\n');
    return written;
  }

  async read(runId: string, cursor: RunLogCursor = START, limit?: number): Promise<RunLogPage> {
    const after = this.load().filter((record) => record.runId === runId && record.seq > cursor.afterSeq);
    const records = typeof limit === 'number' ? after.slice(0, limit) : after;
    return { records, cursor: cursorAfter(records, cursor) };
  }
}

/**
 * Write the run's pi session file so `SessionManager.open` can resume it. This
 * is the cloud→local (and local→local restart) resume path: project, write,
 * hand the path to pi.
 */
export function writeSessionFile(
  path: string,
  records: readonly RunEventRecord[],
  options: SessionProjectionOptions = {}
): string {
  const projection = projectSession(records, options);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, projection.jsonl, { mode: 0o600 });
  return path;
}
