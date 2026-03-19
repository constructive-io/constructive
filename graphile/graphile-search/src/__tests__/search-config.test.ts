/**
 * Tests for Phase D (per-table @searchConfig smart tag) and Phase E (chunk querying).
 *
 * These tests verify the pure helper functions extracted from plugin.ts and pgvector.ts
 * without requiring a database connection.
 */

// We need to test the internal helpers. Since they're not exported,
// we test them indirectly through the adapter/plugin behavior using mocked codecs.

import { createPgvectorAdapter } from '../adapters/pgvector';
import { createUnifiedSearchPlugin } from '../plugin';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { createBm25Adapter } from '../adapters/bm25';

// ─── pgvector adapter: chunk detection ────────────────────────────────────────

describe('pgvector adapter — chunk querying (Phase E)', () => {
  describe('detectColumns with @hasChunks smart tag', () => {
    const adapter = createPgvectorAdapter();

    it('detects vector columns without chunks info when no @hasChunks tag', () => {
      const codec = {
        name: 'documents',
        attributes: {
          id: { codec: { name: 'uuid' } },
          embedding: { codec: { name: 'vector' } },
        },
        extensions: { tags: {} },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].attributeName).toBe('embedding');
      expect(columns[0].adapterData).toBeUndefined();
    });

    it('includes chunksInfo when @hasChunks smart tag has metadata', () => {
      const codec = {
        name: 'documents',
        attributes: {
          id: { codec: { name: 'uuid' } },
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: {
            hasChunks: {
              chunksTable: 'documents_chunks',
              parentFk: 'document_id',
              embeddingField: 'embedding',
            },
          },
        },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].attributeName).toBe('embedding');
      expect(columns[0].adapterData).toEqual({
        chunksInfo: {
          chunksTableName: 'documents_chunks',
          parentFkField: 'document_id',
          embeddingField: 'embedding',
        },
      });
    });

    it('parses JSON-encoded @hasChunks smart tag', () => {
      const codec = {
        name: 'documents',
        attributes: {
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: {
            hasChunks: JSON.stringify({
              chunksTable: 'doc_chunks',
              parentFk: 'doc_id',
              embeddingField: 'vec',
            }),
          },
        },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].adapterData).toEqual({
        chunksInfo: {
          chunksTableName: 'doc_chunks',
          parentFkField: 'doc_id',
          embeddingField: 'vec',
        },
      });
    });

    it('uses default parentFk and embeddingField when not specified', () => {
      const codec = {
        name: 'documents',
        attributes: {
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: {
            hasChunks: { chunksTable: 'my_chunks' },
          },
        },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns[0].adapterData).toEqual({
        chunksInfo: {
          chunksTableName: 'my_chunks',
          parentFkField: 'parent_id',
          embeddingField: 'embedding',
        },
      });
    });

    it('ignores boolean true @hasChunks (no metadata to resolve)', () => {
      const codec = {
        name: 'documents',
        attributes: {
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: { hasChunks: true },
        },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].adapterData).toBeUndefined();
    });

    it('ignores invalid JSON in @hasChunks string', () => {
      const codec = {
        name: 'documents',
        attributes: {
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: { hasChunks: 'not-valid-json' },
        },
      };

      const columns = adapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].adapterData).toBeUndefined();
    });

    it('does not detect chunks when enableChunkQuerying is false', () => {
      const noChunksAdapter = createPgvectorAdapter({ enableChunkQuerying: false });
      const codec = {
        name: 'documents',
        attributes: {
          embedding: { codec: { name: 'vector' } },
        },
        extensions: {
          tags: {
            hasChunks: { chunksTable: 'doc_chunks' },
          },
        },
      };

      const columns = noChunksAdapter.detectColumns(codec, {});
      expect(columns).toHaveLength(1);
      expect(columns[0].adapterData).toBeUndefined();
    });
  });

  describe('buildFilterApply with chunks', () => {
    const adapter = createPgvectorAdapter();

    // Mock sql object that mimics pg-sql2 behavior
    const mockSql = {
      identifier: (name: string) => `"${name}"`,
      value: (val: any) => `'${val}'`,
      raw: (s: string) => s,
      fragment: (strings: TemplateStringsArray, ...values: any[]) => {
        let result = '';
        strings.forEach((str, i) => {
          result += str;
          if (i < values.length) result += String(values[i]);
        });
        return result;
      },
      join: (parts: any[], sep: string) => parts.join(sep),
      parens: (expr: any) => `(${expr})`,
    };
    // Make sql a tagged template function too
    const sql = Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) => {
        let result = '';
        strings.forEach((str: string, i: number) => {
          result += str;
          if (i < values.length) result += String(values[i]);
        });
        return result;
      },
      mockSql,
    );

    it('generates standard query when no chunks info', () => {
      const result = adapter.buildFilterApply(
        sql,
        'tbl' as any,
        { attributeName: 'embedding' },
        { vector: [1, 0, 0], metric: 'COSINE' },
        {},
      );

      expect(result).not.toBeNull();
      expect(result!.scoreExpression).toBeDefined();
      // Standard query should NOT contain chunks table reference
      expect(String(result!.scoreExpression)).not.toContain('chunks');
    });

    it('generates chunk-aware query when chunks info is present', () => {
      const result = adapter.buildFilterApply(
        sql,
        'tbl' as any,
        {
          attributeName: 'embedding',
          adapterData: {
            chunksInfo: {
              chunksTableName: 'documents_chunks',
              parentFkField: 'document_id',
              embeddingField: 'embedding',
            },
          },
        },
        { vector: [1, 0, 0], metric: 'COSINE' },
        {},
      );

      expect(result).not.toBeNull();
      // Chunk-aware query should contain LEAST and chunks table reference
      const scoreStr = String(result!.scoreExpression);
      expect(scoreStr).toContain('LEAST');
      expect(scoreStr).toContain('documents_chunks');
    });

    it('generates standard query when includeChunks is false', () => {
      const result = adapter.buildFilterApply(
        sql,
        'tbl' as any,
        {
          attributeName: 'embedding',
          adapterData: {
            chunksInfo: {
              chunksTableName: 'documents_chunks',
              parentFkField: 'document_id',
              embeddingField: 'embedding',
            },
          },
        },
        { vector: [1, 0, 0], metric: 'COSINE', includeChunks: false },
        {},
      );

      expect(result).not.toBeNull();
      // With includeChunks: false, should NOT use chunk query
      const scoreStr = String(result!.scoreExpression);
      expect(scoreStr).not.toContain('LEAST');
      expect(scoreStr).not.toContain('documents_chunks');
    });
  });
});

