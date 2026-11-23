import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { OLLAMA_URL, startGateway, TEST_CLAIMS, type TestGateway } from '../../test-utils/gateway';
import { GraphileLlmPreset } from '../preset';

// The preset as production loads it (graphile-settings calls `GraphileLlmPreset()`
// and the dev stack adds an embedder), built into a real schema with the
// plugins it enriches, and queried through grafast.

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;


async function ollamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

describe('GraphileLlmPreset builds a real schema', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;
  let gateway: TestGateway;

  beforeAll(async () => {
    gateway = await startGateway();
    const connections = await getConnections(
      {
        schemas: ['llm_test'],
        preset: {
          extends: [
            ConnectionFilterPreset(),
            GraphileLlmPreset({
              defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' },
              enableRag: true
            })
          ],
          plugins: [
            VectorCodecPlugin,
            createUnifiedSearchPlugin({ adapters: [createPgvectorAdapter()] })
          ]
        },
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );
    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
    // Requests run on the root client (`useRoot`); its context is their pgSettings.
    connections.pg.setContext({ role: 'postgres', ...TEST_CLAIMS });
  });

  afterAll(async () => {
    if (teardown) await teardown();
    if (gateway) await gateway.close();
  });

  beforeEach(async () => {
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
  });

  it('has exactly the module, text search, text mutation and RAG plugins', () => {
    const names = GraphileLlmPreset({ enableRag: true }).plugins!.map((p) => p.name);
    expect(names).toEqual(['LlmModulePlugin', 'LlmTextSearchPlugin', 'LlmTextMutationPlugin', 'LlmRagPlugin']);
  });

  it('takes no metering option', () => {
    // @ts-expect-error there is no metering plugin to turn on
    expect(GraphileLlmPreset({ metering: true }).plugins!.map((p) => p.name)).toEqual([
      'LlmModulePlugin',
      'LlmTextSearchPlugin',
      'LlmTextMutationPlugin'
    ]);
  });

  it('exposes the text search field, the text companion field and embedText', async () => {
    const result = await query<{
      nearby: { inputFields: Array<{ name: string }> };
      input: { inputFields: Array<{ name: string }> };
      root: { fields: Array<{ name: string }> };
    }>(`
      query {
        nearby: __type(name: "VectorNearbyInput") { inputFields { name } }
        input: __type(name: "ArticleInput") { inputFields { name } }
        root: __type(name: "Query") { fields { name } }
      }
    `);

    expect(result.errors).toBeUndefined();
    const names = (fields: Array<{ name: string }>) => fields.map((f) => f.name);
    expect(names(result.data!.nearby.inputFields)).toContain('text');
    expect(names(result.data!.input.inputFields)).toContain('embeddingText');
    expect(names(result.data!.root.fields)).toContain('embedText');
  });

  it('embedText reads the embedder result through the one embedder shape', async () => {
    if (!(await ollamaReachable())) {
      console.log('Ollama not reachable; skipping the live embed');
      return;
    }

    const result = await query<{ embedText: { vector: number[]; dimensions: number } }>(`
      query { embedText(text: "warehouse lease") { vector dimensions } }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data!.embedText.dimensions).toBe(768);
    expect(result.data!.embedText.vector).toHaveLength(768);
  });
});
