---
name: pgsql-test-seeding
description: Seed test databases with pgsql-test using loadJson, loadSql, and loadCsv. Use when asked to "seed test data", "load fixtures", "populate test database", or when setting up test data for database tests.
compatibility: pgsql-test, Jest/Vitest, PostgreSQL
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Seeding Test Databases with pgsql-test

Load test data efficiently using loadJson, loadSql, and loadCsv methods. Create maintainable, realistic test fixtures.

## When to Apply

Use this skill when:
- Setting up test data for database tests
- Loading fixtures from JSON, SQL, or CSV files
- Seeding data that respects or bypasses RLS
- Creating per-test or shared test data

## Seeding Methods Overview

| Method | Best For | RLS Behavior |
|--------|----------|--------------|
| `loadJson()` | Inline data, small datasets | Respects RLS (use `pg` to bypass) |
| `loadSql()` | Complex data, version-controlled fixtures | Respects RLS (use `pg` to bypass) |
| `loadCsv()` | Large datasets, spreadsheet exports | Bypasses RLS (uses COPY) |

## Seed Once per File with Seed Adapters

The second argument to `getConnections()` is a list of seed adapters. They run once, before any test, and are committed, so every per-test rollback returns to the seeded state:

```typescript
import { getConnections, seed } from 'pgsql-test';

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections({}, [
    seed.pgpm(),                                     // deploy the pgpm module in cwd (the default when no list is passed)
    seed.sqlfile([path.join(__dirname, 'fixtures/seed.sql')]),
    seed.json({ 'app.users': [{ id: USER_ID, email: 'alice@example.com' }] }),
    seed.csv({ 'app.categories': path.join(__dirname, 'fixtures/categories.csv') }),
    seed.fn(async ({ pg }) => {
      await pg.query(`SELECT setval('app.categories_id_seq', (SELECT max(id) FROM app.categories))`);
    })
  ]));
});
```

`seed.pgpm(cwd?, cache?)` deploys a pgpm module or workspace (`db.loadPgpm()` is the same at runtime). Calling `pg.load*()` in `beforeAll`, as in the sections below, gives the same once-per-file result because those statements auto-commit.

## Seeding with loadJson()

Best for inline test data. Clean, readable, and type-safe.

```typescript
import { getConnections, PgTestClient } from 'pgsql-test';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Seed using superuser to bypass RLS
  await pg.loadJson({
    'app.users': [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'alice@example.com',
        name: 'Alice'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'bob@example.com',
        name: 'Bob'
      }
    ],
    'app.posts': [
      {
        id: 'post-1',
        title: 'First Post',
        owner_id: '550e8400-e29b-41d4-a716-446655440001'
      },
      {
        id: 'post-2',
        title: 'Second Post',
        owner_id: '550e8400-e29b-41d4-a716-446655440002'
      }
    ]
  });
});

afterAll(async () => {
  await teardown();
});
```

**Key features:**
- Schema-qualified table names: `'app.users'`
- Explicit UUIDs for referential integrity
- Multiple tables in one call
- Order matters for foreign keys

## Seeding with loadSql()

Best for complex data or version-controlled fixtures.

Create `__tests__/fixtures/seed.sql`:
```sql
-- Insert users
INSERT INTO app.users (id, email, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'alice@example.com', 'Alice'),
  ('550e8400-e29b-41d4-a716-446655440002', 'bob@example.com', 'Bob'),
  ('550e8400-e29b-41d4-a716-446655440003', 'charlie@example.com', 'Charlie');

-- Insert posts with foreign key references
INSERT INTO app.posts (id, title, owner_id) VALUES
  ('post-1', 'Alice Post 1', '550e8400-e29b-41d4-a716-446655440001'),
  ('post-2', 'Alice Post 2', '550e8400-e29b-41d4-a716-446655440001'),
  ('post-3', 'Bob Post', '550e8400-e29b-41d4-a716-446655440002');
```

Load in tests:
```typescript
import path from 'path';

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  await pg.loadSql([
    path.join(__dirname, 'fixtures/seed.sql')
  ]);
});
```