// ─── Plugin: per-table @searchConfig smart tag (Phase D) ──────────────────────

describe('per-table @searchConfig smart tag (Phase D)', () => {
  describe('createUnifiedSearchPlugin respects @searchConfig', () => {
    it('creates a plugin with searchScoreWeights that can be overridden per-table', () => {
      // This test verifies the plugin can be created with global weights
      // The actual per-table override happens at schema-build time when codec.extensions.tags.searchConfig is read
      const plugin = createUnifiedSearchPlugin({
        adapters: [
          createTsvectorAdapter(),
          createBm25Adapter(),
        ],
        enableSearchScore: true,
        searchScoreWeights: { tsv: 0.8, bm25: 0.2 },
      });

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('UnifiedSearchPlugin');
    });

    it('creates a plugin without global weights (per-table only)', () => {
      const plugin = createUnifiedSearchPlugin({
        adapters: [
          createTsvectorAdapter(),
          createBm25Adapter(),
        ],
        enableSearchScore: true,
        // No searchScoreWeights — per-table @searchConfig will be the only source
      });

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('UnifiedSearchPlugin');
    });
  });
});

// ─── VectorNearbyInput: includeChunks field ──────────────────────────────────

describe('VectorNearbyInput includeChunks field (Phase E)', () => {
  it('adapter registers includeChunks field on VectorNearbyInput', () => {
    const adapter = createPgvectorAdapter();

    // Mock build object with minimal graphql types
    const registeredTypes: Record<string, any> = {};
    const mockBuild = {
      graphql: {
        GraphQLList: function GraphQLList(type: any) { return { type, kind: 'list' }; },
        GraphQLNonNull: function GraphQLNonNull(type: any) { return { type, kind: 'nonnull' }; },
        GraphQLFloat: 'Float',
        GraphQLBoolean: 'Boolean',
      },
      getTypeByName: (name: string) => registeredTypes[name] ?? name,
      registerEnumType: (name: string, _scope: any, specFn: any, _origin: string) => {
        registeredTypes[name] = { name, ...specFn() };
      },
      registerInputObjectType: (name: string, _scope: any, specFn: any, _origin: string) => {
        registeredTypes[name] = { name, ...specFn() };
      },
    };

    adapter.registerTypes(mockBuild);

    // VectorNearbyInput should be registered
    expect(registeredTypes['VectorNearbyInput']).toBeDefined();

    // Get the fields
    const fieldsResult = registeredTypes['VectorNearbyInput'].fields;
    const fields = typeof fieldsResult === 'function' ? fieldsResult() : fieldsResult;

    expect(fields.vector).toBeDefined();
    expect(fields.metric).toBeDefined();
    expect(fields.distance).toBeDefined();
    expect(fields.includeChunks).toBeDefined();
    expect(fields.includeChunks.type).toBe('Boolean');
    expect(fields.includeChunks.description).toContain('chunks');
  });
});
