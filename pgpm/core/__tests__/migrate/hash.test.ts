import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse } from 'pgsql-parser';

import { hashSqlFile, hashString } from '../../src/migrate/utils/hash';

it('preserves migration hashes from before libpg-query 18.2.5 added offsets', async () => {
  const sql = [
    'CREATE FUNCTION f() RETURNS integer AS $$SELECT 1$$ LANGUAGE sql;',
    "NOTIFY c, 'x';",
    "CREATE SUBSCRIPTION sub CONNECTION 'dbname=postgres' PUBLICATION pub;",
    "ALTER SUBSCRIPTION sub CONNECTION 'dbname=postgres';"
  ].join('\n');
  const parsed = await parse(sql);
  const legacyIgnoredFields = new Set([
    'stmt_len', 'stmt_location', 'location',
    'arg_location', 'payload_location', 'conninfo_location'
  ]);
  const legacyAst = JSON.stringify(parsed, (key, value) =>
    legacyIgnoredFields.has(key) ? undefined : value
  );
  const dir = await mkdtemp(join(tmpdir(), 'pgpm-hash-'));
  try {
    const file = join(dir, 'deploy.sql');
    await writeFile(file, sql);
    expect(await hashSqlFile(file)).toBe(hashString(legacyAst));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
