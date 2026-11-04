import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import { createPgvectorAdapter } from 'graphile-search/adapters/pgvector';
import { createTsvectorAdapter } from 'graphile-search/adapters/tsvector';
import { TsvectorCodecPlugin } from 'graphile-search/codecs/tsvector-codec';
import { VectorCodecPlugin } from 'graphile-search/codecs/vector-codec';
import { createUnifiedSearchPlugin } from 'graphile-search/plugin';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLSchema } from 'graphql';
import * as graphql from 'graphql';
import { parse, validate } from 'graphql';
import type { PgTestClient } from 'pgsql-test';

import { createEmbedIndex, embedField } from '../../src/embed-inputs';
import { llmConfigStore } from '../../src/embedder';
import { createLlmModulePlugin } from '../../src/plugins/llm-module-plugin';
import { createLlmTextMutationPlugin } from '../../src/plugins/text-mutation-plugin';
import { createLlmTextSearchPlugin } from '../../src/plugins/text-search-plugin';

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

type DocNode = { name: string; embeddingVectorDistance: number | null };
type DocsResult = { allDocs: { nodes: DocNode[] } };

// Deterministic 3-dim embedder so ranking is exact and no provider is needed.
const VECTORS: Record<string, number[]> = {
  rent: [1, 0, 0],
  revenue: [0, 1, 0],
  breach: [0, 0, 1]
};
const vectorFor = (text: string) => VECTORS[text] ?? [1, 1, 1];

type EmbedderShape = 'result' | 'array' | 'null' | 'empty';
let shape: EmbedderShape = 'result';
const calls: Array<{ text: string; overrides: unknown }> = [];

// `result` is the provider shape ({ embedding }), `array` is the metering
// wrapper's shape, `null` is the metering wrapper refusing (quota exceeded),
// `empty` is a provider answering with no vector.
function fakeEmbedderPlugin(configured: boolean): GraphileConfig.Plugin {
  return {
    name: 'FakeEmbedderPlugin',
    version: '0.0.0',
    after: ['LlmModulePlugin'],
    schema: {
      hooks: {
        build(build) {
          (build as any).llmEmbedder = configured
            ? async (text: string) => {
              calls.push({ text, overrides: llmConfigStore.getStore() });
              if (shape === 'null') return null;
              if (shape === 'empty') return [];
              const embedding = vectorFor(text);
              return shape === 'array' ? embedding : { embedding, promptTokens: 1 };
            }
            : null;
          return build;
        }
      }
    }
  };
}

const SETUP_SQL = `
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE SCHEMA llm_embed_inputs;
  CREATE TABLE llm_embed_inputs.docs (
    id serial PRIMARY KEY,
    name text NOT NULL,
    body text NOT NULL DEFAULT '',
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || body)) STORED,
    embedding vector(3) NOT NULL
  );
  INSERT INTO llm_embed_inputs.docs (name, body, embedding) VALUES
    ('warehouse-lease.txt', 'warehouse lease and monthly rent', '[1,0,0]'),
    ('q3-results.txt', 'quarterly revenue results', '[0,1,0]'),
    ('breach-report.txt', 'customer data breach', '[0,0,1]');
`;

interface Harness {
  db: PgTestClient;
  pg: PgTestClient;
  query: QueryFn;
  schema: GraphQLSchema;
  teardown: () => Promise<void>;
}

async function setup(options: {
  onQuotaExceeded?: 'degrade' | 'throw';
  embedderConfigured?: boolean;
}): Promise<Harness> {
  let schema: GraphQLSchema;
  const CaptureSchemaPlugin: GraphileConfig.Plugin = {
    name: 'CaptureSchemaPlugin',
    version: '0.0.0',
    schema: { hooks: { finalize(s) { schema = s; return s; } } }
  };

  const connections = await getConnections({
    schemas: ['llm_embed_inputs'],
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
        fakeEmbedderPlugin(options.embedderConfigured ?? true),
        createLlmTextSearchPlugin({ onQuotaExceeded: options.onQuotaExceeded }),
        createLlmTextMutationPlugin(),
        CaptureSchemaPlugin
      ]
    },
    useRoot: true,
    authRole: 'postgres'
  }, [seed.fn(async (ctx) => { await ctx.pg.query(SETUP_SQL); })]);

  return { ...connections, query: connections.query as QueryFn, schema: schema! };
}

