import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse } from 'pgsql-parser';

import { hashSqlFile, hashString } from '../../src/migrate/utils/hash';

jest.mock('pgsql-parser', () => {
  const actual = jest.requireActual<typeof import('pgsql-parser')>('pgsql-parser');
  return { ...actual, parse: jest.fn(actual.parse) };
});

it('excludes libpg-query offsets from migration hashes', async () => {
  const sql = [
    'CREATE FUNCTION f() RETURNS integer AS $$SELECT 1$$ LANGUAGE sql;',
    "NOTIFY c, 'x';",
    "CREATE SUBSCRIPTION sub CONNECTION 'dbname=postgres' PUBLICATION pub;",
    "ALTER SUBSCRIPTION sub CONNECTION 'dbname=postgres';"
  ].join('\n');
  const { version: _version, ...parsed } = await parse(sql);
  const ignoredFields = new Set([
    'stmt_len', 'stmt_location', 'location',
    'arg_location', 'payload_location', 'conninfo_location'
  ]);
  const cleanAst = JSON.stringify(parsed, (key, value) =>
    ignoredFields.has(key) ? undefined : value
  );
  const dir = await mkdtemp(join(tmpdir(), 'pgpm-hash-'));
  try {
    const file = join(dir, 'deploy.sql');
    await writeFile(file, sql);
    expect(await hashSqlFile(file)).toBe(hashString(cleanAst));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it('ignores the parser version but hashes SQL changes', async () => {
  const sql = 'SELECT 1;';
  const parsed = await parse(sql);
  const dir = await mkdtemp(join(tmpdir(), 'pgpm-hash-'));
  try {
    const file = join(dir, 'deploy.sql');
    await writeFile(file, sql);
    jest.mocked(parse).mockResolvedValueOnce({ ...parsed, version: 180004 });
    const first = await hashSqlFile(file);
    jest.mocked(parse).mockResolvedValueOnce({ ...parsed, version: 180006 });
    expect(await hashSqlFile(file)).toBe(first);

    await writeFile(file, 'SELECT 2;');
    expect(await hashSqlFile(file)).not.toBe(first);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
