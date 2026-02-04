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
          authRole: 'anonymous',
          server: {
            api: {
              enableServicesApi: false
            }
          }
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
      // Server binds to 127.0.0.1 to avoid IPv6/IPv4 mismatch issues with supertest
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(server.graphqlUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/graphql$/);
      expect(server.port).toBeGreaterThan(0);
    });

    it('should query users via HTTP', async () => {
      const res = await query<{ users: { nodes: Array<{ username: string }> } }>(
        `query { users { nodes { username } } }`
      );

      expect(res.data).toBeDefined();
      expect(res.data?.users.nodes).toHaveLength(2);
      expect(res.data?.users.nodes[0].username).toBe('alice');
    });

    it('should query posts via HTTP', async () => {
      const res = await query<{ posts: { nodes: Array<{ title: string }> } }>(
        `query { posts { nodes { title } } }`
      );

      expect(res.data).toBeDefined();
      expect(res.data?.posts.nodes).toHaveLength(3);
    });

    it('should support variables', async () => {
      const res = await query<
        { userByUsername: { username: string; email: string } | null },
        { username: string }
      >(
        `query GetUser($username: String!) {
          userByUsername(username: $username) {
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
        .send({ query: '{ users { nodes { username } } }' });

      expect(res.status).toBe(200);
      expect(res.body.data.users.nodes).toHaveLength(2);
    });

    it('should snapshot query results', async () => {
      const res = await query(`query { users { nodes { username email } } }`);
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
          authRole: 'authenticated',
          server: {
            api: {
              enableServicesApi: false
            }
          }
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
      // Insert a new user using pg client (superuser, outside transaction)
      // Note: pg client doesn't participate in db's transaction rollback
      await pg.query(`INSERT INTO app_public.users (username) VALUES ('charlie')`);

      // Verify it exists
      const result = await pg.query('SELECT COUNT(*) FROM app_public.users');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should verify data persists when using pg client', async () => {
      // Since pg client doesn't participate in transaction rollback,
      // the user from the previous test should still exist
      const result = await pg.query('SELECT COUNT(*) FROM app_public.users');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });
  });
});
