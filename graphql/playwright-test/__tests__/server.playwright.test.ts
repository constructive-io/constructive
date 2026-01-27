import { test, expect } from '@playwright/test';
import { join } from 'path';
import { seed } from 'pgsql-test';

import { getConnectionsWithServer } from '../src';

const sql = (f: string) => join(__dirname, '/../sql', f);

test.describe('playwright-test server', () => {
  test('GraphQL server responds to queries via HTTP and direct query', async ({ request }) => {
    const { server, query, teardown } = await getConnectionsWithServer(
      {
        useRoot: true,
        schemas: ['app_public'],
        authRole: 'postgres'
      },
      [seed.sqlfile([sql('test.sql')])]
    );

    try {
      // Test 1: HTTP introspection query
      const introspectionResponse = await request.post(server.graphqlUrl, {
        data: { query: '{ __typename }' },
        headers: { 'Content-Type': 'application/json' }
      });
      expect(introspectionResponse.ok()).toBeTruthy();
      const introspectionJson = await introspectionResponse.json();
      expect(introspectionJson.data).toBeDefined();
      expect(introspectionJson.data.__typename).toBe('Query');

      // Test 2: Direct query function works alongside HTTP server
      const directResult = await query('{ __typename }');
      expect(directResult.data).toBeDefined();
      expect(directResult.data.__typename).toBe('Query');
    } finally {
      await teardown();
    }
  });
});
