import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { Bm25CodecPlugin } from '../bm25-codec';
import { createBm25SearchPlugin } from '../bm25-search';

interface AllArticlesResult {
  allArticles: {
    nodes: Array<{
      rowId: number;
      title: string;
      body: string;
      category: string | null;
      bm25BodyScore: number | null;
      bm25TitleScore: number | null;
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
      plugins: [
        Bm25CodecPlugin,
        createBm25SearchPlugin({ conditionPrefix: 'bm25' }),
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

  describe('condition field (bm25Body)', () => {
    it('performs BM25 search with a query string', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(condition: {
            bm25Body: {
              query: "database management system"
            }
          }) {
            nodes {
              title
              body
              bm25BodyScore
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

    it('returns bm25BodyScore computed field when condition is active', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(condition: {
            bm25Body: {
              query: "database"
            }
          }) {
            nodes {
              title
              bm25BodyScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All nodes should have a BM25 score since the condition is active
      for (const node of nodes!) {
        expect(node.bm25BodyScore).toBeDefined();
        expect(typeof node.bm25BodyScore).toBe('number');
        // BM25 scores are negative
        expect(node.bm25BodyScore).toBeLessThan(0);
      }
    });

    it('returns null for bm25BodyScore when no condition is active', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles {
            nodes {
              title
              bm25BodyScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      for (const node of nodes!) {
        expect(node.bm25BodyScore).toBeNull();
      }
    });

    it('filters by score threshold', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(condition: {
            bm25Body: {
              query: "database"
              threshold: -0.5
            }
          }) {
            nodes {
              title
              bm25BodyScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All returned scores should be <= -0.5 (more relevant than threshold)
      for (const node of nodes!) {
        expect(node.bm25BodyScore).toBeLessThan(-0.5);
      }
    });
  });

  describe('multiple BM25-indexed columns', () => {
    it('discovers BM25 indexes on both title and body columns', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(condition: {
            bm25Title: {
              query: "PostgreSQL"
            }
          }) {
            nodes {
              title
              bm25TitleScore
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
        expect(node.bm25TitleScore).toBeDefined();
        expect(typeof node.bm25TitleScore).toBe('number');
        expect(node.bm25TitleScore).toBeLessThan(0);
      }
    });
  });

  describe('orderBy (BM25_BODY_SCORE_ASC/DESC)', () => {
    it('orders by BM25 score ascending (best matches first)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            condition: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BM25_BODY_SCORE_ASC
          ) {
            nodes {
              title
              bm25BodyScore
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
        expect(nodes![i].bm25BodyScore).toBeLessThanOrEqual(
          nodes![i + 1].bm25BodyScore!
        );
      }
    });

    it('orders by BM25 score descending (worst matches first)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            condition: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BM25_BODY_SCORE_DESC
          ) {
            nodes {
              title
              bm25BodyScore
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
        expect(nodes![i].bm25BodyScore).toBeGreaterThanOrEqual(
          nodes![i + 1].bm25BodyScore!
        );
      }
    });
  });

  describe('composability', () => {
    it('combines BM25 search with score threshold and ordering', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            condition: {
              bm25Body: {
                query: "search ranking"
                threshold: -0.1
              }
            }
            orderBy: BM25_BODY_SCORE_ASC
          ) {
            nodes {
              title
              bm25BodyScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();

      // All returned scores should be < threshold
      for (const node of nodes!) {
        expect(node.bm25BodyScore).toBeLessThan(-0.1);
      }

      // Should be ordered
      if (nodes!.length > 1) {
        for (let i = 0; i < nodes!.length - 1; i++) {
          expect(nodes![i].bm25BodyScore).toBeLessThanOrEqual(
            nodes![i + 1].bm25BodyScore!
          );
        }
      }
    });

    it('works with pagination (first/offset)', async () => {
      const result = await query<AllArticlesResult>(`
        query {
          allArticles(
            condition: {
              bm25Body: {
                query: "database"
              }
            }
            orderBy: BM25_BODY_SCORE_ASC
            first: 2
          ) {
            nodes {
              title
              bm25BodyScore
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
