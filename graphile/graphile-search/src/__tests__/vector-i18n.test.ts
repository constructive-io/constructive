/**
 * Vector search in the request's language.
 *
 * A table with translations (@i18n) is compared with the query through the
 * translation in the first requested language the row has one for, and
 * through the row's own vector otherwise. A default-language request never
 * matches a row through another language's translation.
 */

import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { createPgvectorAdapter } from '../adapters/pgvector';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

interface Result {
  allArticles: { nodes: { rowId: number; embeddingVectorDistance: number | null }[] };
}

describe('vector search follows the request language', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas: ['vector_i18n_test'],
        preset: {
          extends: [ConnectionFilterPreset()],
          plugins: [
            VectorCodecPlugin,
            createUnifiedSearchPlugin({ adapters: [createPgvectorAdapter()], enableSearchScore: true }),
          ],
        },
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './vector-i18n.sql')])]
    );
    db = connections.db;
    teardown = connections.teardown;
    query = connections.query as QueryFn;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  async function matches(langCodes?: string[]): Promise<number[]> {
    const result = await query<Result>(
      `query {
        allArticles(
          where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE, distance: 0.1 } }
          orderBy: PRIMARY_KEY_ASC
        ) { nodes { rowId embeddingVectorDistance } }
      }`,
      undefined,
      false,
      langCodes ? { langCodes } : undefined
    );
    expect(result.errors).toBeUndefined();
    return result.data!.allArticles.nodes.map((n) => n.rowId);
  }

  it('compares only the base rows without a request language', async () => {
    expect(await matches()).toEqual([1]);
  });

  it('never matches through a translation in a default-language request', async () => {
    expect(await matches(['en'])).toEqual([1]);
  });

  it('compares through the requested translation, falling back to the base row', async () => {
    // 2 matches through French; 1 has a French translation that does not
    // match; 3 has no French translation and its own text does not match.
    expect(await matches(['fr'])).toEqual([2]);
    // 3 matches through Spanish; 1 has no Spanish translation and falls back
    // to its own (matching) text.
    expect(await matches(['es'])).toEqual([1, 3]);
  });

  it('uses the first requested language a row has a translation in', async () => {
    expect(await matches(['es', 'fr'])).toEqual([2, 3]);
  });

  it('scores a row by the vector it was compared through', async () => {
    const result = await query<Result>(
      `query {
        allArticles(
          where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }
          orderBy: PRIMARY_KEY_ASC
        ) { nodes { rowId embeddingVectorDistance } }
      }`,
      undefined,
      false,
      { langCodes: ['fr'] }
    );
    expect(result.errors).toBeUndefined();
    const distance = Object.fromEntries(
      result.data!.allArticles.nodes.map((n) => [n.rowId, n.embeddingVectorDistance])
    );
    expect(distance[2]).toBeCloseTo(0);
    expect(distance[1]).toBeCloseTo(1);
    expect(distance[3]).toBeCloseTo(1);
  });
});
