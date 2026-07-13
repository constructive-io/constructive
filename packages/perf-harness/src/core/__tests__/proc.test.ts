import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isAlive, readJsonl, readPid, writeDone } from '../proc';

const tmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'perf-proc-'));

describe('readJsonl', () => {
  test('parses valid lines and skips blank / corrupt ones', () => {
    const dir = tmp();
    const file = path.join(dir, 'metrics.jsonl');
    fs.writeFileSync(
      file,
      [
        JSON.stringify({ a: 1 }),
        '', // blank
        '   ', // whitespace only
        '{ this is not json', // corrupt (e.g. half-flushed final row)
        JSON.stringify({ b: 2 }),
        '{"c":3}' // trailing line without newline
      ].join('\n')
    );
    expect(readJsonl(file)).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  test('missing file returns []', () => {
    expect(readJsonl(path.join(tmp(), 'does-not-exist.jsonl'))).toEqual([]);
  });

  test('empty file returns []', () => {
    const dir = tmp();
    const file = path.join(dir, 'empty.jsonl');
    fs.writeFileSync(file, '');
    expect(readJsonl(file)).toEqual([]);
  });
});

describe('readPid', () => {
  test('reads a written pid file', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'server.pid'), '12345\n');
    expect(readPid(dir, 'server')).toBe(12345);
  });

  test('returns null when the pid file is absent', () => {
    expect(readPid(tmp(), 'missing')).toBeNull();
  });

  test('returns null on garbage content', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'bad.pid'), 'not-a-pid\n');
    expect(readPid(dir, 'bad')).toBeNull();
  });
});

describe('isAlive', () => {
  test('the current process is alive', () => {
    expect(isAlive(process.pid)).toBe(true);
  });

  test('a pid above the max range is not alive', () => {
    expect(isAlive(2 ** 30)).toBe(false);
  });

  test('non-positive pids are not alive', () => {
    expect(isAlive(0)).toBe(false);
    expect(isAlive(-1)).toBe(false);
  });
});

describe('writeDone', () => {
  test('writes a .done marker with default timestamp content', () => {
    const dir = tmp();
    writeDone(dir, 'soak');
    const body = fs.readFileSync(path.join(dir, 'soak.done'), 'utf8');
    expect(body.endsWith('\n')).toBe(true);
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('writes explicit content (newline-terminated)', () => {
    const dir = tmp();
    writeDone(dir, 'soak', 'ok');
    expect(fs.readFileSync(path.join(dir, 'soak.done'), 'utf8')).toBe('ok\n');
  });
});
