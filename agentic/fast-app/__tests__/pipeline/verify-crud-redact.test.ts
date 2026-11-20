import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { withStepLog } from '../../src/pipeline/activity';
import type { VerifyInput } from '../../src/pipeline/verify';
import { checkCrud } from '../../src/pipeline/verify-crud';

// A bare key: no shape the patterns know, so only its value can redact it.
const TOKEN = 'ownerkeyvalue0123456789abcdefghij';

const TAG: LiveMetaTable = JSON.parse(
  readFileSync(path.join(__dirname, '__fixtures__', 'crm-meta.json'), 'utf8')
)._meta.tables.find((table: LiveMetaTable) => table.name === 'Tag');

async function appWithOrm(orm: string) {
  const appDir = await mkdtemp(path.join(os.tmpdir(), 'crud-redact-'));
  const dir = path.join(appDir, 'src/graphql/sdk/app/orm');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.ts'), orm);
  await writeFile(path.join(appDir, 'package.json'), '{"type":"module"}');
  await mkdir(path.join(appDir, 'node_modules'));
  await symlink(
    path.dirname(createRequire(__filename).resolve('typescript/package.json')),
    path.join(appDir, 'node_modules/typescript')
  );
  return appDir;
}

const inStep = <T>(work: () => Promise<T>) =>
  withStepLog({ root: undefined, secrets: () => [TOKEN], push: (entry) => entry, changed: () => {} }, work);

const input = (appDir: string): VerifyInput => ({ appDir, tables: [TAG], rules: {} }) as unknown as VerifyInput;

test('a smoke that crashed after printing the token shows its output without it', async () => {
  const appDir = await appWithOrm(`export function createClient() {
  process.stderr.write('auth header: ' + process.env.CONSTRUCTIVE_SMOKE_TOKEN + '\\n');
  process.exit(1);
}
`);
  try {
    const crud = await inStep(() => checkCrud(input(appDir), { endpoint: 'x', token: TOKEN, userId: 'u1' }));
    const message = crud.failures[0]?.message ?? '';
    assert.match(message, /^The CRUD smoke crashed:\nauth header: \[redacted\]/);
    assert.ok(!message.includes(TOKEN));
  } finally {
    await rm(appDir, { recursive: true, force: true });
  }
});

test("an ORM that failed to load with the token in its error doesn't show it", async () => {
  const appDir = await appWithOrm(`throw new Error('bad token ' + process.env.CONSTRUCTIVE_SMOKE_TOKEN);
export function createClient() {}
`);
  try {
    const crud = await inStep(() => checkCrud(input(appDir), { endpoint: 'x', token: TOKEN, userId: 'u1' }));
    const message = crud.failures[0]?.message ?? '';
    assert.match(message, /^The generated ORM failed to load: bad token \[redacted\]/);
    assert.ok(!message.includes(TOKEN));
  } finally {
    await rm(appDir, { recursive: true, force: true });
  }
});
