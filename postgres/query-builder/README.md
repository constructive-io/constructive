# @constructive-io/query-builder

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
  <a href="https://www.npmjs.com/package/@constructive-io/query-builder">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fquery-builder%2Fpackage.json"/>
  </a>
</p>

AST-backed PostgreSQL query builder powered by `pg-ast` and `pgsql-deparser`. Builds parameterized SQL from typed AST nodes — no string concatenation, no manual escaping.

## Install

```sh
npm install @constructive-io/query-builder
```

## Features

- All SQL generated from `pg-ast` AST nodes, deparsed via `pgsql-deparser`
- Auto-parameterized values (`$1`, `$2`, ...) with a separate `values` array
- Fluent, chainable API
- SDK-style JSON filters for `WHERE`/`HAVING` (`{ status: { equalTo: 'active' } }`), matching the generated ORM/SDK filter grammar
- Composable expressions (`col()`, `fn()`, `add()`, `eq()`, ...) usable in SELECT, WHERE, SET, ON CONFLICT, and RETURNING
- Full support for: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`, `CTE`, `ON CONFLICT`, `RETURNING`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`/`OFFSET`, `DISTINCT`, function/procedure calls

## Usage

### SELECT

```ts
import { QueryBuilder } from '@constructive-io/query-builder';

const { text, values } = new QueryBuilder()
  .table('users')
  .select(['id', 'name', 'email'])
  .where({ age: { greaterThan: 18 } })
  .limit(10)
  .build();

// text:
// SELECT
//   id,
//   name,
//   email
// FROM users
// WHERE
//   age > $1
// LIMIT 10
//
// values: [18]
```

### WHERE filters (SDK JSON style)

`.where()` takes the same JSON filter shape as the generated ORM/SDK clients. Multiple `.where()` calls AND-combine.

```ts
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

// WHERE status IN ($1, $2) AND attempts < $3
//   AND completed_at IS NULL
//   AND (priority > $4 OR escalated = $5)
```

Supported field operators:

| Operator | SQL |
|----------|-----|
| `equalTo` / `notEqualTo` | `=` / `<>` |
| `lessThan` / `lessThanOrEqualTo` | `<` / `<=` |
| `greaterThan` / `greaterThanOrEqualTo` | `>` / `>=` |
| `in` / `notIn` | `IN (...)` / `NOT IN (...)` (array or subquery) |
| `isNull: true` / `isNull: false` | `IS NULL` / `IS NOT NULL` |
| `distinctFrom` / `notDistinctFrom` | `IS DISTINCT FROM` / `IS NOT DISTINCT FROM` |
| `like` / `notLike` | `LIKE` / `NOT LIKE` |
| `likeInsensitive` / `notLikeInsensitive` | `ILIKE` / `NOT ILIKE` |
| `includes`, `startsWith`, `endsWith` (+ `not*` / `*Insensitive` variants) | `LIKE`/`ILIKE` with auto `%` patterns |

Boolean combinators: `and: [...]`, `or: [...]`, `not: {...}` — nest arbitrarily. Unknown operators and empty `in` arrays throw at build time.

Operands can be plain values (parameterized), expressions, or subqueries:

```ts
// Column-to-column and function comparisons
import { col, fn } from '@constructive-io/query-builder';

new QueryBuilder()
  .table('jobs')
  .select(['id'])
  .where({
    updated_at: { lessThan: fn('now') },
    a: { equalTo: col('b') },
  })
  .build();

// Subqueries
const teamIds = new QueryBuilder()
  .table('teams')
  .select(['id'])
  .where({ active: { equalTo: true } });

new QueryBuilder()
  .table('users')
  .select(['id'])
  .where({ team_id: { in: teamIds } })
  .build();
```

### Expression predicates

`.where()` / `.having()` also accept expressions directly, for predicates the JSON grammar can't express (column-to-column, arithmetic, function calls). Filters and expressions mix freely and AND-combine:

```ts
import {
  and, or, not, eq, neq, lt, lte, gt, gte,
  isNull, isNotNull, col, fn,
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

### INSERT with RETURNING

```ts
const { text, values } = new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .returning(['id'])
  .build();

// text:
// INSERT INTO users (
//   name,
//   email
// ) VALUES
//   ($1, $2) RETURNING id
//
// values: ['Alice', 'alice@example.com']
```

### UPDATE

```ts
const { text, values } = new QueryBuilder()
  .table('users')
  .update({ name: 'Alice Updated' })
  .where({ id: { equalTo: 1 } })
  .build();

// text: UPDATE users SET name = $1 WHERE id = $2
// values: ['Alice Updated', 1]
```

SET values accept expressions too:

```ts
import { add, col, fn } from '@constructive-io/query-builder';

