# @constructive-io/playwright-test

Constructive Playwright Testing with HTTP server support for end-to-end testing.

This package extends `@constructive-io/graphql-test` to provide an actual HTTP server for Playwright and other E2E testing frameworks. It creates isolated test databases and starts a GraphQL server that bypasses domain routing, making it perfect for integration testing.

## Installation

```bash
npm install @constructive-io/playwright-test
```

## Usage

### Basic Usage

```typescript
import { getConnectionsWithServer, seed } from '@constructive-io/playwright-test';

describe('E2E Tests', () => {
  let teardown: () => Promise<void>;
  let serverUrl: string;

  beforeAll(async () => {
    const connections = await getConnectionsWithServer({
      schemas: ['public', 'app_public'],
      authRole: 'anonymous'
    }, [seed.pgpm({ extensions: ['my-extension'] })]);

    teardown = connections.teardown;
    serverUrl = connections.server.graphqlUrl;
  });

  afterAll(async () => {
    await teardown();
  });

  it('should work with Playwright', async () => {
    // Use serverUrl in your Playwright tests
    // e.g., await page.goto(serverUrl);
  });
});
```

### With Playwright

```typescript
import { test, expect } from '@playwright/test';
import { getConnectionsWithServer } from '@constructive-io/playwright-test';

let connections: Awaited<ReturnType<typeof getConnectionsWithServer>>;

test.beforeAll(async () => {
  connections = await getConnectionsWithServer({
    schemas: ['services_public', 'app_public'],
    authRole: 'anonymous',
    server: {
      port: 5555,
      host: 'localhost'
    }
  });
});

test.afterAll(async () => {
  await connections.teardown();
});

test('GraphQL API is accessible', async ({ page }) => {
  const response = await page.request.post(connections.server.graphqlUrl, {
    data: {
      query: '{ __typename }'
    }
  });
  expect(response.ok()).toBeTruthy();
});
```

### Direct Query Access

You can also execute GraphQL queries directly without going through HTTP:

```typescript
const { query, server, teardown } = await getConnectionsWithServer({
  schemas: ['public'],
  authRole: 'anonymous'
});

// Direct query (bypasses HTTP)
const result = await query(`
  query {
    allUsers {
      nodes {
        id
        name
      }
    }
  }
`);

// HTTP endpoint for Playwright
console.log(server.graphqlUrl); // http://localhost:5555/graphql
```

## API

### getConnectionsWithServer(input, seedAdapters?)

Creates database connections and starts an HTTP server for testing.

**Parameters:**
- `input.schemas` - Array of PostgreSQL schemas to expose
- `input.authRole` - Default authentication role (e.g., 'anonymous', 'authenticated')
- `input.server.port` - Port to run the server on (defaults to random available port)
- `input.server.host` - Host to bind to (defaults to 'localhost')
- `input.graphile` - Optional Graphile configuration overrides
- `seedAdapters` - Optional array of seed adapters for database setup

**Returns:**
- `pg` - PostgreSQL client for direct database access
- `db` - Database client for test operations
- `server` - Server info including `url`, `graphqlUrl`, `port`, `host`, and `stop()`
- `query` - GraphQL query function (positional API)
- `teardown` - Cleanup function to stop server and drop test database

### getConnectionsWithServerObject(input, seedAdapters?)

Same as `getConnectionsWithServer` but uses object-based query API.

### getConnectionsWithServerUnwrapped(input, seedAdapters?)

Same as `getConnectionsWithServer` but throws on GraphQL errors instead of returning them.

### createTestServer(opts, serverOpts?)

Low-level function to create just the HTTP server without database setup.

## How It Works

1. Creates an isolated test database using `pgsql-test`
2. Starts an Express server with Constructive GraphQL middleware
3. Configures `enableServicesApi: false` to bypass domain/subdomain routing
4. Exposes the specified schemas directly via the GraphQL endpoint
5. Returns the server URL for Playwright to connect to
6. Provides a teardown function that stops the server and cleans up the database

## Configuration

The server is configured with `enableServicesApi: false`, which means:
- No domain/subdomain routing is required
- Schemas are exposed directly based on the `schemas` parameter
- Perfect for isolated testing without complex domain setup
