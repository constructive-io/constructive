import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

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
    edges: Array<{ cursor: string; node: { rowId: number } }>;
    pageInfo: { hasPreviousPage: boolean; hasNextPage: boolean; startCursor: string | null; endCursor: string | null };
  };
}
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const PAGE = `
  query($w: DocumentFilter, $ob: [DocumentOrderBy!], $first: Int, $last: Int, $after: Cursor, $before: Cursor) {
    allDocuments(where: $w, orderBy: $ob, first: $first, last: $last, after: $after, before: $before) {
      edges { cursor node { rowId } }
      pageInfo { hasPreviousPage hasNextPage startCursor endCursor }
    }
  }
`;

const TRGM = { trgmTitle: { value: 'Learning', threshold: 0.05 } };
const TSV = { tsvTsv: 'learning' };

describe('cursor paging over search-ordered results', () => {
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

  it('last/before and first/after agree on a two-row page size', async () => {
    const all = await allIds(TRGM, ['TITLE_TRGM_SIMILARITY_DESC']);
    expect(await pageBackwards(TRGM, ['TITLE_TRGM_SIMILARITY_DESC'], 2)).toEqual(all);
    expect(await pageForwards(TRGM, ['TITLE_TRGM_SIMILARITY_DESC'], 2)).toEqual(all);
  });
});
