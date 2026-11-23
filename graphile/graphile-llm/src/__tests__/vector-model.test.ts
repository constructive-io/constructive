/**
 * A vector column that records the model of each row's vector is searched with
 * that model, and only against rows the same model embedded.
 *
 * `@embeddingModel` on a vector column names the model its definition asks for;
 * `@embeddingModelOf <column>` marks the sibling that holds, per row, the model
 * that produced the vector. Two models' vectors are not comparable even at the
 * same length, so one search text is embedded once per model its columns use.
 */

import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { createTsvectorAdapter } from 'graphile-search/adapters/tsvector';
import { TsvectorCodecPlugin } from 'graphile-search/codecs/tsvector-codec';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';

import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import { createLlmTextSearchPlugin } from '../../src/plugins/text-search-plugin';

type QueryFn = <TResult = unknown>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<TResult>>;
type Notes = { allNotes: { nodes: Array<{ name: string }> } };

const REQUEST_MODEL = 'request-model';
const calls: Array<{ text: string; model: string | undefined }> = [];

// Every model answers with the same vector, so only the model stamp can tell rows apart.
const FakeEmbedderPlugin: GraphileConfig.Plugin = {
  name: 'FakeEmbedderPlugin',
  version: '0.0.0',
  after: ['LlmModulePlugin'],
  schema: {
    hooks: {
      build(build) {
        (build as any).llmEmbedder = async (text: string, model?: string) => {
          calls.push({ text, model });
          return { embedding: [1, 0, 0], promptTokens: 1, model: model ?? REQUEST_MODEL };
        };
        return build;
      }
    }
  }
};

const SETUP_SQL = `
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE SCHEMA llm_vector_model;
  CREATE TABLE llm_vector_model.notes (
    id serial PRIMARY KEY,
    name text NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', name || ' note')) STORED,
    embedding vector(3),
    embedding_model text,
    summary vector(3),
    summary_model text,
    legacy vector(3)
  );
  COMMENT ON COLUMN llm_vector_model.notes.embedding IS E'@embeddingModel model-a';
  COMMENT ON COLUMN llm_vector_model.notes.embedding_model IS E'@embeddingModelOf embedding';
  COMMENT ON COLUMN llm_vector_model.notes.summary_model IS E'@embeddingModelOf summary';
  INSERT INTO llm_vector_model.notes (name, embedding, embedding_model, summary, summary_model, legacy) VALUES
    ('current', '[1,0,0]', 'model-a', '[1,0,0]', '${REQUEST_MODEL}', '[1,0,0]'),
    ('older',   '[1,0,0]', 'model-b', '[1,0,0]', 'model-b',          '[1,0,0]'),
    ('pending', NULL,      NULL,      NULL,      NULL,               NULL);
`;

describe('searching a vector column that records its model', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let query: QueryFn;
  let teardown: () => Promise<void>;

  const names = async (where: string) => {
    const res = await query<Notes>(`{ allNotes(where: ${where}) { nodes { name } } }`);
    expect(res.errors).toBeUndefined();
    return res.data!.allNotes.nodes.map((n) => n.name).sort();
  };

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas: ['llm_vector_model'],
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
            createLlmModulePlugin(),
            FakeEmbedderPlugin,
            createLlmTextSearchPlugin(),
            createLlmTextMutationPlugin()
          ]
        },
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.fn(async (ctx) => { await ctx.pg.query(SETUP_SQL); })]
    );
    ({ db, pg, teardown } = connections);
    query = connections.query as QueryFn;
  });

  afterAll(async () => { await teardown(); });

  beforeEach(async () => {
    calls.length = 0;
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
  });

  it('embeds the text with the model the column names and skips rows of another model', async () => {
    expect(await names('{ vectorEmbedding: { text: "q" } }')).toEqual(['current']);
    expect(calls).toEqual([{ text: 'q', model: 'model-a' }]);
  });

  it('uses the request model for a column that names none, and still skips other models', async () => {
    expect(await names('{ vectorSummary: { text: "q" } }')).toEqual(['current']);
    expect(calls).toEqual([{ text: 'q', model: undefined }]);
  });

  it('compares every row of a column that records no model', async () => {
    expect(await names('{ vectorLegacy: { text: "q" } }')).toEqual(['current', 'older']);
  });

  it('filters a client-sent vector by the model the client says produced it', async () => {
    expect(await names('{ vectorEmbedding: { vector: [1, 0, 0], model: "model-b" } }')).toEqual(['older']);
    expect(await names('{ vectorEmbedding: { vector: [1, 0, 0] } }')).toEqual(['current', 'older']);
    expect(calls).toEqual([]);
  });

  it('labels an embedded text with the model that embedded it, whatever label the client sent', async () => {
    expect(await names('{ vectorEmbedding: { text: "q", model: "model-b" } }')).toEqual(['current']);
  });

  it('stamps the model beside a vector it embeds on a write, so the row is found by a search', async () => {
    const res = await query<{ createNote: { note: { name: string; embeddingModel: string; summaryModel: string } } }>(`mutation {
      createNote(input: { note: { name: "written", embeddingText: "q", summaryText: "q" } }) {
        note { name embeddingModel summaryModel }
      }
    }`);
    expect(res.errors).toBeUndefined();
    expect(res.data!.createNote.note).toEqual({ name: 'written', embeddingModel: 'model-a', summaryModel: REQUEST_MODEL });
    expect(calls.map((c) => c.model).sort()).toEqual(['model-a', undefined]);
    expect(await names('{ vectorEmbedding: { text: "q" } }')).toEqual(['current', 'written']);
  });

  it('embeds unifiedSearch once per model and scores each column with its own', async () => {
    const res = await query<{ allNotes: { nodes: Array<Record<string, unknown>> } }>(`{
      allNotes(where: { unifiedSearch: "note" }) {
        nodes { name embeddingVectorDistance summaryVectorDistance legacyVectorDistance }
      }
    }`);
    expect(res.errors).toBeUndefined();
    const byName = Object.fromEntries(res.data!.allNotes.nodes.map((n) => [n.name, n]));
    expect(calls.map((c) => c.model).sort()).toEqual(['model-a', undefined]);
    expect(byName.current).toMatchObject({ embeddingVectorDistance: 0, summaryVectorDistance: 0, legacyVectorDistance: 0 });
    // Another model produced these two vectors: no distance, not a wrong one.
    expect(byName.older).toMatchObject({ embeddingVectorDistance: null, summaryVectorDistance: null, legacyVectorDistance: 0 });
  });
});
