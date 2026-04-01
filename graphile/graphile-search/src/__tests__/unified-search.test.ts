import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { Bm25CodecPlugin } from '../codecs/bm25-codec';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { TsvectorCodecPlugin } from '../codecs/tsvector-codec';
import { createUnifiedSearchPlugin } from '../plugin';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { createBm25Adapter } from '../adapters/bm25';
import { createTrgmAdapter } from '../adapters/trgm';
import { createPgvectorAdapter } from '../adapters/pgvector';

// ─── Result types ────────────────────────────────────────────────────────────

interface DocumentNode {
  rowId: number;
  title: string;
  body: string;
  // tsvector score (ts_rank)
  tsvRank: number | null;
  // BM25 score (negative, more negative = more relevant)
  bodyBm25Score: number | null;
  // pg_trgm similarity (0..1)
  titleTrgmSimilarity: number | null;
  // pgvector distance (cosine, lower = closer)
  embeddingVectorDistance: number | null;
  // Composite search score (0..1, higher = more relevant)
  searchScore: number | null;
}

interface AllDocumentsResult {
  allDocuments: {
    nodes: DocumentNode[];
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('graphile-search (unified search plugin)', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    // Build the unified search plugin with all 4 adapters
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableFullTextSearch: true,
    });

    const testPreset = {
      extends: [
        ConnectionFilterPreset(),
      ],
      plugins: [
        // Codec plugins must load first (gather phase discovers types & indexes)
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
        // The unified search plugin (wires all adapters into hooks)
        unifiedPlugin,
      ],
    };

    const connections = await getConnections({
      schemas: ['unified_search_test'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.sqlfile([join(__dirname, './setup.sql')])
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

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

  // ─── tsvector adapter ────────────────────────────────────────────────────

  describe('tsvector adapter (tsvTsv filter)', () => {
    it('filters by full-text search and returns tsvRank score', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            tsvTsv: "machine learning"
          }) {
            nodes {
              title
              tsvRank
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // All returned rows should have a ts_rank score
      for (const node of nodes!) {
        expect(typeof node.tsvRank).toBe('number');
        expect(node.tsvRank).toBeGreaterThan(0);
      }
    });

    it('returns null tsvRank when no tsvector filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(first: 1) {
            nodes {
              title
              tsvRank
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      for (const node of nodes!) {
        expect(node.tsvRank).toBeNull();
      }
    });
  });

  // ─── BM25 adapter ───────────────────────────────────────────────────────

  describe('BM25 adapter (bm25Body filter)', () => {
    it('filters by BM25 search and returns bodyBm25Score', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            bm25Body: {
              query: "machine learning intelligence"
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
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // BM25 scores are negative (more negative = more relevant)
      for (const node of nodes!) {
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(node.bodyBm25Score).toBeLessThan(0);
      }
    });

    it('applies BM25 threshold filter', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            bm25Body: {
              query: "learning"
              threshold: -0.1
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
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      for (const node of nodes!) {
        expect(node.bodyBm25Score).toBeLessThan(-0.1);
      }
    });
  });

  // ─── pg_trgm adapter ────────────────────────────────────────────────────

  describe('pg_trgm adapter (trgmTitle filter)', () => {
    it('filters by trigram similarity and returns titleTrgmSimilarity', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            trgmTitle: {
              value: "Machine Learnng"
            }
          }) {
            nodes {
              title
              titleTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // Similarity is 0..1, higher = more similar
      for (const node of nodes!) {
        expect(typeof node.titleTrgmSimilarity).toBe('number');
        expect(node.titleTrgmSimilarity).toBeGreaterThan(0);
        expect(node.titleTrgmSimilarity).toBeLessThanOrEqual(1);
      }
    });

    it('handles typos gracefully (fuzzy matching)', async () => {
      // "Machne Lerning" has typos but should still match "Machine Learning"
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            trgmTitle: {
              value: "Machne Lerning"
              threshold: 0.05
            }
          }) {
            nodes {
              title
              titleTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);
    });
  });