const BY_TEXT = `
  query($t: String!) {
    allDocs(where: { vectorEmbedding: { text: $t, metric: COSINE } }, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { name embeddingVectorDistance }
    }
  }
`;
const BY_VECTOR = `
  query($v: [Float!]) {
    allDocs(where: { vectorEmbedding: { vector: $v, metric: COSINE } }, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { name embeddingVectorDistance }
    }
  }
`;
const BY_VECTOR_AND_TEXT = `
  query($v: [Float!], $t: String) {
    allDocs(where: { vectorEmbedding: { vector: $v, text: $t, metric: COSINE } }, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { name embeddingVectorDistance }
    }
  }
`;
const UNIFIED = `
  query($t: String!) {
    allDocs(where: { unifiedSearch: $t }) { nodes { name embeddingVectorDistance } }
  }
`;
const CREATE_FROM_VECTOR_AND_TEXT = `
  mutation($name: String!, $t: String) {
    createDoc(input: { doc: { name: $name, embedding: [0, 0, 1], embeddingText: $t } }) { doc { rowId } }
  }
`;

const CREATE_FROM_TEXT = `
  mutation($name: String!, $t: String) {
    createDoc(input: { doc: { name: $name, embeddingText: $t } }) { doc { rowId embedding } }
  }
`;

const names = (r: GraphQLResponse<DocsResult>) => r.data!.allDocs.nodes.map((n) => n.name);

