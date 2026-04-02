/**
 * Search Integration Tests
 *
 * Tests the unified search plugin (graphile-search) end-to-end against a real
 * PostgreSQL database with tsvector, pg_trgm, and pgvector columns.
 *
 * Uses a simple SQL fixture (search-seed) with an `articles` table containing:
 * - tsv (tsvector): auto-populated from title + body via trigger
 * - title, body (text): for pg_trgm fuzzy matching
 * - embedding (vector(3)): for pgvector similarity search
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=search.integration
 */

import path from 'path';
import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';
import type supertest from 'supertest';

jest.setTimeout(60000);

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) =>
  path.join(seedRoot, seedDir, file);

const schemas = ['search_public'];

describe('Unified Search — server integration', () => {
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let hasVector = false;

  const postGraphQL = (payload: {
    query: string;
    variables?: Record<string, unknown>;
  }) => request.post('/graphql').send(payload);

  beforeAll(async () => {
    ({ server, request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: { enableServicesApi: false, isPublic: false },
        },
      },
      [
        seed.sqlfile([
          sql('search-seed', 'setup.sql'),
          sql('search-seed', 'schema.sql'),
          sql('search-seed', 'test-data.sql'),
        ]),
      ]
    ));

    // Detect if pgvector is available by introspecting the schema
    const introspection = await postGraphQL({
      query: `{
        __type(name: "Article") {
          fields { name }
        }
      }`,
    });
    const fieldNames =
      introspection.body.data?.__type?.fields?.map(
        (f: { name: string }) => f.name
      ) ?? [];
    hasVector = fieldNames.includes('embeddingVectorDistance');
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  // ===========================================================================
  // Basic connectivity
  // ===========================================================================

  it('should query all articles', async () => {
    const res = await postGraphQL({
      query: '{ articles { nodes { id title body } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.articles.nodes).toHaveLength(5);
  });

  // ===========================================================================
  // tsvector full-text search
  // ===========================================================================

  describe('tsvector search', () => {
    it('should filter articles by tsvector search (tsvTsv)', async () => {
      const res = await postGraphQL({
        query: `{
          articles(where: { tsvTsv: "machine learning" }) {
            nodes { title tsvRank }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // The "Introduction to Machine Learning" article should match
      const titles = nodes.map((n: { title: string }) => n.title);
      expect(titles).toContain('Introduction to Machine Learning');

      // tsvRank should be a number when search is active
      for (const node of nodes) {
        expect(typeof node.tsvRank).toBe('number');
        expect(node.tsvRank).toBeGreaterThan(0);
      }
    });

    it('should return tsvRank as null when no tsvector filter is active', async () => {
      const res = await postGraphQL({
        query: `{
          articles(first: 1) {
            nodes { title tsvRank }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles.nodes[0].tsvRank).toBeNull();
    });

    it('should order by TSV_RANK_DESC', async () => {
      const res = await postGraphQL({
        query: `{
          articles(
            where: { tsvTsv: "PostgreSQL search" }
            orderBy: TSV_RANK_DESC
          ) {
            nodes { title tsvRank }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // Verify descending order
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i - 1].tsvRank).toBeGreaterThanOrEqual(nodes[i].tsvRank);
      }
    });
  });

  // ===========================================================================
  // pg_trgm fuzzy matching
  // ===========================================================================

  describe('pg_trgm fuzzy matching', () => {
    it('should filter articles by trgm similarity on title (trgmTitle)', async () => {
      const res = await postGraphQL({
        query: `{
          articles(where: { trgmTitle: { value: "machin lerning", threshold: 0.1 } }) {
            nodes { title titleTrgmSimilarity }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // Similarity scores should be numbers between 0 and 1
      for (const node of nodes) {
        expect(typeof node.titleTrgmSimilarity).toBe('number');
        expect(node.titleTrgmSimilarity).toBeGreaterThan(0);
        expect(node.titleTrgmSimilarity).toBeLessThanOrEqual(1);
      }
    });

    it('should filter by trgm on body (trgmBody)', async () => {
      const res = await postGraphQL({
        query: `{
          articles(where: { trgmBody: { value: "neural networks", threshold: 0.1 } }) {
            nodes { title bodyTrgmSimilarity }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      for (const node of nodes) {
        expect(typeof node.bodyTrgmSimilarity).toBe('number');
        expect(node.bodyTrgmSimilarity).toBeGreaterThan(0);
      }
    });

    it('should order by TITLE_TRGM_SIMILARITY_DESC', async () => {
      const res = await postGraphQL({
        query: `{
          articles(
            where: { trgmTitle: { value: "PostgreSQL", threshold: 0.05 } }
            orderBy: TITLE_TRGM_SIMILARITY_DESC
          ) {
            nodes { title titleTrgmSimilarity }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      // Verify descending order
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i - 1].titleTrgmSimilarity).toBeGreaterThanOrEqual(
          nodes[i].titleTrgmSimilarity
        );
      }
    });
  });

  // ===========================================================================
  // pgvector similarity search (conditional — only if extension available)
  // ===========================================================================

  describe('pgvector similarity search', () => {
    it('should filter by vector similarity (vectorEmbedding)', async () => {
      if (!hasVector) {
        console.log('pgvector not available, skipping');
        return;
      }

      const res = await postGraphQL({
        query: `{
          articles(where: { vectorEmbedding: { vector: [0.1, 0.9, 0.3], distance: 1.0 } }) {
            nodes { title embeddingVectorDistance }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // Distance should be a number >= 0
      for (const node of nodes) {
        expect(typeof node.embeddingVectorDistance).toBe('number');
        expect(node.embeddingVectorDistance).toBeGreaterThanOrEqual(0);
        expect(node.embeddingVectorDistance).toBeLessThanOrEqual(1.0);
      }
    });

    it('should order by EMBEDDING_VECTOR_DISTANCE_ASC', async () => {
      if (!hasVector) {
        console.log('pgvector not available, skipping');
        return;
      }

      const res = await postGraphQL({
        query: `{
          articles(
            where: { vectorEmbedding: { vector: [0.5, 0.5, 0.5] } }
            orderBy: EMBEDDING_VECTOR_DISTANCE_ASC
          ) {
            nodes { title embeddingVectorDistance }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      // Verify ascending order (closest first)
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i].embeddingVectorDistance).toBeGreaterThanOrEqual(
          nodes[i - 1].embeddingVectorDistance
        );
      }
    });
  });

  // ===========================================================================
  // Composite: searchScore + unifiedSearch
  // ===========================================================================

  describe('composite search', () => {
    it('should expose searchScore when any search filter is active', async () => {
      const res = await postGraphQL({
        query: `{
          articles(where: { tsvTsv: "machine learning" }) {
            nodes { title searchScore }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      for (const node of nodes) {
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThan(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
    });

    it('should return searchScore as null when no search filter is active', async () => {
      const res = await postGraphQL({
        query: `{
          articles(first: 1) {
            nodes { title searchScore }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles.nodes[0].searchScore).toBeNull();
    });

        it('should filter via unifiedSearch composite filter', async () => {
          const res = await postGraphQL({
            query: `{
              articles(where: { unifiedSearch: "vector databases" }) {
            nodes { title tsvRank searchScore }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // unifiedSearch dispatches to all text-capable adapters (tsv + trgm)
      const titles = nodes.map((n: { title: string }) => n.title);
      expect(titles).toContain('Vector Databases and Embeddings');
    });

    it('should order by SEARCH_SCORE_DESC', async () => {
      const res = await postGraphQL({
        query: `{
          articles(
            where: { unifiedSearch: "PostgreSQL search" }
            orderBy: SEARCH_SCORE_DESC
          ) {
            nodes { title searchScore }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // Verify descending order
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i - 1].searchScore).toBeGreaterThanOrEqual(
          nodes[i].searchScore
        );
      }
    });
  });

  // ===========================================================================
  // Mega Query v1 — per-algorithm filters + manual orderBy
  // ===========================================================================

  describe('Mega Query v1 — per-algorithm filters', () => {
    it('should combine tsvector + trgm filters with multi-column ordering', async () => {
      const res = await postGraphQL({
        query: `{
          articles(
            where: {
              tsvTsv: "search"
              trgmTitle: { value: "PostgreSQL", threshold: 0.05 }
            }
            orderBy: [TSV_RANK_DESC, TITLE_TRGM_SIMILARITY_DESC]
          ) {
            nodes {
              title
              tsvRank
              titleTrgmSimilarity
              bodyTrgmSimilarity
              searchScore
            }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // All score fields should be populated
      for (const node of nodes) {
        expect(typeof node.tsvRank).toBe('number');
        expect(typeof node.titleTrgmSimilarity).toBe('number');
        expect(typeof node.searchScore).toBe('number');
      }
    });

    it('should combine tsvector + trgm + vector filters (full mega query v1)', async () => {
      if (!hasVector) {
        console.log('pgvector not available, skipping full mega query v1');
        return;
      }

      const res = await postGraphQL({
        query: `{
          articles(
            where: {
              tsvTsv: "search"
              trgmTitle: { value: "PostgreSQL", threshold: 0.05 }
              vectorEmbedding: { vector: [0.8, 0.2, 0.5] }
            }
            orderBy: [TSV_RANK_DESC, TITLE_TRGM_SIMILARITY_DESC, EMBEDDING_VECTOR_DISTANCE_ASC]
          ) {
            nodes {
              title
              tsvRank
              titleTrgmSimilarity
              bodyTrgmSimilarity
              embeddingVectorDistance
              searchScore
            }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      // May have 0 results if the intersection of all 3 filters is empty —
      // the important thing is no errors and all fields resolve correctly
      for (const node of nodes) {
        expect(typeof node.tsvRank).toBe('number');
        expect(typeof node.titleTrgmSimilarity).toBe('number');
        expect(typeof node.embeddingVectorDistance).toBe('number');
        expect(typeof node.searchScore).toBe('number');
      }
    });
  });

  // ===========================================================================
  // Mega Query v2 — unifiedSearch composite + orderBy SEARCH_SCORE_DESC
  // ===========================================================================

    describe('Mega Query v2 — unifiedSearch composite', () => {
      it('should use unifiedSearch + SEARCH_SCORE_DESC', async () => {
        const res = await postGraphQL({
          query: `{
            articles(
              where: { unifiedSearch: "machine learning" }
            orderBy: SEARCH_SCORE_DESC
          ) {
            nodes {
              title
              tsvRank
              titleTrgmSimilarity
              bodyTrgmSimilarity
              searchScore
            }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      // "Introduction to Machine Learning" should be the top result
      expect(nodes[0].title).toBe('Introduction to Machine Learning');

      // All text-search score fields should be populated
      for (const node of nodes) {
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThan(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }

      // Verify descending order by searchScore
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i - 1].searchScore).toBeGreaterThanOrEqual(
          nodes[i].searchScore
        );
      }
    });

    it('should combine unifiedSearch + vector filter + mixed orderBy', async () => {
      if (!hasVector) {
        console.log('pgvector not available, skipping mega query v2 with vector');
        return;
      }

      const res = await postGraphQL({
        query: `{
          articles(
            where: {
              unifiedSearch: "machine learning"
              vectorEmbedding: { vector: [0.1, 0.9, 0.3] }
            }
            orderBy: [SEARCH_SCORE_DESC, EMBEDDING_VECTOR_DISTANCE_ASC]
          ) {
            nodes {
              title
              tsvRank
              titleTrgmSimilarity
              bodyTrgmSimilarity
              embeddingVectorDistance
              searchScore
            }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data.articles.nodes;
      // All fields should resolve without errors
      for (const node of nodes) {
        if (node.tsvRank != null) expect(typeof node.tsvRank).toBe('number');
        if (node.embeddingVectorDistance != null) {
          expect(typeof node.embeddingVectorDistance).toBe('number');
        }
        expect(typeof node.searchScore).toBe('number');
      }
    });
  });

  // ===========================================================================
  // Schema introspection — verify field presence
  // ===========================================================================

  describe('Schema introspection', () => {
    it('should expose expected search fields on Article type', async () => {
      const res = await postGraphQL({
        query: `{
          __type(name: "Article") {
            fields { name type { name kind ofType { name } } }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const fields = res.body.data.__type.fields;
      const fieldNames = fields.map((f: { name: string }) => f.name);

      // Core fields
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('body');

      // tsvector score fields
      expect(fieldNames).toContain('tsvRank');

      // trgm score fields
      expect(fieldNames).toContain('titleTrgmSimilarity');
      expect(fieldNames).toContain('bodyTrgmSimilarity');

      // composite
      expect(fieldNames).toContain('searchScore');

      // pgvector (conditional)
      if (hasVector) {
        expect(fieldNames).toContain('embeddingVectorDistance');
      }
    });

    it('should expose expected filter fields on ArticleFilter type', async () => {
      const res = await postGraphQL({
        query: `{
          __type(name: "ArticleFilter") {
            inputFields { name type { name kind ofType { name } } }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const inputFields = res.body.data.__type.inputFields;
      const fieldNames = inputFields.map((f: { name: string }) => f.name);

      // tsvector filter
      expect(fieldNames).toContain('tsvTsv');

      // trgm filters
      expect(fieldNames).toContain('trgmTitle');
      expect(fieldNames).toContain('trgmBody');

      // composite
      expect(fieldNames).toContain('unifiedSearch');

      // pgvector (conditional)
      if (hasVector) {
        expect(fieldNames).toContain('vectorEmbedding');
      }
    });

    it('should expose expected orderBy enum values', async () => {
      const res = await postGraphQL({
        query: `{
          __type(name: "ArticleOrderBy") {
            enumValues { name }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const enumNames = res.body.data.__type.enumValues.map(
        (v: { name: string }) => v.name
      );

      // tsvector orderBy
      expect(enumNames).toContain('TSV_RANK_ASC');
      expect(enumNames).toContain('TSV_RANK_DESC');

      // trgm orderBy
      expect(enumNames).toContain('TITLE_TRGM_SIMILARITY_ASC');
      expect(enumNames).toContain('TITLE_TRGM_SIMILARITY_DESC');
      expect(enumNames).toContain('BODY_TRGM_SIMILARITY_ASC');
      expect(enumNames).toContain('BODY_TRGM_SIMILARITY_DESC');

      // composite
      expect(enumNames).toContain('SEARCH_SCORE_ASC');
      expect(enumNames).toContain('SEARCH_SCORE_DESC');

      // pgvector (conditional)
      if (hasVector) {
        expect(enumNames).toContain('EMBEDDING_VECTOR_DISTANCE_ASC');
        expect(enumNames).toContain('EMBEDDING_VECTOR_DISTANCE_DESC');
      }
    });
  });
});
