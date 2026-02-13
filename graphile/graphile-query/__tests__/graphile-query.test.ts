/**
 * Tests for graphile-query PostGraphile v5 integration
 */
import { Pool } from 'pg';
import { getConnections, GetConnectionResult } from 'pgsql-test';
import {
  getSchema,
  GraphileQuery,
  GraphileQuerySimple,
  createGraphileQuery,
  createGraphileQuerySimple,
} from '../src';

const TEST_SCHEMA = `
CREATE SCHEMA IF NOT EXISTS test_public;

CREATE TABLE test_public.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_public.posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES test_public.users(id),
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO test_public.users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');

INSERT INTO test_public.posts (user_id, title, body) VALUES
  (1, 'Hello World', 'This is my first post'),
  (1, 'GraphQL is great', 'I love using GraphQL'),
  (2, 'Testing with Jest', 'Jest makes testing easy');
`;

describe('graphile-query', () => {
  let pool: Pool;
  let conn: GetConnectionResult;

  beforeAll(async () => {
    conn = await getConnections({
      db: { extensions: [] },
    });
    pool = conn.manager.getPool(conn.pg.config);

    const client = await pool.connect();
    try {
      await client.query(TEST_SCHEMA);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await conn.teardown();
  });

  describe('getSchema', () => {
    it('should create a GraphQL schema from database schemas', async () => {
      const result = await getSchema(pool, {
        schema: 'test_public',
      });

      expect(result.schema).toBeDefined();
      expect(result.resolvedPreset).toBeDefined();
      expect(result.pgService).toBeDefined();

      const typeMap = result.schema.getTypeMap();
      expect(typeMap['User']).toBeDefined();
      expect(typeMap['Post']).toBeDefined();
    });

    it('should accept multiple schemas', async () => {
      const result = await getSchema(pool, {
        schema: ['test_public'],
      });

      expect(result.schema).toBeDefined();
    });
  });

  describe('GraphileQuery', () => {
    it('should execute queries and return data', async () => {
      const { schema, resolvedPreset, pgService } = await getSchema(pool, {
        schema: 'test_public',
      });

      const gq = new GraphileQuery({
        schema,
        pool,
        settings: { schema: 'test_public' },
        resolvedPreset,
        pgService,
      });

      const result = await gq.query({
        query: '{ allUsers { nodes { name email } } }',
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      const data = result.data as { allUsers: { nodes: { name: string; email: string }[] } };
      expect(data.allUsers.nodes).toHaveLength(2);
      expect(data.allUsers.nodes[0].name).toBe('Alice');
    });

    it('should support variables', async () => {
      const { schema, resolvedPreset, pgService } = await getSchema(pool, {
        schema: 'test_public',
      });

      const gq = new GraphileQuery({
        schema,
        pool,
        settings: { schema: 'test_public' },
        resolvedPreset,
        pgService,
      });

      const result = await gq.query({
        query: `
          query GetUsers($first: Int!) {
            allUsers(first: $first) {
              nodes { name }
            }
          }
        `,
        variables: { first: 1 },
      });

      expect(result.errors).toBeUndefined();
      const data = result.data as { allUsers: { nodes: { name: string }[] } };
      expect(data.allUsers.nodes).toHaveLength(1);
    });
  });

  describe('GraphileQuerySimple', () => {
    it('should execute simple queries', async () => {
      const { schema, resolvedPreset, pgService } = await getSchema(pool, {
        schema: 'test_public',
      });

      const gq = new GraphileQuerySimple({
        schema,
        pool,
        resolvedPreset,
        pgService,
      });

      const result = await gq.query('{ allPosts { nodes { title } } }');

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      const data = result.data as { allPosts: { nodes: { title: string }[] } };
      expect(data.allPosts.nodes).toHaveLength(3);
    });

    it('should support variables', async () => {
      const { schema, resolvedPreset, pgService } = await getSchema(pool, {
        schema: 'test_public',
      });

      const gq = new GraphileQuerySimple({
        schema,
        pool,
        resolvedPreset,
        pgService,
      });

      const result = await gq.query(
        `query GetPosts($first: Int!) {
          allPosts(first: $first) { nodes { title } }
        }`,
        { first: 2 }
      );

      expect(result.errors).toBeUndefined();
      const data = result.data as { allPosts: { nodes: { title: string }[] } };
      expect(data.allPosts.nodes).toHaveLength(2);
    });
  });

  describe('createGraphileQuery', () => {
    it('should create a GraphileQuery instance with schema', async () => {
      const gq = await createGraphileQuery(pool, {
        schema: 'test_public',
      });

      const result = await gq.query({
        query: '{ allUsers { nodes { name } } }',
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('createGraphileQuerySimple', () => {
    it('should create a GraphileQuerySimple instance with schema', async () => {
      const gq = await createGraphileQuerySimple(pool, {
        schema: 'test_public',
      });

      const result = await gq.query('{ allPosts { nodes { title } } }');

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw for missing required parameters', () => {
      expect(() => {
        new GraphileQuery({
          schema: null as unknown as never,
          pool,
          settings: { schema: 'test_public' },
          resolvedPreset: {} as never,
          pgService: {} as never,
        });
      }).toThrow('requires a schema');

      expect(() => {
        new GraphileQuerySimple({
          schema: null as unknown as never,
          pool,
          resolvedPreset: {} as never,
          pgService: {} as never,
        });
      }).toThrow('requires a schema');
    });
  });
});
