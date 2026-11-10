// grafserv caches parsed documents by query text and grafast caches the
// operation plan per document, so one plan serves many requests. graphile-test
// re-parses every call; caching parse here gives tests the server's plan reuse.
jest.mock('graphql', () => {
  const actual = jest.requireActual('graphql');
  const parsed = new Map<string, unknown>();
  return {
    ...actual,
    parse: (source: unknown, options?: unknown) => {
      if (typeof source !== 'string') return actual.parse(source, options);
      if (!parsed.has(source)) parsed.set(source, actual.parse(source, options));
      return parsed.get(source);
    },
  };
});

import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

import { createBm25Adapter } from '../adapters/bm25';
import { createPgvectorAdapter } from '../adapters/pgvector';
import { createTrgmAdapter } from '../adapters/trgm';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { Bm25CodecPlugin } from '../codecs/bm25-codec';
import { TsvectorCodecPlugin } from '../codecs/tsvector-codec';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

type ScoreField = 'tsvRank' | 'bodyBm25Score' | 'titleTrgmSimilarity' | 'embeddingVectorDistance';
type DocumentNode = { rowId: number } & Record<ScoreField, number | null>;
type Result = { allDocuments: { nodes: DocumentNode[] } };
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const NODES = 'nodes { rowId tsvRank bodyBm25Score titleTrgmSimilarity embeddingVectorDistance }';

const VECTOR = { vectorEmbedding: { vector: [1, 0.5, 0.2], metric: 'COSINE' } };
const TRGM = { trgmTitle: { value: 'Learning', threshold: 0.05 } };
const BM25 = { bm25Body: { query: 'learning' } };
const TSV = { tsvTsv: 'learning' };

const CASES: Array<[string, Record<string, unknown>, ScoreField, 'ASC' | 'DESC']> = [
  ['EMBEDDING_VECTOR_DISTANCE_ASC', VECTOR, 'embeddingVectorDistance', 'ASC'],
  ['EMBEDDING_VECTOR_DISTANCE_DESC', VECTOR, 'embeddingVectorDistance', 'DESC'],
  ['TITLE_TRGM_SIMILARITY_ASC', TRGM, 'titleTrgmSimilarity', 'ASC'],
  ['TITLE_TRGM_SIMILARITY_DESC', TRGM, 'titleTrgmSimilarity', 'DESC'],
  ['BODY_BM25_SCORE_ASC', BM25, 'bodyBm25Score', 'ASC'],
  ['BODY_BM25_SCORE_DESC', BM25, 'bodyBm25Score', 'DESC'],
  ['TSV_RANK_ASC', TSV, 'tsvRank', 'ASC'],
  ['TSV_RANK_DESC', TSV, 'tsvRank', 'DESC'],
];

function expectSortedBy(nodes: DocumentNode[], field: ScoreField, direction: 'ASC' | 'DESC') {
  const scores = nodes.map((n) => n[field] as number);
  const sorted = [...scores].sort((a, b) => (direction === 'ASC' ? a - b : b - a));
  expect(scores).toEqual(sorted);
}

describe('search orderBy passed as a GraphQL variable', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnections({
      schemas: ['unified_search_test'],
      preset: {
        extends: [ConnectionFilterPreset()],
        plugins: [
          TsvectorCodecPlugin,
          Bm25CodecPlugin,
          VectorCodecPlugin,
          createUnifiedSearchPlugin({
            adapters: [
              createTsvectorAdapter(),
              createBm25Adapter(),
              createTrgmAdapter({ defaultThreshold: 0.1 }),
              createPgvectorAdapter(),
            ],
          }),
        ],
      },
      useRoot: true,
      authRole: 'postgres',
    }, [seed.sqlfile([join(__dirname, './setup.sql')])]);
    teardown = connections.teardown;
    query = connections.query as QueryFn;
  });

  afterAll(async () => {
    await teardown?.();
  });

  async function nodesFor(q: string, variables: Record<string, unknown>) {
    const result = await query<Result>(q, variables);
    expect(result.errors).toBeUndefined();
    return result.data!.allDocuments.nodes;
  }

  it.each(CASES)('%s sorts the same as the literal', async (orderBy, where, field, direction) => {
    const literal = await nodesFor(
      `query($w: DocumentFilter) { allDocuments(where: $w, orderBy: [${orderBy}]) { ${NODES} } }`,
      { w: where },
    );
    const variable = await nodesFor(
      `query($w: DocumentFilter, $ob: [DocumentOrderBy!]) { allDocuments(where: $w, orderBy: $ob) { ${NODES} } }`,
      { w: where, ob: [orderBy] },
    );

    expect(variable.length).toBeGreaterThan(2);
    expectSortedBy(variable, field, direction);
    expect(variable.map((n) => n.rowId)).toEqual(literal.map((n) => n.rowId));
  });

  it('honours the order of a composite orderBy variable', async () => {
    const q = `query($w: DocumentFilter, $ob: [DocumentOrderBy!]) { allDocuments(where: $w, orderBy: $ob) { ${NODES} } }`;
    const where = { ...VECTOR, ...TRGM };

    const vectorFirst = await nodesFor(q, { w: where, ob: ['EMBEDDING_VECTOR_DISTANCE_ASC', 'TITLE_TRGM_SIMILARITY_DESC'] });
    const trgmFirst = await nodesFor(q, { w: where, ob: ['TITLE_TRGM_SIMILARITY_DESC', 'EMBEDDING_VECTOR_DISTANCE_ASC'] });

    expectSortedBy(vectorFirst, 'embeddingVectorDistance', 'ASC');
    expectSortedBy(trgmFirst, 'titleTrgmSimilarity', 'DESC');
    expect(trgmFirst.map((n) => n.rowId)).not.toEqual(vectorFirst.map((n) => n.rowId));
  });

  it('does not carry one request\'s orderBy into the next request on the same plan', async () => {
    const q = `query Reused($ob: [DocumentOrderBy!]) { allDocuments(where: { vectorEmbedding: { vector: [1, 0.5, 0.2], metric: COSINE } }, orderBy: $ob) { ${NODES} } }`;

    const byDistance = await nodesFor(q, { ob: ['EMBEDDING_VECTOR_DISTANCE_DESC'] });
    const byRowId = await nodesFor(q, { ob: ['ROW_ID_ASC'] });

    // Checked first: before the fix the first request's own order was also
    // dropped, and asserting it first would hide the carry-over.
    expect(byRowId.map((n) => n.rowId)).toEqual([1, 2, 3, 4, 5]);
    expectSortedBy(byDistance, 'embeddingVectorDistance', 'DESC');
  });
});
