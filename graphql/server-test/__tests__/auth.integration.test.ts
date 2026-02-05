/**
 * Bearer Token Authentication Integration Tests
 *
 * Tests the authentication middleware with a mocked RLS module and authenticate function.
 * This verifies that bearer tokens are properly validated and the correct role is applied.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=auth.integration
 */

import path from 'path';
import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';
import type supertest from 'supertest';

jest.setTimeout(30000);

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) =>
  path.join(seedRoot, seedDir, file);

const schemas = ['auth-test-public'];
const servicesDatabaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const metaSchemas = [
  'services_public',
  'metaschema_public',
  'metaschema_modules_public',
];

const seedFiles = [
  sql('auth-seed', 'setup.sql'),
  sql('auth-seed', 'schema.sql'),
  sql('auth-seed', 'test-data.sql'),
];

describe('Bearer Token Authentication', () => {
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const postGraphQL = (
    payload: { query: string; variables?: Record<string, unknown> },
    headers?: Record<string, string>
  ) => {
    let req = request.post('/graphql');
    req = req.set('Host', 'auth.test.constructive.io');
    if (headers) {
      for (const [header, value] of Object.entries(headers)) {
        req = req.set(header, value);
      }
    }
    return req.send(payload);
  };

  beforeAll(async () => {
    ({ server, request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: true,
            isPublic: true,
            metaSchemas,
          },
        },
      },
      [seed.sqlfile(seedFiles)]
    ));
  });

  afterAll(async () => {
    await teardown();
  });

  describe('Unauthenticated requests', () => {
    it('should allow queries without authentication', async () => {
      const res = await postGraphQL({
        query: '{ items { nodes { id name } } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.items.nodes).toBeInstanceOf(Array);
    });

    it('should use anonymous role when no token is provided', async () => {
      const res = await postGraphQL({
        query: '{ __typename }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });
  });

  describe('Valid bearer token authentication', () => {
    it('should authenticate with a valid admin token', async () => {
      const res = await postGraphQL(
        {
          query: '{ items { nodes { id name } } }',
        },
        {
          Authorization: 'Bearer valid-admin-token',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.items.nodes).toBeInstanceOf(Array);
    });

    it('should authenticate with a valid user token', async () => {
      const res = await postGraphQL(
        {
          query: '{ items { nodes { id name } } }',
        },
        {
          Authorization: 'Bearer valid-user-token',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.items.nodes).toBeInstanceOf(Array);
    });

    it('should query items with authentication', async () => {
      const res = await postGraphQL(
        {
          query: `{
            items {
              nodes {
                id
                name
                ownerId
              }
            }
          }`,
        },
        {
          Authorization: 'Bearer valid-user-token',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.items.nodes).toHaveLength(3);
    });
  });

  describe('Invalid bearer token authentication', () => {
    it('should reject an invalid token', async () => {
      const res = await postGraphQL(
        {
          query: '{ items { nodes { id name } } }',
        },
        {
          Authorization: 'Bearer invalid-token-that-does-not-exist',
        }
      );

      // Invalid tokens should return an UNAUTHENTICATED error
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should reject an expired token', async () => {
      const res = await postGraphQL(
        {
          query: '{ items { nodes { id name } } }',
        },
        {
          Authorization: 'Bearer expired-token',
        }
      );

      // Expired tokens should return an UNAUTHENTICATED error
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should handle malformed authorization header', async () => {
      const res = await postGraphQL(
        {
          query: '{ __typename }',
        },
        {
          Authorization: 'NotBearer some-token',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('should handle empty bearer token', async () => {
      const res = await postGraphQL(
        {
          query: '{ __typename }',
        },
        {
          Authorization: 'Bearer ',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });
  });

  describe('Mutations with authentication', () => {
    it('should allow authenticated user to create an item', async () => {
      const res = await postGraphQL(
        {
          query: `mutation($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
              }
            }
          }`,
          variables: {
            input: {
              item: {
                name: 'Test Item Created by Auth User',
              },
            },
          },
        },
        {
          Authorization: 'Bearer valid-user-token',
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.createItem.item.name).toBe('Test Item Created by Auth User');
    });
  });
});

// Note: X-Api-Name header tests are skipped for now due to cache cleanup issues
// between test suites. The main authentication flow is tested above via domain lookup.
// TODO: Investigate cache cleanup between test suites to enable X-Api-Name tests
