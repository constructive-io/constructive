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

interface DocumentNode {
  rowId: number;
  searchScore: number | null;
  bodyBm25Score: number | null;
  titleTrgmSimilarity: number | null;
}
type Result = { allDocuments: { nodes: DocumentNode[] } };
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const NODES = 'nodes { rowId searchScore bodyBm25Score titleTrgmSimilarity }';
const UNIFIED = { unifiedSearch: 'learning' };

function ids(nodes: DocumentNode[]) {
  return nodes.map((n) => n.rowId);
}

function sortedBy(nodes: DocumentNode[], field: keyof DocumentNode, direction: 'ASC' | 'DESC') {
  return [...nodes].sort((a, b) =>
    direction === 'ASC'
      ? (a[field] as number) - (b[field] as number)
      : (b[field] as number) - (a[field] as number),
  );
}

describe('SEARCH_SCORE ordering, scored-once columns and orderBy validation', () => {
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

  async function nodesFor(q: string, variables: Record<string, unknown> = {}) {
    const result = await query<Result>(q, variables);
    expect(result.errors).toBeUndefined();
    return result.data!.allDocuments.nodes;
  }

  describe('SEARCH_SCORE_ASC / SEARCH_SCORE_DESC', () => {
    it('orders by the composite searchScore with a literal orderBy', async () => {
      const desc = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC]) { ${NODES} } }`,
        { w: UNIFIED },
      );
      const asc = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_ASC]) { ${NODES} } }`,
        { w: UNIFIED },
      );

      expect(desc.length).toBeGreaterThan(2);
      expect(new Set(desc.map((n) => n.searchScore)).size).toBeGreaterThan(1);
      expect(ids(desc)).toEqual(ids(sortedBy(desc, 'searchScore', 'DESC')));
      expect(ids(asc)).toEqual(ids(sortedBy(asc, 'searchScore', 'ASC')));
      expect(ids(asc)).toEqual([...ids(desc)].reverse());
    });

    it('orders by the composite searchScore with a variable orderBy', async () => {
      const q = `query($w: DocumentFilter, $ob: [DocumentOrderBy!]) { allDocuments(where: $w, orderBy: $ob) { ${NODES} } }`;
      const desc = await nodesFor(q, { w: UNIFIED, ob: ['SEARCH_SCORE_DESC'] });
      const asc = await nodesFor(q, { w: UNIFIED, ob: ['SEARCH_SCORE_ASC'] });

      expect(ids(desc)).toEqual(ids(sortedBy(desc, 'searchScore', 'DESC')));
      expect(ids(asc)).toEqual([...ids(desc)].reverse());
    });

    it('first: N returns the N best rows by searchScore', async () => {
      const all = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC]) { ${NODES} } }`,
        { w: UNIFIED },
      );
      const top = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC], first: 2) { ${NODES} } }`,
        { w: UNIFIED },
      );
      expect(ids(top)).toEqual(ids(sortedBy(all, 'searchScore', 'DESC')).slice(0, 2));
    });

    it('orders by searchScore when several explicit filters are active', async () => {
      const where = {
        bm25Body: { query: 'learning' },
        trgmTitle: { value: 'Learning', threshold: 0.05 },
      };
      const desc = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC]) { ${NODES} } }`,
        { w: where },
      );
      expect(desc.length).toBeGreaterThan(2);
      expect(ids(desc)).toEqual(ids(sortedBy(desc, 'searchScore', 'DESC')));
    });
  });

  describe('a column filtered explicitly and by unifiedSearch is scored once', () => {
    // Both filters match rows 1, 2, 3 and 5; the explicit query scores
    // row 1 differently from unifiedSearch's "learning".
    const EXPLICIT = 'learning systems data';
    const where = { unifiedSearch: 'learning', bm25Body: { query: EXPLICIT } };

    async function explicitScores(): Promise<Map<number, number>> {
      const { rows } = await pg.query(
        `SELECT id, (body <@> to_bm25query($1, '"unified_search_test"."idx_documents_body_bm25"'))::float8 AS score
         FROM unified_search_test.documents`,
        [EXPLICIT],
      );
      return new Map(rows.map((r: any) => [r.id, Number(r.score)]));
    }

    it.each([
      ['literal', `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [BODY_BM25_SCORE_ASC]) { ${NODES} } }`, {}],
      ['variable', `query($w: DocumentFilter, $ob: [DocumentOrderBy!]) { allDocuments(where: $w, orderBy: $ob) { ${NODES} } }`, { ob: ['BODY_BM25_SCORE_ASC'] }],
    ])('%s orderBy: the explicit filter\'s score is displayed and drives the order', async (_label, q, extra) => {
      const expected = await explicitScores();
      const nodes = await nodesFor(q, { w: where, ...extra });

      expect(ids(nodes).sort()).toEqual([1, 2, 3, 5]);
      for (const node of nodes) {
        expect(node.bodyBm25Score).toBeCloseTo(expected.get(node.rowId)!, 6);
      }
      expect(ids(nodes)).toEqual(ids(sortedBy(nodes, 'bodyBm25Score', 'ASC')));
    });

    it('the explicit filter\'s score feeds searchScore whichever filter is listed first', async () => {
      const q = `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC]) { ${NODES} } }`;
      const explicitFirst = await nodesFor(q, { w: { bm25Body: { query: EXPLICIT }, unifiedSearch: 'learning' } });
      const unifiedFirst = await nodesFor(q, { w: { unifiedSearch: 'learning', bm25Body: { query: EXPLICIT } } });

      expect(ids(explicitFirst)).toEqual(ids(unifiedFirst));
      expect(explicitFirst.map((n) => n.searchScore)).toEqual(unifiedFirst.map((n) => n.searchScore));
      expect(ids(explicitFirst)).toEqual(ids(sortedBy(explicitFirst, 'searchScore', 'DESC')));
    });
  });

  describe('a search orderBy without its filter is an error', () => {
    async function errorFor(q: string, variables: Record<string, unknown> = {}) {
      const result = await query<Result>(q, variables);
      expect(result.errors).toBeDefined();
      return result.errors!.map((e: any) => e.message).join('\n');
    }

    it('per-adapter orderBy with no where names the filter it needs', async () => {
      const message = await errorFor(`{ allDocuments(orderBy: [BODY_BM25_SCORE_ASC]) { ${NODES} } }`);
      expect(message).toMatch(/BODY_BM25_SCORE_ASC/);
      expect(message).toMatch(/bm25Body/);
    });

    it('per-adapter orderBy with the wrong filter names the filter it needs', async () => {
      const message = await errorFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [TITLE_TRGM_SIMILARITY_DESC]) { ${NODES} } }`,
        { w: { bm25Body: { query: 'learning' } } },
      );
      expect(message).toMatch(/TITLE_TRGM_SIMILARITY_DESC/);
      expect(message).toMatch(/trgmTitle/);
    });

    it('SEARCH_SCORE orderBy with no search filter is an error', async () => {
      const message = await errorFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [SEARCH_SCORE_DESC]) { ${NODES} } }`,
        { w: { title: { equalTo: 'x' } } },
      );
      expect(message).toMatch(/SEARCH_SCORE_DESC/);
      expect(message).toMatch(/unifiedSearch/);
    });

    it('variable orderBy is validated too', async () => {
      const message = await errorFor(
        `query($ob: [DocumentOrderBy!]) { allDocuments(orderBy: $ob) { ${NODES} } }`,
        { ob: ['ROW_ID_ASC', 'TSV_RANK_DESC'] },
      );
      expect(message).toMatch(/TSV_RANK_DESC/);
      expect(message).toMatch(/tsvTsv/);
    });

    it('unifiedSearch satisfies the text adapters\' orderBy', async () => {
      const nodes = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [TITLE_TRGM_SIMILARITY_DESC]) { ${NODES} } }`,
        { w: UNIFIED },
      );
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('a filter nested under and/or satisfies its orderBy', async () => {
      const nodes = await nodesFor(
        `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [BODY_BM25_SCORE_ASC]) { ${NODES} } }`,
        { w: { or: [{ bm25Body: { query: 'learning' } }, { title: { equalTo: 'none' } }] } },
      );
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('a variable orderBy keeps a search term ahead of a column term', async () => {
      const nodes = await nodesFor(
        `query($w: DocumentFilter, $ob: [DocumentOrderBy!]) { allDocuments(where: $w, orderBy: $ob) { nodes { rowId searchScore bodyBm25Score titleTrgmSimilarity } } }`,
        { w: { trgmTitle: { value: 'Learning', threshold: 0.05 } }, ob: ['TITLE_TRGM_SIMILARITY_DESC', 'ROW_ID_ASC'] },
      );
      expect(ids(nodes)).toEqual(ids(sortedBy(nodes, 'titleTrgmSimilarity', 'DESC')));
      expect(ids(nodes)).not.toEqual([...ids(nodes)].sort((a, b) => a - b));
    });

    it('a plain column orderBy without any filter still works', async () => {
      const nodes = await nodesFor(`{ allDocuments(orderBy: [ROW_ID_DESC]) { ${NODES} } }`);
      expect(ids(nodes)).toEqual([5, 4, 3, 2, 1]);
    });
  });
});
