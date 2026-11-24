import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { BuildLedger, type BuildRecord, readBuildRecord } from '../../src/pipeline/build-record';

const opened: BuildRecord = {
  version: 3,
  kind: 'build',
  startedAt: '2026-10-19T10:00:00.000Z',
  database: { id: 'db-1', name: 'shifts', hash: 'h0' },
  overlay: {
    app: { name: 'Shifts', backend: { kind: 'custom' } },
    owned: ['t:shifts'],
    tables: {},
  },
  seeded: {},
  steps: { settled: false, codegen: false, seeded: false, gen: false },
  expect: [{ table: 'shifts', present: true }],
};

test('steps patched side by side all land, and the record reads back whole', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'build-record-'));
  assert.deepEqual(await readBuildRecord(dir), { kind: 'none' });

  const ledger = await BuildLedger.open(dir, opened);
  await ledger.update({ steps: { settled: true } });
  const seeded = { 't:shifts': { rows: [{ 'f:shifts.notes': 'first' }], ids: ['s-0'] } };
  // Codegen and the seed run together and patch the record as they end.
  await Promise.all([
    ledger.update({ steps: { codegen: true } }),
    ledger.update({ seeded, steps: { seeded: true } }),
  ]);
  // The ledger keeps a copy: the seed's own object changing later changes nothing.
  seeded['t:shifts'].ids.push('later');

  const read = await readBuildRecord(dir);
  assert.equal(read.kind, 'ok');
  const { record } = read as { record: BuildRecord };
  assert.deepEqual(record.steps, { settled: true, codegen: true, seeded: true, gen: false });
  assert.deepEqual(record.seeded, {
    't:shifts': { rows: [{ 'f:shifts.notes': 'first' }], ids: ['s-0'] },
  });
  assert.deepEqual(record.expect, opened.expect);
  assert.deepEqual(ledger.record, record);
});
