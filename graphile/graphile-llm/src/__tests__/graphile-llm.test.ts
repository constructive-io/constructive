import { join } from 'path';
import OllamaClient from '@agentic-kit/ollama';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import type { GraphileConfig } from 'graphile-config';
import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmTextSearchPlugin } from '../../src/plugins/text-search-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import { createLlmRagPlugin } from '../../src/plugins/rag-plugin';
import {
  buildEmbedder,
  buildEmbedderFromModule,
  buildEmbedderFromEnv,
} from '../../src/embedder';
import {
  buildChatCompleter,
  buildChatCompleterFromModule,
  buildChatCompleterFromEnv,
} from '../../src/chat';
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

// =============================================================================
// Suite 4: Chat completion abstraction unit tests
// =============================================================================

describe('Chat completion abstraction', () => {
  describe('buildChatCompleter()', () => {
    it('returns a ChatFunction for ollama provider', () => {
      const chat = buildChatCompleter({
        provider: 'ollama',
        model: 'llama3',
        baseUrl: 'http://localhost:11434',
      });
      expect(chat).not.toBeNull();
      expect(typeof chat).toBe('function');
    });

    it('returns null for unknown provider', () => {
      const chat = buildChatCompleter({
        provider: 'unknown-provider',
      });
      expect(chat).toBeNull();
    });

    it('uses default model and baseUrl for ollama when not specified', () => {
      const chat = buildChatCompleter({ provider: 'ollama' });
      expect(chat).not.toBeNull();
      expect(typeof chat).toBe('function');
    });
  });

  describe('buildChatCompleterFromModule()', () => {
    it('builds chat completer from LlmModuleData with chat_provider', () => {
      const moduleData: LlmModuleData = {
        embedding_provider: 'ollama',
        chat_provider: 'ollama',
        chat_model: 'llama3',
        chat_base_url: 'http://localhost:11434',
      };
      const chat = buildChatCompleterFromModule(moduleData);
      expect(chat).not.toBeNull();
      expect(typeof chat).toBe('function');
    });

    it('returns null when chat_provider is not set', () => {
      const moduleData: LlmModuleData = {
        embedding_provider: 'ollama',
      };
      const chat = buildChatCompleterFromModule(moduleData);
      expect(chat).toBeNull();
    });
  });

  describe('buildChatCompleterFromEnv()', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns null when CHAT_PROVIDER is not set', () => {
      process.env = { ...originalEnv };
      delete process.env.CHAT_PROVIDER;
      const chat = buildChatCompleterFromEnv();
      expect(chat).toBeNull();
    });

    it('builds chat completer from environment variables', () => {
      process.env = {
        ...originalEnv,
        CHAT_PROVIDER: 'ollama',
        CHAT_MODEL: 'llama3',
        CHAT_BASE_URL: 'http://localhost:11434',
      };
      const chat = buildChatCompleterFromEnv();
      expect(chat).not.toBeNull();
      expect(typeof chat).toBe('function');
    });
  });
});

// =============================================================================
// Suite 5: RAG plugin schema enrichment
// Requires PostgreSQL + pgvector. Tests WILL fail if database is unavailable.
// =============================================================================

/**
 * Smart tag injection plugin for test tables.
 * Injects @hasChunks on the articles codec so the RAG plugin can discover it.
 */
