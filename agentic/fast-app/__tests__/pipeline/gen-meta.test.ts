import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { META_FILE, writeMeta } from '../../src/pipeline/gen';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const platformScope = {
  scope: 'database',
  tier: 'database',
  keyColumn: 'databaseId',
  entityTable: '',
  source: '',
};

test('meta.json leaves out the platform tables, so the app gets no screens for them', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gen-meta-'));
  try {
    const tables = [
      { name: 'Order' },
      { name: 'Domain', scope: platformScope },
      { name: 'Company', scope: { ...platformScope, scope: 'app', tier: 'global' } },
    ] as LiveMetaTable[];
    await writeMeta(dir, tables);
    const written = JSON.parse(await readFile(path.join(dir, META_FILE), 'utf8')) as {
      _meta: { tables: LiveMetaTable[] };
    };
    assert.deepEqual(
      written._meta.tables.map((t) => t.name),
      ['Company', 'Order'],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('meta.json omits search chunks and storage internals but retains rooms and storage descriptors', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gen-meta-'));
  try {
    const fixture = new URL('./__fixtures__/blueprint-generated-meta.json', moduleUrl);
    const tables = JSON.parse(await readFile(fixture, 'utf8')) as LiveMetaTable[];
    const skipped = await writeMeta(dir, tables);
    const written = JSON.parse(await readFile(path.join(dir, META_FILE), 'utf8')) as {
      _meta: { tables: LiveMetaTable[] };
    };
    assert.deepEqual(
      written._meta.tables.map((t) => t.name),
      ['Company', 'DataRoom', 'DataRoomBucket', 'DataRoomFile'],
    );
    assert.deepEqual(skipped, [
      { table: 'CompaniesChunk', reason: 'search chunks' },
      { table: 'DataRoomFileEvent', reason: 'storage module internals' },
      { table: 'DataRoomFilePathShare', reason: 'storage module internals' },
      { table: 'DataRoomFilesChunk', reason: 'search chunks' },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
