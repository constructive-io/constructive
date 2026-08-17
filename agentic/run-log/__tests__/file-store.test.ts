import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseSessionJsonl, projectParts, readAll } from '../src';
import { FileRunLogStore, writeSessionFile } from '../src/file-store';
import { assistantText, assistantToolCall, header, resetIds, toolResult, userMessage } from './fixtures';

let dir: string;
let path: string;

beforeEach(() => {
  resetIds();
  dir = mkdtempSync(join(tmpdir(), 'run-log-'));
  path = join(dir, 'nested', 'run.jsonl');
});

describe('FileRunLogStore', () => {
  it('creates the log on first append and survives a new store instance', async () => {
    const writer = new FileRunLogStore({ path });
    await writer.append('run-1', [header(), userMessage('hi')]);
    await writer.append('run-1', [assistantText('hello')]);

    const reader = new FileRunLogStore({ path });
    const records = await readAll(reader, 'run-1');
    expect(records.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(readFileSync(path, 'utf8').trimEnd().split('\n')).toHaveLength(3);
  });

  it('reads nothing for a log that does not exist yet', async () => {
    expect((await new FileRunLogStore({ path }).read('run-1')).records).toEqual([]);
  });

  it('resumes sequence numbering after a process restart', async () => {
    await new FileRunLogStore({ path }).append('run-1', [userMessage('a')]);
    const written = await new FileRunLogStore({ path }).append('run-1', [userMessage('b', 2)]);
    expect(written[0].seq).toBe(2);
  });

  it('skips entries already on disk, so a restarted writer can replay its tail', async () => {
    const entries = [header(), userMessage('a'), assistantText('b')];
    await new FileRunLogStore({ path }).append('run-1', entries);
    const retry = await new FileRunLogStore({ path }).append('run-1', entries);
    expect(retry).toEqual([]);
    expect(readFileSync(path, 'utf8').trimEnd().split('\n')).toHaveLength(3);
  });

  it('keeps runs separate within one file', async () => {
    const store = new FileRunLogStore({ path });
    await store.append('run-1', [userMessage('a')]);
    await store.append('run-2', [userMessage('b')]);
    expect((await store.read('run-2')).records[0].seq).toBe(1);
    expect((await store.read('run-1')).records).toHaveLength(1);
  });

  it('throws on a truncated or corrupt line instead of returning a partial log', async () => {
    const store = new FileRunLogStore({ path });
    await store.append('run-1', [userMessage('a')]);
    appendFileSync(path, '{"runId":"run-1","seq":2,');
    await expect(store.read('run-1')).rejects.toThrow(/line 2 is not valid JSON/);

    writeFileSync(path, '{"runId":"run-1","seq":1,"recordedAt":"x","transcriptFormat":"pi","transcriptVersion":3}\n');
    await expect(store.read('run-1')).rejects.toThrow(/must be an object/);
  });
});

describe('writeSessionFile', () => {
  it('writes a pi session file the log can be resumed from', async () => {
    const store = new FileRunLogStore({ path });
    await store.append('run-1', [
      header(),
      userMessage('add a test'),
      assistantToolCall({ id: 'call-1', name: 'write_file' }),
      toolResult({ toolCallId: 'call-1', toolName: 'write_file', text: 'ok' })
    ]);
    const records = await readAll(store, 'run-1');

    const sessionPath = writeSessionFile(join(dir, 'sessions', 'session-1.jsonl'), records);
    const entries = parseSessionJsonl(readFileSync(sessionPath, 'utf8'));

    expect(entries[0]).toMatchObject({ type: 'session', id: 'session-1' });
    expect(entries).toHaveLength(4);
    // The transcript a UI would draw is unchanged by the round trip.
    expect(projectParts(records).parts).toHaveLength(2);
  });
});
