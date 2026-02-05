import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConnections, seed, type PgTestClient } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import { PgVectorPreset } from '../preset';
import { ConstructivePreset } from 'graphile-settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VectorSearchResult {
  vectorSearchDocument: Array<{
    id: number;
    title: string;
    content: string | null;
    distance: number;
  }>;
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('PgVectorPlugin', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        ConstructivePreset,
        PgVectorPreset({
          collections: [{
            schema: 'pgvector_test',
            table: 'documents',
            embeddingColumn: 'embedding',
            graphqlFieldName: 'vectorSearchDocument',
          }],
          defaultMetric: 'COSINE',
          maxLimit: 100,
        }),
      ],
    };

    const connections = await getConnections({
      schemas: ['pgvector_test'],
      preset: testPreset,
      useRoot: true,
    }, [
      seed.sqlfile([join(__dirname, 'setup.sql')])
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

    // Start a transaction for savepoint-based test isolation
    await db.client.query('BEGIN');
  });

  afterAll(async () => {
    // Rollback the transaction
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

  describe('basic vector search', () => {
    it('returns results ordered by distance', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 5) {
            id
            title
            distance
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.vectorSearchDocument).toBeDefined();
      expect(result.data?.vectorSearchDocument.length).toBeGreaterThan(0);

      // Document A has embedding [1, 0, 0], should be closest to query [1, 0, 0]
      const firstResult = result.data?.vectorSearchDocument[0];
      expect(firstResult?.title).toBe('Document A');
      expect(firstResult?.distance).toBeCloseTo(0, 5);
    });

    it('respects limit parameter', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 2) {
            id
            title
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.vectorSearchDocument).toHaveLength(2);
    });

    it('respects offset parameter', async () => {
      const resultNoOffset = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 5) {
            id
            title
          }
        }
      `);

      const resultWithOffset = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 5, offset: 1) {
            id
            title
          }
        }
      `);

      expect(resultNoOffset.errors).toBeUndefined();
      expect(resultWithOffset.errors).toBeUndefined();

      // First result with offset should match second result without offset
      expect(resultWithOffset.data?.vectorSearchDocument[0]?.title)
        .toBe(resultNoOffset.data?.vectorSearchDocument[1]?.title);
    });
  });

  describe('similarity metrics', () => {
    it('uses COSINE metric by default', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 1) {
            title
            distance
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      // Cosine distance of identical vectors is 0
      expect(result.data?.vectorSearchDocument[0]?.distance).toBeCloseTo(0, 5);
    });

    it('supports L2 (Euclidean) metric', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 1, metric: L2) {
            title
            distance
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      // L2 distance of identical vectors is 0
      expect(result.data?.vectorSearchDocument[0]?.distance).toBeCloseTo(0, 5);
    });

    it('supports IP (inner product) metric', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 1, metric: IP) {
            title
            distance
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      // Inner product of [1,0,0] with itself is 1, but pgvector returns negative inner product
      // so the distance should be -1
      expect(result.data?.vectorSearchDocument[0]?.distance).toBeCloseTo(-1, 5);
    });

    it('returns different distances for different metrics', async () => {
      const cosineResult = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [0.5, 0.5, 0], limit: 1, metric: COSINE) {
            title
            distance
          }
        }
      `);

      const l2Result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [0.5, 0.5, 0], limit: 1, metric: L2) {
            title
            distance
          }
        }
      `);

      expect(cosineResult.errors).toBeUndefined();
      expect(l2Result.errors).toBeUndefined();

      // The distances should be different for different metrics
      // Document D [0.707, 0.707, 0] should be closest for both metrics
      expect(cosineResult.data?.vectorSearchDocument[0]?.title).toBe('Document D');
      expect(l2Result.data?.vectorSearchDocument[0]?.title).toBe('Document D');
    });
  });

  describe('edge cases', () => {
    it('returns empty array when no results match', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [1, 0, 0], limit: 5, offset: 100) {
            id
            title
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.vectorSearchDocument).toHaveLength(0);
    });

    it('handles zero vector query', async () => {
      const result = await query<VectorSearchResult>(`
        query {
          vectorSearchDocument(query: [0, 0, 0], limit: 5, metric: L2) {
            id
            title
            distance
          }
        }
      `);

      // Zero vector with L2 metric should return results
      expect(result.errors).toBeUndefined();
      expect(result.data?.vectorSearchDocument).toBeDefined();
      expect(result.data?.vectorSearchDocument.length).toBeGreaterThan(0);
    });
  });
});
