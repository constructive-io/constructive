import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLQueryFn } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { UnifiedSearchPreset } from '../preset';
import { requestTsConfig } from '../ts-config';

const filters = ['tsvTsv', 'unifiedSearch', 'matches'] as const;
type Filter = typeof filters[number];

describe.each([false, true])('request search language (explicit adapter config: %s)', (explicit) => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFn;

  beforeAll(async () => {
    ({ db, pg, teardown, query } = await getConnections({
      schemas: ['request_language_test'],
      preset: { extends: [
        ConnectionFilterPreset(),
        UnifiedSearchPreset({ bm25: false, trgm: false, pgvector: false,
          ...(explicit && { tsConfig: 'french', tsvector: { tsConfig: 'english' } }) }),
      ] },
      useRoot: true,
      authRole: 'postgres',
    }, [seed.sqlfile([join(__dirname, 'request-language.sql')])]));
  });
  afterAll(async () => { await teardown?.(); });
  beforeEach(async () => { await pg.beforeEach(); await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); await pg.afterEach(); });

  async function search(filter: Filter | 'tsvExplicitTsv', text: string, langCodes?: unknown) {
    const where = filter === 'matches' ? { tsv: { matches: text } } : { [filter]: text };
    const result = await query<{ allArticles: { nodes: { rowId: number; tsvRank: number | null; searchScore: number | null }[] } }>(
      'query($where: ArticleFilter) { allArticles(where: $where) { nodes { rowId tsvRank searchScore } } }',
      { where }, false, { langCodes },
    );
    expect(result.errors).toBeUndefined();
    return result.data!.allArticles.nodes;
  }

  it.each(filters)('uses request French stemming in %s, including cached alternating languages', async (filter) => {
    for (const codes of [['fr'], ['en'], ['fr-CA'], ['zz-Unknown'], ['zz', 'fr'], ['french']]) {
      const rows = await search(filter, 'chevaux', codes);
      const french = codes.some((code) => code === 'french' || code.startsWith('fr'));
      expect(rows.map((row) => row.rowId)).toEqual(!explicit && french ? [1] : []);
      if (filter !== 'matches' && rows.length) {
        expect(rows[0].tsvRank).toBeGreaterThan(0);
        expect(rows[0].searchScore).toBeGreaterThan(0);
      }
    }
  });

  it.each(filters)('preserves English defaults and unknown/empty-language fallback in %s', async (filter) => {
    for (const codes of [undefined, [], ['zz-Unknown'], ["'; DROP TABLE articles; --"]]) {
      expect((await search(filter, 'running', codes)).map((row) => row.rowId)).toEqual([2]);
    }
  });

  it('keeps an explicit column configuration ahead of request and adapter configuration', async () => {
    expect(await search('tsvExplicitTsv', 'chevaux', ['fr'])).toEqual([]);
    expect((await search('tsvExplicitTsv', 'cheval', ['fr'])).map((row) => row.rowId)).toEqual([1]);
  });

  it.each(filters)('retains empty-query behavior in %s', async (filter) => {
    const rows = await search(filter, '', ['fr']);
    expect(rows).toHaveLength(filter === 'matches' ? 0 : 2);
  });
});

it.each([
  [['FR-ca'], 'pg_catalog.french'], [['de-DE-1996'], 'pg_catalog.german'],
  [['es-419'], 'pg_catalog.spanish'], [['simple'], 'pg_catalog.simple'],
  [['constructor'], 'english'], [null, 'english'], [['zz', 'pt-BR'], 'pg_catalog.portuguese'],
])('maps only validated request codes %p to %s', (codes, config) => {
  expect(requestTsConfig(codes)).toBe(config);
});
