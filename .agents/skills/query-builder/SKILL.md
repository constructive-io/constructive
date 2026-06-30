---
name: query-builder
description: "AST-backed PostgreSQL query builder — fluent API for SELECT/INSERT/UPDATE/DELETE with JOINs, CTEs, ON CONFLICT, RETURNING, parameterized values. Uses pg-ast + pgsql-deparser. Use when building parameterized SQL queries, writing test helpers, or working with TableClient in constructive-test."
metadata:
  author: constructive-io
  version: "1.0.0"
---

# @constructive-io/query-builder

AST-backed PostgreSQL query builder located at `postgres/query-builder/`. Uses `pg-ast` node constructors + `pgsql-deparser` to generate parameterized SQL from typed AST nodes.

## When to Apply

Use this skill when:
- Building parameterized SQL queries programmatically
- Writing test helpers that need safe SQL generation
- Working with `TableClient` in `constructive-test`
- Constructing complex queries with JOINs, CTEs, ON CONFLICT, etc.

## Core API

```typescript
import { QueryBuilder } from '@constructive-io/query-builder';

// Every .build() returns { text: string, values: SqlValue[] }
const { text, values } = new QueryBuilder()
  .schema('app_public')        // optional schema qualification
  .table('users')
  .select(['id', 'name'])
  .where('active', '=', true)
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(20)
  .build();

// Use with PgTestClient:
const rows = await db.any(text, values);
```

## Statement Types

### SELECT
```typescript
new QueryBuilder()
  .table('users')
  .select(['id', 'name', 'email'])
  .where('age', '>', 18)
  .where('status', '=', 'active')    // multiple .where() = AND
  .distinct()
  .groupBy(['department'])
  .having('COUNT(*)', '>', 5)
  .orderBy('name', 'ASC', 'NULLS FIRST')
  .limit(10)
  .offset(20)
  .build();
```

### INSERT
```typescript
// Single row
new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .returning(['id'])
  .build();

// Multi-row
new QueryBuilder()
  .table('users')
  .insertMany([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ])
  .build();

// Upsert (ON CONFLICT)
new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .onConflict({
    columns: ['email'],
    action: 'update',
    updateColumns: { name: 'Alice Updated' },
  })
  .returning(['id'])
  .build();

// ON CONFLICT DO NOTHING
new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice' })
  .onConflict({ columns: ['email'], action: 'nothing' })
  .build();
```

### UPDATE
```typescript
new QueryBuilder()
  .table('users')
  .update({ name: 'Alice Updated', status: 'inactive' })
  .where('id', '=', userId)
  .returning(['*'])
  .build();
```

### DELETE
```typescript
new QueryBuilder()
  .table('users')
  .delete()
  .where('expired', '=', true)
  .returning(['id'])
  .build();
```

### JOINs
```typescript
new QueryBuilder()
  .table('orders')
  .select(['orders.id', 'customers.name', 'products.title'])
  .innerJoin('customers', 'orders.customer_id', '=', 'customers.id')
  .leftJoin('products', 'orders.product_id', '=', 'products.id')
  .where('orders.total', '>', 100)
  .build();
// Also: .rightJoin(), .fullJoin()
```

### CTEs (WITH clauses)
```typescript
const activeCte = new QueryBuilder()
  .table('users')
  .select(['id', 'name'])
  .where('active', '=', true);

new QueryBuilder()
  .with('active_users', activeCte)
  .table('active_users')
  .select(['*'])
  .build();

// Recursive CTE
new QueryBuilder()
  .withRecursive('tree', recursiveSubquery)
  .table('tree')
  .select(['*'])
  .build();
```

### Function/Procedure Calls
```typescript
// Positional args
new QueryBuilder()
  .call('my_function', [42, 'test'])
  .build();
// => SELECT my_function($1, $2)

// Named args (uses => syntax)
new QueryBuilder()
  .schema('auth')
  .call('authenticate', { email: 'alice@example.com', password: 'secret' })
  .build();
// => SELECT auth.authenticate(email => $1, password => $2)

// With column selection
new QueryBuilder()
  .call('get_users', [], ['id', 'name'])
  .build();
// => SELECT id, name FROM get_users()
```

## Key Implementation Details

- **AST node wrapping**: `relation` in INSERT/UPDATE/DELETE uses unwrapped `ast.rangeVar()`, while `fromClause` arrays in SELECT use wrapped `nodes.rangeVar()`.
- **Auto-parameterization**: All values become `ParamRef` nodes (`$1`, `$2`, ...) — values are never inlined into SQL.
- **Deparser output**: `deparseSync()` produces pretty-printed multiline SQL. Tests should use flexible regex patterns with `\s*` for whitespace matching.
- **NULL handling**: `.where('col', 'IS', null)` produces `col IS NULL` (no parameterization for NULL).

## TableClient Integration

`TableClient` in `constructive-test` wraps `QueryBuilder` for single-table operations:

```typescript
import { TableClient } from 'constructive-test';

const tc = new TableClient(db, 'app_public', 'users');
await tc.insert({ name: 'Alice' });
const user = await tc.findOne<User>({ id: userId });
const users = await tc.findMany({ where: { active: true }, orderBy: 'name', limit: 10 });
await tc.upsert({ name: 'Alice', email: 'alice@example.com' }, ['email'], { name: 'Updated' });
await tc.update({ status: 'inactive' }, { id: userId });
await tc.delete({ expired: true });
```

## Dependencies

- `pg-ast` (workspace) — AST node constructors
- `pgsql-deparser` ^17.18.3 — SQL generation from AST nodes
