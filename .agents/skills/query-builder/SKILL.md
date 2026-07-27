---
name: query-builder
description: "AST-backed PostgreSQL query builder — fluent API for SELECT/INSERT/UPDATE/DELETE with SDK-style JSON where filters, expression helpers, JOINs, CTEs, ON CONFLICT, RETURNING, parameterized values. Uses pg-ast + pgsql-deparser. Use when building parameterized SQL queries, writing test helpers, or working with TableClient in constructive-test."
metadata:
  author: constructive-io
  version: "2.1.0"
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
  .where({ active: { equalTo: true } })
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
  .where({ age: { greaterThan: 18 } })
  .where({ status: { equalTo: 'active' } })    // multiple .where() = AND
  .distinct()
  .groupBy(['department'])
  .having({ order_count: { greaterThan: 5 } })
  .orderBy('name', 'ASC', 'FIRST')
  .limit(10)
  .offset(20)
  .build();
```

## WHERE Filters (SDK JSON style)

`.where()` and `.having()` take the same JSON filter shape as the generated ORM/SDK clients:

```typescript
new QueryBuilder()
  .table('jobs')
  .select(['id'])
  .where({
    status: { in: ['queued', 'retry'] },
    attempts: { lessThan: 5 },
    completed_at: { isNull: true },
    or: [
      { priority: { greaterThan: 0 } },
      { escalated: { equalTo: true } },
    ],
  })
  .build();
```

Field operators: `equalTo`, `notEqualTo`, `lessThan`, `lessThanOrEqualTo`, `greaterThan`, `greaterThanOrEqualTo`, `in`, `notIn` (array or subquery `QueryBuilder`), `isNull` (true/false), `distinctFrom`, `notDistinctFrom`, `like`, `notLike`, `likeInsensitive`, `notLikeInsensitive`, plus pattern sugar `includes`, `startsWith`, `endsWith` (and `not*` / `*Insensitive` variants).

Combinators: `and: [...]`, `or: [...]`, `not: {...}` — nest arbitrarily. Unknown operators and empty `in` arrays throw at build time.

Operands can be plain values (parameterized), expressions (`col()`, `fn()`), or subqueries:

```typescript
.where({ updated_at: { lessThan: fn('now') }, a: { equalTo: col('b') } })
.where({ team_id: { in: subQueryBuilder } })
```

## Expression Predicates and Helpers

`.where()` / `.having()` also accept expressions directly, for predicates JSON can't express (column-to-column, arithmetic, function calls). Filters and expressions mix freely and AND-combine:

```typescript
import {
  add, and, col, eq, fn, gt, gte, isNotNull, isNull,
  lit, lt, lte, neq, not, or, param, sub, mul, div,
} from '@constructive-io/query-builder';

new QueryBuilder()
  .table('jobs')
  .select(['id'])
  .where(and(
    lte(col('attempts'), col('max_attempts')),
    or(gt(col('priority'), 5), isNull(col('locked_at')))
  ))
  .build();

new QueryBuilder()
  .table('orders')
  .select(['customer_id'])
  .groupBy(['customer_id'])
  .having(gt(fn('sum', [col('total')]), 1000))
  .build();
```

Helpers: `eq/neq/lt/lte/gt/gte` (comparisons), `add/sub/mul/div` (arithmetic), `isNull/isNotNull`, `and/or/not`, `cast` (type casts). All accept plain values (auto-parameterized) or expressions.

### Type casts — `cast(operand, typeName)`

`cast()` emits a `TypeCast` node. The type name accepts anything `format_type()` produces: typmods (`numeric(10,2)`), array suffix (`text[]`), multi-word SQL-standard names (`timestamp with time zone` — mapped to their `pg_catalog` aliases), and `schema.type` qualification:

```typescript
import { cast, col, lit } from '@constructive-io/query-builder';

new QueryBuilder()
  .table('apis')
  .select([])
  .selectExpr('raw_id', cast(col('id'), 'text'))
  .build();
// SELECT id::text AS raw_id FROM apis

new QueryBuilder()
  .table('apis')
  .insert({ id: cast(lit('00000000-…'), 'uuid'), labels: cast(lit('{}'), 'text[]') })
  .build();
