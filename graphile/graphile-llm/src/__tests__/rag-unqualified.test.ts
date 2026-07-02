/**
 * RAG chunk-table qualification tests (pure, no DB / no Ollama required).
 *
 * Verifies the blueprint-pooling flag `build.options.constructiveUnqualified`
 * is threaded into discovered ChunkTableInfo and that the generated chunk
 * search SQL references the tenant-data table UNQUALIFIED when the flag is on
 * (so the per-request search_path resolves the tenant), while the default
 * behavior stays schema-qualified.
 */

import { buildChunkSearchSql, discoverChunkTables } from '../plugins/rag-plugin';
import type { ChunkTableInfo } from '../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function baseChunkTable(overrides: Partial<ChunkTableInfo> = {}): ChunkTableInfo {
  return {
    parentCodecName: 'articles',
    chunksSchema: 'llm_test',
    chunksTableName: 'articles_chunks',
    parentFkField: 'parent_id',
    parentPkField: 'id',
    embeddingField: 'embedding',
    contentField: 'content',
    ...overrides
  };
}

function makeBuild(constructiveUnqualified?: boolean) {
  return {
    options: constructiveUnqualified === undefined ? {} : { constructiveUnqualified },
    input: {
      pgRegistry: {
        pgCodecs: {
          articles: {
            name: 'articles',
            attributes: { id: {}, title: {} },
            extensions: {
              pg: { schemaName: 'llm_test' },
              tags: {
                hasChunks: {
                  chunksTable: 'articles_chunks',
                  parentFk: 'parent_id',
                  parentPk: 'id',
                  embeddingField: 'embedding',
                  contentField: 'content'
                }
              }
            }
          }
        }
      }
    }
  };
}

// ─── buildChunkSearchSql ─────────────────────────────────────────────────────

describe('buildChunkSearchSql — chunk table qualification', () => {
  it('emits a SCHEMA-QUALIFIED reference by default (flag off)', () => {
    const { text } = buildChunkSearchSql(baseChunkTable(), '[1,0,0]', 5, null);
    expect(text).toContain('FROM "llm_test"."articles_chunks"');
  });

  it('emits an UNQUALIFIED reference when unqualified is true (blueprint pooling)', () => {
    const { text } = buildChunkSearchSql(
      baseChunkTable({ unqualified: true }),
      '[1,0,0]',
      5,
      null
    );
    expect(text).toContain('FROM "articles_chunks"');
    expect(text).not.toContain('"llm_test"."articles_chunks"');
  });

  it('emits an UNQUALIFIED reference when no schema is known (existing fallback)', () => {
    const { text } = buildChunkSearchSql(
      baseChunkTable({ chunksSchema: null }),
      '[1,0,0]',
      5,
      null
    );
    expect(text).toContain('FROM "articles_chunks"');
  });

  it('preserves parameter order/values (no maxDistance)', () => {
    const { values } = buildChunkSearchSql(baseChunkTable(), '[1,0,0]', 7, null);
    expect(values).toEqual(['[1,0,0]', 7]);
  });

  it('preserves parameter order/values (with maxDistance)', () => {
    const { text, values } = buildChunkSearchSql(baseChunkTable(), '[1,0,0]', 7, 0.4);
    expect(values).toEqual(['[1,0,0]', 0.4, 7]);
    expect(text).toContain('LIMIT $3');
  });
});

// ─── discoverChunkTables threading ───────────────────────────────────────────

describe('discoverChunkTables — threads constructiveUnqualified into ChunkTableInfo', () => {
  it('sets unqualified=true when build.options.constructiveUnqualified is true', () => {
    const tables = discoverChunkTables(makeBuild(true));
    expect(tables).toHaveLength(1);
    expect(tables[0].unqualified).toBe(true);
    expect(tables[0].chunksSchema).toBe('llm_test');

    // End-to-end: the discovered table produces a bare reference.
    const { text } = buildChunkSearchSql(tables[0], '[1,0,0]', 5, null);
    expect(text).toContain('FROM "articles_chunks"');
    expect(text).not.toContain('"llm_test"."articles_chunks"');
  });

  it('sets unqualified=false when the flag is false', () => {
    const tables = discoverChunkTables(makeBuild(false));
    expect(tables).toHaveLength(1);
    expect(tables[0].unqualified).toBe(false);

    const { text } = buildChunkSearchSql(tables[0], '[1,0,0]', 5, null);
    expect(text).toContain('FROM "llm_test"."articles_chunks"');
  });

  it('sets unqualified=false when the flag is absent (default behavior unchanged)', () => {
    const tables = discoverChunkTables(makeBuild(undefined));
    expect(tables).toHaveLength(1);
    expect(tables[0].unqualified).toBe(false);

    const { text } = buildChunkSearchSql(tables[0], '[1,0,0]', 5, null);
    expect(text).toContain('FROM "llm_test"."articles_chunks"');
  });
});