**Multiple SQL files:**
```typescript
await pg.loadSql([
  path.join(__dirname, 'fixtures/users.sql'),
  path.join(__dirname, 'fixtures/posts.sql'),
  path.join(__dirname, 'fixtures/comments.sql')
]);
```

Files execute in order, so put parent tables first.

## Seeding with loadCsv()

Best for large datasets or spreadsheet exports.

Create `__tests__/fixtures/users.csv`:
```csv
id,email,name
550e8400-e29b-41d4-a716-446655440001,alice@example.com,Alice
550e8400-e29b-41d4-a716-446655440002,bob@example.com,Bob
550e8400-e29b-41d4-a716-446655440003,charlie@example.com,Charlie
```

Load in tests:
```typescript
import path from 'path';

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  await pg.loadCsv({
    'app.users': path.join(__dirname, 'fixtures/users.csv'),
    'app.posts': path.join(__dirname, 'fixtures/posts.csv')
  });
});
```

**Important:** `loadCsv()` uses PostgreSQL's COPY command, which bypasses RLS. Always use `pg` (superuser) client for CSV loading.

## Combining Seeding Strategies

Mix methods based on data characteristics:

```typescript
beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // 1. Load large reference data from CSV
  await pg.loadCsv({
    'app.categories': path.join(__dirname, 'fixtures/categories.csv')
  });

  // 2. Load complex relationships from SQL
  await pg.loadSql([
    path.join(__dirname, 'fixtures/users-with-roles.sql')
  ]);

  // 3. Add test-specific data inline
  await pg.loadJson({
    'app.posts': [
      { title: 'Test Post', owner_id: testUserId, category_id: 1 }
    ]
  });
});
```

## Per-Test Seeding

When different tests need different data, seed in `beforeEach()`:

```typescript
beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await pg.beforeEach();
  await db.beforeEach();
});

afterEach(async () => {
  await db.afterEach();
  await pg.afterEach();
});

describe('empty state tests', () => {
  it('handles no data gracefully', async () => {
    const result = await db.query('SELECT COUNT(*) FROM app.posts');
    expect(result.rows[0].count).toBe('0');
  });
});

describe('populated state tests', () => {
  // Seed on the client you assert with: rows pg writes inside its own test
  // transaction are invisible to db until pg commits.
  beforeEach(async () => {
    db.setContext({ role: 'administrator' });
    await db.loadJson({
      'app.posts': [
        { title: 'Test Post', owner_id: userId }
      ]
    });
  });

  it('finds existing posts', async () => {
    const result = await db.query('SELECT COUNT(*) FROM app.posts');
    expect(result.rows[0].count).toBe('1');
  });
});
```

## RLS-Aware Seeding

When testing RLS, seed with the appropriate client:

```typescript
// Bypass RLS for setup (use pg)
await pg.loadJson({
  'app.posts': [{ title: 'Admin Post', owner_id: adminId }]
});

// Respect RLS for user operations (use db with context)
db.setContext({
  role: 'authenticated',
  'request.jwt.claim.sub': userId
});

await db.loadJson({
  'app.posts': [{ title: 'User Post', owner_id: userId }]
});
```

## Fixture Organization

Recommended structure:
```text
__tests__/
├── fixtures/
│   ├── users.csv
│   ├── posts.csv
│   ├── seed.sql
│   └── complex-scenario.sql
├── users.test.ts
├── posts.test.ts
└── rls.test.ts
```

## Best Practices

1. **Use explicit IDs**: Makes referential integrity predictable
2. **Order by dependencies**: Parent tables before child tables
3. **Keep fixtures minimal**: Only seed what tests need
4. **Use `pg` for setup**: Bypass RLS during seeding
5. **Use `db` for testing**: Enforce RLS during assertions
6. **Version control fixtures**: SQL/CSV files in repo

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Foreign key violation | Load parent tables first |
| RLS blocking inserts | Use `pg` client instead of `db` |
| CSV format errors | Ensure headers match column names |
| Data persists between tests | Check beforeEach/afterEach hooks |

## References

- Related skill: `pgsql-test-rls` for RLS testing patterns
- Related skill: `pgsql-test-exceptions` for handling errors
- Related skill: `pgpm` (`references/testing.md`) for general test setup