function makeTestSmartTagsPlugin(
  tagsByTable: Record<string, Record<string, any>>
): GraphileConfig.Plugin {
  return {
    name: 'TestSmartTagsPlugin',
    version: '1.0.0',

    schema: {
      hooks: {
        init: {
          before: ['UnifiedSearchPlugin', 'LlmRagPlugin'],
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

describe('RAG plugin schema enrichment', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [createPgvectorAdapter()],
    });

    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        hasChunks: {
          chunksTable: 'articles_chunks',
          parentFk: 'parent_id',
          parentPk: 'id',
          embeddingField: 'embedding',
          contentField: 'content',
        },
      },
    });

    // Mock embedder that returns a fixed 3-dim vector
    const mockEmbedder = async (_text: string): Promise<number[]> => [1, 0, 0];

    // Mock chat completer that returns a canned response
    const mockChatCompleter = async (
      messages: Array<{ role: string; content: string }>,
    ): Promise<string> => {
      const userMessage = messages.find((m) => m.role === 'user');
      return `Mock answer for: ${userMessage?.content || 'unknown'}`;
    };

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        VectorCodecPlugin,
        unifiedPlugin,
        smartTagsPlugin,
        createLlmModulePlugin({
          defaultEmbedder: {
            provider: 'ollama',
            model: 'nomic-embed-text',
            baseUrl: 'http://localhost:11434',
          },
        }),
        createLlmTextSearchPlugin(),
        createLlmTextMutationPlugin(),
        createLlmRagPlugin(),
      ],
    };

    // Override the embedder and chat completer on the build context
    // by wrapping the LlmModulePlugin's build hook
    const overridePlugin: GraphileConfig.Plugin = {
      name: 'TestOverridePlugin',
      version: '1.0.0',
      after: ['LlmModulePlugin'],
      schema: {
        hooks: {
          build(build) {
            return build.extend(
              build,
              {
                llmEmbedder: mockEmbedder,
                llmChatCompleter: mockChatCompleter,
              },
              'TestOverridePlugin overriding embedder and chat completer'
            );
          },
        },
      },
    };

    const connections = await getConnections(
      {
        schemas: ['llm_test'],
        preset: {
          ...testPreset,
          plugins: [...testPreset.plugins, overridePlugin],
        },
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

  it('adds ragQuery field to the Query type', async () => {
    const result = await query<{
      __type: { fields: Array<{ name: string }> };
    }>(`
      query {
        __type(name: "Query") {
          fields {
            name
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const queryType = result.data?.__type;
    expect(queryType).toBeDefined();

    const fieldNames = queryType!.fields.map((f) => f.name);
    expect(fieldNames).toContain('ragQuery');
  });

  it('adds embedText field to the Query type', async () => {
    const result = await query<{
      __type: { fields: Array<{ name: string }> };
    }>(`
      query {
        __type(name: "Query") {
          fields {
            name
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type.fields.map((f) => f.name);
    expect(fieldNames).toContain('embedText');
  });

  it('ragQuery returns RagResponse type with answer and sources', async () => {
    const result = await query<{
      __type: { fields: Array<{ name: string; type: { name: string; kind: string } }> };
    }>(`
      query {
        __type(name: "RagResponse") {
          fields {
            name
            type { name kind }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const ragResponseType = result.data?.__type;
    expect(ragResponseType).toBeDefined();

    const fieldNames = ragResponseType!.fields.map((f) => f.name);
    expect(fieldNames).toContain('answer');
    expect(fieldNames).toContain('sources');
    expect(fieldNames).toContain('tokensUsed');
  });

  it('ragQuery executes and returns mock answer with sources', async () => {
    const result = await query<{
      ragQuery: {
        answer: string;
        sources: Array<{
          content: string;
          similarity: number;
          tableName: string;
          parentId: string;
        }>;
        tokensUsed: number | null;
      };
    }>(`
      query {
        ragQuery(prompt: "What is machine learning?", contextLimit: 3) {
          answer
          sources {
            content
            similarity
            tableName
            parentId
          }
          tokensUsed
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const rag = result.data?.ragQuery;
    expect(rag).toBeDefined();

    // Mock chat completer returns a canned response
    expect(rag!.answer).toContain('Mock answer for');
    expect(rag!.answer).toContain('What is machine learning?');

    // Sources should come from the chunks table
    expect(rag!.sources.length).toBeGreaterThan(0);
    expect(rag!.sources.length).toBeLessThanOrEqual(3);

    for (const source of rag!.sources) {
      expect(typeof source.content).toBe('string');
      expect(source.content.length).toBeGreaterThan(0);
      expect(typeof source.similarity).toBe('number');
      expect(source.similarity).toBeGreaterThanOrEqual(0);
      expect(source.similarity).toBeLessThanOrEqual(1);
      expect(source.tableName).toBe('articles');
      expect(source.parentId).toBeTruthy();
    }
  });

  it('embedText executes and returns vector with dimensions', async () => {
    const result = await query<{
      embedText: {
        vector: number[];
        dimensions: number;
      };
    }>(`
      query {
        embedText(text: "test embedding") {
          vector
          dimensions
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const embed = result.data?.embedText;
    expect(embed).toBeDefined();

    // Mock embedder returns [1, 0, 0]
    expect(embed!.vector).toEqual([1, 0, 0]);
    expect(embed!.dimensions).toBe(3);
  });
});

// =============================================================================
// Suite 6: GraphileLlmPreset toggle tests
// =============================================================================

describe('GraphileLlmPreset toggles', () => {
  it('enableRag=false excludes RAG plugin (no ragQuery field)', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableRag: false,
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmRagPlugin');
  });

  it('enableRag=true includes RAG plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableRag: true,
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain('LlmRagPlugin');
  });

  it('enableTextSearch=false excludes text search plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextSearch: false,
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmTextSearchPlugin');
    // Module plugin is always included
    expect(pluginNames).toContain('LlmModulePlugin');
  });

  it('enableTextMutations=false excludes text mutation plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextMutations: false,
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmTextMutationPlugin');
  });

  it('all toggles false leaves only LlmModulePlugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextSearch: false,
      enableTextMutations: false,
      enableRag: false,
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).toEqual(['LlmModulePlugin']);
  });

  it('default options include text search and mutations but not RAG', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset();

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain('LlmModulePlugin');
    expect(pluginNames).toContain('LlmTextSearchPlugin');
    expect(pluginNames).toContain('LlmTextMutationPlugin');
    expect(pluginNames).not.toContain('LlmRagPlugin');
  });
});
