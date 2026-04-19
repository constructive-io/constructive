import { join } from 'path';
import OllamaClient from '@agentic-kit/ollama';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmTextSearchPlugin } from '../../src/plugins/text-search-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import {
  buildEmbedder,
  buildEmbedderFromModule,
  buildEmbedderFromEnv,
} from '../../src/embedder';
import type { LlmModuleData } from '../../src/types';

// ─── @agentic-kit/ollama client ─────────────────────────────────────────────

const ollamaClient = new OllamaClient('http://localhost:11434');

async function ensureNomicModel(): Promise<void> {
  const models = await ollamaClient.listModels();
  const hasModel = models.some((m: string) => m.includes('nomic-embed-text'));
  if (!hasModel) {
    console.log('Pulling nomic-embed-text model...');
    await ollamaClient.pullModel('nomic-embed-text');
  }
}

// ─── Result types ────────────────────────────────────────────────────────────

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<GraphQLResponse<TResult>>;

// =============================================================================
// Suite 1: Embedder abstraction unit tests
// =============================================================================

describe('Embedder abstraction', () => {
  describe('buildEmbedder()', () => {
    it('returns an EmbedderFunction for ollama provider', () => {
      const embedder = buildEmbedder({
        provider: 'ollama',
        model: 'nomic-embed-text',
        baseUrl: 'http://localhost:11434',
      });
      expect(embedder).not.toBeNull();
      expect(typeof embedder).toBe('function');
    });

    it('returns null for unknown provider', () => {
      const embedder = buildEmbedder({
        provider: 'unknown-provider',
      });
      expect(embedder).toBeNull();
    });

    it('uses default model and baseUrl for ollama when not specified', () => {
      const embedder = buildEmbedder({ provider: 'ollama' });
      expect(embedder).not.toBeNull();
      expect(typeof embedder).toBe('function');
    });
  });

  describe('buildEmbedderFromModule()', () => {
    it('builds embedder from LlmModuleData', () => {
      const moduleData: LlmModuleData = {
        embedding_provider: 'ollama',
        embedding_model: 'nomic-embed-text',
        embedding_base_url: 'http://localhost:11434',
      };
      const embedder = buildEmbedderFromModule(moduleData);
      expect(embedder).not.toBeNull();
      expect(typeof embedder).toBe('function');
    });

    it('returns null for unsupported provider in module data', () => {
      const moduleData: LlmModuleData = {
        embedding_provider: 'unsupported',
      };
      const embedder = buildEmbedderFromModule(moduleData);
      expect(embedder).toBeNull();
    });
  });

  describe('buildEmbedderFromEnv()', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns null when EMBEDDER_PROVIDER is not set', () => {
      process.env = { ...originalEnv };
      delete process.env.EMBEDDER_PROVIDER;
      const embedder = buildEmbedderFromEnv();
      expect(embedder).toBeNull();
    });

    it('builds embedder from environment variables', () => {
      process.env = {
        ...originalEnv,
        EMBEDDER_PROVIDER: 'ollama',
        EMBEDDER_MODEL: 'nomic-embed-text',
        EMBEDDER_BASE_URL: 'http://localhost:11434',
      };
      const embedder = buildEmbedderFromEnv();
      expect(embedder).not.toBeNull();
      expect(typeof embedder).toBe('function');
    });
  });
});

// =============================================================================
// Suite 2: Schema enrichment — plugin adds text fields to GraphQL schema
// Requires PostgreSQL + pgvector. Tests WILL fail if database is unavailable.
// =============================================================================