new QueryBuilder()
  .table('jobs')
  .update({
    attempts: add(col('attempts'), 1),
    updated_at: fn('now'),
  })
  .where({ completed_at: { isNull: true } })
  .returning(['id'])
  .build();

// UPDATE jobs SET attempts = attempts + $1, updated_at = now()
// WHERE completed_at IS NULL RETURNING id
```

### DELETE

```ts
const { text, values } = new QueryBuilder()
  .table('users')
  .delete()
  .where({ id: { equalTo: 1 } })
  .build();

// text: DELETE FROM users WHERE id = $1
// values: [1]
```

### ON CONFLICT (upsert)

```ts
const { text, values } = new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .onConflict({
    columns: ['email'],
    action: 'update',
    updateColumns: { name: 'Alice Updated' },
  })
  .returning(['id'])
  .build();

// text:
// INSERT INTO users (
//   name,
//   email
// ) VALUES
//   ($1, $2) ON CONFLICT (email) DO UPDATE SET
//   name = $3 RETURNING id
//
// values: ['Alice', 'alice@example.com', 'Alice Updated']
```

`updateColumns` values accept expressions, and `where` accepts a JSON filter:

```ts
import { add, col } from '@constructive-io/query-builder';

new QueryBuilder()
  .table('counters')
  .insert({ key: 'k', count: 1 })
  .onConflict({
    columns: ['key'],
    action: 'update',
    updateColumns: { count: add(col('counters.count'), col('excluded.count')) },
    where: { locked: { equalTo: false } },
  })
  .build();
```

### RETURNING expressions

`.returning()` accepts column names or aliased expressions:

```ts
import { col, fn } from '@constructive-io/query-builder';

new QueryBuilder()
  .table('users')
  .insert({ name: 'Alice' })
  .returning(['id', { expr: fn('lower', [col('name')]), as: 'name_lower' }])
  .build();

// INSERT INTO users (name) VALUES ($1) RETURNING id, lower(name) AS name_lower
```

### JOINs

```ts
const { text, values } = new QueryBuilder()
  .table('orders')
  .select(['orders.id', 'customers.name'])
  .innerJoin('customers', 'orders.customer_id', '=', 'customers.id')
  .build();

// text:
// SELECT
//   orders.id,
//   customers.name
// FROM orders
// JOIN customers ON orders.customer_id = customers.id
```

Supported join types: `.innerJoin()`, `.leftJoin()`, `.rightJoin()`, `.fullJoin()`.

### CTEs (WITH clauses)

```ts
const activeCte = new QueryBuilder()
  .table('users')
  .select(['id', 'name'])
  .where({ active: { equalTo: true } });

const { text, values } = new QueryBuilder()
  .with('active_users', activeCte)
  .table('active_users')
  .select(['*'])
  .build();

// text:
// WITH
//   active_users AS (SELECT
//     id,
//     name
//   FROM users
//   WHERE
//     active = $1)
// SELECT *
// FROM active_users
//
// values: [true]
```

Use `.withRecursive('name', subquery)` for recursive CTEs.

### Schema-qualified tables

```ts
const { text } = new QueryBuilder()
  .schema('app_public')
  .table('users')
  .select(['id', 'name'])
  .build();

// text:
// SELECT
//   id,
//   name
// FROM app_public.users
```

### Function calls

```ts
// Positional args
const { text, values } = new QueryBuilder()
  .call('my_function', [42, 'test'])
  .build();
// text: SELECT my_function($1, $2)
// values: [42, 'test']

// Named args
const { text, values } = new QueryBuilder()
  .schema('auth')
  .call('authenticate', { email: 'alice@example.com', password: 'secret' })
  .build();
// text: SELECT auth.authenticate(email => $1, password => $2)
// values: ['alice@example.com', 'secret']

// Result alias — rows come back under a stable key instead of the function name
const { text } = new QueryBuilder()
  .call('rollup_compute_daily', { day: '2026-01-01' }, { schema: 'private', as: 'result' })
  .build();
// text: SELECT private.rollup_compute_daily(day => $1) AS result
```

Named args accept expressions (`col()`, `param()`, `lit()`, `fn()`) as well as plain values:

```ts
import { col, lit, param } from '@constructive-io/query-builder';

new QueryBuilder()
  .schema('priv')
  .call('secrets_get', {
    owner_id: col('s.owner_id'),
    ns: param('1111-...'),
    default_value: lit(null),
  })
  .build();
// SELECT priv.secrets_get(owner_id => s.owner_id, ns => $1, default_value => NULL)
```

### Computed SELECT columns

```ts
import { col, fn } from '@constructive-io/query-builder';

