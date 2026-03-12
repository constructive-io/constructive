import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { VectorCodecPreset } from '../vector-codec';
import { createVectorSearchPlugin } from '../vector-search';

interface AllDocumentsResult {
  allDocuments: {
    nodes: Array<{
      rowId: number;
      title: string;
      content: string | null;
      embedding: number[];
      embeddingDistance: number | null;
    }>;
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('VectorSearchPlugin', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        ConnectionFilterPreset(),
        VectorCodecPreset,
        {
          plugins: [createVectorSearchPlugin({ defaultMetric: 'COSINE' })],
        },
      ],
    };

    const connections = await getConnections({
      schemas: ['pgvector_test'],
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

  describe('filter field (vectorEmbedding)', () => {
    it('filters by vector similarity with distance threshold', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(filter: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: COSINE
              distance: 0.5
            }
          }) {
            nodes {
              rowId
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // Document A [1,0,0] is identical to query — distance ~0
      // Only docs within distance 0.5 should be returned
      const titles = nodes!.map(n => n.title);
      expect(titles).toContain('Document A');
    });

    it('returns embeddingDistance computed field when filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(filter: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: COSINE
            }
          }) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      // All nodes should have a distance value since the condition is active
      for (const node of nodes!) {
        expect(node.embeddingDistance).toBeDefined();
        expect(typeof node.embeddingDistance).toBe('number');
      }

      // Document A [1,0,0] should have distance ~0 to query [1,0,0]
      const docA = nodes!.find(n => n.title === 'Document A');
      expect(docA).toBeDefined();
      expect(docA!.embeddingDistance).toBeCloseTo(0, 2);
    });

    it('returns null for embeddingDistance when no filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      for (const node of nodes!) {
        expect(node.embeddingDistance).toBeNull();
      }
    });

    it('supports L2 metric', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(filter: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: L2
            }
          }) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      // L2 distance of identical vectors is 0
      const docA = nodes!.find(n => n.title === 'Document A');
      expect(docA).toBeDefined();
      expect(docA!.embeddingDistance).toBeCloseTo(0, 2);
    });

    it('supports IP metric', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(filter: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: IP
            }
          }) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      // Inner product of [1,0,0] with itself is 1, pgvector returns negative: -1
      const docA = nodes!.find(n => n.title === 'Document A');
      expect(docA).toBeDefined();
      expect(docA!.embeddingDistance).toBeCloseTo(-1, 2);
    });
  });

  describe('orderBy (EMBEDDING_DISTANCE_ASC/DESC)', () => {
    it('orders by distance ascending when filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            filter: {
              vectorEmbedding: {
                vector: [1, 0, 0]
                metric: COSINE
              }
            }
            orderBy: EMBEDDING_DISTANCE_ASC
          ) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Should be ordered by distance ascending (closest first)
      // Document A [1,0,0] should be first (distance ~0)
      expect(nodes![0].title).toBe('Document A');

      // Verify ordering: each distance should be <= next
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].embeddingDistance).toBeLessThanOrEqual(
          nodes![i + 1].embeddingDistance!
        );
      }
    });

    it('orders by distance descending when filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            filter: {
              vectorEmbedding: {
                vector: [1, 0, 0]
                metric: COSINE
              }
            }
            orderBy: EMBEDDING_DISTANCE_DESC
          ) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Should be ordered by distance descending (farthest first)
      // Document A [1,0,0] should be last (distance ~0)
      expect(nodes![nodes!.length - 1].title).toBe('Document A');

      // Verify ordering: each distance should be >= next
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].embeddingDistance).toBeGreaterThanOrEqual(
          nodes![i + 1].embeddingDistance!
        );
      }
    });
  });

  describe('composability', () => {
    it('combines vector distance threshold with ordering', async () => {
      // Use a tight distance threshold to filter, then order by distance
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            filter: {
              vectorEmbedding: {
                vector: [1, 0, 0]
                metric: COSINE
                distance: 0.5
              }
            }
            orderBy: EMBEDDING_DISTANCE_ASC
          ) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      // Only documents within cosine distance 0.5 of [1,0,0] should be returned
      // Document A [1,0,0] → distance ~0 (included)
      // Document D [0.707,0.707,0] → distance ~0.293 (included)
      // Document E [0.577,0.577,0.577] → distance ~0.423 (included)
      // Document B [0,1,0] → distance ~1.0 (excluded)
      // Document C [0,0,1] → distance ~1.0 (excluded)
      expect(nodes!.length).toBeGreaterThanOrEqual(1);
      expect(nodes!.length).toBeLessThanOrEqual(3);

      // First result should be closest: Document A
      expect(nodes![0].title).toBe('Document A');

      // All returned distances should be <= 0.5
      for (const node of nodes!) {
        expect(node.embeddingDistance).toBeLessThanOrEqual(0.5);
      }
    });

    it('works with pagination (first/offset)', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            filter: {
              vectorEmbedding: {
                vector: [1, 0, 0]
                metric: COSINE
              }
            }
            orderBy: EMBEDDING_DISTANCE_ASC
            first: 2
          ) {
            nodes {
              title
              embeddingDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBe(2);
      // Closest should be Document A
      expect(nodes![0].title).toBe('Document A');
    });
  });
});
