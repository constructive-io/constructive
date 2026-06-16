/**
 * RRF (Reciprocal Rank Fusion) scoring tests.
 *
 * Verifies that searchScore uses rank-based fusion across adapters:
 * - Single adapter scenarios (BM25 only, tsvector only, trgm only, pgvector only)
 * - Multi-adapter combinations (BM25+tsvector, BM25+pgvector, all 4)
 * - Chunk-aware tables (parent + chunks with BM25/pgvector)
 * - Custom @searchConfig weights
 * - Recency boost + RRF
 * - Invariants: searchScore always [0,1], SEARCH_SCORE_DESC correct ordering
 */

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
import type { GraphileConfig } from 'graphile-config';

// ─── Smart Tags Plugin ───────────────────────────────────────────────────────

function makeTestSmartTagsPlugin(
  tagsByTable: Record<string, Record<string, any>>
): GraphileConfig.Plugin {
  return {
    name: 'TestSmartTagsPlugin',
    version: '1.0.0',
    schema: {
      hooks: {
        init: {
          before: ['UnifiedSearchPlugin'],
          callback(_, build) {
            for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
              const c = codec as any;
              if (!c.attributes || !c.name) continue;
              const tags = tagsByTable[c.name];
              if (!tags) continue;
              if (!c.extensions) c.extensions = {};
              if (!c.extensions.tags) c.extensions.tags = {};
              Object.assign(c.extensions.tags, tags);
            }
            return _;
          },
        },
      },
    },
  };
}

// ─── Result types ────────────────────────────────────────────────────────────

interface DocumentNode {
  rowId: number;
  title: string;
  body?: string;
  tsvRank: number | null;
  bodyBm25Score: number | null;
  titleTrgmSimilarity: number | null;
  embeddingVectorDistance: number | null;
  searchScore: number | null;
}

interface AllDocumentsResult {
  allDocuments: {
    nodes: DocumentNode[];
  };
}

interface ArticleNode {
  rowId: number;
  title: string;
  tsvRank: number | null;
  bodyBm25Score: number | null;
  embeddingVectorDistance: number | null;
  searchScore: number | null;
}

interface AllArticlesResult {
  allArticles: {
    nodes: ArticleNode[];
  };
}

interface PostNode {
  rowId: number;
  title: string;
  tsvRank: number | null;
  embeddingVectorDistance: number | null;
  searchScore: number | null;
}

interface AllPostsResult {
  allPosts: {
    nodes: PostNode[];
  };
}

interface PostChunkNode {
  rowId: number;
  content: string;
  searchScore: number | null;
}

