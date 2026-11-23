import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { createTsvectorAdapter } from 'graphile-search/adapters/tsvector';
import { TsvectorCodecPlugin } from 'graphile-search/codecs/tsvector-codec';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { buildChatCompleter, buildChatCompleterFromEnv } from '../../src/chat';
import { buildEmbedder, buildEmbedderFromEnv } from '../../src/embedder';
import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmRagPlugin } from '../../src/plugins/rag-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import { createLlmTextSearchPlugin, embedTextInWhere } from '../../src/plugins/text-search-plugin';
import type { EmbedderFunction } from '../../src/types';
import {
  asTestRequest,
  ensureModel,
  startGateway,
  TEST_CLAIMS,
  TEST_DATABASE_ID,
  type TestGateway
} from '../../test-utils/gateway';

// ─── Gateway ────────────────────────────────────────────────────────────────

let gateway: TestGateway;

beforeAll(async () => {
  gateway = await startGateway();
});

afterAll(async () => {
  if (gateway) await gateway.close();
});

const ensureNomicModel = () => ensureModel();

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
    it('returns a gateway embedder for the configured provider and model', () => {
      const embedder = buildEmbedder({ provider: 'ollama', model: 'nomic-embed-text' });
      expect(typeof embedder).toBe('function');
    });

    it('uses the default model when none is given', () => {
      const embedder = buildEmbedder({ provider: 'ollama' });
      expect(typeof embedder).toBe('function');
    });

    it('refuses to build without a gateway', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.AGENTIC_SERVER_URL;
      try {
        expect(() => buildEmbedder({ provider: 'ollama' })).toThrow(/AGENTIC_SERVER_URL/);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('buildEmbedderFromEnv()', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns a gateway embedder when only AGENTIC_SERVER_URL is set', () => {
      process.env = { ...originalEnv };
      delete process.env.EMBEDDER_PROVIDER;
      delete process.env.EMBEDDER_MODEL;
      const embedder = buildEmbedderFromEnv();
      expect(typeof embedder).toBe('function');
    });

    it('builds from EMBEDDER_PROVIDER / EMBEDDER_MODEL through the gateway', () => {
      process.env = {
        ...originalEnv,
        EMBEDDER_PROVIDER: 'ollama',
        EMBEDDER_MODEL: 'nomic-embed-text'
      };
      const embedder = buildEmbedderFromEnv();
      expect(typeof embedder).toBe('function');
    });

    it('returns null when neither a gateway nor a provider is configured', () => {
      process.env = { ...originalEnv };
      delete process.env.AGENTIC_SERVER_URL;
      delete process.env.EMBEDDER_PROVIDER;
      delete process.env.EMBEDDER_MODEL;
      delete process.env.EMBEDDER_BASE_URL;
      expect(buildEmbedderFromEnv()).toBeNull();
    });

    it('throws when a provider is configured without a gateway', () => {
      process.env = { ...originalEnv, EMBEDDER_PROVIDER: 'ollama' };
      delete process.env.AGENTIC_SERVER_URL;
      expect(() => buildEmbedderFromEnv()).toThrow(/AGENTIC_SERVER_URL/);
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
      adapters: [createPgvectorAdapter()]
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
          }
        }),
        createLlmTextSearchPlugin(),
        createLlmTextMutationPlugin()
      ]
    };

    const connections = await getConnections(
      {
        schemas: ['llm_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
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
    it('adds embeddingText field to ArticleInput (create input)', async () => {
      const result = await query<{
        __type: { inputFields: Array<{ name: string; type: { name: string } }> };
      }>(`
        query {
          __type(name: "ArticleInput") {
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
      expect(fieldNames).toContain('embedding');
      expect(fieldNames).toContain('embeddingText');

      const textField = inputType!.inputFields.find(
        (f) => f.name === 'embeddingText'
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
        (f) => f.name === 'embeddingText'
      );
      expect(textField).toBeDefined();
      expect(textField!.type.name).toBe('String');
    });

    it('does not conflict with a physical embedding_text column (NoteInput)', async () => {
      const result = await query<{
        __type: { inputFields: Array<{ name: string; type: { name: string } }> };
      }>(`
        query {
          __type(name: "NoteInput") {
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

      // Exactly one embeddingText field — the physical column, not a
      // plugin-synthesized companion.
      const textFields = inputType!.inputFields.filter(
        (f) => f.name === 'embeddingText'
      );
      expect(textFields).toHaveLength(1);
      expect(textFields[0].type.name).toBe('String');
    });

    it('stores raw text in the physical embedding_text column (not consumed as companion)', async () => {
      const result = await query<{
        createNote: { note: { rowId: number; title: string; embeddingText: string; embedding: number[] | null } };
      }>(`
        mutation {
          createNote(input: { note: { title: "Physical column", embeddingText: "keep me as text" } }) {
            note {
              rowId
              title
              embeddingText
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const note = result.data?.createNote?.note;
      expect(note).toBeDefined();
      expect(note!.embeddingText).toBe('keep me as text');
      // The vector column must NOT have been populated by the plugin.
      expect(note!.embedding).toBeNull();
    });
  });
});

// =============================================================================
// Suite 3: Real Ollama embedding via @agentic-kit/ollama
// Requires Ollama running with nomic-embed-text. Tests WILL fail if unavailable.
// =============================================================================

describe('graphile-llm with real Ollama embedding', () => {
  let embedder: EmbedderFunction;

  beforeAll(async () => {
    await ensureNomicModel();
    embedder = buildEmbedder({ provider: 'ollama', model: 'nomic-embed-text' });
  });

  beforeEach(() => {
    gateway.recorded.length = 0;
  });

  it('embeds text to a real vector through the gateway, recording the call', async () => {
    const result = await asTestRequest(() => embedder('Machine learning is transforming AI'));

    // nomic-embed-text produces 768-dimensional vectors
    expect(result.embedding).toHaveLength(768);
    expect(result.promptTokens).toBeGreaterThan(0);
    for (const v of result.embedding) {
      expect(Number.isFinite(v)).toBe(true);
    }

    expect(gateway.recorded).toHaveLength(1);
    expect(gateway.recorded[0]).toMatchObject({
      service: 'embed',
      databaseId: TEST_DATABASE_ID,
      model: 'nomic-embed-text',
      status: 'ok',
      inputTokens: result.promptTokens
    });
  });

  it('refuses a call that carries no identity', async () => {
    await expect(embedder('unattributed')).rejects.toThrow(/database_id/);
    expect(gateway.recorded).toHaveLength(0);
  });

  it('produces different vectors for semantically different text', async () => {
    const [a, b] = await asTestRequest(() =>
      Promise.all([
        embedder('Artificial intelligence and machine learning'),
        embedder('Cooking recipes for Italian pasta dishes')
      ])
    );
    expect(a.embedding).not.toEqual(b.embedding);
    expect(cosine(a.embedding, b.embedding)).toBeLessThan(0.9);
    expect(gateway.recorded).toHaveLength(2);
  });

  it('produces similar vectors for semantically similar text', async () => {
    const [a, b] = await asTestRequest(() =>
      Promise.all([
        embedder('Machine learning and artificial intelligence'),
        embedder('AI and ML are subfields of computer science')
      ])
    );
    expect(cosine(a.embedding, b.embedding)).toBeGreaterThan(0.5);
  });
});

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// =============================================================================
// Suite 4: Chat completion abstraction unit tests
// =============================================================================

describe('Chat completion abstraction', () => {
  describe('buildChatCompleter()', () => {
    it('returns a gateway chat completer for the configured provider and model', () => {
      const chat = buildChatCompleter({ provider: 'ollama', model: 'llama3' });
      expect(typeof chat).toBe('function');
    });

    it('refuses to build without a gateway', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.AGENTIC_SERVER_URL;
      try {
        expect(() => buildChatCompleter({ provider: 'ollama' })).toThrow(/AGENTIC_SERVER_URL/);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('buildChatCompleterFromEnv()', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns a gateway chat completer when only AGENTIC_SERVER_URL is set', () => {
      process.env = { ...originalEnv };
      delete process.env.CHAT_PROVIDER;
      delete process.env.CHAT_MODEL;
      expect(typeof buildChatCompleterFromEnv()).toBe('function');
    });

    it('builds from CHAT_PROVIDER / CHAT_MODEL through the gateway', () => {
      process.env = { ...originalEnv, CHAT_PROVIDER: 'ollama', CHAT_MODEL: 'llama3' };
      expect(typeof buildChatCompleterFromEnv()).toBe('function');
    });

    it('returns null when neither a gateway nor a provider is configured', () => {
      process.env = { ...originalEnv };
      delete process.env.AGENTIC_SERVER_URL;
      delete process.env.CHAT_PROVIDER;
      delete process.env.CHAT_MODEL;
      delete process.env.CHAT_BASE_URL;
      expect(buildChatCompleterFromEnv()).toBeNull();
    });

    it('throws when a provider is configured without a gateway', () => {
      process.env = { ...originalEnv, CHAT_PROVIDER: 'ollama' };
      delete process.env.AGENTIC_SERVER_URL;
      expect(() => buildChatCompleterFromEnv()).toThrow(/AGENTIC_SERVER_URL/);
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
    before: ['LlmRagPlugin'],

    schema: {
      hooks: {
        build: {
          before: ['LlmRagPlugin'],
          callback(build) {
            const pgRegistry = build.input?.pgRegistry ?? (build as any).pgRegistry;
            if (!pgRegistry) return build;

            for (const codec of Object.values(pgRegistry.pgCodecs || {})) {
              const c = codec as any;
              if (!c.attributes || !c.name) continue;

              const tags = tagsByTable[c.name];
              if (!tags) continue;

              if (!c.extensions) c.extensions = {};
              if (!c.extensions.tags) c.extensions.tags = {};

              Object.assign(c.extensions.tags, tags);
            }
            return build;
          }
        }
      }
    }
  };
}

describe('RAG plugin schema enrichment', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [createPgvectorAdapter()]
    });

    const smartTagsPlugin = makeTestSmartTagsPlugin({
      articles: {
        hasChunks: {
          chunksTable: 'articles_chunks',
          parentFk: 'parent_id',
          parentPk: 'id',
          embeddingField: 'embedding',
          contentField: 'content'
        }
      }
    });

    // Mock embedder that returns a fixed 3-dim vector with token count
    const mockEmbedder = async (_text: string) => ({
      embedding: [1, 0, 0],
      promptTokens: 5
    });

    // Mock chat completer that returns a canned response with usage
    const mockChatCompleter = async (
      messages: Array<{ role: string; content: string }>
    ) => {
      const userMessage = messages.find((m) => m.role === 'user');
      return {
        content: `Mock answer for: ${userMessage?.content || 'unknown'}`,
        usage: { input: 10, output: 15, reasoning: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 25 }
      };
    };

    // Provide mock embedder/chat directly instead of using createLlmModulePlugin
    // to avoid build.extend naming conflicts when overriding
    const mockLlmPlugin: GraphileConfig.Plugin = {
      name: 'TestMockLlmPlugin',
      version: '1.0.0',
      schema: {
        hooks: {
          build(build) {
            return build.extend(
              build,
              {
                llmEmbedder: mockEmbedder,
                llmChatCompleter: mockChatCompleter,
                llmEmbeddingModel: 'test-mock-model',
                llmChatModel: 'test-mock-chat'
              },
              'TestMockLlmPlugin providing mock embedder and chat completer'
            );
          }
        }
      }
    };

    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [
        VectorCodecPlugin,
        unifiedPlugin,
        smartTagsPlugin,
        mockLlmPlugin,
        createLlmTextSearchPlugin(),
        createLlmTextMutationPlugin(),
        createLlmRagPlugin()
      ]
    };

    const connections = await getConnections(
      {
        schemas: ['llm_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
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
      enableRag: false
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmRagPlugin');
  });

  it('enableRag=true includes RAG plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableRag: true
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain('LlmRagPlugin');
  });

  it('enableTextSearch=false excludes text search plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextSearch: false
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmTextSearchPlugin');
    // Module plugin is always included
    expect(pluginNames).toContain('LlmModulePlugin');
  });

  it('enableTextMutations=false excludes text mutation plugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextMutations: false
    });

    const pluginNames = preset.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain('LlmTextMutationPlugin');
  });

  it('all toggles false leaves only LlmModulePlugin', async () => {
    const { GraphileLlmPreset } = await import('../../src/preset');
    const preset = GraphileLlmPreset({
      enableTextSearch: false,
      enableTextMutations: false,
      enableRag: false
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

// =============================================================================
// Suite 7: Real Ollama + unifiedSearch + pgvector RRF integration
//
// End-to-end: embeds article text with real Ollama nomic-embed-text (768 dims),
// seeds the DB, then runs hybrid text+vector queries verifying RRF fusion,
// semantic relevance, and server-side embedding of unifiedSearch text.
//
// Requires: PostgreSQL with pgvector + Ollama with nomic-embed-text.
// =============================================================================

const INTEGRATION_ARTICLES = [
  { id: 1, title: 'Introduction to Machine Learning', body: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.' },
  { id: 2, title: 'Cooking Italian Pasta', body: 'The best Italian pasta is made with fresh ingredients like San Marzano tomatoes and homemade egg noodles.' },
  { id: 3, title: 'Deep Learning with Neural Networks', body: 'Deep learning uses neural networks with multiple layers to learn hierarchical representations of data.' },
  { id: 4, title: 'Gardening Tips for Spring', body: 'Start your spring garden by preparing soil, choosing the right seeds, and ensuring proper sunlight and watering.' },
  { id: 5, title: 'Natural Language Processing', body: 'NLP combines computational linguistics with machine learning to enable computers to understand human language.' },
];

const INTEGRATION_SETUP_SQL = `
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE SCHEMA IF NOT EXISTS llm_integration;

  CREATE TABLE llm_integration.articles (
    id serial PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', title), 'A') ||
      setweight(to_tsvector('english', body), 'B')
    ) STORED,
    embedding vector(768) NOT NULL
  );

  CREATE INDEX idx_int_articles_tsv ON llm_integration.articles USING gin(tsv);
  CREATE INDEX idx_int_articles_embedding ON llm_integration.articles
    USING hnsw(embedding vector_cosine_ops);
`;

describe('Real Ollama + unifiedSearch + pgvector RRF integration', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;
  let embedder: EmbedderFunction;
  // Pre-computed query vectors (embedded once in beforeAll)
  let mlQueryVector: number[];
  let cookingQueryVector: number[];

  beforeAll(async () => {
    // Build a real Ollama embedder
    embedder = buildEmbedder({ provider: 'ollama', model: 'nomic-embed-text' });

    await ensureNomicModel();

    // Embed all article bodies in parallel
    const embeddings = await asTestRequest(() =>
      Promise.all(INTEGRATION_ARTICLES.map((a) => embedder(`${a.title}. ${a.body}`)))
    );

    // Build seed SQL with real 768-dim embeddings
    const values = INTEGRATION_ARTICLES.map((a, i) => {
      const vecStr = `'[${embeddings[i].embedding.join(',')}]'`;
      const titleEsc = a.title.replace(/'/g, "''");
      const bodyEsc = a.body.replace(/'/g, "''");
      return `(${a.id}, '${titleEsc}', '${bodyEsc}', ${vecStr})`;
    }).join(',\n  ');

    const seedSql = `
      INSERT INTO llm_integration.articles (id, title, body, embedding)
      VALUES ${values};
      SELECT setval('llm_integration.articles_id_seq', ${INTEGRATION_ARTICLES.length});
    `;

    // Pre-compute search query vectors
    const [mlResult, cookResult] = await asTestRequest(() =>
      Promise.all([
        embedder('machine learning artificial intelligence algorithms'),
        embedder('Italian cooking pasta recipes tomatoes')
      ])
    );
    mlQueryVector = mlResult.embedding;
    cookingQueryVector = cookResult.embedding;

    // Set up PostGraphile with tsvector + pgvector adapters + LLM plugin
    const unifiedPlugin = createUnifiedSearchPlugin({
      adapters: [
        createTsvectorAdapter(),
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
        VectorCodecPlugin,
        unifiedPlugin,
        createLlmModulePlugin({
          defaultEmbedder: {
            provider: 'ollama',
            model: 'nomic-embed-text',
          },
        }),
        createLlmTextSearchPlugin(),
      ],
    };

    const connections = await getConnections({
      schemas: ['llm_integration'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.fn(async (ctx) => {
        await ctx.pg.query(INTEGRATION_SETUP_SQL);
        await ctx.pg.query(seedSql);
      }),
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
    // Requests run on the root client (`useRoot`); its context is their pgSettings.
    connections.pg.setContext({ role: 'postgres', ...TEST_CLAIMS });

    await db.client.query('BEGIN');
  }, 120_000);

  afterAll(async () => {
    if (db) {
      try {
        await db.client.query('ROLLBACK');
      } catch {
        // ignore
      }
    }
    if (teardown) await teardown();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  // ─── embedTextInWhere with real Ollama ──────────────────────────────────

  it('embedTextInWhere transforms unifiedSearch with real 768-dim Ollama vector', async () => {
    const realEmbedder = async (text: string) => {
      const result = await asTestRequest(() => embedder(text));
      return result.embedding;
    };

    const where: any = { unifiedSearch: 'machine learning algorithms' };
    await embedTextInWhere(where, realEmbedder, true);

    expect(where.unifiedSearch).toHaveProperty('__text', 'machine learning algorithms');
    expect(where.unifiedSearch).toHaveProperty('__vector');
    expect(Array.isArray(where.unifiedSearch.__vector)).toBe(true);
    expect(where.unifiedSearch.__vector.length).toBe(768);

    for (const v of where.unifiedSearch.__vector) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
  }, 30_000);

  // ─── unifiedSearch text embedded server-side ───────────────────────────

  it('unifiedSearch text embeds server-side so tsvector and pgvector both participate', async () => {
    const result = await query<{
      allArticles: { nodes: Array<{ rowId: number; title: string; tsvRank: number | null; embeddingVectorDistance: number | null; searchScore: number }> };
    }>(`
      query {
        allArticles(where: { unifiedSearch: "machine learning" }) {
          nodes { rowId title tsvRank embeddingVectorDistance searchScore }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    expect(nodes.some((n) => n.tsvRank !== null)).toBe(true);
    for (const node of nodes) {
      expect(typeof node.embeddingVectorDistance).toBe('number');
    }
  });

  // ─── unifiedSearch + real pgvector: hybrid RRF ─────────────────────────

  it('unifiedSearch + real vector embedding fuses tsvector + pgvector via RRF', async () => {
    const vecStr = `[${mlQueryVector.join(',')}]`;
    const result = await query<{
      allArticles: { nodes: Array<{ rowId: number; title: string; tsvRank: number | null; embeddingVectorDistance: number | null; searchScore: number }> };
    }>(`
      query($vec: [Float!]!) {
        allArticles(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: $vec, metric: COSINE }
        }) {
          nodes { rowId title tsvRank embeddingVectorDistance searchScore }
        }
      }
    `, { vec: mlQueryVector });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);

    // Both adapters should be active
    const hasTsv = nodes.some((n) => n.tsvRank !== null);
    const hasVector = nodes.some((n) => n.embeddingVectorDistance !== null);
    expect(hasTsv).toBe(true);
    expect(hasVector).toBe(true);

    // searchScore must be normalized [0,1]
    for (const node of nodes) {
      expect(node.searchScore).toBeGreaterThanOrEqual(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  // ─── Semantic relevance with real embeddings ───────────────────────────

  it('ML query ranks ML articles higher than cooking/gardening with real embeddings', async () => {
    const result = await query<{
      allArticles: { nodes: Array<{ rowId: number; title: string; searchScore: number }> };
    }>(`
      query($vec: [Float!]!) {
        allArticles(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: $vec, metric: COSINE }
        }) {
          nodes { rowId title searchScore }
        }
      }
    `, { vec: mlQueryVector });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];

    // ML-related articles (1, 3, 5) should score higher than non-ML (2, 4)
    const mlArticles = nodes.filter((n) => [1, 3, 5].includes(n.rowId));
    const nonMlArticles = nodes.filter((n) => [2, 4].includes(n.rowId));

    if (mlArticles.length > 0 && nonMlArticles.length > 0) {
      const bestMlScore = Math.max(...mlArticles.map((n) => n.searchScore));
      const bestNonMlScore = Math.max(...nonMlArticles.map((n) => n.searchScore));
      expect(bestMlScore).toBeGreaterThan(bestNonMlScore);
    }
  });

  it('cooking query ranks cooking article higher than ML articles with real embeddings', async () => {
    const result = await query<{
      allArticles: { nodes: Array<{ rowId: number; title: string; searchScore: number }> };
    }>(`
      query($vec: [Float!]!) {
        allArticles(where: {
          unifiedSearch: "Italian pasta cooking"
          vectorEmbedding: { vector: $vec, metric: COSINE }
        }) {
          nodes { rowId title searchScore }
        }
      }
    `, { vec: cookingQueryVector });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];

    // Cooking article (id=2) should rank highest
    const cookingArticle = nodes.find((n) => n.rowId === 2);
    const otherArticles = nodes.filter((n) => n.rowId !== 2);

    if (cookingArticle && otherArticles.length > 0) {
      const bestOtherScore = Math.max(...otherArticles.map((n) => n.searchScore));
      expect(cookingArticle.searchScore).toBeGreaterThan(bestOtherScore);
    }
  });

  // ─── Vector-only search with real embeddings ───────────────────────────

  it('VectorNearbyInput with real embedding returns semantically relevant results', async () => {
    const result = await query<{
      allArticles: { nodes: Array<{ rowId: number; title: string; embeddingVectorDistance: number }> };
    }>(`
      query($vec: [Float!]!) {
        allArticles(where: {
          vectorEmbedding: { vector: $vec, metric: COSINE }
        }) {
          nodes { rowId title embeddingVectorDistance }
        }
      }
    `, { vec: mlQueryVector });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.allArticles?.nodes ?? [];
    expect(nodes.length).toBe(5);

    // Nearest to ML query should be ML articles
    const sorted = [...nodes].sort((a, b) => a.embeddingVectorDistance - b.embeddingVectorDistance);
    // Top result should be an ML-related article (1, 3, or 5)
    expect([1, 3, 5]).toContain(sorted[0].rowId);
  });

  // ─── RRF boost: text+vector scores higher than text-only ───────────────

  it('hybrid text+vector search scores higher than text-only for relevant docs', async () => {
    const textOnly = await query<{
      allArticles: { nodes: Array<{ rowId: number; searchScore: number }> };
    }>(`
      query {
        allArticles(where: { unifiedSearch: "machine learning" }) {
          nodes { rowId searchScore }
        }
      }
    `);

    const hybrid = await query<{
      allArticles: { nodes: Array<{ rowId: number; searchScore: number }> };
    }>(`
      query($vec: [Float!]!) {
        allArticles(where: {
          unifiedSearch: "machine learning"
          vectorEmbedding: { vector: $vec, metric: COSINE }
        }) {
          nodes { rowId searchScore }
        }
      }
    `, { vec: mlQueryVector });

    expect(textOnly.errors).toBeUndefined();
    expect(hybrid.errors).toBeUndefined();

    const doc1TextOnly = textOnly.data?.allArticles?.nodes?.find((n) => n.rowId === 1);
    const doc1Hybrid = hybrid.data?.allArticles?.nodes?.find((n) => n.rowId === 1);

    // Doc 1 (ML article) should score at least as high with hybrid
    if (doc1TextOnly && doc1Hybrid) {
      expect(doc1Hybrid.searchScore).toBeGreaterThanOrEqual(doc1TextOnly.searchScore);
    }
  });
});
