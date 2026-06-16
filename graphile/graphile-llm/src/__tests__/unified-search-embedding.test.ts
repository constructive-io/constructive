/**
 * Unit tests for LlmTextSearchPlugin's embedTextInWhere function.
 *
 * Tests the transformation logic:
 *   - unifiedSearch: "text" → unifiedSearch: { __text: "text", __vector: [...] }
 *   - VectorNearbyInput.text → VectorNearbyInput.vector (existing behavior)
 *
 * Pure unit tests — no database or Ollama required.
 */

import { embedTextInWhere } from '../../src/plugins/text-search-plugin';

describe('unifiedSearch embedding integration', () => {
  const mockVector = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockEmbedder = jest.fn(async (_text: string) => mockVector);
  const nullEmbedder = jest.fn(async (_text: string) => null as number[] | null);

  beforeEach(() => {
    mockEmbedder.mockClear();
    nullEmbedder.mockClear();
  });

  describe('unifiedSearch text → { __text, __vector } transformation', () => {
    it('transforms unifiedSearch string to object with __text and __vector', async () => {
      const where = { unifiedSearch: 'HIPAA compliance' };
      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.unifiedSearch).toEqual({
        __text: 'HIPAA compliance',
        __vector: mockVector,
      });
      expect(mockEmbedder).toHaveBeenCalledWith('HIPAA compliance');
    });

    it('leaves unifiedSearch as plain string when embedder returns null (graceful degradation)', async () => {
      const where = { unifiedSearch: 'database normalization' };
      await embedTextInWhere(where, nullEmbedder, true);

      // Should remain as string — text adapters handle it
      expect(where.unifiedSearch).toBe('database normalization');
      expect(nullEmbedder).toHaveBeenCalledWith('database normalization');
    });

    it('throws when embedder returns null and no text adapters available', async () => {
      const where = { unifiedSearch: 'vector only query' };

      await expect(
        embedTextInWhere(where, nullEmbedder, false)
      ).rejects.toThrow('embedding failed');
    });

    it('does not embed empty unifiedSearch strings', async () => {
      const where = { unifiedSearch: '   ' };
      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.unifiedSearch).toBe('   ');
      expect(mockEmbedder).not.toHaveBeenCalled();
    });

    it('does not embed null unifiedSearch', async () => {
      const where: any = { unifiedSearch: null };
      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.unifiedSearch).toBeNull();
      expect(mockEmbedder).not.toHaveBeenCalled();
    });
  });

  describe('VectorNearbyInput text → vector (existing behavior)', () => {
    it('transforms VectorNearbyInput text to vector', async () => {
      const where = { vectorEmbedding: { text: 'semantic query' } };
      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.vectorEmbedding).toEqual({ vector: mockVector });
      expect(mockEmbedder).toHaveBeenCalledWith('semantic query');
    });

    it('removes text field when embedder returns null', async () => {
      const where = { vectorEmbedding: { text: 'failed query' } };
      await embedTextInWhere(where, nullEmbedder, true);

      expect(where.vectorEmbedding).toEqual({});
      expect(nullEmbedder).toHaveBeenCalledWith('failed query');
    });

    it('does not modify VectorNearbyInput with existing vector', async () => {
      const existingVector = [1, 2, 3];
      const where = { vectorEmbedding: { vector: existingVector, text: 'ignored' } };
      await embedTextInWhere(where, mockEmbedder, true);

      // text + vector present → not modified (vector takes precedence)
      expect(where.vectorEmbedding.vector).toBe(existingVector);
      expect(mockEmbedder).not.toHaveBeenCalled();
    });
  });

  describe('combined unifiedSearch + VectorNearbyInput', () => {
    it('embeds both unifiedSearch and VectorNearbyInput.text in parallel', async () => {
      const where = {
        unifiedSearch: 'hybrid search query',
        vectorEmbedding: { text: 'vector part' },
      };

      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.unifiedSearch).toEqual({
        __text: 'hybrid search query',
        __vector: mockVector,
      });
      expect(where.vectorEmbedding).toEqual({ vector: mockVector });
      expect(mockEmbedder).toHaveBeenCalledTimes(2);
    });
  });

  describe('nested filter structures (AND, OR)', () => {
    it('handles unifiedSearch inside nested AND/OR filters', async () => {
      const where = {
        AND: [
          { unifiedSearch: 'first query' },
          { unifiedSearch: 'second query' },
        ],
      };

      await embedTextInWhere(where, mockEmbedder, true);

      expect(where.AND[0].unifiedSearch).toEqual({
        __text: 'first query',
        __vector: mockVector,
      });
      expect(where.AND[1].unifiedSearch).toEqual({
        __text: 'second query',
        __vector: mockVector,
      });
    });
  });

  describe('onQuotaExceeded option', () => {
    it('degrade mode (default): leaves unifiedSearch as string when embedder returns null', async () => {
      const where = { unifiedSearch: 'some query' };
      await embedTextInWhere(where, nullEmbedder, true, 'degrade');

      expect(where.unifiedSearch).toBe('some query');
    });

    it('throw mode: throws on unifiedSearch when embedder returns null even with text adapters', async () => {
      const where = { unifiedSearch: 'some query' };

      await expect(
        embedTextInWhere(where, nullEmbedder, true, 'throw')
      ).rejects.toThrow('onQuotaExceeded is set to \'throw\'');
    });

    it('throw mode: throws on VectorNearbyInput.text when embedder returns null', async () => {
      const where = { vectorEmbedding: { text: 'semantic query' } };

      await expect(
        embedTextInWhere(where, nullEmbedder, true, 'throw')
      ).rejects.toThrow('VectorNearbyInput: embedding failed');
    });

    it('degrade mode: silently removes VectorNearbyInput.text when embedder returns null', async () => {
      const where = { vectorEmbedding: { text: 'failed query' } };
      await embedTextInWhere(where, nullEmbedder, true, 'degrade');

      expect(where.vectorEmbedding).toEqual({});
    });

    it('throw mode: still works normally when embedder succeeds', async () => {
      const where = { unifiedSearch: 'good query' };
      await embedTextInWhere(where, mockEmbedder, true, 'throw');

      expect(where.unifiedSearch).toEqual({
        __text: 'good query',
        __vector: mockVector,
      });
    });

    it('no text adapters: throws regardless of onQuotaExceeded setting', async () => {
      const where1 = { unifiedSearch: 'query1' };
      await expect(
        embedTextInWhere(where1, nullEmbedder, false, 'degrade')
      ).rejects.toThrow('No text search adapters available');

      const where2 = { unifiedSearch: 'query2' };
      await expect(
        embedTextInWhere(where2, nullEmbedder, false, 'throw')
      ).rejects.toThrow('No text search adapters available');
    });
  });

  describe('apply function object shape handling', () => {
    it('plugin.ts apply function handles { __text, __vector } correctly', () => {
      // Simulate what the apply function does with the transformed value
      const val = { __text: 'HIPAA compliance', __vector: [0.1, 0.2, 0.3] };

      let text: string;
      let vector: number[] | null = null;

      if (typeof val === 'object' && val.__text) {
        text = val.__text;
        vector = val.__vector ?? null;
      } else {
        text = typeof val === 'string' ? val : String(val);
      }

      expect(text).toBe('HIPAA compliance');
      expect(vector).toEqual([0.1, 0.2, 0.3]);
    });

    it('plugin.ts apply function handles plain string correctly', () => {
      const val = 'plain text search' as any;

      let text: string;
      let vector: number[] | null = null;

      if (typeof val === 'object' && val.__text) {
        text = val.__text;
        vector = val.__vector ?? null;
      } else {
        text = typeof val === 'string' ? val : String(val);
      }

      expect(text).toBe('plain text search');
      expect(vector).toBeNull();
    });
  });
});
