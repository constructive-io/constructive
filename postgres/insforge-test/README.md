# insforge-test

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
  <a href="https://www.npmjs.com/package/insforge-test">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Finsforge-test%2Fpackage.json"/>
  </a>
</p>

`insforge-test` is an InsForge-optimized version of [`pgsql-test`](https://www.npmjs.com/package/pgsql-test) with InsForge defaults baked in. It provides instant, isolated PostgreSQL databases for testing with automatic transaction rollbacks, context switching, and clean seeding — configured for InsForge's local development environment. It's also great for GitHub Actions and CI/CD testing.

## Install

```sh
npm install insforge-test
```

## Features

* **Instant test DBs** — each one seeded, isolated, and UUID-named
* **Per-test rollback** — every test runs in its own transaction or savepoint
* **RLS-friendly** — test with role-based auth via `.setContext()`
* **Flexible seeding** — run `.sql` files, programmatic seeds, or even load fixtures
* **Compatible with any async runner** — works with `Jest`, `Mocha`, etc.
* **Auto teardown** — no residue, no reboots, just clean exits

## Quick Start

```ts
import { getConnections } from 'insforge-test';

let db, teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
  await db.query(`SELECT 1`); // Ready to run queries
});

afterAll(() => teardown());
```

## `getConnections()` Overview

```ts
import { getConnections } from 'insforge-test';

// Complete object destructuring
const { pg, db, admin, teardown, manager } = await getConnections();

// Most common pattern
const { db, teardown } = await getConnections();
```

The `getConnections()` helper sets up a fresh PostgreSQL test database and returns a structured object with:

* `pg`: a `PgTestClient` connected as the root or superuser — useful for administrative setup or introspection
* `db`: a `PgTestClient` connected as the app-level user — used for running tests with RLS and granted permissions
* `admin`: a `DbAdmin` utility for managing database state, extensions, roles, and templates
* `teardown()`: a function that shuts down the test environment and database pool
* `manager`: a shared connection pool manager (`PgTestConnector`) behind both clients

Together, these allow fast, isolated, role-aware test environments with per-test rollback and full control over setup and teardown.

The `PgTestClient` returned by `getConnections()` is a fully-featured wrapper around `pg.Pool`. It provides:

* Automatic transaction and savepoint management for test isolation
* Easy switching of role-based contexts for RLS testing
* A clean, high-level API for integration testing PostgreSQL systems

## `PgTestClient` API Overview

```ts
let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

beforeEach(() => pg.beforeEach());
afterEach(() => pg.afterEach());
afterAll(() => teardown());
```

The `PgTestClient` returned by `getConnections()` wraps a `pg.Client` and provides convenient helpers for query execution, test isolation, and context switching.

### Common Methods

* `query(sql, values?)` – Run a raw SQL query and get the `QueryResult`
* `beforeEach()` – Begins a transaction and sets a savepoint (called at the start of each test)
* `afterEach()` – Rolls back to the savepoint and commits the outer transaction (cleans up test state)
* `setContext({ key: value })` – Sets PostgreSQL config variables (like `role`) to simulate RLS contexts
* `any`, `one`, `oneOrNone`, `many`, `manyOrNone`, `none`, `result` – Typed query helpers for specific result expectations

These methods make it easier to build expressive and isolated integration tests with strong typing and error handling.

The `PgTestClient` returned by `getConnections()` is a fully-featured wrapper around `pg.Pool`. It provides:

* Automatic transaction and savepoint management for test isolation
* Easy switching of role-based contexts for RLS testing
* A clean, high-level API for integration testing PostgreSQL systems

## Usage Examples

### Basic Setup

```ts
import { getConnections } from 'insforge-test';

let db; // A fully wrapped PgTestClient using pg.Pool with savepoint-based rollback per test
let teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());

  await db.query(`
    CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
    CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), content TEXT);

    INSERT INTO users (name) VALUES ('Alice'), ('Bob');
    INSERT INTO posts (user_id, content) VALUES (1, 'Hello world!'), (2, 'Testing InsForge!');
  `);
});

afterAll(() => teardown());

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());

test('user count starts at 2', async () => {
  const res = await db.query('SELECT COUNT(*) FROM users');
  expect(res.rows[0].count).toBe('2');
});
```