describe('graphile-llm schema enrichment', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [createPgvectorAdapter()],
    });

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        // Search infrastructure (provides VectorNearbyInput)
        VectorCodecPlugin,
        unifiedPlugin,
        // LLM plugins under test
        createLlmModulePlugin({
          defaultEmbedder: {
            provider: 'ollama',
            model: 'nomic-embed-text',
            baseUrl: 'http://localhost:11434',
          },
        }),
        createLlmTextSearchPlugin(),
        createLlmTextMutationPlugin(),
      ],
    };

    const connections = await getConnections(
      {
        schemas: ['llm_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])],
    );

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
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

  // ─── VectorNearbyInput text field ────────────────────────────────────────

  describe('VectorNearbyInput text field', () => {
    it('adds text field to VectorNearbyInput type', async () => {
      const result = await query<{
        __type: { inputFields: Array<{ name: string; type: { name: string } }> };
      }>(`
        query {
          __type(name: "VectorNearbyInput") {
            inputFields {
              name
              type { name }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const inputType = result.data?.__type;
      expect(inputType).toBeDefined();

      const fieldNames = inputType!.inputFields.map((f) => f.name);
      // Original fields from graphile-search
      expect(fieldNames).toContain('vector');
      expect(fieldNames).toContain('metric');
      expect(fieldNames).toContain('distance');
      // New field from LlmTextSearchPlugin
      expect(fieldNames).toContain('text');

      // text field should be a String
      const textField = inputType!.inputFields.find((f) => f.name === 'text');
      expect(textField!.type.name).toBe('String');
    });

    it('still allows vector-based queries (existing behavior unchanged)', async () => {
      const result = await query<{
        allArticles: { nodes: Array<{ title: string; embeddingVectorDistance: number }> };
      }>(`
        query {
          allArticles(where: {
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
      const nodes = result.data?.allArticles?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      for (const node of nodes!) {
        expect(typeof node.embeddingVectorDistance).toBe('number');
        expect(node.embeddingVectorDistance).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── Mutation text companion fields ──────────────────────────────────────

  describe('Mutation text companion fields', () => {
    it('adds embeddingText field to CreateArticleInput', async () => {
      const result = await query<{
        __type: { inputFields: Array<{ name: string; type: { name: string } }> };
      }>(`
        query {
          __type(name: "CreateArticleInput") {
            inputFields {
              name
              type { name }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const inputType = result.data?.__type;
      expect(inputType).toBeDefined();

      const fieldNames = inputType!.inputFields.map((f) => f.name);
      // Original embedding field
      expect(fieldNames).toContain('embedding');
      // Companion text field from LlmTextMutationPlugin
      expect(fieldNames).toContain('embeddingText');

      const textField = inputType!.inputFields.find(
        (f) => f.name === 'embeddingText',
      );
      expect(textField).toBeDefined();
      expect(textField!.type.name).toBe('String');
    });

    it('adds embeddingText field to UpdateArticleInput (patch)', async () => {
      const result = await query<{
        __type: { inputFields: Array<{ name: string; type: { name: string } }> };
      }>(`
        query {
          __type(name: "ArticlePatch") {
            inputFields {
              name
              type { name }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const inputType = result.data?.__type;
      expect(inputType).toBeDefined();

      const fieldNames = inputType!.inputFields.map((f) => f.name);
      expect(fieldNames).toContain('embeddingText');

      const textField = inputType!.inputFields.find(
        (f) => f.name === 'embeddingText',
      );
      expect(textField).toBeDefined();
      expect(textField!.type.name).toBe('String');
    });
  });
});

// =============================================================================
// Suite 3: Real Ollama embedding via @agentic-kit/ollama
// Requires Ollama running with nomic-embed-text. Tests WILL fail if unavailable.
// =============================================================================

describe('graphile-llm with real Ollama embedding', () => {
  beforeAll(async () => {
    await ensureNomicModel();
  });

  it('should embed text to a real vector via Ollama nomic-embed-text', async () => {
    const embedder = buildEmbedder({
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    expect(embedder).not.toBeNull();

    const vector = await embedder!('Machine learning is transforming AI');

    // nomic-embed-text produces 768-dimensional vectors
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(768);

    // All elements should be numbers
    for (const v of vector) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }

    // Vector should not be all zeros
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeGreaterThan(0);

  });

  it('should produce different vectors for semantically different text', async () => {
    const embedder = buildEmbedder({
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    expect(embedder).not.toBeNull();

    const [vecA, vecB] = await Promise.all([
      embedder!('Artificial intelligence and machine learning'),
      embedder!('Cooking recipes for Italian pasta dishes'),
    ]);

    expect(vecA.length).toBe(768);
    expect(vecB.length).toBe(768);

    // Compute cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

    // Semantically different texts should have lower similarity
    expect(cosineSimilarity).toBeLessThan(0.95);
  });

  it('should produce similar vectors for semantically similar text', async () => {
    const embedder = buildEmbedder({
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    expect(embedder).not.toBeNull();

    const [vecA, vecB] = await Promise.all([
      embedder!('Machine learning and artificial intelligence'),
      embedder!('AI and ML are subfields of computer science'),
    ]);

    expect(vecA.length).toBe(768);
    expect(vecB.length).toBe(768);

    // Compute cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

    // Semantically similar texts should have high similarity
    expect(cosineSimilarity).toBeGreaterThan(0.5);
  });

  it('should produce embeddings via @agentic-kit/ollama OllamaClient directly', async () => {
    const vector = await ollamaClient.generateEmbedding(
      'Testing the agentic-kit Ollama client directly',
      'nomic-embed-text',
    );

    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(768);

    for (const v of vector) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
