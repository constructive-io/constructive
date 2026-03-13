import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { TrgmSearchPreset } from '../src/preset';

interface AllProductsResult {
  allProducts: {
    nodes: Array<{
      rowId: number;
      name: string;
      description: string | null;
      category: string | null;
      nameTrgmSimilarity: number | null;
      descriptionTrgmSimilarity: number | null;
    }>;
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('TrgmSearchPlugin', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        ConnectionFilterPreset(),
        TrgmSearchPreset(),
      ],
    };

    const connections = await getConnections({
      schemas: ['trgm_test'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.sqlfile([join(__dirname, '../sql/setup.sql')])
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

  // ========================================================================
  // SCHEMA INTROSPECTION
  // ========================================================================
  describe('schema introspection', () => {
    it('exposes similarTo operator on StringFilter', async () => {
      const result = await query<{ __type: { inputFields: { name: string }[] } | null }>(`
        query {
          __type(name: "StringFilter") {
            inputFields { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('similarTo');
    });

    it('exposes wordSimilarTo operator on StringFilter', async () => {
      const result = await query<{ __type: { inputFields: { name: string }[] } | null }>(`
        query {
          __type(name: "StringFilter") {
            inputFields { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('wordSimilarTo');
    });

    it('exposes trgmName filter field on ProductFilter', async () => {
      const result = await query<{ __type: { inputFields: { name: string }[] } | null }>(`
        query {
          __type(name: "ProductFilter") {
            inputFields { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('trgmName');
      expect(fieldNames).toContain('trgmDescription');
    });

    it('exposes nameTrgmSimilarity computed field on Product type', async () => {
      const result = await query<{ __type: { fields: { name: string }[] } | null }>(`
        query {
          __type(name: "Product") {
            fields { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.fields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('nameTrgmSimilarity');
      expect(fieldNames).toContain('descriptionTrgmSimilarity');
    });
  });

  // ========================================================================
  // similarTo OPERATOR (via connectionFilterOperatorFactories on StringFilter)
  // ========================================================================
  describe('similarTo operator on StringFilter', () => {
    it('fuzzy matches with typo in name', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            name: { similarTo: { value: "Postgressql Databse", threshold: 0.2 } }
          }) {
            nodes {
              name
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      const names = nodes.map((n) => n.name);
      expect(names).toContain('PostgreSQL Database');
    });

    it('returns empty for very low similarity', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            name: { similarTo: { value: "zzzzzzz", threshold: 0.5 } }
          }) {
            nodes {
              name
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.allProducts?.nodes ?? []).toHaveLength(0);
    });
  });

  // ========================================================================
  // wordSimilarTo OPERATOR
  // ========================================================================
  describe('wordSimilarTo operator on StringFilter', () => {
    it('matches substring within longer text', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            name: { wordSimilarTo: { value: "Park", threshold: 0.3 } }
          }) {
            nodes {
              name
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      const names = nodes.map((n) => n.name);
      // "Central Park Cafe" and "Brooklyn Bridge Park" both contain "Park"
      expect(names.some((n) => n.includes('Park'))).toBe(true);
    });
  });

  // ========================================================================
  // trgmName FILTER FIELD (direct filter on LocationFilter)
  // ========================================================================
  describe('trgmName filter field', () => {
    it('fuzzy matches with direct trgm filter', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            trgmName: { value: "Postgressql Databse", threshold: 0.2 }
          }) {
            nodes {
              name
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].name).toBe('PostgreSQL Database');
    });

    it('returns nameTrgmSimilarity score when trgm filter is active', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            trgmName: { value: "database", threshold: 0.1 }
          }) {
            nodes {
              name
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);

      for (const node of nodes) {
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0);
        expect(node.nameTrgmSimilarity).toBeLessThanOrEqual(1);
      }
    });

    it('returns null for nameTrgmSimilarity when no trgm filter is active', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts {
            nodes {
              name
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);

      for (const node of nodes) {
        expect(node.nameTrgmSimilarity).toBeNull();
      }
    });

    it('uses default threshold of 0.3 when not specified', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            trgmName: { value: "PostgreSQL Database" }
          }) {
            nodes {
              name
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      // Should match with default threshold 0.3
      expect(nodes.length).toBeGreaterThan(0);
      // All returned should have similarity > 0.3
      for (const node of nodes) {
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0.3);
      }
    });
  });

  // ========================================================================
  // COMPOSABILITY
  // ========================================================================
  describe('composability', () => {
    it('combines trgm filter with scalar filter', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            trgmName: { value: "database", threshold: 0.1 }
            category: { equalTo: "database" }
          }) {
            nodes {
              name
              category
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(node.category).toBe('database');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0);
      }
    });

    it('works with pagination (first/offset)', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(
            filter: {
              trgmName: { value: "database", threshold: 0.1 }
            }
            first: 2
          ) {
            nodes {
              name
              nameTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeLessThanOrEqual(2);
    });

    it('works inside OR logical operator', async () => {
      const result = await query<AllProductsResult>(`
        query {
          allProducts(filter: {
            or: [
              { name: { similarTo: { value: "redis", threshold: 0.2 } } }
              { name: { similarTo: { value: "elasticsearch", threshold: 0.3 } } }
            ]
          }) {
            nodes {
              name
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allProducts?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      const names = nodes.map((n) => n.name);
      // Should find Redis Cache and/or Elasticsearch
      expect(names.some((n) => n.includes('Redis') || n.includes('Elasticsearch'))).toBe(true);
    });
  });
});
