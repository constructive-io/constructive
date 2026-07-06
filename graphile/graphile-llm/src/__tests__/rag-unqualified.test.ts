/**
 * RAG chunk-table qualification tests (pure, no DB / no Ollama required).
 *
 * Verifies the generated chunk search SQL references the tenant-data table
 * schema-qualified when a chunks schema is known, and falls back to a bare
 * table name only when no schema is available.
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

function makeBuild() {
  return {
    options: {},
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
  it('emits a SCHEMA-QUALIFIED reference by default', () => {
    const { text } = buildChunkSearchSql(baseChunkTable(), '[1,0,0]', 5, null);
    expect(text).toContain('FROM "llm_test"."articles_chunks"');
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

// ─── discoverChunkTables ─────────────────────────────────────────────────────

describe('discoverChunkTables', () => {
  it('discovers chunk tables and emits schema-qualified SQL', () => {
    const tables = discoverChunkTables(makeBuild());
    expect(tables).toHaveLength(1);
    expect(tables[0].chunksSchema).toBe('llm_test');

    const { text } = buildChunkSearchSql(tables[0], '[1,0,0]', 5, null);
    expect(text).toContain('FROM "llm_test"."articles_chunks"');
  });
});
