import { join } from 'path';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { checkFileTree, generate, isClean, writeFileTree } from '../src/generate';

const sql = (f: string) => join(__dirname, '/../sql', f);
const FIXTURES = join(__dirname, '..', '__fixtures__', 'generated');

let teardown: () => Promise<void>;
let pg: PgTestClient;
let files: Record<string, string>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({}, [seed.sqlfile([sql('test.sql')])]));
  files = await generate(pg.client, { schemas: ['codegen_test'] });
});

afterAll(() => teardown());

it('emits one module per table plus enums and barrels', () => {
  expect(Object.keys(files).sort()).toEqual([
    'codegen_test/active-users.ts',
    'codegen_test/agent-runs.ts',
    'codegen_test/enums.ts',
    'codegen_test/index.ts',
    'codegen_test/posts.ts',
    'codegen_test/users.ts',
    'index.ts'
  ]);
});

it('generates the users module', () => {
  expect(files['codegen_test/users.ts']).toMatchSnapshot();
});

it('generates the posts module', () => {
  expect(files['codegen_test/posts.ts']).toMatchSnapshot();
});

it('generates the agent_runs module (enums, arrays, jsonb, bigint)', () => {
  expect(files['codegen_test/agent-runs.ts']).toMatchSnapshot();
});

it('generates the enums module', () => {
  expect(files['codegen_test/enums.ts']).toMatchSnapshot();
});

it('generates the schema and root barrels', () => {
  expect(files['codegen_test/index.ts']).toMatchSnapshot();
  expect(files['index.ts']).toMatchSnapshot();
});

it('matches the committed __fixtures__/generated output (drift check)', async () => {
  if (process.env.PG_CODEGEN_UPDATE_FIXTURES) {
    await writeFileTree(FIXTURES, files);
  }
  const report = await checkFileTree(FIXTURES, files);
  expect(report).toEqual({ missing: [], stale: [] });
  expect(isClean(report)).toBe(true);
});
