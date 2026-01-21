# @constructive-io/graphql-server-test

Constructive GraphQL Server Testing with SuperTest HTTP requests.

This package provides a testing framework that spins up a real HTTP server using `@constructive-io/graphql-server` and tests it using SuperTest. Unlike `@constructive-io/graphql-test` which uses direct PostGraphile execution, this package makes actual HTTP requests to test the full middleware stack.

## Installation

```bash
pnpm add @constructive-io/graphql-server-test
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
import { getConnections, seed } from '@constructive-io/graphql-server-test';

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
import { getConnections, seed } from '@constructive-io/graphql-server-test';

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
import { getConnections, snapshot } from '@constructive-io/graphql-server-test';

it('matches snapshot', async () => {
  const res = await query('{ allUsers { nodes { username } } }');
  expect(snapshot(res.data)).toMatchSnapshot();
});
```

## Configuration Options

### GetConnectionsInput

| Option | Type | Description |
|--------|------|-------------|
| `schemas` | `string[]` | PostgreSQL schemas to expose in GraphQL |
| `authRole` | `string` | Default role for anonymous requests |
| `useRoot` | `boolean` | Use root/superuser for queries (bypasses RLS) |
| `graphile` | `GraphileOptions` | Graphile/PostGraphile configuration |
| `server.port` | `number` | Port to run the server on (default: random) |
| `server.host` | `string` | Host to bind the server to (default: localhost) |

## Comparison with Other Test Packages

| Package | Server | Query Method |
|---------|--------|--------------|
| `graphile-test` | None | Direct PostGraphile execution |
| `@constructive-io/graphql-test` | None | Direct PostGraphile execution |
| `@constructive-io/playwright-test` | Real HTTP | Direct PostGraphile execution |
| **`@constructive-io/graphql-server-test`** | Real HTTP | **SuperTest HTTP requests** |

## License

MIT
