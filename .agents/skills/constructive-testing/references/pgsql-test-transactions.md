---
name: pgsql-test-transactions
description: Transaction-local context, the beforeAll gotcha, and PostgreSQL role patterns for RLS testing. Use when debugging "context lost" errors, getting RLS failures in beforeAll, or choosing between pg and db for test operations.
---

# Transaction-Local Context & Role Patterns

## The `set_config(..., true)` Contract

`pgsql-test`'s `setContext()` uses `set_config('key', 'value', true)` internally. The third parameter `true` makes the setting **transaction-local** — it only persists within the current transaction.

This works transparently inside test bodies (`it()` blocks) because `beforeEach()` calls `db.begin()` + `db.savepoint()`, creating an active transaction. But in `beforeAll()`, there is no active transaction by default.

## The `beforeAll` Gotcha

**Symptom:** You call `setContext()` and then a query, but the query runs without any JWT context — leading to RLS violations or `current_setting()` returning NULL.

**Root cause:** Without an active transaction, each `db.query()` runs in auto-commit mode. The `ctxQuery()` call (which executes `set_config`) runs in one implicit transaction that immediately commits, and the actual query runs in a separate implicit transaction where the context no longer exists.

**Fix — wrap `beforeAll` operations in explicit transactions:**

```typescript
beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());

  // pg operations auto-commit — no transaction needed
  await pg.query(`CREATE TABLE ...`);
  await pg.query(`INSERT INTO users ...`);

  // db operations NEED an explicit transaction for context to persist
  await db.begin();
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': ADMIN_ID });
  await db.query(`INSERT INTO app.teams (...) VALUES (...)`);  // context persists!
  await db.query(`INSERT INTO app.members (...) VALUES (...)`); // still works!
  await db.commit();
});
```

**Without `db.begin()`:**
```typescript
// WRONG — context lost between queries in auto-commit mode
db.setContext({ role: 'authenticated', 'jwt.claims.user_id': ADMIN_ID });
await db.query(`INSERT INTO app.teams (...) VALUES (...)`);  // ERROR: no context
```

## Role Patterns for RLS Testing

PostgreSQL supports multiple roles with different privilege levels. `pgsql-test` gives you `pg` (superuser) and `db` (app-level) to test against them:

| Role | Client | Bypasses RLS? | Fires Triggers? | When to use |
|------|--------|---------------|-----------------|-------------|
| **superuser** | `pg` | Yes | Yes | Schema setup, DDL, seed data in `beforeAll` |
| **administrator** | `db` + `setContext({ role: 'administrator' })` | Yes (`BYPASSRLS`) | Yes | Elevated data ops that should still exercise triggers |
| **authenticated** | `db` + `setContext({ role: 'authenticated', ... })` | No (full RLS) | Yes | All test queries — this is what real users experience |

### Why Use `db` with an Elevated Role Instead of `pg` for Data Operations

Triggers and FK constraints fire for every role, superuser included. What differs is privileges: the superuser (`pg`) skips every grant check. `administrator` is created with `BYPASSRLS`, so it also skips RLS, but it still goes through table and function grants. Using `db` with `administrator` therefore:
- Runs on the same connection as the rest of the test, so no cross-connection visibility issues
- Verifies that your grant/privilege setup actually works

Neither tests your RLS policies: only `authenticated` (or another `NOBYPASSRLS` role) does.

```typescript
// Superuser — bypasses RLS, may hide policy bugs
await pg.query(`INSERT INTO app.posts (owner_id, title) VALUES ($1, 'test')`, [ALICE_ID]);

// Elevated role via db — same connection, grants are tested (RLS still bypassed)
db.setContext({ role: 'administrator' });
await db.query(`INSERT INTO app.posts (owner_id, title) VALUES ($1, 'test')`, [ALICE_ID]);
```

### Switching Roles Mid-Test

```typescript
it('admin seeds, user reads', async () => {
  // Elevated operation
  db.setContext({ role: 'administrator' });
  await db.query(`INSERT INTO app.posts (owner_id, title) VALUES ($1, 'Admin Post')`, [ALICE_ID]);

  // Switch to user — RLS now enforced
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': ALICE_ID });
  const rows = await db.any('SELECT * FROM app.posts');
  expect(rows.length).toBeGreaterThan(0);
});
```

## `pg` vs `db` Quick Reference

| Operation | Use `pg`? | Use `db`? | Notes |
|-----------|-----------|-----------|-------|
| CREATE TABLE, DDL | ✓ | | Superuser needed for schema changes |
| Seed reference/lookup data | ✓ | | Bootstrap data in `beforeAll` |
| Catalog/information_schema queries | ✓ | | Read-only, no RLS concern |
| Insert data that triggers should process | | ✓ (elevated role) | Ensures triggers fire and side effects happen |
| Grant permissions | | ✓ (elevated role) | Validates grant setup works |
| Test queries (what users see) | | ✓ (authenticated) | RLS must be enforced |

## Common Pitfalls

### 1. Forgetting `db.begin()` in `beforeAll`
Context is transaction-local. Without `begin()`, `setContext()` has no effect on subsequent queries. This is the #1 cause of "my context disappeared" bugs.

### 2. Cross-connection deadlock
Never mix `pg` and `db` in the same test body when both are inside savepoints. Both have separate transactions — data locked by one blocks the other indefinitely. Use `db` with an elevated role for in-test seeding instead.

### 3. Assuming `pg` tests real behavior
`pg` bypasses RLS, so tests using `pg` for data operations won't catch broken policies. Use `pg` only for setup/DDL, and `db` for everything you want to actually test.