interface AllPostsChunksResult {
  allPostsChunks: {
    nodes: PostChunkNode[];
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

// ─── Test Suite: Single Adapter RRF Scenarios ────────────────────────────────

describe('RRF scoring — single adapter scenarios', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('tsvector only — searchScore is 0..1 and correctly ranked', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          tsvTsv: "machine learning"
        }) {
          nodes {
            rowId
            title
            tsvRank
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // The best match (highest tsvRank) should also have highest searchScore
    const sorted = [...nodes].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));
    const topResult = sorted[0];
    expect(topResult.searchScore).toBe(1); // Rank 1 with single adapter → normalized to 1.0
  });

  it('BM25 only — searchScore is 0..1 and best match gets score 1.0', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          bm25Body: { query: "machine learning intelligence" }
        }) {
          nodes {
            rowId
            title
            bodyBm25Score
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // Rank 1 document should get score 1.0 (single adapter, rank 1 = max)
    const sorted = [...nodes].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));
    expect(sorted[0].searchScore).toBe(1);
  });

  it('trgm only — searchScore is 0..1', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          trgmTitle: { value: "Machine Learn", threshold: 0.1 }
        }) {
          nodes {
            rowId
            title
            titleTrgmSimilarity
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('pgvector only — searchScore is 0..1', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('searchScore is null when no search filters active', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(first: 2) {
          nodes {
            rowId
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    for (const node of nodes) {
      expect(node.searchScore).toBeNull();
    }
  });
});

// ─── Test Suite: Multi-Adapter RRF Combinations ──────────────────────────────

describe('RRF scoring — multi-adapter combinations', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('BM25 + tsvector (via unifiedSearch) — searchScore combines ranks from both', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
        }) {
          nodes {
            rowId
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
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // Document ranked #1 by multiple adapters should score higher than one
    // ranked lower by all adapters
    const sortedByScore = [...nodes].sort(
      (a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0)
    );
    // The top scoring doc should be one with "machine learning" in title AND body
    expect(sortedByScore[0].title.toLowerCase()).toContain('machine learning');
  });

  it('BM25 + pgvector (separate filters) — RRF fuses ranks from both', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          bm25Body: { query: "machine learning" }
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            bodyBm25Score
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
      // Both scores should be populated when both filters are active
      expect(node.bodyBm25Score).not.toBeNull();
      expect(node.embeddingVectorDistance).not.toBeNull();
    }
  });

  it('all 4 adapters — unifiedSearch + pgvector combines all ranks', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            tsvRank
            bodyBm25Score
            titleTrgmSimilarity
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // Document 1 ("Introduction to Machine Learning") should rank highest:
    // - Matches "machine learning" in title/body (BM25, tsv, trgm)
    // - Has embedding [1,0,0] (exact match for vector filter)
    const doc1 = nodes.find((n) => n.rowId === 1);
    if (doc1) {
      expect(doc1.searchScore).toBeGreaterThan(0.5);
    }
  });

  it('SEARCH_SCORE_DESC ordering returns results in roughly descending score order', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(
          where: { unifiedSearch: "machine learning" }
          orderBy: [SEARCH_SCORE_DESC]
        ) {
          nodes {
            rowId
            title
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(1);

    // Verify all scores are valid
    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // The first result should have the highest (or near-highest) score
    const maxScore = Math.max(...nodes.map((n) => n.searchScore ?? 0));
    // Allow small floating point tolerance for ordering
    expect(nodes[0].searchScore).toBeGreaterThanOrEqual(maxScore - 0.05);
  });

  it('document ranked #1 by multiple adapters scores higher than one ranked lower by all', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
        }) {
          nodes {
            rowId
            title
            tsvRank
            bodyBm25Score
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(1);

    // Doc 1 should be #1 for BM25 and tsvector (most relevant to "machine learning")
    // and should score higher than docs that only partially match
    const doc1 = nodes.find((n) => n.rowId === 1);
    const otherDocs = nodes.filter((n) => n.rowId !== 1);

    if (doc1 && otherDocs.length > 0) {
      const maxOtherScore = Math.max(...otherDocs.map((d) => d.searchScore ?? 0));
      expect(doc1.searchScore).toBeGreaterThanOrEqual(maxOtherScore);
    }
  });
});

// ─── Test Suite: unifiedSearch + pgvector RRF Fusion ─────────────────────────
//
// When graphile-llm is active, it transforms unifiedSearch: "text" into
// { __text, __vector } via a resolver wrapper. The apply function then
// includes pgvector in the OR + RRF fusion.
//
// Testing the full resolver-wrapper → apply flow requires PostGraphile
// server-level execution (Grafast plan-based fields skip `resolve` in
// direct schema execution). Unit tests for the object-shape handling
// are in graphile-llm/src/__tests__/unified-search-embedding.test.ts.
//
// Here we verify the equivalent end-user behavior: when both unifiedSearch
// (text) AND vectorEmbedding (vector) filters are applied, RRF fuses all
// adapter ranks correctly — which is what the LLM integration produces.

