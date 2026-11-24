import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { writeSmokeFiles } from '../../src/pipeline/smoke-script';

// A stand-in for the generated ORM: `flaky` fails its first read the way the
// backend does while it rebuilds the app's API handler, `broken` always fails,
// and each read is counted in a file the test reads back.
const FAKE_ORM = (calls: string) => `
import { appendFileSync } from 'node:fs';
const seen = {};
const model = (name, fail) => ({
  findMany: () => ({
    execute: async () => {
      appendFileSync(${JSON.stringify(calls)}, name + '\\n');
      seen[name] = (seen[name] ?? 0) + 1;
      const error = fail(seen[name]);
      return error ? { ok: false, errors: [{ message: error }] } : { ok: true, data: { all: { nodes: [{ id: '1' }] } } };
    },
  }),
});
export const createClient = () => ({
  flaky: model('flaky', (n) => n === 1 && 'Something went wrong: Failed to create handler for api-x.example: service api-x.example was invalidated while its handler was being built'),
  broken: model('broken', () => 'permission denied for table broken'),
});
`;

// node:test's t.after: each test's cleanups, run after it ends, failed or not.
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

test('the CRUD smoke tries an operation once more when the backend failed to build its handler, and only then', async () => {
  const plan = {
    resources: [] as never[],
    readOnly: [
      { table: 'flaky', model: 'flaky', primaryKey: 'id' },
      { table: 'broken', model: 'broken', primaryKey: 'id' },
    ],
    skipped: [] as never[],
  };
  const files = await writeSmokeFiles(plan as never, {
    ormEntry: '',
    endpoint: 'http://unused',
    userId: 'u',
  });
  cleanups.push(() => rmSync(files.dir, { recursive: true, force: true }));
  const calls = path.join(files.dir, 'calls.txt');
  const orm = path.join(files.dir, 'orm.mjs');
  writeFileSync(calls, '');
  writeFileSync(orm, FAKE_ORM(calls));
  writeFileSync(
    files.planFile,
    JSON.stringify({ ...JSON.parse(readFileSync(files.planFile, 'utf8')), ormEntry: orm }),
  );

  const output = execFileSync(process.execPath, [files.script, files.planFile], {
    encoding: 'utf8',
  });
  const { results } = JSON.parse(output.trim().split('\n').at(-1) ?? '{}');

  assert.deepEqual(results, [
    { table: 'flaky', op: 'get', ok: true },
    { table: 'broken', op: 'get', ok: false, error: 'permission denied for table broken' },
  ]);
  assert.deepEqual(readFileSync(calls, 'utf8').trim().split('\n'), ['flaky', 'flaky', 'broken']);
});
