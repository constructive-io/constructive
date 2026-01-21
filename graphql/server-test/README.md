# graphql-server-test

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/graphql-server-test">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fserver-test%2Fpackage.json"/>
  </a>
</p>

`graphql-server-test` provides a testing framework that spins up a real HTTP server using `@constructive-io/graphql-server` and tests it using SuperTest. Unlike `@constructive-io/graphql-test` which uses direct PostGraphile execution, this package makes actual HTTP requests to test the full middleware stack.

## Install

```sh
npm install graphql-server-test
```

## Features

- Real HTTP server testing with SuperTest
- Uses `@constructive-io/graphql-server` directly for the full middleware stack
- Per-test database isolation with transaction rollback
- Built on top of `pgsql-test` for database management
- Compatible with Jest and other test runners

## Usage

### Basic Usage

```typescript
import { getConnections, seed } from 'graphql-server-test';

let db, pg, server, query, request, teardown;

beforeAll(async () => {
  ({ db, pg, server, query, request, teardown } = await getConnections({
    schemas: ['app_public'],
    authRole: 'anonymous'
  }, [
    seed.sqlfile(['./sql/test.sql'])
  ]));
});

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
afterAll(() => teardown());

it('queries users via HTTP', async () => {
  const res = await query(`
    query {
      allUsers {
        nodes { id username }
      }
    }
  `);

  expect(res.data.allUsers.nodes).toHaveLength(2);
});
```

### Using SuperTest Directly

For more control over HTTP requests, use the `request` agent directly:

```typescript
it('tests authentication headers', async () => {
  const res = await request
    .post('/graphql')
    .set('Authorization', 'Bearer test-token')
    .set('Content-Type', 'application/json')
    .send({ query: '{ currentUser { id } }' });

  expect(res.status).toBe(200);
  expect(res.body.data.currentUser).toBeDefined();
});

it('tests error responses', async () => {
  const res = await request
    .post('/graphql')
    .send({ query: '{ invalidField }' });

  expect(res.body.errors).toBeDefined();
});
```

### Server Information

The `server` object provides information about the running HTTP server:

```typescript
const { server } = await getConnections({ schemas: ['app_public'] });

console.log(server.url);        // http://localhost:5555
console.log(server.graphqlUrl); // http://localhost:5555/graphql
console.log(server.port);       // 5555
console.log(server.host);       // localhost

// Stop the server manually (usually handled by teardown)
await server.stop();
```

### Database Operations

Direct database access is available through `pg` (superuser) and `db` (app-level) clients:

```typescript
const { pg, db } = await getConnections({ schemas: ['app_public'] });

// Superuser operations (bypasses RLS)
await pg.query('INSERT INTO app_public.users (username) VALUES ($1)', ['admin']);

// App-level operations (respects RLS)
await db.query('SELECT * FROM app_public.users');
```

### Seeding

Use the `seed` utilities from `pgsql-test`:

```typescript
import { getConnections, seed } from 'graphql-server-test';

const { db, query, teardown } = await getConnections(
  { schemas: ['app_public'] },
  [
    seed.sqlfile(['./sql/schema.sql', './sql/data.sql']),
    seed.fn(async (client) => {
      await client.query('INSERT INTO users (name) VALUES ($1)', ['Test User']);
    })
  ]
);
```

### Snapshots

Use the `snapshot` utility for snapshot testing:

```typescript
import { getConnections, snapshot } from 'graphql-server-test';

it('matches snapshot', async () => {
  const res = await query('{ allUsers { nodes { username } } }');
  expect(snapshot(res.data)).toMatchSnapshot();
});
```

## Configuration Options

### GetConnectionsInput

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schemas` | `string[]` | required | PostgreSQL schemas to expose in GraphQL |
| `authRole` | `string` | - | Default role for anonymous requests |
| `useRoot` | `boolean` | `false` | Use root/superuser for queries (bypasses RLS) |
| `graphile` | `GraphileOptions` | - | Graphile/PostGraphile configuration |
| `server.port` | `number` | random | Port to run the server on |
| `server.host` | `string` | `localhost` | Host to bind the server to |
| `enableServicesApi` | `boolean` | `false` | Enable domain/subdomain routing via services_public |
| `api` | `Partial<ApiOptions>` | - | Full API configuration options (see below) |

### API Options

The `api` option provides full control over the GraphQL server configuration. It accepts a partial `ApiOptions` object from `@constructive-io/graphql-types`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enableServicesApi` | `boolean` | `false` | Enable domain/subdomain routing via services_public |
| `exposedSchemas` | `string[]` | from `schemas` | Database schemas to expose (overridden by `schemas`) |
| `anonRole` | `string` | from `authRole` | Anonymous role name (overridden by `authRole`) |
| `roleName` | `string` | from `authRole` | Default role name (overridden by `authRole`) |
| `defaultDatabaseId` | `string` | `'test-database'` | Default database identifier |
| `isPublic` | `boolean` | - | Whether the API is publicly accessible |
| `metaSchemas` | `string[]` | - | Schemas containing metadata tables |

The convenience properties (`schemas`, `authRole`, `enableServicesApi`) take precedence over values in the `api` object when both are specified.

```typescript
// Using convenience properties (recommended for most cases)
const { query } = await getConnections({
  schemas: ['app_public'],
  authRole: 'anonymous'
});

// Using full api options for advanced configuration
const { query } = await getConnections({
  schemas: ['app_public'],
  api: {
    isPublic: false,
    defaultDatabaseId: 'my-test-db',
    metaSchemas: ['services_public', 'metaschema_public']
  }
});

// Combining convenience properties with api options
const { query } = await getConnections({
  schemas: ['app_public'],
  authRole: 'authenticated',
  enableServicesApi: true,
  api: {
    isPublic: true,
    metaSchemas: ['services_public']
  }
});
```

### Services API

By default, `enableServicesApi` is set to `false`, which bypasses domain/subdomain routing and directly exposes the schemas you specify. This is the recommended setting for most testing scenarios.

When `enableServicesApi` is `true`, the server uses the `services_public` schema to resolve which API and schemas to expose based on the incoming request's domain/subdomain. This is useful when you need to test the full domain routing behavior.

## Comparison with Other Test Packages

| Package | Server | Query Method |
|---------|--------|--------------|
| `graphile-test` | None | Direct PostGraphile execution |
| `@constructive-io/graphql-test` | None | Direct PostGraphile execution |
| `@constructive-io/playwright-test` | Real HTTP | Direct PostGraphile execution |
| **`graphql-server-test`** | Real HTTP | **SuperTest HTTP requests** |

## License

MIT
