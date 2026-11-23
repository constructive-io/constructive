import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { createBm25Adapter } from '../adapters/bm25';
import { createPgvectorAdapter } from '../adapters/pgvector';
import { createTrgmAdapter } from '../adapters/trgm';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { Bm25CodecPlugin } from '../codecs/bm25-codec';
import { TsvectorCodecPlugin } from '../codecs/tsvector-codec';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

interface Page {
  allDocuments: {
    edges: Array<{ cursor: string; node: { rowId: number; searchScore: number | null } }>;
    pageInfo: { hasPreviousPage: boolean; hasNextPage: boolean; startCursor: string | null; endCursor: string | null };
  };
}
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const PAGE = `
  query($w: DocumentFilter, $ob: [DocumentOrderBy!], $first: Int, $last: Int, $after: Cursor, $before: Cursor) {
    allDocuments(where: $w, orderBy: $ob, first: $first, last: $last, after: $after, before: $before) {
      edges { cursor node { rowId searchScore } }
      pageInfo { hasPreviousPage hasNextPage startCursor endCursor }
    }
  }
`;

const TRGM = { trgmTitle: { value: 'Learning', threshold: 0.05 } };
const TSV = { tsvTsv: 'learning' };
// Fans out to tsvector, bm25 and trgm: rows 1, 2, 3 and 5 match.
const UNIFIED = { unifiedSearch: 'learning' };

describe('cursor paging over search-ordered results', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnections({
      schemas: ['unified_search_test'],
      preset: {
        extends: [ConnectionFilterPreset()],
        plugins: [
          TsvectorCodecPlugin,
          Bm25CodecPlugin,
          VectorCodecPlugin,
          createUnifiedSearchPlugin({
            adapters: [
              createTsvectorAdapter(),
              createBm25Adapter(),
              createTrgmAdapter({ defaultThreshold: 0.1 }),
              createPgvectorAdapter(),
            ],
          }),
        ],
      },
      useRoot: true,
      authRole: 'postgres',
    }, [seed.sqlfile([join(__dirname, './setup.sql')])]);
    pg = connections.pg;
    teardown = connections.teardown;
    query = connections.query as QueryFn;
  });

  afterAll(async () => {
    await teardown?.();
  });

  async function page(variables: Record<string, unknown>) {
    const result = await query<Page>(PAGE, variables);
    expect(result.errors).toBeUndefined();
    return result.data!.allDocuments;
  }

  async function allIds(w: Record<string, unknown>, ob: string[]) {
    return (await page({ w, ob })).edges.map((e) => e.node.rowId);
  }

  async function pageBackwards(w: Record<string, unknown>, ob: string[], pageSize: number) {
    const seen: number[] = [];
    let before: string | null = null;
    for (let i = 0; i < 10; i++) {
      const { edges, pageInfo } = await page({ w, ob, last: pageSize, before });
      seen.unshift(...edges.map((e) => e.node.rowId));
      if (!pageInfo.hasPreviousPage || edges.length === 0) break;
      before = pageInfo.startCursor;
    }
    return seen;
  }

  async function pageForwards(w: Record<string, unknown>, ob: string[], pageSize: number) {
    const seen: number[] = [];
    let after: string | null = null;
    for (let i = 0; i < 10; i++) {
      const { edges, pageInfo } = await page({ w, ob, first: pageSize, after });
      seen.push(...edges.map((e) => e.node.rowId));
      if (!pageInfo.hasNextPage || edges.length === 0) break;
      after = pageInfo.endCursor;
    }
    return seen;
  }

  it.each([
    ['TITLE_TRGM_SIMILARITY_ASC', TRGM],
    ['TITLE_TRGM_SIMILARITY_DESC', TRGM],
    ['TSV_RANK_ASC', TSV],
    ['TSV_RANK_DESC', TSV],
  ])('%s: last/before visits every row once, in the forward order', async (orderBy, where) => {
    const all = await allIds(where, [orderBy]);
    expect(all.length).toBeGreaterThan(2);

    const backwards = await pageBackwards(where, [orderBy], 1);
    expect(backwards).toEqual(all);

    const forwards = await pageForwards(where, [orderBy], 1);
    expect(forwards).toEqual(all);
  });

  describe('SEARCH_SCORE_DESC with unifiedSearch across adapters', () => {
    it('first/after and last/before visit every row once, in the forward order', async () => {
      const { edges } = await page({ w: UNIFIED, ob: ['SEARCH_SCORE_DESC'] });
      const all = edges.map((e) => e.node.rowId);
      expect(all.length).toBeGreaterThan(3);
      const scores = edges.map((e) => e.node.searchScore as number);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));

      expect(await pageForwards(UNIFIED, ['SEARCH_SCORE_DESC'], 1)).toEqual(all);
      expect(await pageBackwards(UNIFIED, ['SEARCH_SCORE_DESC'], 1)).toEqual(all);
      expect(await pageForwards(UNIFIED, ['SEARCH_SCORE_ASC'], 2)).toEqual([...all].reverse());
      expect(await pageBackwards(UNIFIED, ['SEARCH_SCORE_ASC'], 2)).toEqual([...all].reverse());
    });

    describe('with rows whose scores tie', () => {
      // Two copies of row 5 score the same in every adapter, so the three
      // share one composite score; only the primary key separates them.
      beforeAll(async () => {
        await pg.query(`
          INSERT INTO unified_search_test.documents (id, title, body, tsv, embedding)
          SELECT id + 100, title, body, tsv, embedding FROM unified_search_test.documents WHERE id = 5
          UNION ALL
          SELECT id + 200, title, body, tsv, embedding FROM unified_search_test.documents WHERE id = 5
        `);
      });
      afterAll(async () => {
        await pg.query('DELETE FROM unified_search_test.documents WHERE id > 100');
      });

      it.each([1, 2])('pages across the tied rows with %d per page, forwards and backwards', async (pageSize) => {
        const { edges } = await page({ w: UNIFIED, ob: ['SEARCH_SCORE_DESC'] });
        const all = edges.map((e) => e.node.rowId);
        expect(all).toEqual(expect.arrayContaining([5, 105, 205]));
        const tied = edges.filter((e) => [5, 105, 205].includes(e.node.rowId)).map((e) => e.node.searchScore);
        expect(new Set(tied).size).toBe(1);
        // The tied rows are adjacent, separated only by the primary key.
        const positions = [5, 105, 205].map((id) => all.indexOf(id)).sort((a, b) => a - b);
        expect(positions[2] - positions[0]).toBe(2);

        expect(await pageForwards(UNIFIED, ['SEARCH_SCORE_DESC'], pageSize)).toEqual(all);
        expect(await pageBackwards(UNIFIED, ['SEARCH_SCORE_DESC'], pageSize)).toEqual(all);
      });
    });
  });

  it('last/before and first/after agree on a two-row page size', async () => {
    const all = await allIds(TRGM, ['TITLE_TRGM_SIMILARITY_DESC']);
    expect(await pageBackwards(TRGM, ['TITLE_TRGM_SIMILARITY_DESC'], 2)).toEqual(all);
    expect(await pageForwards(TRGM, ['TITLE_TRGM_SIMILARITY_DESC'], 2)).toEqual(all);
  });
});
