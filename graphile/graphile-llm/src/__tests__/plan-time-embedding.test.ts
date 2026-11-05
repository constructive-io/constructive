import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { createTsvectorAdapter } from 'graphile-search/adapters/tsvector';
import { TsvectorCodecPlugin } from 'graphile-search/codecs/tsvector-codec';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';

import { buildEmbedder } from '../../src/embedder';
import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import { createLlmTextSearchPlugin } from '../../src/plugins/text-search-plugin';
import { asTestRequest, ensureModel, startGateway, TEST_CLAIMS, type TestGateway } from '../../test-utils/gateway';

// Text-to-vector must happen while the operation is planned, before SQL is
// built: a v4-style resolve() wrapper runs after Grafast has already executed
// the plan, so it can neither filter nor write the vector.

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

type DocNode = { name: string; embeddingVectorDistance: number | null };
type DocsResult = { allDocs: { nodes: DocNode[] } };

const DOCS: Array<[string, string]> = [
  ['warehouse-lease.txt', 'Warehouse lease agreement: monthly rent of 12,000 USD for the Oakland storage facility, five year term.'],
  ['q3-financial-results.txt', 'Third quarter revenue grew 14 percent while operating margin improved to 22 percent.'],
  ['patent-portfolio.txt', 'The company holds 37 granted patents covering battery chemistry and charging circuits.'],
  ['data-breach-incident.txt', 'An attacker accessed customer email addresses through a misconfigured backup server.']
];

const ASK = 'how much rent do we pay for the warehouse';

const BY_VECTOR = `
  query($v: [Float!]!) {
    allDocs(where: { vectorEmbedding: { vector: $v, metric: COSINE } }, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { name embeddingVectorDistance }
    }
  }
`;

const BY_TEXT = `
  query($t: String!) {
    allDocs(where: { vectorEmbedding: { text: $t, metric: COSINE } }, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { name embeddingVectorDistance }
    }
  }
`;

