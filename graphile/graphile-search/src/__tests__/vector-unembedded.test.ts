/**
 * Vector search over rows that have no embedding.
 *
 * A row whose distance is NULL (no parent embedding and no embedded chunk)
 * has nothing to rank, so vector search leaves it out — on the chunk-aware
 * path and on the includeChunks:false path. Cursor paging then walks every
 * scored row exactly once in both directions.
 */

import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { createPgvectorAdapter } from '../adapters/pgvector';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

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

interface NoteNode {
  rowId: number;
  title: string;
  embeddingVectorDistance: number | null;
  searchScore: number | null;
}

interface AllNotesResult {
  allNotes: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: NoteNode[];
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

const QUERY_VECTOR = '[1, 0, 0]';
const CHUNK_AWARE = `vectorEmbedding: { vector: ${QUERY_VECTOR}, metric: COSINE }`;
const PARENT_ONLY = `vectorEmbedding: { vector: ${QUERY_VECTOR}, metric: COSINE, includeChunks: false }`;

// Rows 1, 2 and 6 carry a parent embedding; row 3 only has an embedded chunk;
// rows 4, 5 and 7 have no embedding anywhere.
const CHUNK_AWARE_ROWS = [1, 2, 3, 6];
const PARENT_ONLY_ROWS = [1, 2, 6];

describe('vector search excludes rows with no embedding', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [createPgvectorAdapter()],
      enableSearchScore: true,
    });

    const smartTagsPlugin = makeTestSmartTagsPlugin({
      notes: {
        hasChunks: {
          chunksTable: 'notes_chunks',
          parentFk: 'note_id',
          parentPk: 'id',
          embeddingField: 'embedding',
          contentField: 'content',
        },
      },
    });

    const connections = await getConnections(
      {
        schemas: ['vector_unembedded_test'],
        preset: {
          extends: [ConnectionFilterPreset()],
          plugins: [VectorCodecPlugin, smartTagsPlugin, unifiedPlugin],
        },
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './vector-unembedded.sql')])]
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

  async function fetchAll(
    filter: string,
    direction: 'ASC' | 'DESC',
    connection: 'allNotes' | 'allMemos' = 'allNotes'
  ): Promise<NoteNode[]> {
    const result = await query<Record<string, AllNotesResult['allNotes']>>(`
      query {
        ${connection}(where: { ${filter} }, orderBy: EMBEDDING_VECTOR_DISTANCE_${direction}) {
          totalCount
          nodes { rowId title embeddingVectorDistance searchScore }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    return result.data![connection].nodes;
  }

  /** Walk every page with `first`/`after`, returning rowIds in page order. */
  async function pageThrough(
    filter: string,
    direction: 'ASC' | 'DESC',
    first: number,
    connection: 'allNotes' | 'allMemos' = 'allNotes'
  ): Promise<number[]> {
    const seen: number[] = [];
    let after: string | null = null;
    for (let page = 0; page < 20; page++) {
      const result: GraphQLResponse<Record<string, AllNotesResult['allNotes']>> = await query(
        `
          query ($first: Int!, $after: Cursor) {
            ${connection}(
              first: $first
              after: $after
              where: { ${filter} }
              orderBy: EMBEDDING_VECTOR_DISTANCE_${direction}
            ) {
              pageInfo { hasNextPage endCursor }
              nodes { rowId title embeddingVectorDistance searchScore }
            }
          }
        `,
        { first, after }
      );
      expect(result.errors).toBeUndefined();
      const conn = result.data![connection];
      seen.push(...conn.nodes.map((n) => n.rowId));
      if (!conn.pageInfo.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
    return seen;
  }

  function sortedByDistance(nodes: NoteNode[], direction: 'ASC' | 'DESC'): number[] {
    return [...nodes]
      .sort((a, b) =>
        direction === 'ASC'
          ? a.embeddingVectorDistance! - b.embeddingVectorDistance!
          : b.embeddingVectorDistance! - a.embeddingVectorDistance!
      )
      .map((n) => n.rowId);
  }

  describe('chunk-aware path (includeChunks default)', () => {
    it('returns only rows with a parent or chunk embedding, each with a finite distance', async () => {
      const nodes = await fetchAll(CHUNK_AWARE, 'ASC');
      expect(nodes.map((n) => n.rowId).sort()).toEqual(CHUNK_AWARE_ROWS);
      for (const node of nodes) {
        expect(Number.isFinite(node.embeddingVectorDistance)).toBe(true);
      }
      // Row 3 is reached through its chunk [0,0,1]
      const row3 = nodes.find((n) => n.rowId === 3)!;
      expect(row3.embeddingVectorDistance).toBeCloseTo(1, 5);
    });

    it('reports totalCount over scored rows only', async () => {
      const result = await query<AllNotesResult>(`
        query { allNotes(where: { ${CHUNK_AWARE} }) { totalCount nodes { rowId } } }
      `);
      expect(result.errors).toBeUndefined();
      expect(result.data!.allNotes.totalCount).toBe(CHUNK_AWARE_ROWS.length);
    });

    it.each([
      ['ASC', 1],
      ['ASC', 2],
      ['DESC', 1],
      ['DESC', 2],
    ] as Array<['ASC' | 'DESC', number]>)(
      'first/after paging (%s, first: %i) visits every scored row once, in order',
      async (direction, first) => {
        const all = await fetchAll(CHUNK_AWARE, direction);
        const paged = await pageThrough(CHUNK_AWARE, direction, first);
        expect(paged).toEqual(sortedByDistance(all, direction));
        expect([...paged].sort()).toEqual(CHUNK_AWARE_ROWS);
      }
    );

    it('keeps the distance threshold', async () => {
      const result = await query<AllNotesResult>(`
        query {
          allNotes(where: { vectorEmbedding: { vector: ${QUERY_VECTOR}, metric: COSINE, distance: 0.5 } }) {
            nodes { rowId embeddingVectorDistance }
          }
        }
      `);
      expect(result.errors).toBeUndefined();
      const nodes = result.data!.allNotes.nodes;
      // Row 1 (parent [1,0,0]) and row 2 (chunk [0.9,0.1,0]) and row 6 ([0.707,0.707,0] → 0.29)
      expect(nodes.map((n) => n.rowId).sort()).toEqual([1, 2, 6]);
      for (const node of nodes) {
        expect(node.embeddingVectorDistance).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('includeChunks: false path', () => {
    it('returns only rows with a parent embedding', async () => {
      const nodes = await fetchAll(PARENT_ONLY, 'ASC');
      expect(nodes.map((n) => n.rowId).sort()).toEqual(PARENT_ONLY_ROWS);
      for (const node of nodes) {
        expect(Number.isFinite(node.embeddingVectorDistance)).toBe(true);
      }
    });

    it('reports totalCount over scored rows only', async () => {
      const result = await query<AllNotesResult>(`
        query { allNotes(where: { ${PARENT_ONLY} }) { totalCount nodes { rowId } } }
      `);
      expect(result.errors).toBeUndefined();
      expect(result.data!.allNotes.totalCount).toBe(PARENT_ONLY_ROWS.length);
    });

    it.each([
      ['ASC', 1],
      ['ASC', 2],
      ['DESC', 1],
      ['DESC', 2],
    ] as Array<['ASC' | 'DESC', number]>)(
      'first/after paging (%s, first: %i) visits every scored row once, in order',
      async (direction, first) => {
        const all = await fetchAll(PARENT_ONLY, direction);
        const paged = await pageThrough(PARENT_ONLY, direction, first);
        expect(paged).toEqual(sortedByDistance(all, direction));
        expect([...paged].sort()).toEqual(PARENT_ONLY_ROWS);
      }
    );
  });

  describe('table without a vector index or chunks (sequential scan)', () => {
    const PLAIN = `vectorEmbedding: { vector: ${QUERY_VECTOR}, metric: COSINE }`;

    it('returns only rows with an embedding', async () => {
      const nodes = await fetchAll(PLAIN, 'ASC', 'allMemos');
      expect(nodes.map((n) => n.rowId).sort()).toEqual(PARENT_ONLY_ROWS);
      for (const node of nodes) {
        expect(Number.isFinite(node.embeddingVectorDistance)).toBe(true);
      }
    });

    it('reports totalCount over scored rows only', async () => {
      const result = await query<AllNotesResult>(`
        query { allMemos(where: { ${PLAIN} }) { totalCount nodes { rowId } } }
      `);
      expect(result.errors).toBeUndefined();
      expect((result.data as any).allMemos.totalCount).toBe(PARENT_ONLY_ROWS.length);
    });

    it.each([
      ['ASC', 1],
      ['ASC', 2],
      ['DESC', 1],
      ['DESC', 2],
    ] as Array<['ASC' | 'DESC', number]>)(
      'first/after paging (%s, first: %i) visits every scored row once, in order',
      async (direction, first) => {
        const all = await fetchAll(PLAIN, direction, 'allMemos');
        const paged = await pageThrough(PLAIN, direction, first, 'allMemos');
        expect(paged).toEqual(sortedByDistance(all, direction));
        expect([...paged].sort()).toEqual(PARENT_ONLY_ROWS);
      }
    );
  });

  describe('searchScore', () => {
    it.each([
      ['chunk-aware', CHUNK_AWARE],
      ['includeChunks: false', PARENT_ONLY],
    ])('%s: every returned row has a distance and the closest row scores highest', async (_label, filter) => {
      const nodes = await fetchAll(filter, 'ASC');
      for (const node of nodes) {
        expect(node.embeddingVectorDistance).not.toBeNull();
        expect(node.searchScore).toBeGreaterThan(0);
        expect(node.searchScore).toBeLessThanOrEqual(1);
      }
      // Sorted by distance ASC, so searchScore must be non-increasing
      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].searchScore!).toBeGreaterThanOrEqual(nodes[i + 1].searchScore!);
      }
      expect(nodes[0].rowId).toBe(1);
      expect(nodes[0].searchScore).toBe(1);
    });
  });
});
