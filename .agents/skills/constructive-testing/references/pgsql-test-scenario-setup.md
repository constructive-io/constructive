---
name: pgsql-test-scenario-setup
description: Structuring complex test scenarios with proper isolation, transaction management, and multi-client patterns. Use when building complex RLS test scenarios, managing test isolation, or implementing multi-client database test patterns.
---

Structuring complex test scenarios with proper isolation, transaction management, and multi-client patterns.

## Overview

Complex RLS and database tests often require careful setup: creating users, seeding data, and testing access patterns. This skill covers the patterns for structuring these scenarios with proper test isolation.

## The Two-Client Pattern

The `getConnections()` function returns multiple clients with different privilege levels:

```typescript
import { getConnections, PgTestClient } from 'pgsql-test';

let db: PgTestClient;  // App-level client (RLS-enforced)
let pg: PgTestClient;  // Superuser client (bypasses RLS)
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());
});

afterAll(() => teardown());
```

### When to Use Each Client

**Use `pg` (superuser) for:**
- Test setup that needs to bypass RLS
- Creating test users and seed data
- Administrative operations
- Verifying data exists regardless of RLS

**Use `db` (app-level) for:**
- Testing actual RLS behavior
- Simulating real application queries
- Verifying access control works correctly

### Example: RLS Test Setup

```typescript
const TEST_USER_1 = '00000000-0000-0000-0000-000000000001';
const TEST_USER_2 = '00000000-0000-0000-0000-000000000002';

beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());

  // Use pg (superuser) to create test users - bypasses RLS
  await pg.query(
    `INSERT INTO users (id, username) VALUES ($1, 'user1') ON CONFLICT DO NOTHING`,
    [TEST_USER_1]
  );
  await pg.query(
    `INSERT INTO users (id, username) VALUES ($1, 'user2') ON CONFLICT DO NOTHING`,
    [TEST_USER_2]
  );

  // Create test data owned by user 1
  await pg.query(
    `INSERT INTO documents (owner_id, title) VALUES ($1, 'User 1 Doc')`,
    [TEST_USER_1]
  );
});

// Now test RLS with db client
it('user 1 can see their documents', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': TEST_USER_1 });
  const docs = await db.any('SELECT * FROM documents');
  expect(docs.length).toBe(1);
});

it('user 2 cannot see user 1 documents', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': TEST_USER_2 });
  const docs = await db.any('SELECT * FROM documents');
  expect(docs.length).toBe(0);
});
```

## Transaction Management

### Test Isolation with beforeEach/afterEach

Each test runs in its own transaction that rolls back after the test:

```typescript
beforeEach(async () => {
  await db.beforeEach();  // BEGIN + SAVEPOINT
});

afterEach(async () => {
  await db.afterEach();   // ROLLBACK TO SAVEPOINT + COMMIT
});
```

This ensures tests don't affect each other - any data created during a test is rolled back.

### What beforeEach/afterEach Do

```typescript
// db.beforeEach() executes:
await this.begin();      // BEGIN transaction
await this.savepoint();  // SAVEPOINT "lqlsavepoint"

// db.afterEach() executes:
await this.rollback();   // ROLLBACK TO SAVEPOINT "lqlsavepoint"
await this.commit();     // COMMIT (the outer transaction)
```

## The publish() Method

When you need data created in one client to be visible to another client (or to persist beyond the current transaction), use `publish()`:

```typescript
it('cross-connection visibility', async () => {
  // Create data with db client
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': USER_ID });
  await db.query(`INSERT INTO items (name) VALUES ('test item')`);

  // Data is not yet visible to pg client (different connection)
  let pgItems = await pg.any('SELECT * FROM items WHERE name = $1', ['test item']);
  expect(pgItems.length).toBe(0);

  // Publish makes data visible to other connections
  await db.publish();

  // Now pg can see it
  pgItems = await pg.any('SELECT * FROM items WHERE name = $1', ['test item']);
  expect(pgItems.length).toBe(1);
});
```

### What publish() Does

```typescript
// db.publish() executes:
await this.commit();     // Make data visible to other sessions
await this.begin();      // Start fresh transaction
await this.savepoint();  // Maintain rollback harness
await this.ctxQuery();   // Reapply setContext() settings
```

## Setup Patterns

### Pattern 1: Simple Setup in beforeAll

For tests that share the same seed data:

```typescript
beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());

  // Seed data once
  await pg.query(`INSERT INTO users (id, name) VALUES ($1, 'Alice')`, [USER_ID]);
});

afterAll(() => teardown());

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
```

### Pattern 2: Setup That Needs RLS Context

`pg` statements in `beforeAll` auto-commit, so `db` sees them immediately. `setContext()` is transaction-local, so setup that runs *as a user* needs an explicit transaction:

```typescript
beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());

  // Auto-committed, visible to db
  await pg.query(`INSERT INTO users (id, name) VALUES ($1, 'Alice')`, [USER_1]);
  await pg.query(`INSERT INTO users (id, name) VALUES ($1, 'Bob')`, [USER_2]);

  // Setup that runs as a user, committed so every test sees it
  await db.begin();
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': USER_1 });
  // ... additional setup with RLS context
  await db.commit();
});
```

### Pattern 3: Per-Describe Setup

Data a `describe` block's `beforeAll` writes with auto-committed `pg` queries stays for the rest of the file, including later blocks:

```typescript
describe('Admin scenarios', () => {
  let adminId: string;

  beforeAll(async () => {
    // Create admin user for this describe block
    const result = await pg.one<{ id: string }>(
      `INSERT INTO users (name, is_admin) VALUES ('Admin', true) RETURNING id`
    );
    adminId = result.id;
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  it('admin can see all data', async () => {
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': adminId });
    // ...
  });
});
```

### Pattern 4: Per-Describe Fixtures That Roll Back

To share fixtures across one block's tests and remove them afterwards, hold a transaction open for the block with a named savepoint, and give each test its own inner savepoint. Jest runs outer hooks for nested tests too, so keep the file-level `beforeEach()`/`afterEach()` in a sibling `describe`: around this block they would commit its transaction:

```typescript
describe('with a group-only admin', () => {
  beforeAll(async () => {
    await db.begin();
    db.setContext({ role: 'administrator' });
    await db.query(`INSERT INTO users (id, name, is_admin) VALUES ($1, 'Admin', true)`, [ADMIN_ID]);
    await db.savepoint('group');
  });
  afterAll(async () => {
    await db.rollback('group');
    await db.query('ROLLBACK');
  });
  beforeEach(() => db.savepoint('test'));
  afterEach(() => db.rollback('test'));

  it('sees the admin', async () => { /* ... */ });
});
```

## Scenario Testing Pattern

For testing complex workflows with multiple actors:

```typescript
describe('Organization membership scenarios', () => {
  const OWNER_ID = '00000000-0000-0000-0000-000000000001';
  const MEMBER_ID = '00000000-0000-0000-0000-000000000002';
  let orgId: string;

  beforeAll(async () => {
    ({ db, pg, teardown } = await getConnections());

    // Create test users
    await pg.query(`INSERT INTO users (id, name) VALUES ($1, 'Owner')`, [OWNER_ID]);
    await pg.query(`INSERT INTO users (id, name) VALUES ($1, 'Member')`, [MEMBER_ID]);
  });

  afterAll(() => teardown());
  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  it('owner creates organization', async () => {
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': OWNER_ID });

    const result = await db.one<{ id: string }>(
      `INSERT INTO organizations (name) VALUES ('Acme') RETURNING id`
    );
    orgId = result.id;

    expect(orgId).toBeDefined();
  });

  it('owner can add members', async () => {
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': OWNER_ID });

    // First recreate the org (previous test rolled back)
    const org = await db.one<{ id: string }>(
      `INSERT INTO organizations (name) VALUES ('Acme') RETURNING id`
    );

    await db.query(
      `INSERT INTO memberships (org_id, user_id) VALUES ($1, $2)`,
      [org.id, MEMBER_ID]
    );

    const members = await db.any(
      `SELECT * FROM memberships WHERE org_id = $1`,
      [org.id]
    );
    expect(members.length).toBe(1);
  });
});
```

## Best Practices

1. Use `pg` for setup, `db` for testing RLS behavior
2. Always call `beforeEach()`/`afterEach()` for test isolation
3. Use `publish()` when data needs to be visible across connections
4. Keep test user IDs as constants for consistency
5. Structure complex scenarios with clear beforeAll setup
6. Remember that each test's changes are rolled back - don't depend on previous test state
7. Use descriptive test names that explain the scenario being tested
