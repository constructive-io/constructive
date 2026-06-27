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
- Full support for: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`, `CTE`, `ON CONFLICT`, `RETURNING`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`/`OFFSET`, `DISTINCT`, function/procedure calls

## Usage

### SELECT

```ts
import { QueryBuilder } from '@constructive-io/query-builder';

const { text, values } = new QueryBuilder()
  .table('users')
  .select(['id', 'name', 'email'])
  .where('age', '>', 18)
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
  .where('id', '=', 1)
  .build();

// text: UPDATE users SET name = $1 WHERE id = $2
// values: ['Alice Updated', 1]
```

### DELETE

```ts
const { text, values } = new QueryBuilder()
  .table('users')
  .delete()
  .where('id', '=', 1)
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
  .where('active', '=', true);

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
```

### Additional clauses

```ts
// GROUP BY + HAVING
new QueryBuilder()
  .table('orders')
  .select(['customer_id', 'SUM(total) AS total'])
  .groupBy(['customer_id'])
  .having('SUM(total)', '>', 1000)
  .build();

// ORDER BY with NULLS
new QueryBuilder()
  .table('users')
  .select(['*'])
  .orderBy('name', 'ASC', 'NULLS FIRST')
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
| `.insert(data)` | Build an INSERT with `{ column: value }` pairs |
| `.insertMany(rows)` | Build a multi-row INSERT |
| `.update(data)` | Build an UPDATE with `{ column: value }` SET pairs |
| `.delete()` | Build a DELETE |
| `.where(col, op, val)` | Add a WHERE condition (AND-combined) |
| `.innerJoin(table, leftCol, op, rightCol)` | INNER JOIN |
| `.leftJoin(table, leftCol, op, rightCol)` | LEFT JOIN |
| `.rightJoin(table, leftCol, op, rightCol)` | RIGHT JOIN |
| `.fullJoin(table, leftCol, op, rightCol)` | FULL JOIN |
| `.orderBy(col, dir?, nulls?)` | ORDER BY clause |
| `.groupBy(columns)` | GROUP BY clause |
| `.having(col, op, val)` | HAVING clause |
| `.limit(n)` | LIMIT clause |
| `.offset(n)` | OFFSET clause |
| `.distinct()` | SELECT DISTINCT |
| `.returning(columns)` | RETURNING clause |
| `.onConflict(opts)` | ON CONFLICT (DO NOTHING or DO UPDATE) |
| `.with(name, subquery)` | CTE (WITH clause) |
| `.withRecursive(name, subquery)` | Recursive CTE |
| `.call(fnName, args?, columns?)` | Function/procedure call |
| `.build()` | Returns `{ text: string, values: SqlValue[] }` |
| `.toSQL()` | Returns just the SQL string |

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
  .where('active', '=', true)
  .build();

const rows = await db.any(text, values);
```

## Running Tests

```sh
pnpm test
pnpm test:watch
```