### Role-Based Context

The `insforge-test` framework provides powerful tools to simulate authentication contexts during tests, which is particularly useful when testing Row-Level Security (RLS) policies.

#### Setting Test Context

Use `setContext()` to simulate different user roles and JWT claims:

```ts
db.setContext({
  role: 'authenticated',
  'request.jwt.claim.sub': '550e8400-e29b-41d4-a716-446655440001'
});
```

This applies the settings using `SET LOCAL` statements, ensuring they persist only for the current transaction and maintain proper isolation between tests.

#### InsForge Roles

InsForge uses three built-in PostgreSQL roles:

| Role | Description | Use Case |
|------|-------------|----------|
| `anon` | Unauthenticated users | Public read access |
| `authenticated` | Logged-in users | Standard user operations |
| `project_admin` | System administrators | Full access to all resources |

#### Testing Role-Based Access

```ts
describe('authenticated role', () => {
  beforeEach(async () => {
    db.setContext({ role: 'authenticated' });
    await db.beforeEach();
  });

  afterEach(() => db.afterEach());

  it('runs as authenticated', async () => {
    const res = await db.query(`SELECT current_setting('role', true) AS role`);
    expect(res.rows[0].role).toBe('authenticated');
  });
});
```

### Creating Test Users

Use `insertUser()` to create users in `auth.users`:

```ts
import { getConnections, PgTestClient, insertUser } from 'insforge-test';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

let alice: any;
let bob: any;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Create users in auth.users (requires superuser)
  alice = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
  bob = await insertUser(pg, 'bob@example.com', '550e8400-e29b-41d4-a716-446655440002');
});
```

**Parameters:**
- `pg` - Superuser client (required for auth.users)
- `email` - User's email
- `id` - Optional UUID (auto-generated if omitted)

### Testing RLS Policies

#### User Can Access Own Data

```ts
it('user can insert own record', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': alice.id
  });

  const result = await db.one(`
    INSERT INTO public.posts (title, owner_id)
    VALUES ($1, $2)
    RETURNING id, title, owner_id
  `, ['My Post', alice.id]);

  expect(result.title).toBe('My Post');
  expect(result.owner_id).toBe(alice.id);
});
```

#### User Cannot Access Others' Data

```ts
it('user cannot see other users data', async () => {
  // Bob creates a post
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': bob.id
  });

  await db.one(`
    INSERT INTO public.posts (title, owner_id)
    VALUES ($1, $2)
    RETURNING id
  `, ['Bob Post', bob.id]);

  // Alice queries - should not see Bob's post
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': alice.id
  });

  const result = await db.query('SELECT * FROM public.posts');
  expect(result.rows).toHaveLength(0);
});
```

#### Testing Permission Denied

Use savepoint pattern for expected failures:

```ts
it('anonymous cannot insert', async () => {
  db.setContext({ role: 'anon' });

  const point = 'anon_insert';
  await db.savepoint(point);

  await expect(
    db.query(`INSERT INTO public.posts (title) VALUES ('Hacked')`)
  ).rejects.toThrow(/permission denied/);

  await db.rollback(point);
});
```

### Seeding System

The second argument to `getConnections()` is an optional array of `SeedAdapter` objects:

```ts
const { db, teardown } = await getConnections(getConnectionOptions, seedAdapters);
```

This array lets you fully customize how your test database is seeded. You can compose multiple strategies:

