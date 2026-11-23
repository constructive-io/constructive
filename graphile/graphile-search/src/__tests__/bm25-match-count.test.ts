import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { createBm25Adapter } from '../adapters/bm25';
import { createTrgmAdapter } from '../adapters/trgm';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { Bm25CodecPlugin } from '../codecs/bm25-codec';
import { TsvectorCodecPlugin } from '../codecs/tsvector-codec';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

interface Result {
  allDocuments: { totalCount: number; nodes: Array<{ rowId: number; bodyBm25Score: number | null }> };
}
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const Q = `
  query($w: DocumentFilter, $ob: [DocumentOrderBy!]) {
    allDocuments(where: $w, orderBy: $ob) { totalCount nodes { rowId bodyBm25Score } }
  }
`;

// Row 4 ("Computer Vision and Image Recognition") is the only row whose body
// does not contain "learning".
const MATCHING = [1, 2, 3, 5];

describe('bm25 filter without a threshold', () => {
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
            adapters: [createTsvectorAdapter(), createBm25Adapter(), createTrgmAdapter({ defaultThreshold: 0.1 })],
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

  async function run(variables: Record<string, unknown>) {
    const result = await query<Result>(Q, variables);
    expect(result.errors).toBeUndefined();
    return result.data!.allDocuments;
  }

  function expectMatchingRowsOnly(connection: Result['allDocuments']) {
    expect(connection.nodes.map((n) => n.rowId).sort()).toEqual(MATCHING);
    expect(connection.totalCount).toBe(connection.nodes.length);
    for (const node of connection.nodes) {
      expect(node.bodyBm25Score).toBeLessThan(0);
    }
  }

  describe.each([
    ['bm25 index scan allowed', true],
    ['index scans disabled (seq scan + sort)', false],
  ])('%s', (_label, indexAllowed) => {
    beforeAll(async () => {
      if (!indexAllowed) {
        await pg.query('SET enable_indexscan = off; SET enable_bitmapscan = off');
      }
    });
    afterAll(async () => {
      if (!indexAllowed) {
        await pg.query('RESET enable_indexscan; RESET enable_bitmapscan');
      }
    });

    it('returns only matching rows and totalCount agrees with nodes', async () => {
      expectMatchingRowsOnly(await run({ w: { bm25Body: { query: 'learning' } } }));
    });

    it('does the same when ordered by the bm25 score', async () => {
      const connection = await run({ w: { bm25Body: { query: 'learning' } }, ob: ['BODY_BM25_SCORE_ASC'] });
      expectMatchingRowsOnly(connection);
      const scores = connection.nodes.map((n) => n.bodyBm25Score as number);
      expect(scores).toEqual([...scores].sort((a, b) => a - b));
    });

    it('does the same through unifiedSearch', async () => {
      const connection = await run({ w: { unifiedSearch: 'reinforcement' } });
      expect(connection.totalCount).toBe(connection.nodes.length);
      expect(connection.nodes.map((n) => n.rowId)).toEqual([5]);
    });
  });

  it('threshold is a maximum score: a row scoring exactly the threshold is kept', async () => {
    const all = await run({ w: { bm25Body: { query: 'learning' } }, ob: ['BODY_BM25_SCORE_ASC'] });
    const boundary = all.nodes[1];
    const kept = await run({ w: { bm25Body: { query: 'learning', threshold: boundary.bodyBm25Score } } });
    expect(kept.nodes.map((n) => n.rowId).sort()).toEqual([all.nodes[0].rowId, boundary.rowId].sort());
    expect(kept.totalCount).toBe(2);
  });
});
