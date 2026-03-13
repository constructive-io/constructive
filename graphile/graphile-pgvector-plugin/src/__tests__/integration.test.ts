import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { VectorCodecPreset } from '../vector-codec';
import { ConnectionFilterPreset } from 'graphile-connection-filter';

interface DocumentResult {
  allDocuments: {
    nodes: Array<{
      rowId: number;
      title: string;
      content: string | null;
      embedding: number[];
    }>;
  };
}

interface SearchResult {
  searchDocuments: {
    nodes: Array<{
      rowId: number;
      title: string;
      embedding: number[];
    }>;
  };
}

interface CreateDocumentResult {
  createDocument: {
    document: {
      rowId: number;
      title: string;
      embedding: number[];
    };
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('graphile-pgvector-plugin integration', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        VectorCodecPreset,
        ConnectionFilterPreset({ connectionFilterAllowEmptyObjectInput: true }),
      ],
    };

    const connections = await getConnections({
      schemas: ['pgvector_test'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres',
    }, [
      seed.sqlfile([join(__dirname, './setup.sql')])
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

    // Start a transaction for savepoint-based test isolation
    await db.client.query('BEGIN');
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
    }

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

  describe('vector columns on output types', () => {
    it('exposes vector column as array of floats', async () => {
      const result = await query<DocumentResult>(`
        query {
          allDocuments(first: 1) {
            nodes {
              rowId
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);

      const doc = nodes![0];
      expect(Array.isArray(doc.embedding)).toBe(true);
      expect(doc.embedding.length).toBe(3);
      expect(typeof doc.embedding[0]).toBe('number');
    });

    it('returns correct vector values', async () => {
      const result = await query<DocumentResult>(`
        query {
          allDocuments(filter: { title: { equalTo: "Document A" } }) {
            nodes {
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const doc = result.data?.allDocuments?.nodes[0];
      expect(doc?.embedding).toEqual([1, 0, 0]);
    });

    it('returns all documents with vector data', async () => {
      const result = await query<DocumentResult>(`
        query {
          allDocuments {
            nodes {
              rowId
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.allDocuments?.nodes;
      expect(nodes?.length).toBe(5);
      for (const node of nodes!) {
        expect(Array.isArray(node.embedding)).toBe(true);
        expect(node.embedding.length).toBe(3);
      }
    });
  });

  describe('SQL functions with vector args', () => {
    it('exposes search function that accepts vector input', async () => {
      const result = await query<SearchResult>(`
        query {
          searchDocuments(queryEmbedding: [1, 0, 0]) {
            nodes {
              rowId
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchDocuments?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);
    });

    it('returns results ordered by similarity (closest first)', async () => {
      const result = await query<SearchResult>(`
        query {
          searchDocuments(queryEmbedding: [1, 0, 0]) {
            nodes {
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchDocuments?.nodes;
      // Document A [1,0,0] should be closest to query [1,0,0]
      expect(nodes![0].title).toBe('Document A');
    });

    it('respects result_limit parameter', async () => {
      const result = await query<SearchResult>(`
        query {
          searchDocuments(queryEmbedding: [1, 0, 0], resultLimit: 2) {
            nodes {
              title
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchDocuments?.nodes;
      expect(nodes?.length).toBe(2);
    });
  });

  describe('mutations with vector input', () => {
    it('creates a document with vector embedding', async () => {
      const result = await query<CreateDocumentResult>(`
        mutation {
          createDocument(input: {
            document: {
              title: "New Document"
              embedding: [0.5, 0.5, 0.0]
            }
          }) {
            document {
              rowId
              title
              embedding
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const doc = result.data?.createDocument?.document;
      expect(doc).toBeDefined();
      expect(doc!.title).toBe('New Document');
      expect(doc!.embedding).toEqual([0.5, 0.5, 0]);
    });

    it('round-trips vector data through create and read', async () => {
      const inputVector = [0.123, -0.456, 0.789];

      const createResult = await query<CreateDocumentResult>(`
        mutation($embedding: Vector!) {
          createDocument(input: {
            document: {
              title: "Round Trip Test"
              embedding: $embedding
            }
          }) {
            document {
              rowId
              embedding
            }
          }
        }
      `, { embedding: inputVector });

      expect(createResult.errors).toBeUndefined();
      const created = createResult.data?.createDocument?.document;
      expect(created).toBeDefined();

      // Read it back
      const readResult = await query<DocumentResult>(`
        query($rowId: Int!) {
          allDocuments(filter: { rowId: { equalTo: $rowId } }) {
            nodes {
              embedding
            }
          }
        }
      `, { rowId: created!.rowId });

      expect(readResult.errors).toBeUndefined();
      const readDoc = readResult.data?.allDocuments?.nodes[0];
      // pgvector stores at ~6 decimal precision
      for (let i = 0; i < inputVector.length; i++) {
        expect(readDoc!.embedding[i]).toBeCloseTo(inputVector[i], 3);
      }
    });
  });
});
