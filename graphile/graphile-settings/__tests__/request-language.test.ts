import type { GraphQLQueryFn } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { ConstructivePreset } from '../src/presets/constructive-preset';

let db: PgTestClient;
let pg: PgTestClient;
let teardown: () => Promise<void>;
let query: GraphQLQueryFn;

beforeAll(async () => {
  ({ db, pg, teardown, query } = await getConnections({
    schemas: ['settings_language_test'],
    preset: { extends: [ConstructivePreset] },
    useRoot: true,
    authRole: 'postgres',
  }, [seed.sqlfile([join(__dirname, '../sql/request-language.sql')])]));
});
afterAll(async () => { await teardown?.(); });
beforeEach(async () => { await pg.beforeEach(); await db.beforeEach(); });
afterEach(async () => { await db.afterEach(); await pg.afterEach(); });

async function search(text: string, langCodes?: string[], field = 'fulltext') {
  const result = await query<{ documents: { nodes: { title: string }[] } }>(
    'query($where: DocumentFilter) { documents(where: $where) { nodes { title } } }',
    { where: { [field]: { matches: text } } }, false, { langCodes },
  );
  expect(result.errors).toBeUndefined();
  return result.data!.documents.nodes;
}

it.each([
  [['fr'], ['French']], [['fr-CA'], ['French']], [['en'], []],
  [['zz-Unknown'], []], [undefined, []],
])('uses request preferences %p for FullText.matches through ConstructivePreset', async (codes, titles) => {
  expect((await search('chevaux', codes)).map((row) => row.title)).toEqual(titles);
});

it('preserves English fallback for absent, empty and unknown preferences', async () => {
  for (const codes of [undefined, [], ['zz-Unknown']]) {
    expect(await search('running', codes)).toEqual([{ title: 'English' }]);
  }
});

it('keeps explicit column configuration ahead of the request', async () => {
  expect(await search('chevaux', ['fr'], 'explicitFulltext')).toEqual([]);
  expect(await search('cheval', ['fr'], 'explicitFulltext')).toEqual([{ title: 'French' }]);
});

it('retains empty query behavior', async () => {
  expect(await search('', ['fr'])).toEqual([]);
});