* [`seed.sqlfile()`](#sql-file-seeding) – Execute raw `.sql` files from disk
* [`seed.fn()`](#programmatic-seeding) – Run JavaScript/TypeScript logic to programmatically insert data
* [`seed.csv()`](#csv-seeding) – Load tabular data from CSV files
* [`seed.json()`](#json-seeding) – Use in-memory objects as seed data
* [`seed.pgpm()`](#pgpm-seeding) – Apply a PGPM project or set of packages (compatible with sqitch)

> **Default Behavior:** If no `SeedAdapter[]` is passed, pgpm seeding is assumed. This makes `insforge-test` zero-config for pgpm-based projects.

### SQL File Seeding

```ts
const { db, teardown } = await getConnections({}, [
  seed.sqlfile(['schema.sql', 'fixtures.sql'])
]);
```

### Programmatic Seeding

```ts
const { db, teardown } = await getConnections({}, [
  seed.fn(async ({ pg }) => {
    await pg.query(`INSERT INTO users (name) VALUES ('Seeded User')`);
  })
]);
```

### JSON Seeding

```ts
const { db, teardown } = await getConnections({}, [
  seed.json({
    'public.users': [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  })
]);
```

### pgpm Seeding

```ts
// pgpm migrate is used automatically
const { db, teardown } = await getConnections();
```

## `getConnections` Options

### `db` Options (PgTestConnectionOptions)

| Option                   | Type       | Default          | Description                                                                 |
| ------------------------ | ---------- | ---------------- | --------------------------------------------------------------------------- |
| `db.extensions`          | `string[]` | `[]`             | Array of PostgreSQL extensions to include in the test database              |
| `db.cwd`                 | `string`   | `process.cwd()`  | Working directory used for PGPM or Sqitch projects                          |
| `db.connection.user`     | `string`   | `'postgres'`     | User for simulating RLS via `setContext()`                                  |
| `db.connection.password` | `string`   | `'postgres'`     | Password for RLS test user                                                  |
| `db.connection.role`     | `string`   | `'anon'`         | Default role used during `setContext()`                                     |
| `db.template`            | `string`   | `undefined`      | Template database used for faster test DB creation                          |
| `db.rootDb`              | `string`   | `'postgres'`     | Root database used for administrative operations (e.g., creating databases) |
| `db.prefix`              | `string`   | `'db-'`          | Prefix used when generating test database names                             |

### `pg` Options (PgConfig)

Environment variables will override these options when available:

* `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

| Option        | Type     | Default       | Description                                     |
| ------------- | -------- | ------------- | ----------------------------------------------- |
| `pg.user`     | `string` | `'postgres'`  | Superuser for PostgreSQL                        |
| `pg.password` | `string` | `'postgres'`  | Password for the PostgreSQL superuser           |
| `pg.host`     | `string` | `'localhost'` | Hostname for PostgreSQL                         |
| `pg.port`     | `number` | `5432`        | Port for PostgreSQL                             |
| `pg.database` | `string` | `'postgres'`  | Default database used when connecting initially |

### Usage

```ts
const { conn, db, teardown } = await getConnections({
  pg: { user: 'postgres', password: 'secret' },
  db: {
    extensions: ['uuid-ossp'],
    cwd: '/path/to/project',
    connection: { user: 'test_user', password: 'secret', role: 'authenticated' },
    template: 'test_template',
    prefix: 'test_',
    rootDb: 'postgres'
  }
});
```

## InsForge vs Supabase Defaults

If you're coming from `supabase-test`, here are the key differences:

| Setting | `supabase-test` | `insforge-test` |
|---------|-----------------|-----------------|
| Admin role | `service_role` | `project_admin` |
| App user | `supabase_admin` | `postgres` |
| Default port | `54322` | `5432` |
| JWT claim key | `request.jwt.claim.sub` | `request.jwt.claim.sub` |

The anonymous (`anon`) and authenticated (`authenticated`) roles are identical across both platforms.

## Snapshot Utilities

The `insforge-test/utils` module provides utilities for sanitizing query results for snapshot testing. These helpers replace dynamic values (IDs, UUIDs, dates, hashes) with stable placeholders, making snapshots deterministic.

```ts
import { snapshot } from 'insforge-test/utils';

const result = await db.any('SELECT * FROM users');
expect(snapshot(result)).toMatchSnapshot();
```

See [`pgsql-test` Snapshot Utilities](https://www.npmjs.com/package/pgsql-test#snapshot-utilities) for the full API reference.
