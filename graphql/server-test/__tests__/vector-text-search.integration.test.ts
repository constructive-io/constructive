/**
 * Integration tests — `VectorNearbyInput` through the routed server.
 *
 * Requests go over HTTP, so GraphQL validation runs before any plan. A query
 * that sends `{ text }` must pass validation, be embedded server-side, and
 * rank the matching row first; `{ vector }` keeps working; sending neither or
 * both is rejected with a clear error.
 *
 * The embedding provider is a local HTTP stand-in for Ollama's `/api/embed`,
 * so no real model is needed and ranking is exact.
 *
 *   pnpm test -- --testPathPattern=vector-text-search
 */

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
const schema = 'vector_text_search';
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const VECTORS: Record<string, number[]> = {
  'machine learning': [0.1, 0.9, 0.3],
  'postgres tuning': [0.8, 0.2, 0.5]
};
const vectorFor = (text: string) => VECTORS[text] ?? [0.5, 0.5, 0.5];
const COSINE_METRIC = 'COSINE';

const embedCalls: string[] = [];

function startEmbedder(): Promise<Listening> {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (req.method !== 'POST' || req.url !== '/api/embed') {
        res.writeHead(404).end();
        return;
      }
      const { input } = JSON.parse(body) as { input: string };
      embedCalls.push(input);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ embeddings: [vectorFor(input)], prompt_eval_count: 1 }));
    });
  });
  return listen(server);
}

const INPUT_FIELDS = `
  query {
    __type(name: "VectorNearbyInput") {
      inputFields {
        name
        type { kind name ofType { kind name } }
      }
    }
  }
`;

const NEARBY = `
  query Nearby($where: ArticleFilter!) {
    articles(where: $where, orderBy: [EMBEDDING_VECTOR_DISTANCE_ASC]) {
      nodes { title embeddingVectorDistance }
    }
  }
`;

type Node = { title: string; embeddingVectorDistance: number | null };

describe('VectorNearbyInput over HTTP: vector or text', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let embedder: Listening;
  let gateway: Listening;
  const previousEnv: Record<string, string | undefined> = {};

  const post = (query: string, variables?: Record<string, unknown>) =>
    request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schema)
      .send({ query, variables });

  beforeAll(async () => {
    embedder = await startEmbedder();
    gateway = await startGateway(embedder.url);
    for (const key of ['AGENTIC_SERVER_URL', 'EMBEDDER_PROVIDER', 'EMBEDDER_MODEL']) {
      previousEnv[key] = process.env[key];
    }
    process.env.AGENTIC_SERVER_URL = gateway.url;
    process.env.EMBEDDER_PROVIDER = 'ollama';
    process.env.EMBEDDER_MODEL = 'test-embed';

    ({ request, teardown } = await getConnections(
      {
        schemas: [schema],
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: false, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql'),
          path.join(localSeedRoot, 'vector-text-search', 'schema.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    if (teardown) await teardown();
    if (gateway) await gateway.close();
    if (embedder) await embedder.close();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(() => {
    embedCalls.length = 0;
  });

  it('exposes `text` and a nullable `vector` on VectorNearbyInput', async () => {
    const res = await post(INPUT_FIELDS);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const fields = res.body.data.__type.inputFields as Array<{
      name: string;
      type: { kind: string };
    }>;
    const byName = Object.fromEntries(fields.map((f) => [f.name, f.type]));
    expect(byName.text).toBeDefined();
    expect(byName.vector.kind).toBe('LIST');
  });

  it('finds the row by `text`, embedded server-side', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { text: 'machine learning', metric: COSINE_METRIC } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const nodes = res.body.data.articles.nodes as Node[];
    expect(nodes[0].title).toBe('Introduction to Machine Learning');
    expect(nodes[0].embeddingVectorDistance).toBeCloseTo(0, 5);
    expect(embedCalls).toEqual(['machine learning']);
  });

  it('finds the row by `vector` without calling the embedder', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { vector: [0.8, 0.2, 0.5], metric: COSINE_METRIC } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const nodes = res.body.data.articles.nodes as Node[];
    expect(nodes[0].title).toBe('PostgreSQL Performance Tuning');
    expect(nodes[0].embeddingVectorDistance).toBeCloseTo(0, 5);
    expect(embedCalls).toEqual([]);
  });

  it('rejects a VectorNearbyInput with neither `vector` nor `text`', async () => {
    const res = await post(NEARBY, {
      where: { vectorEmbedding: { metric: COSINE_METRIC } }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(/exactly one of `vector` or `text`/);
    expect(res.body.data?.articles ?? null).toBeNull();
    expect(embedCalls).toEqual([]);
  });

  it('rejects a VectorNearbyInput with both `vector` and `text`', async () => {
    const res = await post(NEARBY, {
      where: {
        vectorEmbedding: {
          vector: [0.8, 0.2, 0.5],
          text: 'machine learning',
          metric: COSINE_METRIC
        }
      }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(/exactly one of `vector` or `text`/);
    expect(res.body.data?.articles ?? null).toBeNull();
    expect(embedCalls).toEqual([]);
  });
});

