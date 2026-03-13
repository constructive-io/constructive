import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { Bm25CodecPlugin } from '../bm25-codec';
import { createBm25SearchPlugin } from '../bm25-search';

interface AllArticlesResult {
  allArticles: {
    nodes: Array<{
      rowId: number;
      title: string;
      body: string;
      category: string | null;
      bodyBm25Score: number | null;
      titleBm25Score: number | null;
    }>;
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('Bm25SearchPlugin', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        ConnectionFilterPreset(),
      ],
      plugins: [
        Bm25CodecPlugin,
        createBm25SearchPlugin({ filterPrefix: 'bm25' }),
      ],
    };

    const connections = await getConnections({
      schemas: ['bm25_test'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.sqlfile([join(__dirname, './setup.sql')])
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

    // Start a transaction for savepoint-based test isolation
    await db.client.query('BEGIN');
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
    }

    if (teardown) {
      await teardown();
    }
  });

  beforeEach(async () => {
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
  });

  describe('filter field (bm25Body)', () => {
    // Note: filter fields keep {algo}{Column} pattern (algo first)
    it('performs BM25 search with a query string', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(filter: {
            bm25Body: {
              query: "database management system"
            }
          }) {
            nodes {
              title
              body
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      // Should return articles that match "database management system"
      // BM25 scores are negative, more negative = more relevant
      expect(nodes!.length).toBeGreaterThan(0);
    });

    it('returns bodyBm25Score computed field when filter is active', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(filter: {
            bm25Body: {
              query: "database"
            }
          }) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All nodes should have a BM25 score since the filter is active
      for (const node of nodes!) {
        expect(node.bodyBm25Score).toBeDefined();
        expect(typeof node.bodyBm25Score).toBe('number');
        // BM25 scores are negative
        expect(node.bodyBm25Score).toBeLessThan(0);
      }
    });

    it('returns null for bodyBm25Score when no filter is active', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      for (const node of nodes!) {
        expect(node.bodyBm25Score).toBeNull();
      }
    });

    it('filters by score threshold', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(filter: {
            bm25Body: {
              query: "database"
              threshold: -0.5
            }
          }) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All returned scores should be <= -0.5 (more relevant than threshold)
      for (const node of nodes!) {
        expect(node.bodyBm25Score).toBeLessThan(-0.5);
      }
    });
  });

  describe('multiple BM25-indexed columns', () => {
    it('discovers BM25 indexes on both title and body columns', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(filter: {
            bm25Title: {
              query: "PostgreSQL"
            }
          }) {
            nodes {
              title
              titleBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // All nodes should have a title BM25 score
      for (const node of nodes!) {
        expect(node.titleBm25Score).toBeDefined();
        expect(typeof node.titleBm25Score).toBe('number');
        expect(node.titleBm25Score).toBeLessThan(0);
      }
    });
  });

  describe('orderBy (BODY_BM25_SCORE_ASC/DESC)', () => {
    it('orders by BM25 score ascending (best matches first)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            filter: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Should be ordered by score ascending (most negative first = best matches first)
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].bodyBm25Score).toBeLessThanOrEqual(
          nodes![i + 1].bodyBm25Score!
        );
      }
    });

    it('orders by BM25 score descending (worst matches first)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            filter: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BODY_BM25_SCORE_DESC
          ) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Should be ordered by score descending (least negative first = worst matches first)
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].bodyBm25Score).toBeGreaterThanOrEqual(
          nodes![i + 1].bodyBm25Score!
        );
      }
    });
  });

  describe('composability', () => {
    it('combines BM25 search with score threshold and ordering', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            filter: {
              bm25Body: {
                query: "search ranking"
                threshold: -0.1
              }
            }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All returned scores should be < threshold
      for (const node of nodes!) {
        expect(node.bodyBm25Score).toBeLessThan(-0.1);
      }

      // Should be ordered
      if (nodes!.length > 1) {
        for (let i = 0; i < nodes!.length - 1; i++) {
          expect(nodes![i].bodyBm25Score).toBeLessThanOrEqual(
            nodes![i + 1].bodyBm25Score!
          );
        }
      }
    });

    it('works with pagination (first/offset)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            filter: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BODY_BM25_SCORE_ASC
            first: 2
          ) {
            nodes {
              title
              bodyBm25Score
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeLessThanOrEqual(2);
    });
  });
});
