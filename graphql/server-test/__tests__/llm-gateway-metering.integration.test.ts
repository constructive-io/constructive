/**
 * Integration tests — every server-side embedding and completion is one
 * recorded call on the metered gateway.
 *
 * Requests go over HTTP through the routed server. With `AGENTIC_SERVER_URL`
 * set, graphile-llm embeds `VectorNearbyInput.text`, `{column}Text`
 * companions, `ragQuery` and `embedText` through the gateway's
 * `/v1/embeddings` (and `ragQuery`'s answer through `/v1/chat/completions`),
 * under the identity the request's claims carry. The gateway here is the real
 * `agentic-server` with an in-memory sink in place of its metering backend, in
 * front of a local stand-in for Ollama, so the suite asserts exactly which
 * calls were recorded and for whom: one entry per model call, none when the
 * client sends a vector, attributed to the request's database and actor.
 *
 *   pnpm test -- --testPathPattern=llm-gateway-metering
 */

import type { InferenceEntry } from 'agentic-server';
import { createLlmRagPlugin } from 'graphile-llm';
import http from 'http';
import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';
import { listen, type Listening, startGateway } from './llm-gateway.shared';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);

const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
/** The user `auth-cookie/schema.sql`'s `authenticate` resolves `session-token` to. */
const userId = 'bbbbbbbb-0000-4000-8000-000000000002';
const schema = 'llm_gateway_metering';
/** The routed API the fixture exposes the schema on; resolving it brings the database's `authenticate`. */
const API_NAME = 'app';
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const EMBED_MODEL = 'test-embed';
const CHAT_MODEL = 'test-chat';
const EMBED_TOKENS = 7;
const CHAT_TOKENS = { prompt: 12, completion: 8 };

const VECTORS: Record<string, number[]> = {
  'machine learning': [0.1, 0.9, 0.3],
  'postgres tuning': [0.8, 0.2, 0.5]
};
const vectorFor = (text: string) => VECTORS[text] ?? [0.5, 0.5, 0.5];
const COSINE_METRIC = 'COSINE';

const modelCalls: Array<{ path: string; body: any }> = [];
/** Statuses the model server answers the next calls with instead of a result. */
const modelFailures: number[] = [];

/** Ollama's `/api/embed` and `/api/chat`, as far as the gateway's transforms read them. */
function startModelServer(): Promise<Listening> {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = JSON.parse(raw);
      modelCalls.push({ path: req.url ?? '', body });
      const failure = modelFailures.shift();
      if (failure) {
        res.writeHead(failure, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'model server unavailable' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.method === 'POST' && req.url === '/api/embed') {
        res.end(JSON.stringify({ embeddings: [vectorFor(body.input)], prompt_eval_count: EMBED_TOKENS }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/chat') {
        res.end(JSON.stringify({
          message: { role: 'assistant', content: 'From the context: machine learning.' },
          prompt_eval_count: CHAT_TOKENS.prompt,
          eval_count: CHAT_TOKENS.completion
        }));
        return;
      }
      res.writeHead(404).end();
    });
  });
  return listen(server);
}

const recorded: InferenceEntry[] = [];

const NEARBY = `
  query Nearby($where: ArticleFilter!) {
    articles(where: $where, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { title embeddingVectorDistance }
    }
  }
`;

const CREATE = `
  mutation Create($input: CreateArticleInput!) {
    createArticle(input: $input) { article { id title embedding } }
  }
`;

const UPDATE = `
  mutation Update($input: UpdateArticleInput!) {
    updateArticle(input: $input) { article { id embedding } }
  }
`;

const RAG = `
  query Rag($prompt: String!) {
    ragQuery(prompt: $prompt) { answer sources { content } tokensUsed }
  }
`;

const EMBED_TEXT = `
  query Embed($text: String!) {
    embedText(text: $text) { vector dimensions }
  }
`;

const embeds = () => recorded.filter((e) => e.service === 'embed');
const chats = () => recorded.filter((e) => e.service === 'chat');