describe('server-side embedding runs before SQL', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;
  let askVector: number[];
  let gateway: TestGateway;

  beforeAll(async () => {
    gateway = await startGateway();
    await ensureModel();

    const embed = buildEmbedder({ provider: 'ollama', model: 'nomic-embed-text' });
    const docVectors = await asTestRequest(() => Promise.all(DOCS.map(([, body]) => embed(body))));
    askVector = (await asTestRequest(() => embed(ASK))).embedding;

    const values = DOCS.map(([name, body], i) =>
      `('${name}', '${body.replace(/'/g, "''")}', '[${docVectors[i].embedding.join(',')}]')`
    ).join(',\n');

    const connections = await getConnections({
      schemas: ['llm_plan_embed'],
      preset: {
        extends: [ConnectionFilterPreset()],
        plugins: [
          TsvectorCodecPlugin,
          VectorCodecPlugin,
          createUnifiedSearchPlugin({
            adapters: [createTsvectorAdapter(), createPgvectorAdapter()],
            enableSearchScore: true,
            enableUnifiedSearch: true
          }),
          createLlmModulePlugin({
            defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' }
          }),
          createLlmTextSearchPlugin(),
          createLlmTextMutationPlugin()
        ]
      },
      useRoot: true,
      authRole: 'postgres'
    }, [
      seed.fn(async (ctx) => {
        await ctx.pg.query(`
          CREATE EXTENSION IF NOT EXISTS vector;
          CREATE SCHEMA llm_plan_embed;
          CREATE TABLE llm_plan_embed.docs (
            id serial PRIMARY KEY,
            name text NOT NULL,
            body text NOT NULL,
            tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || body)) STORED,
            embedding vector(768)
          );
          INSERT INTO llm_plan_embed.docs (name, body, embedding) VALUES ${values};
        `);
      })
    ]);

    db = connections.db;
    pg = connections.pg;
    teardown = connections.teardown;
    query = connections.query;
    // Requests run on the root client (`useRoot`); its context is their pgSettings.
    pg.setContext({ role: 'postgres', ...TEST_CLAIMS });
  }, 120_000);

  afterAll(async () => {
    if (teardown) await teardown();
    if (gateway) await gateway.close();
  });

  beforeEach(async () => { await db.beforeEach(); });
  afterEach(async () => { await db.afterEach(); });

  it('lets clients send text without a vector', async () => {
    const result = await query<{
      __type: { inputFields: Array<{ name: string; type: { kind: string } }> };
    }>(`{ __type(name: "VectorNearbyInput") { inputFields { name type { kind } } } }`);

    expect(result.errors).toBeUndefined();
    const vectorField = result.data!.__type.inputFields.find((f) => f.name === 'vector');
    expect(vectorField!.type.kind).not.toBe('NON_NULL');
  });

  it('ranks a text search exactly like the same text sent as a vector', async () => {
    const byVector = await query<DocsResult>(BY_VECTOR, { v: askVector });
    const byText = await query<DocsResult>(BY_TEXT, { t: ASK });

    expect(byVector.errors).toBeUndefined();
    expect(byText.errors).toBeUndefined();
    const expected = byVector.data!.allDocs.nodes;
    const actual = byText.data!.allDocs.nodes;
    expect(expected[0].name).toBe('warehouse-lease.txt');
    expect(actual.map((n) => n.name)).toEqual(expected.map((n) => n.name));
    actual.forEach((node, i) => {
      expect(node.embeddingVectorDistance).toBeCloseTo(expected[i].embeddingVectorDistance!, 6);
    });
  });

  it('includes vector distance in unifiedSearch', async () => {
    // unifiedSearch ORs each adapter's WHERE; pgvector adds none without a
    // distance threshold, so rows are still selected by the tsvector match.
    const result = await query<DocsResult>(`
      query($t: String!) {
        allDocs(where: { unifiedSearch: $t }) {
          nodes { name embeddingVectorDistance }
        }
      }
    `, { t: 'warehouse rent' });

    expect(result.errors).toBeUndefined();
    const lease = result.data!.allDocs.nodes.find((n) => n.name === 'warehouse-lease.txt');
    expect(lease).toBeDefined();
    expect(typeof lease!.embeddingVectorDistance).toBe('number');
  });

  it('stores the embedding of {col}Text on create', async () => {
    const created = await query<{ createDoc: { doc: { rowId: number } } }>(`
      mutation($t: String!) {
        createDoc(input: { doc: { name: "ask.txt", body: "ask", embeddingText: $t } }) { doc { rowId } }
      }
    `, { t: ASK });

    expect(created.errors).toBeUndefined();
    const rowId = created.data!.createDoc.doc.rowId;
    const stored = await pg.query<{ distance: number | null }>(
      'SELECT embedding <=> $1::vector AS distance FROM llm_plan_embed.docs WHERE id = $2',
      [`[${askVector.join(',')}]`, rowId]
    );
    expect(stored.rows[0].distance).not.toBeNull();
    expect(stored.rows[0].distance).toBeLessThan(1e-6);
  });

  it('stores the embedding of {col}Text on update', async () => {
    const row = await pg.query<{ id: number }>("SELECT id FROM llm_plan_embed.docs WHERE name = 'patent-portfolio.txt'");
    const updated = await query(`
      mutation($id: Int!, $t: String!) {
        updateDocByRowId(input: { rowId: $id, docPatch: { embeddingText: $t } }) { doc { rowId } }
      }
    `, { id: row.rows[0].id, t: ASK });

    expect(updated.errors).toBeUndefined();
    const stored = await pg.query<{ distance: number }>(
      'SELECT embedding <=> $1::vector AS distance FROM llm_plan_embed.docs WHERE id = $2',
      [`[${askVector.join(',')}]`, row.rows[0].id]
    );
    expect(stored.rows[0].distance).toBeLessThan(1e-6);
  });
});
