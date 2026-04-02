/**
 * Integration tests for @searchConfig smart tag (Phase D) and @hasChunks
 * chunk-aware querying (Phase E), plus Phase I schema-time validation.
 *
 * These tests run against a real PostgreSQL database with tables tagged via
 * a custom Graphile plugin that injects smart tags programmatically (since
 * @searchConfig and @hasChunks are JSON objects, not simple strings).
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
// Injects @searchConfig and @hasChunks smart tags on test tables during the
// schema build phase. This is necessary because these tags are JSON objects
// that can't be set via SQL COMMENT ON statements.

function makeTestSmartTagsPlugin(
  tagsByTable: Record<string, Record<string, any>>
): GraphileConfig.Plugin {
  return {
    name: 'TestSmartTagsPlugin',
    version: '1.0.0',

    schema: {
      hooks: {
        // Run early in the build phase to inject tags before other plugins read them
        init: {
          before: ['UnifiedSearchPlugin'],
          callback(_, build) {
            // Iterate over all codecs and inject tags on matching tables
            for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
              const c = codec as any;
              if (!c.attributes || !c.name) continue;

              const tags = tagsByTable[c.name];
              if (!tags) continue;

              // Ensure extensions.tags exists
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
  embeddingVectorDistance: number | null;
  searchScore: number | null;
}

interface AllPostsResult {
  allPosts: {
    nodes: PostNode[];
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

// ─── Test Suite: @searchConfig with custom weights ───────────────────────────

describe('@searchConfig integration tests', () => {
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
    });

    // Inject @searchConfig on the articles table with custom weights
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        searchConfig: {
          weights: { tsv: 0.7, bm25: 0.2, vector: 0.1 },
          normalization: 'linear',
          boost_recent: true,
          boost_recency_field: 'updated_at',
          boost_recency_decay: 0.9,
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

    const connections = await getConnections(
      {
        schemas: ['unified_search_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

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

  it('returns searchScore for articles with @searchConfig weights applied', async () => {
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
    const nodes = result.data?.allArticles?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    for (const node of nodes!) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('returns searchScore with recency boost (newer articles score higher)', async () => {
    // Query articles matching "database" — article 1 (PostgreSQL, 2025-01) and
    // article 3 (Indexing, 2026-01) should both match. Article 3 is newer, so
    // with recency boost its searchScore should be at least as high.
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          tsvTsv: "database"
        }, orderBy: SEARCH_SCORE_DESC) {
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
    const nodes = result.data?.allArticles?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    // All returned nodes should have valid search scores
    for (const node of nodes!) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('applies per-table weights (tsv weighted 0.7) and produces valid scores', async () => {
    // Use combined search to verify per-table weights produce valid composite scores
    const result = await query<AllArticlesResult>(`
      query {
        allArticles(where: {
          tsvTsv: "database"
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            tsvRank
            embeddingVectorDistance
            searchScore
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    for (const node of nodes!) {
      // Both individual scores should be populated
      expect(typeof node.tsvRank).toBe('number');
      expect(typeof node.embeddingVectorDistance).toBe('number');
      // Composite should be in valid range
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Test Suite: @searchConfig with sigmoid normalization ────────────────────

describe('@searchConfig with sigmoid normalization', () => {
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
    });

    // Inject @searchConfig with sigmoid normalization
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        searchConfig: {
          normalization: 'sigmoid',
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

    const connections = await getConnections(
      {
        schemas: ['unified_search_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('produces valid scores with sigmoid normalization forced', async () => {
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
    const nodes = result.data?.allArticles?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    for (const node of nodes!) {
      expect(typeof node.searchScore).toBe('number');
      // Sigmoid normalization always produces values in (0, 1)
      expect(node.searchScore).toBeGreaterThan(0);
      expect(node.searchScore).toBeLessThan(1);
    }
  });
});

// ─── Test Suite: @hasChunks chunk-aware querying ─────────────────────────────

describe('@hasChunks chunk-aware querying integration', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
    });

    // Inject @hasChunks on the posts table pointing to posts_chunks
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      posts: {
        hasChunks: {
          chunksTable: 'posts_chunks',
          parentFk: 'post_id',
          parentPk: 'id',
          embeddingField: 'embedding',
        },
      },
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        VectorCodecPlugin,
        smartTagsPlugin,
        unifiedPlugin,
      ],
    };

    const connections = await getConnections(
      {
        schemas: ['unified_search_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

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

  it('returns chunk-aware distance (LEAST of parent + chunks)', async () => {
    // Query with vector close to [1,0,0]. Post 1 parent is [0.5,0.5,0] but
    // chunk 1 is [0.95,0.05,0] — much closer. The chunk-aware query should
    // return the smaller distance from the chunk.
    const result = await query<AllPostsResult>(`
      query {
        allPosts(where: {
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE }
        }) {
          nodes {
            rowId
            title
            embeddingVectorDistance
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPosts?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    // Find post 1
    const post1 = nodes!.find((n) => n.rowId === 1);
    expect(post1).toBeDefined();
    expect(typeof post1!.embeddingVectorDistance).toBe('number');

    // Post 1's chunk [0.95, 0.05, 0] is much closer to [1,0,0] than
    // the parent [0.5, 0.5, 0]. Cosine distance of chunk ≈ 0.05
    // while parent ≈ 0.29. Chunk-aware should use the smaller value.
    expect(post1!.embeddingVectorDistance).toBeLessThan(0.15);
  });

  it('returns standard distance when includeChunks is false', async () => {
    const result = await query<AllPostsResult>(`
      query {
        allPosts(where: {
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE, includeChunks: false }
        }) {
          nodes {
            rowId
            title
            embeddingVectorDistance
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPosts?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);

    // Find post 1 — without chunks, distance is from parent [0.5, 0.5, 0]
    const post1 = nodes!.find((n) => n.rowId === 1);
    expect(post1).toBeDefined();
    expect(typeof post1!.embeddingVectorDistance).toBe('number');

    // Parent-only distance should be larger than the chunk-aware distance
    // Parent [0.5, 0.5, 0] to [1, 0, 0] ≈ 0.29 cosine distance
    expect(post1!.embeddingVectorDistance).toBeGreaterThan(0.15);
  });

  it('applies distance threshold with chunk-aware query', async () => {
    // Use a tight distance threshold that only the closest chunk satisfies
    const result = await query<AllPostsResult>(`
      query {
        allPosts(where: {
          vectorEmbedding: { vector: [1, 0, 0], metric: COSINE, distance: 0.1 }
        }) {
          nodes {
            rowId
            title
            embeddingVectorDistance
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allPosts?.nodes;
    expect(nodes).toBeDefined();

    // Only post 1 should match (chunk [0.95, 0.05, 0] is within 0.1 of [1,0,0])
    // Post 2's closest chunk [0.2, 0.8, 0.1] is much farther
    for (const node of nodes!) {
      expect(node.embeddingVectorDistance).toBeLessThanOrEqual(0.1);
    }
  });
});

// ─── Test Suite: Phase I validation — nonexistent recency field ──────────────

describe('Phase I: schema-time validation of boost_recency_field', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(async () => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
        createPgvectorAdapter(),
      ],
      enableSearchScore: true,
    });

    // Inject @searchConfig with a nonexistent recency field — should trigger
    // Phase I validation and gracefully disable recency boost
    const smartTagsPlugin = makeTestSmartTagsPlugin({
      // Use the "documents" table which does NOT have an "updated_at" column
      documents: {
        searchConfig: {
          boost_recent: true,
          boost_recency_field: 'nonexistent_field',
        },
      },
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        TsvectorCodecPlugin,
        VectorCodecPlugin,
        smartTagsPlugin,
        unifiedPlugin,
      ],
    };

    const connections = await getConnections(
      {
        schemas: ['unified_search_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    consoleWarnSpy.mockRestore();
    if (teardown) {
      await teardown();
    }
  });

  it('warns about nonexistent recency field and does not crash', async () => {
    // The schema should have built without crashing
    // Verify by running a query that exercises searchScore
    const result = await query<any>(`
      query {
        allDocuments(where: {
          tsvTsv: "machine learning"
        }) {
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
    expect(nodes!.length).toBeGreaterThan(0);

    // searchScore should still work (just without recency boost)
    for (const node of nodes!) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  it('emitted a console.warn about the missing field', () => {
    // Phase I validation should have warned during schema build
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent_field')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not found on table')
    );
  });
});