new QueryBuilder()
  .schema('priv')
  .table('secrets', 's')
  .select(['s.name'])
  .selectCall('decrypted_value', 'secrets_get', {
    secret_name: col('s.name'),
  }, { schema: 'priv' })
  .build();
// SELECT s.name, priv.secrets_get(secret_name => s.name) AS decrypted_value
// FROM priv.secrets AS s

// Or with an arbitrary expression:
new QueryBuilder()
  .table('t')
  .selectExpr('v', fn('f', { a: param('A'), b: col('t.b') }))
  .build();
```

### Additional clauses

```ts
// GROUP BY + HAVING
new QueryBuilder()
  .table('orders')
  .select(['customer_id'])
  .groupBy(['customer_id'])
  .having({ total: { greaterThan: 1000 } })
  .build();

// ORDER BY with NULLS
new QueryBuilder()
  .table('users')
  .select(['*'])
  .orderBy('name', 'ASC', 'FIRST')
  .build();

// DISTINCT
new QueryBuilder()
  .table('events')
  .select(['type'])
  .distinct()
  .build();

// OFFSET
new QueryBuilder()
  .table('products')
  .select(['*'])
  .limit(10)
  .offset(20)
  .build();
```

## API

### `QueryBuilder`

| Method | Description |
|--------|-------------|
| `.table(name)` | Set the target table |
| `.schema(name)` | Set the schema (e.g. `app_public`) |
| `.select(columns)` | Build a SELECT with given columns (use `['*']` for all) |
| `.selectCall(as, fnName, args?, opts?)` | Append a computed function-call column |
| `.selectExpr(as, expr)` | Append a computed expression column |
| `.insert(data)` | Build an INSERT (single row object or array of rows) |
| `.update(data)` | Build an UPDATE with `{ column: value \| Expr }` SET pairs |
| `.delete()` | Build a DELETE |
| `.where(...predicates)` | JSON filters and/or expressions (AND-combined across calls) |
| `.innerJoin(table, leftCol, op, rightCol)` | INNER JOIN |
| `.leftJoin(table, leftCol, op, rightCol)` | LEFT JOIN |
| `.rightJoin(table, leftCol, op, rightCol)` | RIGHT JOIN |
| `.fullJoin(table, leftCol, op, rightCol)` | FULL JOIN |
| `.orderBy(col, dir?, nulls?)` | ORDER BY clause |
| `.groupBy(columns)` | GROUP BY clause |
| `.having(...predicates)` | HAVING clause (JSON filters and/or expressions) |
| `.limit(n)` | LIMIT clause |
| `.offset(n)` | OFFSET clause |
| `.distinct()` | SELECT DISTINCT |
| `.returning(columns)` | RETURNING clause (column names or `{ expr, as }` items) |
| `.onConflict(opts)` | ON CONFLICT (DO NOTHING or DO UPDATE) |
| `.with(name, subquery)` | CTE (WITH clause) |
| `.withRecursive(name, subquery)` | Recursive CTE |
| `.call(fnName, args?, opts?)` | Function/procedure call; `opts: { schema?, as? }`; args positional array or named record |
| `.build()` | Returns `{ text: string, values: SqlValue[] }` |
| `.toSQL()` | Returns just the SQL string |

### Expression helpers

| Helper | Description |
|--------|-------------|
| `col('t.column')` | Column reference (never parameterized) |
| `param(value)` | Explicitly bound parameter |
| `lit(value)` | Inline literal (e.g. `lit(null)` → `NULL`) |
| `fn(name, args?, opts?)` | Function call expression |
| `eq, neq, lt, lte, gt, gte` | Comparisons |
| `add, sub, mul, div` | Arithmetic |
| `isNull(x), isNotNull(x)` | Null tests |
| `and(...), or(...), not(x)` | Boolean combinators |

All helpers accept plain values (auto-parameterized) or other expressions.

## How it works

The builder constructs `pg-ast` AST nodes (`SelectStmt`, `InsertStmt`, `UpdateStmt`, `DeleteStmt`, etc.) and depars them via `pgsql-deparser`'s `deparseSync()`. All values are replaced with `ParamRef` nodes (`$1`, `$2`, ...) and collected into a separate `values` array for safe parameterized execution.

## Pairs well with `pgsql-test`

```ts
import { getConnections } from 'pgsql-test';
import { QueryBuilder } from '@constructive-io/query-builder';

const { db, teardown } = await getConnections();

const { text, values } = new QueryBuilder()
  .table('users')
  .select(['id', 'name'])
  .where({ active: { equalTo: true } })
  .build();

const rows = await db.any(text, values);
```

## Running Tests

```sh
pnpm test
pnpm test:watch
```
