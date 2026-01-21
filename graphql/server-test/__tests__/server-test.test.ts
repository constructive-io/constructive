import path from 'path';

import { getConnections, seed, snapshot } from '../src';
import type { PgTestClient } from 'pgsql-test/test-client';
import type { ServerInfo, GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';

const sql = (file: string) => path.join(__dirname, '..', 'sql', file);

describe('graphql-server-test', () => {
  describe('getConnections', () => {
    let db: PgTestClient;
    let pg: PgTestClient;
    let server: ServerInfo;
    let query: GraphQLQueryFn;
    let request: supertest.Agent;
    let teardown: () => Promise<void>;

    beforeAll(async () => {
      ({ db, pg, server, query, request, teardown } = await getConnections(
        {
          schemas: ['app_public'],
          authRole: 'anonymous'
        },
        [seed.sqlfile([sql('test.sql')])]
      ));
    });

    afterAll(async () => {
      await teardown();
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());

    it('should have a running server', () => {
      expect(server.url).toMatch(/^http:\/\/localhost:\d+$/);
      expect(server.graphqlUrl).toMatch(/^http:\/\/localhost:\d+\/graphql$/);
      expect(server.port).toBeGreaterThan(0);
    });

    it('should query users via HTTP', async () => {
      const res = await query<{ allUsers: { nodes: Array<{ id: number; username: string }> } }>(
        `query { allUsers { nodes { id username } } }`
      );

      expect(res.data).toBeDefined();
      expect(res.data?.allUsers.nodes).toHaveLength(2);
      expect(res.data?.allUsers.nodes[0].username).toBe('alice');
    });

    it('should query posts via HTTP', async () => {
      const res = await query<{ allPosts: { nodes: Array<{ id: number; title: string }> } }>(
        `query { allPosts { nodes { id title } } }`
      );

      expect(res.data).toBeDefined();
      expect(res.data?.allPosts.nodes).toHaveLength(3);
    });

    it('should support variables', async () => {
      const res = await query<
        { userByUsername: { id: number; username: string; email: string } | null },
        { username: string }
      >(
        `query GetUser($username: String!) { 
          userByUsername(username: $username) { 
            id 
            username 
            email 
          } 
        }`,
        { username: 'alice' }
      );

      expect(res.data?.userByUsername).toBeDefined();
      expect(res.data?.userByUsername?.username).toBe('alice');
      expect(res.data?.userByUsername?.email).toBe('alice@example.com');
    });

    it('should use SuperTest directly for custom requests', async () => {
      const res = await request
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query: '{ allUsers { nodes { id } } }' });

      expect(res.status).toBe(200);
      expect(res.body.data.allUsers.nodes).toHaveLength(2);
    });

    it('should snapshot query results', async () => {
      const res = await query(`query { allUsers { nodes { username email } } }`);
      expect(snapshot(res.data)).toMatchSnapshot();
    });
  });

  describe('database operations', () => {
    let db: PgTestClient;
    let pg: PgTestClient;
    let query: GraphQLQueryFn;
    let teardown: () => Promise<void>;

    beforeAll(async () => {
      ({ db, pg, query, teardown } = await getConnections(
        {
          schemas: ['app_public'],
          authRole: 'authenticated'
        },
        [seed.sqlfile([sql('test.sql')])]
      ));
    });

    afterAll(async () => {
      await teardown();
    });

    beforeEach(() => db.beforeEach());
    afterEach(() => db.afterEach());

    it('should allow direct database queries via pg client', async () => {
      const result = await pg.query('SELECT COUNT(*) FROM app_public.users');
      expect(parseInt(result.rows[0].count)).toBe(2);
    });

    it('should allow direct database queries via db client', async () => {
      const result = await db.query('SELECT COUNT(*) FROM app_public.posts');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should rollback changes between tests', async () => {
      // Insert a new user
      await pg.query(`INSERT INTO app_public.users (username) VALUES ('charlie')`);

      // Verify it exists
      const result = await pg.query('SELECT COUNT(*) FROM app_public.users');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should have rolled back the previous test changes', async () => {
      // The user from the previous test should not exist
      const result = await pg.query('SELECT COUNT(*) FROM app_public.users');
      expect(parseInt(result.rows[0].count)).toBe(2);
    });
  });
});