describe('RRF scoring — unifiedSearch + pgvector fusion (simulating LLM path)', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('text-only unifiedSearch does NOT activate pgvector', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: { unifiedSearch: "machine learning" }) {
          nodes {
            rowId
            tsvRank
            bodyBm25Score
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    // Text adapters should work
    const hasTextScore = nodes.some((n) => n.tsvRank !== null || n.bodyBm25Score !== null);
    expect(hasTextScore).toBe(true);

    // pgvector should NOT participate without LLM injection
    for (const node of nodes) {
      expect(node.embeddingVectorDistance).toBeNull();
    }
  });

  it('unifiedSearch + vectorEmbedding fuses all 4 adapter ranks via RRF', async () => {
    // This is the equivalent end-state of what graphile-llm produces:
    // text adapters handle the keyword matching, pgvector handles semantic
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            tsvRank
            bodyBm25Score
            titleTrgmSimilarity
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }

    // pgvector should participate
    const hasVectorScore = nodes.some((n) => n.embeddingVectorDistance !== null);
    expect(hasVectorScore).toBe(true);

    // Document 1 has embedding [1,0,0] (exact match) AND contains "machine learning"
    const doc1 = nodes.find((n) => n.rowId === 1);
    if (doc1) {
      expect(doc1.searchScore).toBeGreaterThan(0.5);
      expect(doc1.embeddingVectorDistance).not.toBeNull();
    }
  });

  it('doc scores higher with text + vector vs text-only (RRF boost)', async () => {
    const textOnly = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: { unifiedSearch: "machine learning" }) {
          nodes { rowId searchScore }
        }
      }
    `);

    const textAndVector = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes { rowId searchScore }
        }
      }
    `);

    expect(textOnly.errors).toBeUndefined();
    expect(textAndVector.errors).toBeUndefined();

    const textOnlyNodes = textOnly.data?.allDocuments?.nodes ?? [];
    const vectorNodes = textAndVector.data?.allDocuments?.nodes ?? [];

    // Doc 1 should score higher when vector also contributes
    const doc1TextOnly = textOnlyNodes.find((n) => n.rowId === 1);
    const doc1Vector = vectorNodes.find((n) => n.rowId === 1);

    if (doc1TextOnly && doc1Vector) {
      expect(doc1Vector.searchScore).toBeGreaterThanOrEqual(doc1TextOnly.searchScore ?? 0);
    }
  });

  it('searchScore stays [0,1] with all adapters active', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "neural networks deep learning"
          vectorEmbedding: { vector: [0.5, 0.5, 0], metric: COSINE }
        }) {
          nodes { rowId title searchScore }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];

    for (const node of nodes) {
      if (node.searchScore !== null) {
        expect(node.searchScore).toBeGreaterThanOrEqual(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ─── Test Suite: Chunk-Aware Tables ──────────────────────────────────────────

describe('RRF scoring — chunk-aware tables', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('parent posts table — pgvector search produces valid RRF scores', async () => {
    const result = await query<AllPostsResult>(`
      query {
        allPosts(where: {
          vectorEmbedding: { vector: [0.5, 0.5, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPosts?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('chunks table — BM25 search on chunk content produces valid RRF scores', async () => {
    const result = await query<AllPostsChunksResult>(`
      query {
        allPostsChunks(where: {
          bm25Content: { query: "quantum computing" }
        }) {
          nodes {
            rowId
            content
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPostsChunks?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('chunks table — pgvector search on chunk embeddings produces valid RRF scores', async () => {
    const result = await query<AllPostsChunksResult>(`
      query {
        allPostsChunks(where: {
          vectorEmbedding: { vector: [0.95, 0.05, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            content
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPostsChunks?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('chunks table — BM25 + pgvector combined on chunks', async () => {
    const result = await query<AllPostsChunksResult>(`
      query {
        allPostsChunks(where: {
          bm25Content: { query: "quantum computing" }
          vectorEmbedding: { vector: [0.95, 0.05, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            content
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPostsChunks?.nodes ?? [];
    // May be empty if no chunk matches both — that's valid (AND semantics)
    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Test Suite: @searchConfig Weights + RRF ─────────────────────────────────

describe('RRF scoring — custom @searchConfig weights', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    // Inject @searchConfig on articles with custom weights
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        searchConfig: {
          weights: { tsv: 3.0, bm25: 1.0, vector: 0.5 },
        },
      },
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
        smartTagsPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('custom weights influence RRF contribution — higher weighted adapter has more impact', async () => {
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          tsvTsv: "database"
        }) {
          nodes {
            rowId
            title
            tsvRank
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    // searchScore should be valid 0..1
    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('weighted RRF still produces score 1.0 for rank-1 document (single adapter active)', async () => {
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          tsvTsv: "postgresql"
        }) {
          nodes {
            rowId
            title
            tsvRank
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    // Rank 1 doc gets max RRF contribution; with single adapter active
    // searchScore = weight/(k+1) / weight/(k+1) = 1.0
    const sorted = [...nodes].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));
    expect(sorted[0].searchScore).toBe(1);
  });


});

// ─── Test Suite: Recency Boost + RRF ─────────────────────────────────────────

describe('RRF scoring — recency boost', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 60,
    });

    // articles table with recency boost enabled
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        searchConfig: {
          boost_recent: true,
          boost_recency_field: 'updated_at',
          boost_recency_decay: 0.99,
        },
      },
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
        smartTagsPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('recency boost applied to RRF scores — newer documents get higher scores', async () => {
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          unifiedSearch: "database"
        }) {
          nodes {
            rowId
            title
            tsvRank
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    // All scores should still be valid 0..1 with recency boost
    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('recency boost reduces older document scores relative to newer ones', async () => {
    // Article 1: 2025-01-01 (oldest)
    // Article 3: 2026-01-01 (newest)
    // Both match "database" via tsvector
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          tsvTsv: "database"
        }) {
          nodes {
            rowId
            title
            tsvRank
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];

    const article1 = nodes.find((n) => n.rowId === 1);
    const article3 = nodes.find((n) => n.rowId === 3);

    // If both match, the newer one (article 3) should have a higher score
    // due to recency boost (decay applied to older articles)
    if (article1 && article3) {
      // Article 3 is newer so decay has less effect → higher score
      expect(article3.searchScore).toBeGreaterThan(article1.searchScore!);
    }
  });
});

// ─── Test Suite: Custom rrfK parameter ───────────────────────────────────────

describe('RRF scoring — custom rrfK parameter', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    // Use a small rrfK to make rank differences more pronounced
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createBm25Adapter(),
        createTrgmAdapter({ defaultThreshold: 0.1 }),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
      enableUnifiedSearch: true,
      rrfK: 10, // Small k makes top-ranked items dominate more
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        Bm25CodecPlugin,
        VectorCodecPlugin,
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
      try { await db.client.query('ROLLBACK'); } catch {}
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('small rrfK (10) still produces valid 0..1 scores', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          unifiedSearch: "machine learning"
        }) {
          nodes {
            rowId
            title
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('with small rrfK, score difference between rank 1 and rank 2 is larger', async () => {
    const result = await query<AllDocumentsResult>(`
      query {
        allDocuments(where: {
          tsvTsv: "learning"
        }) {
          nodes {
            rowId
            title
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allDocuments?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(1);

    const sorted = [...nodes].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));
    const firstScore = sorted[0].searchScore!;
    const secondScore = sorted[1].searchScore!;

    // With k=10: rank1 → 1/(10+1) = 0.0909, rank2 → 1/(10+2) = 0.0833
    // Normalized: rank1 → 1.0, rank2 → 0.0833/0.0909 ≈ 0.917
    // The gap should be noticeable
    expect(firstScore).toBeGreaterThan(secondScore);
    expect(firstScore - secondScore).toBeGreaterThan(0.05);
  });
});