describe('server-side embeddings are recorded by the gateway', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let modelServer: Listening;
  let gateway: Listening;
  const previousEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    'AGENTIC_SERVER_URL',
    'EMBEDDER_PROVIDER',
    'EMBEDDER_MODEL',
    'CHAT_PROVIDER',
    'CHAT_MODEL'
  ];

  const post = (query: string, variables?: Record<string, unknown>, authenticated = true) => {
    const req = request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Api-Name', API_NAME);
    if (authenticated) req.set('Authorization', 'Bearer session-token');
    return req.send({ query, variables });
  };

  beforeAll(async () => {
    modelServer = await startModelServer();
    gateway = await startGateway(modelServer.url, recorded);
    for (const key of ENV_KEYS) previousEnv[key] = process.env[key];
    process.env.AGENTIC_SERVER_URL = gateway.url;
    process.env.EMBEDDER_PROVIDER = 'ollama';
    process.env.EMBEDDER_MODEL = EMBED_MODEL;
    process.env.CHAT_PROVIDER = 'ollama';
    process.env.CHAT_MODEL = CHAT_MODEL;

    ({ request, teardown } = await getConnections(
      {
        schemas: ['simple-pets-public', 'simple-pets-pets-public', schema],
        authRole: 'anonymous',
        graphile: { preset: { plugins: [createLlmRagPlugin()] } },
        server: { useRouting: true, api: { isPublic: false, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql'),
          path.join(localSeedRoot, 'auth-cookie', 'schema.sql'),
          path.join(localSeedRoot, 'llm-gateway-metering', 'schema.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    try {
      if (teardown) await teardown();
    } finally {
      if (gateway) await gateway.close();
      if (modelServer) await modelServer.close();
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  beforeEach(() => {
    recorded.length = 0;
    modelCalls.length = 0;
    modelFailures.length = 0;
  });

  it('records one embedding for a search by `text`, attributed to the database and actor', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { text: 'machine learning', metric: COSINE_METRIC } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.articles.nodes[0].title).toBe('Introduction to Machine Learning');

    expect(modelCalls.map((c) => c.path)).toEqual(['/api/embed']);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      databaseId,
      actorId: userId,
      service: 'embed',
      model: EMBED_MODEL,
      provider: 'ollama',
      status: 'ok',
      inputTokens: EMBED_TOKENS,
      totalTokens: EMBED_TOKENS
    });
    expect(recorded[0].entityId).toBeUndefined();
  });

  it('records nothing for a search by `vector`', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { vector: [0.8, 0.2, 0.5], metric: COSINE_METRIC } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.articles.nodes[0].title).toBe('PostgreSQL Performance Tuning');
    expect(modelCalls).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it('attributes an anonymous search to the database it addresses, with no actor', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { text: 'machine learning', metric: COSINE_METRIC } }
    }, false);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ databaseId, entityId: databaseId, service: 'embed' });
    expect(recorded[0].actorId).toBeUndefined();
  });

  it('records one embedding for a create by `embeddingText`', async () => {
    const res = await post(CREATE, {
      input: { article: { title: 'By text', embeddingText: 'postgres tuning' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createArticle.article.embedding).toEqual([0.8, 0.2, 0.5]);
    expect(modelCalls.map((c) => c.path)).toEqual(['/api/embed']);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ databaseId, actorId: userId, service: 'embed', model: EMBED_MODEL });
  });

  it('records nothing for a create by `embedding`', async () => {
    const res = await post(CREATE, {
      input: { article: { title: 'By vector', embedding: [0.5, 0.5, 0.5] } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(modelCalls).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it('records one embedding for an update by `embeddingText`', async () => {
    const res = await post(UPDATE, {
      input: { id: 2, articlePatch: { embeddingText: 'machine learning' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateArticle.article.embedding).toEqual([0.1, 0.9, 0.3]);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ databaseId, actorId: userId, service: 'embed' });
  });

  it('records the embedding and the completion of a ragQuery', async () => {
    const res = await post(RAG, { prompt: 'machine learning' });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.ragQuery.answer).toBe('From the context: machine learning.');
    expect(res.body.data.ragQuery.sources[0].content).toMatch(/^Machine learning/);
    expect(res.body.data.ragQuery.tokensUsed).toBe(CHAT_TOKENS.prompt + CHAT_TOKENS.completion);

    expect(modelCalls.map((c) => c.path)).toEqual(['/api/embed', '/api/chat']);
    expect(recorded).toHaveLength(2);
    expect(embeds()).toHaveLength(1);
    expect(embeds()[0]).toMatchObject({ databaseId, actorId: userId, model: EMBED_MODEL, inputTokens: EMBED_TOKENS });
    expect(chats()).toHaveLength(1);
    expect(chats()[0]).toMatchObject({
      databaseId,
      actorId: userId,
      model: CHAT_MODEL,
      inputTokens: CHAT_TOKENS.prompt,
      outputTokens: CHAT_TOKENS.completion
    });
  });

  it('records one embedding for embedText', async () => {
    const res = await post(EMBED_TEXT, { text: 'postgres tuning' });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.embedText).toEqual({ vector: [0.8, 0.2, 0.5], dimensions: 3 });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ databaseId, actorId: userId, service: 'embed' });
  });

  it('records a failed embedding as an error, and the request fails with it', async () => {
    modelFailures.push(503);
    const res = await post(CREATE, {
      input: { article: { title: 'Unreachable', embeddingText: 'machine learning' } }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(/gateway embeddings failed: 503/);
    expect(modelCalls.map((c) => c.path)).toEqual(['/api/embed']);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      databaseId, actorId: userId, service: 'embed', status: 'error', errorType: 'upstream_503'
    });
  });
});
