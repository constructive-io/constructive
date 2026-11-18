import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import type { VerifyInput } from '../../src/pipeline/verify';
import { checkCrud } from '../../src/pipeline/verify-crud';

// The real smoke script against a stand-in ORM that logs each write to the
// file the plan names as its endpoint, so the test sees the child's order.
const FAKE_ORM = `import { appendFileSync } from 'node:fs';
export function createClient({ endpoint }) {
  const log = (line) => appendFileSync(endpoint, line + '\\n');
  const ok = (data) => ({ execute: async () => ({ ok: true, data }) });
  return {
    tag: {
      findMany: () => ok({ tags: { nodes: [] } }),
      findOne: ({ id }) => ok({ tag: { id } }),
      create: () => { log('create t1'); return ok({ createTag: { tag: { id: 't1' } } }); },
      update: ({ data }) => ok({ updateTag: { tag: { id: 't1', ...data } } }),
      delete: () => { log('delete t1'); return ok({ deleteTag: { tag: { id: 't1' } } }); },
    },
  };
}
`;

const TAG: LiveMetaTable = JSON.parse(
  readFileSync(path.join(__dirname, '__fixtures__', 'crm-meta.json'), 'utf8'),
)._meta.tables.find((table: LiveMetaTable) => table.name === 'Tag');

async function fakeApp() {
  const appDir = await mkdtemp(path.join(os.tmpdir(), 'crud-hold-'));
  const orm = path.join(appDir, 'src/graphql/sdk/app/orm');
  await mkdir(orm, { recursive: true });
  await writeFile(path.join(orm, 'index.ts'), FAKE_ORM);
  await writeFile(path.join(appDir, 'package.json'), '{"type":"module"}');
  // The smoke compiles the app's TypeScript with the app's own compiler.
  await mkdir(path.join(appDir, 'node_modules'));
  await symlink(
    path.dirname(createRequire(__filename).resolve('typescript/package.json')),
    path.join(appDir, 'node_modules/typescript'),
  );
  return appDir;
}

const input = (appDir: string): VerifyInput =>
  ({ appDir, tables: [TAG], rules: {} }) as unknown as VerifyInput;

test('the smoke keeps its test rows until the record pages on them have been opened', async () => {
  const appDir = await fakeApp();
  const log = path.join(appDir, 'writes.log');
  try {
    let during = '';
    const crud = await checkCrud(
      input(appDir),
      { endpoint: log, token: 'test', userId: 'u1' },
      async (rows) => {
        assert.deepEqual(rows, [{ table: 'Tag', id: 't1' }]);
        during = await readFile(log, 'utf8');
      },
    );
    assert.deepEqual(crud.failures, []);
    assert.equal(during, 'create t1\n');
    assert.equal(await readFile(log, 'utf8'), 'create t1\ndelete t1\n');
    assert.deepEqual(crud.leftover, []);
  } finally {
    await rm(appDir, { recursive: true, force: true });
  }
});

test('a failing record-page check still releases the smoke to delete its rows', async () => {
  const appDir = await fakeApp();
  const log = path.join(appDir, 'writes.log');
  try {
    const crud = await checkCrud(
      input(appDir),
      { endpoint: log, token: 'test', userId: 'u1' },
      async () => {
        throw new Error('render window crashed');
      },
    );
    assert.deepEqual(crud.failures, []);
    assert.equal(await readFile(log, 'utf8'), 'create t1\ndelete t1\n');
  } finally {
    await rm(appDir, { recursive: true, force: true });
  }
});

test('the test rows are held as long as the render check may take on them', async () => {
  const { holdFor } = await import('../../src/pipeline/verify-crud');
  const { RENDER_PAGE_BUDGET_MS, RENDER_SETUP_BUDGET_MS } = await import('../../src/pipeline/render-budget');
  // Three pages at the check's worst: its set-up, then each page's whole budget.
  assert.ok(holdFor(3) >= RENDER_SETUP_BUDGET_MS + 3 * RENDER_PAGE_BUDGET_MS);
});

test('a smoke that never ran tested no table', async () => {
  // No generated ORM: codegen didn't write it, so the smoke can't start.
  const appDir = await mkdtemp(path.join(os.tmpdir(), 'crud-none-'));
  try {
    const crud = await checkCrud(input(appDir), { endpoint: 'x', token: 'test', userId: 'u1' });
    assert.deepEqual(crud.tested, []);
    assert.equal(crud.failures[0]?.check, 'setup');
  } finally {
    await rm(appDir, { recursive: true, force: true });
  }
});