describe('plan-time embedding (onQuotaExceeded: degrade)', () => {
  let h: Harness;

  beforeAll(async () => { h = await setup({}); }, 120_000);
  afterAll(async () => { if (h) await h.teardown(); });
  beforeEach(async () => {
    shape = 'result';
    calls.length = 0;
    await h.pg.beforeEach();
    await h.db.beforeEach();
  });
  afterEach(async () => {
    await h.db.afterEach();
    await h.pg.afterEach();
  });

  it('passes GraphQL validation for text-only search and a companion-only create on a NOT NULL vector column', () => {
    const documents = [
      BY_TEXT,
      CREATE_FROM_TEXT,
      'mutation { updateDocByRowId(input: { rowId: 1, docPatch: { embeddingText: "rent" } }) { doc { rowId } } }'
    ];
    const errors = documents.map((d) => validate(h.schema, parse(d)).map((e) => e.message));
    expect(errors).toEqual([[], [], []]);
  });

  describe.each<EmbedderShape>(['result', 'array'])('embedder returning the %s shape', (embedderShape) => {
    beforeEach(() => { shape = embedderShape; });

    it('ranks a text search by the embedded vector and embeds once', async () => {
      const result = await h.query<DocsResult>(BY_TEXT, { t: 'revenue' });

      expect(result.errors).toBeUndefined();
      expect(names(result)[0]).toBe('q3-results.txt');
      expect(result.data!.allDocs.nodes[0].embeddingVectorDistance).toBeCloseTo(0, 6);
      expect(calls.map((c) => c.text)).toEqual(['revenue']);
    });

    it('stores the embedding of {col}Text on create', async () => {
      const result = await h.query<{ createDoc: { doc: { rowId: number; embedding: number[] } } }>(
        CREATE_FROM_TEXT, { name: 'created.txt', t: 'breach' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data!.createDoc.doc.embedding).toEqual([0, 0, 1]);
      expect(calls.map((c) => c.text)).toEqual(['breach']);
    });
  });

  it('stores the embedding of {col}Text on update', async () => {
    const result = await h.query<{ updateDocByRowId: { doc: { embedding: number[] } } }>(`
      mutation { updateDocByRowId(input: { rowId: 1, docPatch: { embeddingText: "revenue" } }) { doc { embedding } } }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data!.updateDocByRowId.doc.embedding).toEqual([0, 1, 0]);
  });

  it('uses a client-sent vector without calling the embedder', async () => {
    const result = await h.query<DocsResult>(BY_VECTOR, { v: [0, 0, 1] });

    expect(result.errors).toBeUndefined();
    expect(names(result)[0]).toBe('breach-report.txt');
    expect(calls).toEqual([]);
  });

  it('uses the vector when both vector and text are sent', async () => {
    const result = await h.query<DocsResult>(BY_VECTOR_AND_TEXT, { v: [0, 1, 0], t: 'rent' });

    expect(result.errors).toBeUndefined();
    expect(names(result)[0]).toBe('q3-results.txt');
    expect(calls).toEqual([]);
  });

  it('embeds the text when the vector is empty', async () => {
    const result = await h.query<DocsResult>(BY_VECTOR_AND_TEXT, { v: [], t: 'rent' });

    expect(result.errors).toBeUndefined();
    expect(names(result)[0]).toBe('warehouse-lease.txt');
    expect(calls.map((c) => c.text)).toEqual(['rent']);
  });

  it('rejects a VectorNearbyInput with neither vector nor text', async () => {
    const result = await h.query<DocsResult>(
      'query { allDocs(where: { vectorEmbedding: { metric: COSINE } }) { nodes { name } } }'
    );

    expect(result.errors?.[0]?.message).toMatch(/VectorNearbyInput: provide either `vector` or `text`/);
  });

  it('embeds text nested under and/not', async () => {
    const result = await h.query<DocsResult>(`
      query {
        allDocs(
          where: { and: [{ vectorEmbedding: { text: "rent", metric: COSINE } }, { not: { rowId: { equalTo: 3 } } }] }
          orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]
        ) { nodes { name embeddingVectorDistance } }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(names(result)).toEqual(['warehouse-lease.txt', 'q3-results.txt']);
    expect(result.data!.allDocs.nodes[0].embeddingVectorDistance).toBeCloseTo(0, 6);
    expect(calls.map((c) => c.text)).toEqual(['rent']);
  });

  it('embeds unifiedSearch and VectorNearbyInput text in the same filter', async () => {
    const result = await h.query<DocsResult>(`
      query {
        allDocs(where: { unifiedSearch: "warehouse", vectorEmbedding: { text: "rent", metric: COSINE } }) {
          nodes { name }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(names(result)).toEqual(['warehouse-lease.txt']);
    expect(calls.map((c) => c.text).sort()).toEqual(['rent', 'warehouse']);
  });

  it('adds pgvector to unifiedSearch', async () => {
    const result = await h.query<DocsResult>(UNIFIED, { t: 'warehouse' });

    expect(result.errors).toBeUndefined();
    expect(result.data!.allDocs.nodes).toEqual([
      { name: 'warehouse-lease.txt', embeddingVectorDistance: expect.any(Number) }
    ]);
    expect(calls.map((c) => c.text)).toEqual(['warehouse']);
  });

  it('does not embed a blank unifiedSearch', async () => {
    const result = await h.query<DocsResult>(UNIFIED, { t: '   ' });

    expect(result.errors).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('drops the vector filter when the embedder returns null', async () => {
    shape = 'null';
    const result = await h.query<DocsResult>(BY_TEXT, { t: 'rent' });

    expect(result.errors).toBeUndefined();
    expect(result.data!.allDocs.nodes.length).toBeGreaterThanOrEqual(3);
    expect(result.data!.allDocs.nodes.every((n) => n.embeddingVectorDistance === null)).toBe(true);
  });

  it('falls back to text-only unifiedSearch when the embedder returns null', async () => {
    shape = 'null';
    const result = await h.query<DocsResult>(UNIFIED, { t: 'warehouse' });

    expect(result.errors).toBeUndefined();
    expect(result.data!.allDocs.nodes).toEqual([
      { name: 'warehouse-lease.txt', embeddingVectorDistance: null }
    ]);
  });

  it('fails a create when the embedder returns null, and writes nothing', async () => {
    shape = 'null';
    const result = await h.query(CREATE_FROM_TEXT, { name: 'quota.txt', t: 'rent' });

    expect(result.errors?.[0]?.message).toMatch(/EMBED_QUOTA_EXCEEDED: Cannot embed embeddingText/);
    const rows = await h.pg.query("SELECT 1 FROM llm_embed_inputs.docs WHERE name = 'quota.txt'");
    expect(rows.rows).toHaveLength(0);
  });

  it('rejects a create that has neither the vector nor its text companion', async () => {
    const result = await h.query(CREATE_FROM_TEXT, { name: 'nothing.txt' });

    expect(result.errors?.[0]?.message).toMatch(
      /DocInput: provide exactly one of `embedding` or `embeddingText`; neither was given/
    );
    expect(calls).toEqual([]);
  });

  it('rejects a create that has both the vector and its text companion', async () => {
    const result = await h.query(CREATE_FROM_VECTOR_AND_TEXT, { name: 'both.txt', t: 'rent' });

    expect(result.errors?.[0]?.message).toMatch(
      /DocInput: provide exactly one of `embedding` or `embeddingText`, not both/
    );
    const rows = await h.pg.query("SELECT 1 FROM llm_embed_inputs.docs WHERE name = 'both.txt'");
    expect(rows.rows).toHaveLength(0);
    expect(calls).toEqual([]);
  });

  it('embeds with the per-database model for both search and create', async () => {
    const reqOptions = {
      constructive: {
        useLlm: async () => ({ embeddingModel: 'tenant-embed', embeddingBaseUrl: 'http://tenant-ollama:11434' })
      }
    };
    const search = await h.query(BY_TEXT, { t: 'rent' }, false, reqOptions);
    const create = await h.query(CREATE_FROM_TEXT, { name: 'tenant.txt', t: 'rent' }, false, reqOptions);

    expect(search.errors).toBeUndefined();
    expect(create.errors).toBeUndefined();
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.overrides).toMatchObject({
        embeddingModel: 'tenant-embed',
        embeddingBaseUrl: 'http://tenant-ollama:11434'
      });
    }
  });

  it('does not look up per-database config when nothing needs embedding', async () => {
    const useLlm = jest.fn(async () => ({ embeddingModel: 'tenant-embed' }));
    const result = await h.query(BY_VECTOR, { v: [1, 0, 0] }, false, { constructive: { useLlm } });

    expect(result.errors).toBeUndefined();
    expect(useLlm).not.toHaveBeenCalled();
  });
});

describe('plan-time embedding (onQuotaExceeded: throw)', () => {
  let h: Harness;

  beforeAll(async () => { h = await setup({ onQuotaExceeded: 'throw' }); }, 120_000);
  afterAll(async () => { if (h) await h.teardown(); });
  beforeEach(async () => {
    shape = 'null';
    calls.length = 0;
    await h.pg.beforeEach();
    await h.db.beforeEach();
  });
  afterEach(async () => {
    await h.db.afterEach();
    await h.pg.afterEach();
  });

  it('fails a text search when the embedder returns null', async () => {
    const result = await h.query(BY_TEXT, { t: 'rent' });

    expect(result.errors?.[0]?.message).toMatch(/VectorNearbyInput: embedding failed/);
  });

  it('fails a text search when the embedder returns an empty vector', async () => {
    shape = 'empty';
    const result = await h.query(BY_TEXT, { t: 'rent' });

    expect(result.errors?.[0]?.message).toMatch(/VectorNearbyInput: embedding failed/);
  });

  it('fails unifiedSearch when the embedder returns null', async () => {
    const result = await h.query(UNIFIED, { t: 'warehouse' });

    expect(result.errors?.[0]?.message).toMatch(/unifiedSearch: embedding failed.*onQuotaExceeded is set to 'throw'/);
  });
});

describe('plan-time embedding without an embedder', () => {
  let h: Harness;

  beforeAll(async () => { h = await setup({ embedderConfigured: false }); }, 120_000);
  afterAll(async () => { if (h) await h.teardown(); });
  beforeEach(async () => {
    await h.pg.beforeEach();
    await h.db.beforeEach();
  });
  afterEach(async () => {
    await h.db.afterEach();
    await h.pg.afterEach();
  });

  it('ignores search text and runs unifiedSearch on the text adapters', async () => {
    const byText = await h.query<DocsResult>(BY_TEXT, { t: 'rent' });
    const unified = await h.query<DocsResult>(UNIFIED, { t: 'warehouse' });

    expect(byText.errors).toBeUndefined();
    expect(byText.data!.allDocs.nodes.every((n) => n.embeddingVectorDistance === null)).toBe(true);
    expect(unified.errors).toBeUndefined();
    expect(unified.data!.allDocs.nodes).toEqual([
      { name: 'warehouse-lease.txt', embeddingVectorDistance: null }
    ]);
  });

  it('fails a create from text', async () => {
    const result = await h.query(CREATE_FROM_TEXT, { name: 'unconfigured.txt', t: 'rent' });

    expect(result.errors?.[0]?.message).toMatch(/EMBED_NOT_CONFIGURED: Cannot embed embeddingText/);
  });
});

describe('embeddable-input reachability', () => {
  // Relation filters are cyclic: a filter type reaches another that reaches it
  // back, and the tagged field may sit behind either one.
  function cyclicFilters() {
    const { GraphQLInputObjectType, GraphQLString } = graphql;
    const tagged = new GraphQLInputObjectType({
      name: 'TaggedFilter',
      fields: { text: embedField({ kind: 'unified', onQuotaExceeded: 'degrade' }, { type: GraphQLString }) }
    });
    const parent: any = new GraphQLInputObjectType({
      name: 'ParentFilter',
      fields: () => ({ child: { type: child }, tagged: { type: tagged } })
    });
    const child: any = new GraphQLInputObjectType({
      name: 'ChildFilter',
      fields: () => ({ parent: { type: parent } })
    });
    return { parent, child };
  }

  it('finds the tagged field from every type in the cycle, whichever is asked first', () => {
    const parentFirst = createEmbedIndex(graphql);
    const a = cyclicFilters();
    expect(parentFirst.reaches(a.parent)).toBe(true);
    expect(parentFirst.reaches(a.child)).toBe(true);

    const childFirst = createEmbedIndex(graphql);
    const b = cyclicFilters();
    expect(childFirst.reaches(b.child)).toBe(true);
    expect(childFirst.reaches(b.parent)).toBe(true);
  });
});