  // ─── pgvector adapter ───────────────────────────────────────────────────

  describe('pgvector adapter (vectorEmbedding filter)', () => {
    it('filters by vector similarity and returns embeddingVectorDistance', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: COSINE
            }
          }) {
            nodes {
              title
              embeddingVectorDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // Distance >= 0 (lower = closer)
      for (const node of nodes!) {
        expect(typeof node.embeddingVectorDistance).toBe('number');
        expect(node.embeddingVectorDistance).toBeGreaterThanOrEqual(0);
      }
    });

    it('applies distance threshold filter', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            vectorEmbedding: {
              vector: [1, 0, 0]
              metric: COSINE
              distance: 0.5
            }
          }) {
            nodes {
              title
              embeddingVectorDistance
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();

      // All returned rows should be within threshold
      for (const node of nodes!) {
        expect(node.embeddingVectorDistance).toBeLessThanOrEqual(0.5);
      }
    });
  });

  // ─── Composite searchScore ──────────────────────────────────────────────

  describe('composite searchScore field', () => {
    it('returns null searchScore when no filters are active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(first: 1) {
            nodes {
              title
              searchScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      for (const node of nodes!) {
        expect(node.searchScore).toBeNull();
      }
    });

    it('returns searchScore between 0 and 1 when a single filter is active', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            tsvTsv: "machine learning"
          }) {
            nodes {
              title
              tsvRank
              searchScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      for (const node of nodes!) {
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThanOrEqual(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
    });
  });

  // ─── orderBy enums ──────────────────────────────────────────────────────

  describe('orderBy enums', () => {
    it('orders by BM25 score ascending (best matches first)', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: {
              bm25Body: { query: "learning" }
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
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Ascending: most negative (most relevant) first
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].bodyBm25Score).toBeLessThanOrEqual(
          nodes![i + 1].bodyBm25Score!
        );
      }
    });

    it('orders by trgm similarity descending (best matches first)', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: {
              trgmTitle: { value: "Learning", threshold: 0.05 }
            }
            orderBy: TITLE_TRGM_SIMILARITY_DESC
          ) {
            nodes {
              title
              titleTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(1);

      // Descending: highest similarity first
      for (let i = 0; i < nodes!.length - 1; i++) {
        expect(nodes![i].titleTrgmSimilarity).toBeGreaterThanOrEqual(
          nodes![i + 1].titleTrgmSimilarity!
        );
      }
    });

    it('supports composite orderBy with multiple enums', async () => {
      // Use array syntax: order by BM25 score first, then by trgm similarity
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: {
              bm25Body: { query: "learning" }
              trgmTitle: { value: "Learning", threshold: 0.05 }
            }
            orderBy: [BODY_BM25_SCORE_ASC, TITLE_TRGM_SIMILARITY_DESC]
          ) {
            nodes {
              title
              bodyBm25Score
              titleTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      // All nodes should have both score fields populated
      for (const node of nodes!) {
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(typeof node.titleTrgmSimilarity).toBe('number');
      }
    });
  });

  // ─── orderBy + LIMIT correctness (regression tests) ─────────────────────

  describe('orderBy + LIMIT returns top results (not arbitrary rows)', () => {
    it('pgvector: LIMIT 1 with orderBy ASC returns the closest vector', async () => {
      // Query vector [1,0,0] — doc 1 has embedding [1,0,0] (distance ≈ 0),
      // so it must be the top result when ordering by distance ASC.
      const allResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }
            orderBy: EMBEDDING_VECTOR_DISTANCE_ASC
          ) {
            nodes { rowId title embeddingVectorDistance }
          }
        }
      `);
      expect(allResult.errors).toBeUndefined();
      const allNodes = allResult.data!.allDocuments.nodes;
      expect(allNodes.length).toBeGreaterThan(1);

      // Now fetch with LIMIT 1 — should return the same first row
      const limitResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }
            orderBy: EMBEDDING_VECTOR_DISTANCE_ASC
            first: 1
          ) {
            nodes { rowId title embeddingVectorDistance }
          }
        }
      `);
      expect(limitResult.errors).toBeUndefined();
      const limitNodes = limitResult.data!.allDocuments.nodes;
      expect(limitNodes).toHaveLength(1);

      // The LIMIT 1 result must be the closest (smallest distance)
      expect(limitNodes[0].rowId).toBe(allNodes[0].rowId);
      expect(limitNodes[0].embeddingVectorDistance).toBe(allNodes[0].embeddingVectorDistance);
    });

    it('pgvector: results are actually sorted by distance ASC', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }
            orderBy: EMBEDDING_VECTOR_DISTANCE_ASC
          ) {
            nodes { rowId embeddingVectorDistance }
          }
        }
      `);
      expect(result.errors).toBeUndefined();
      const nodes = result.data!.allDocuments.nodes;
      expect(nodes.length).toBeGreaterThan(1);

      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].embeddingVectorDistance).toBeLessThanOrEqual(
          nodes[i + 1].embeddingVectorDistance!
        );
      }
    });

    it('BM25: LIMIT 2 with orderBy ASC returns the most relevant rows', async () => {
      // Fetch all BM25 results sorted by score ASC (most negative = most relevant)
      const allResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { bm25Body: { query: "learning" } }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes { rowId title bodyBm25Score }
          }
        }
      `);
      expect(allResult.errors).toBeUndefined();
      const allNodes = allResult.data!.allDocuments.nodes;
      expect(allNodes.length).toBeGreaterThan(2);

      // Now fetch with LIMIT 2
      const limitResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { bm25Body: { query: "learning" } }
            orderBy: BODY_BM25_SCORE_ASC
            first: 2
          ) {
            nodes { rowId title bodyBm25Score }
          }
        }
      `);
      expect(limitResult.errors).toBeUndefined();
      const limitNodes = limitResult.data!.allDocuments.nodes;
      expect(limitNodes).toHaveLength(2);

      // The limited results must be the top-2 from the full sorted list
      expect(limitNodes[0].rowId).toBe(allNodes[0].rowId);
      expect(limitNodes[1].rowId).toBe(allNodes[1].rowId);
    });

    it('fullTextSearch + per-adapter orderBy: LIMIT returns top results', async () => {
      // fullTextSearch dispatches to all text-compatible adapters.
      // Per-adapter orderBy (e.g. BM25 score) still works correctly with LIMIT
      // because the adapter score is a SQL-level expression.
      // (Note: SEARCH_SCORE is a JS-computed composite and does not produce
      //  SQL-level ORDER BY, so it should not be relied on with LIMIT.)
      const allResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { fullTextSearch: "machine learning" }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes { rowId title bodyBm25Score }
          }
        }
      `);
      expect(allResult.errors).toBeUndefined();
      const allNodes = allResult.data!.allDocuments.nodes;
      expect(allNodes.length).toBeGreaterThan(1);

      // Now LIMIT 1
      const limitResult = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: { fullTextSearch: "machine learning" }
            orderBy: BODY_BM25_SCORE_ASC
            first: 1
          ) {
            nodes { rowId title bodyBm25Score }
          }
        }
      `);
      expect(limitResult.errors).toBeUndefined();
      const limitNodes = limitResult.data!.allDocuments.nodes;
      expect(limitNodes).toHaveLength(1);

      // Must be the most relevant BM25 row
      expect(limitNodes[0].rowId).toBe(allNodes[0].rowId);
    });
  });

  // ─── Hybrid / multi-adapter queries ─────────────────────────────────────

  describe('hybrid search (multiple adapters active simultaneously)', () => {
    it('combines tsvector + BM25 + trgm filters with searchScore', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: {
              tsvTsv: "learning"
              bm25Body: { query: "learning" }
              trgmTitle: { value: "Learning", threshold: 0.05 }
            }
          ) {
            nodes {
              title
              tsvRank
              bodyBm25Score
              titleTrgmSimilarity
              searchScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      for (const node of nodes!) {
        // All three score fields should be populated
        expect(typeof node.tsvRank).toBe('number');
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(typeof node.titleTrgmSimilarity).toBe('number');

        // Composite searchScore should be in [0, 1]
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThanOrEqual(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
    });

    it('mega query v1: per-algorithm filters with manual orderBy', async () => {
      // Mega Query v1 — Old-style: each algorithm's filter specified individually,
      // with a composite orderBy array mixing different algorithm scores.
      // This gives maximum control over which algorithms are active and how
      // results are ranked.
      const result = await query<AllDocumentsResult>(`
        query MegaQueryV1_PerAlgorithmFilters {
          allDocuments(
            where: {
              # tsvector: full-text search on the tsv column
              tsvTsv: "learning"

              # BM25: ranked text search on the body column (requires BM25 index)
              bm25Body: { query: "learning" }

              # pg_trgm: fuzzy trigram match on the title column (typo-tolerant)
              trgmTitle: { value: "Learning", threshold: 0.05 }

              # pgvector: cosine similarity on the embedding column
              vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
            }
            # Composite orderBy: BM25 relevance first (ASC because lower = more relevant),
            # then trgm similarity as tiebreaker (DESC because higher = more similar),
            # then vector distance (ASC because lower = closer)
            orderBy: [BODY_BM25_SCORE_ASC, TITLE_TRGM_SIMILARITY_DESC, EMBEDDING_VECTOR_DISTANCE_ASC]
          ) {
            nodes {
              rowId
              title
              body

              # Per-adapter scores — each populated only when its filter is active
              tsvRank                    # ts_rank(tsv, query) — higher = more relevant
              bodyBm25Score              # BM25 score — more negative = more relevant
              titleTrgmSimilarity        # similarity(title, value) — 0..1, higher = closer
              embeddingVectorDistance     # cosine distance — lower = closer

              # Composite normalized score — weighted blend of all active algorithms
              searchScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      // Some documents should match all 4 filters simultaneously
      expect(nodes!.length).toBeGreaterThan(0);

      for (const node of nodes!) {
        // All 4 algorithm-specific scores should be populated
        expect(typeof node.tsvRank).toBe('number');
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(typeof node.titleTrgmSimilarity).toBe('number');
        expect(typeof node.embeddingVectorDistance).toBe('number');

        // Composite searchScore should combine all 4 signals
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThanOrEqual(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
    });

    it('mega query v2: fullTextSearch + searchScore with composite ordering', async () => {
      // Mega Query v2 — New-style: uses the unified `fullTextSearch` composite
      // filter that fans out to all text-compatible algorithms (tsvector, BM25, trgm)
      // with a single string, plus a manual pgvector filter for semantic search.
      // Orders by composite searchScore (highest overall relevance first).
      const result = await query<AllDocumentsResult>(`
        query MegaQueryV2_UnifiedSearch {
          allDocuments(
            where: {
              # fullTextSearch: single string fans out to tsvector + BM25 + trgm
              # automatically — no need to specify each algorithm separately
              fullTextSearch: "machine learning"

              # pgvector still needs its own filter (vectors aren't text)
              vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
            }
            # Order by composite searchScore (higher = more relevant across all algorithms),
            # then by vector distance as tiebreaker (lower = semantically closer)
            orderBy: [SEARCH_SCORE_DESC, EMBEDDING_VECTOR_DISTANCE_ASC]
          ) {
            nodes {
              rowId
              title
              body

              # Per-adapter scores — populated by fullTextSearch for text algorithms
              tsvRank
              bodyBm25Score
              titleTrgmSimilarity
              embeddingVectorDistance

              # Composite normalized score — the single number that blends everything
              searchScore
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      for (const node of nodes!) {
        // searchScore should be populated (composite of active algorithms)
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThanOrEqual(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);

        // Vector distance should be populated (manual filter)
        expect(typeof node.embeddingVectorDistance).toBe('number');
        expect(node.embeddingVectorDistance).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── fullTextSearch composite filter ────────────────────────────────────

  describe('fullTextSearch composite filter', () => {
    it('fullTextSearch field exists on the filter type', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            fullTextSearch: "learning"
          }) {
            nodes {
              title
            }
          }
        }
      `);

      // Should not error — field exists and is accepted
      expect(result.errors).toBeUndefined();
      expect(result.data?.allDocuments?.nodes).toBeDefined();
    });

    it('returns results matching any text-compatible algorithm', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            fullTextSearch: "machine learning"
          }) {
            nodes {
              title
              tsvRank
              bodyBm25Score
              titleTrgmSimilarity
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes ?? [];
      // At least one row should match (via tsvector, BM25, or trgm)
      expect(nodes.length).toBeGreaterThan(0);

      // At least one score field should be populated on the first result
      const first = nodes[0];
      const hasAnyScore =
        (first.tsvRank != null && first.tsvRank > 0) ||
        (first.bodyBm25Score != null && first.bodyBm25Score > 0) ||
        (first.titleTrgmSimilarity != null && first.titleTrgmSimilarity > 0);
      expect(hasAnyScore).toBe(true);
    });

    it('coexists with algorithm-specific filters', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            fullTextSearch: "learning"
            tsvTsv: "machine"
          }) {
            nodes {
              title
              tsvRank
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes ?? [];
      // The algorithm-specific filter (tsvTsv) narrows further within the fullTextSearch results
      expect(nodes).toBeDefined();
    });

    it('returns empty results for nonsense query', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(where: {
            fullTextSearch: "xyzzy_nonexistent_term_12345"
          }) {
            nodes {
              title
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes ?? [];
      expect(nodes.length).toBe(0);
    });
  });

  // ─── Pagination ─────────────────────────────────────────────────────────

  describe('pagination with search', () => {
    it('works with first/offset alongside search filters', async () => {
      const result = await query<AllDocumentsResult>(`
        query {
          allDocuments(
            where: {
              bm25Body: { query: "learning" }
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
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeLessThanOrEqual(2);
    });
  });
});

// ─── fullTextSearch disabled (separate suite — needs its own DB connection) ───

describe('fullTextSearch can be disabled', () => {
  let disabledQuery: QueryFn;
  let disabledTeardown: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    // Build a plugin with fullTextSearch DISABLED
    const disabledPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
      ],
      enableSearchScore: true,
      enableFullTextSearch: false,
    });

    const disabledPreset = {
      extends: [
        ConnectionFilterPreset(),
      ],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        disabledPlugin,
      ],
    };

    const connections = await getConnections({
      schemas: ['unified_search_test'],
      preset: disabledPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.sqlfile([join(__dirname, './setup.sql')])
    ]);

    disabledQuery = connections.query;
    disabledTeardown = connections.teardown;
  });

  afterAll(async () => {
    if (disabledTeardown) {
      await disabledTeardown();
    }
  });

  it('fullTextSearch field does NOT exist when disabled', async () => {
    // Introspect the filter type to verify fullTextSearch is NOT present.
    // NOTE: Grafast silently ignores unknown input fields rather than
    // returning a GraphQL validation error, so we verify via introspection.
    const introspection = await disabledQuery<any>(`
      query {
        __type(name: "DocumentFilter") {
          inputFields {
            name
          }
        }
      }
    `);

    expect(introspection.errors).toBeUndefined();
    const filterFields = introspection.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];

    // fullTextSearch should NOT be in the filter fields
    expect(filterFields).not.toContain('fullTextSearch');

    // The per-algorithm fields should still exist (only fullTextSearch is disabled)
    expect(filterFields).toContain('tsvTsv');
    expect(filterFields).toContain('bm25Body');
    expect(filterFields).toContain('trgmTitle');
  });
});
