/**
 * Integration tests — `{column}Text` companions on create/update through the
 * routed server.
 *
 * Requests go over HTTP, so GraphQL validation runs before any plan. A create
 * or update sends exactly one of the vector column or its `{column}Text`
 * companion: the text is embedded server-side and stored; sending both is
 * rejected; a create on a NOT NULL column that sends neither is rejected; an
 * update that sends neither leaves the column alone.
 *
 * The embedding provider is a local HTTP stand-in for Ollama's `/api/embed`.
 *
 *   pnpm test -- --testPathPattern=vector-text-mutations
 */

import http from 'http';
import type { AddressInfo } from 'net';
import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);

const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const schema = 'vector_text_mutations';
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

const embedCalls: string[] = [];

function startEmbedder(): Promise<{ url: string; close: () => Promise<void> }> {
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
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

const CREATE_ARTICLE = `
  mutation CreateArticle($input: CreateArticleInput!) {
    createArticle(input: $input) { article { id title } }
  }
`;

const UPDATE_ARTICLE = `
  mutation UpdateArticle($input: UpdateArticleInput!) {
    updateArticle(input: $input) { article { id title } }
  }
`;

const CREATE_NOTE = `
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) { note { id title } }
  }
`;

const EXACTLY_ONE = /provide exactly one of `embedding` or `embeddingText`/;

describe('{column}Text companions over HTTP: vector or text', () => {
  let request: supertest.Agent;
  let pg: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };
  let teardown: () => Promise<void>;
  let embedder: { url: string; close: () => Promise<void> };
  const previousEnv: Record<string, string | undefined> = {};

  const post = (query: string, variables?: Record<string, unknown>) =>
    request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schema)
      .send({ query, variables });

  const storedVector = async (table: string, title: string): Promise<string | null> => {
    const { rows } = await pg.query(
      `SELECT embedding::text AS embedding FROM ${schema}.${table} WHERE title = $1`,
      [title]
    );
    return rows.length ? rows[0].embedding : null;
  };

  beforeAll(async () => {
    embedder = await startEmbedder();
    for (const key of ['EMBEDDER_PROVIDER', 'EMBEDDER_MODEL', 'EMBEDDER_BASE_URL']) {
      previousEnv[key] = process.env[key];
    }
    process.env.EMBEDDER_PROVIDER = 'ollama';
    process.env.EMBEDDER_MODEL = 'test-embed';
    process.env.EMBEDDER_BASE_URL = embedder.url;

    ({ request, pg, teardown } = await getConnections(
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
          path.join(localSeedRoot, 'vector-text-mutations', 'schema.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    if (teardown) await teardown();
    if (embedder) await embedder.close();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(async () => {
    embedCalls.length = 0;
    await pg.query(`DELETE FROM ${schema}.articles WHERE title <> 'seed'`);
    await pg.query(`DELETE FROM ${schema}.notes WHERE title <> 'seed'`);
    await pg.query(`UPDATE ${schema}.articles SET embedding = '[0.5, 0.5, 0.5]' WHERE title = 'seed'`);
  });

  it('creates from `embeddingText`, storing the embedded vector', async () => {
    const res = await post(CREATE_ARTICLE, {
      input: { article: { title: 'from-text', embeddingText: 'machine learning' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createArticle.article.title).toBe('from-text');
    expect(await storedVector('articles', 'from-text')).toBe('[0.1,0.9,0.3]');
    expect(embedCalls).toEqual(['machine learning']);
  });

  it('creates from `embedding` without calling the embedder', async () => {
    const res = await post(CREATE_ARTICLE, {
      input: { article: { title: 'from-vector', embedding: [0.8, 0.2, 0.5] } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(await storedVector('articles', 'from-vector')).toBe('[0.8,0.2,0.5]');
    expect(embedCalls).toEqual([]);
  });

  it('rejects a create with both `embedding` and `embeddingText`', async () => {
    const res = await post(CREATE_ARTICLE, {
      input: {
        article: { title: 'both', embedding: [0.8, 0.2, 0.5], embeddingText: 'machine learning' }
      }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(EXACTLY_ONE);
    expect(res.body.errors[0].message).toMatch(/not both/);
    expect(await storedVector('articles', 'both')).toBeNull();
    expect(embedCalls).toEqual([]);
  });

  it('rejects a create on a NOT NULL vector column with neither', async () => {
    const res = await post(CREATE_ARTICLE, {
      input: { article: { title: 'neither' } }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(EXACTLY_ONE);
    expect(res.body.errors[0].message).toMatch(/neither was given/);
    expect(await storedVector('articles', 'neither')).toBeNull();
    expect(embedCalls).toEqual([]);
  });

  it('creates a row on a nullable vector column with neither', async () => {
    const res = await post(CREATE_NOTE, {
      input: { note: { title: 'no-vector' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(await storedVector('notes', 'no-vector')).toBeNull();
    expect(embedCalls).toEqual([]);
  });

  it('rejects a create on a nullable vector column with both', async () => {
    const res = await post(CREATE_NOTE, {
      input: { note: { title: 'both', embedding: [0.8, 0.2, 0.5], embeddingText: 'postgres tuning' } }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(EXACTLY_ONE);
    expect(await storedVector('notes', 'both')).toBeNull();
    expect(embedCalls).toEqual([]);
  });

  it('updates from `embeddingText`, storing the embedded vector', async () => {
    const res = await post(UPDATE_ARTICLE, {
      input: { id: 1, articlePatch: { embeddingText: 'postgres tuning' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(await storedVector('articles', 'seed')).toBe('[0.8,0.2,0.5]');
    expect(embedCalls).toEqual(['postgres tuning']);
  });

  it('rejects an update with both `embedding` and `embeddingText`', async () => {
    const res = await post(UPDATE_ARTICLE, {
      input: {
        id: 1,
        articlePatch: { embedding: [0.1, 0.9, 0.3], embeddingText: 'machine learning' }
      }
    });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(EXACTLY_ONE);
    expect(await storedVector('articles', 'seed')).toBe('[0.5,0.5,0.5]');
    expect(embedCalls).toEqual([]);
  });

  it('updates other columns with neither, leaving the vector alone', async () => {
    const res = await post(UPDATE_ARTICLE, {
      input: { id: 1, articlePatch: { title: 'seed' } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(await storedVector('articles', 'seed')).toBe('[0.5,0.5,0.5]');
    expect(embedCalls).toEqual([]);
  });
});