// INSERT INTO apis (id, labels) VALUES ('00000000-…'::uuid, CAST('{}' AS text[]))
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
  .insert([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ])
  .build();

// Values may be expressions
new QueryBuilder()
  .table('jobs')
  .insert({ name: 'job-1', created_at: fn('now') })
  .returning(['id'])
  .build();

// Upsert (ON CONFLICT)
new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .onConflict({
    columns: ['email'],
    action: 'update',
    updateColumns: { name: 'Alice Updated' },   // values may be Exprs
    where: { locked: { equalTo: false } },       // optional JSON filter
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
  .where({ id: { equalTo: userId } })
  .returning(['*'])
  .build();

// SET values accept expressions:
new QueryBuilder()
  .table('jobs')
  .update({ attempts: add(col('attempts'), 1), updated_at: fn('now') })
  .where({ completed_at: { isNull: true } })
  .returning(['id', { expr: fn('lower', [col('name')]), as: 'name_lower' }])
  .build();
```

### DELETE
```typescript
new QueryBuilder()
  .table('users')
  .delete()
  .where({ expired: { equalTo: true } })
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
  .where({ 'orders.total': { greaterThan: 100 } })
  .build();
// Also: .rightJoin(), .fullJoin()
```

### CTEs (WITH clauses)
```typescript
const activeCte = new QueryBuilder()
  .table('users')
  .select(['id', 'name'])
  .where({ active: { equalTo: true } });

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

// Result alias for a stable row key
new QueryBuilder()
  .call('rollup_compute_daily', { day: '2026-01-01' }, { schema: 'private', as: 'result' })
  .build();
// => SELECT private.rollup_compute_daily(day => $1) AS result

// Named args accept expressions (col/param/lit/fn)
new QueryBuilder()
  .schema('priv')
  .call('secrets_get', { owner_id: col('s.owner_id'), default_value: lit(null) })
  .build();
// => SELECT priv.secrets_get(owner_id => s.owner_id, default_value => NULL)

// Set-returning: SELECT columns FROM fn(...)
new QueryBuilder()
  .select(['id', 'name'])
  .call('get_users', [])
  .build();
// => SELECT id, name FROM get_users()

// Computed function-call column over a base table
new QueryBuilder()
  .schema('priv')
  .table('secrets', 's')
  .select(['s.name'])
  .selectCall('decrypted_value', 'secrets_get', { secret_name: col('s.name') }, { schema: 'priv' })
  .build();
// => SELECT s.name, priv.secrets_get(secret_name => s.name) AS decrypted_value FROM priv.secrets AS s
```

## Key Implementation Details

- **AST node wrapping**: `relation` in INSERT/UPDATE/DELETE uses unwrapped `ast.rangeVar()`, while `fromClause` arrays in SELECT use wrapped `nodes.rangeVar()`.
- **Auto-parameterization**: All values become `ParamRef` nodes (`$1`, `$2`, ...) — values are never inlined into SQL.
- **Deparser output**: `deparseSync()` produces pretty-printed multiline SQL. Tests should use flexible regex patterns with `\s*` for whitespace matching.
- **NULL handling**: `.where({ col: { isNull: true } })` produces `col IS NULL`; `{ isNull: false }` produces `col IS NOT NULL` (no parameterization for NULL).
- **JOIN ON conditions**: besides the 4-arg column form, joins accept a `Filter` or `Expr`: `.innerJoin('customers', and(eq(col('o.customer_id'), col('customers.id')), eq(col('customers.region'), 'us')))` or `.leftJoin('customers', { 'c.active': { equalTo: true } }, { schema: 'crm', alias: 'c' })`.
- **Set-returning functions**: `.fromFunction('get_rows', [7], { schema: 'app', as: 'r' })` → `SELECT ... FROM app.get_rows($1) AS r`; joins/where/order compose over it like a table.
- **ORDER BY / GROUP BY expressions**: `.orderBy(fn('lower', [col('name')]), 'DESC')` and `.groupBy([fn('date_trunc', [lit('day'), col('created_at')])])`.
- **Cloning**: builders are mutable; `.clone()` copies configured state so `base.clone().where(...)` never mutates `base`.

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
