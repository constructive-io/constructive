# query-spec

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
  <a href="https://www.npmjs.com/package/query-spec">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fquery-spec%2Fpackage.json"/>
  </a>
</p>

The Constructive query language specification. One shared grammar for filters, ordering, and pagination — used by the generated GraphQL SDK/ORM clients, the PostGraphile connection filters, and the SQL query builder, so the same `where` JSON means the same thing at every layer of the stack.

## Install

```sh
npm install query-spec
```

## The filter grammar

Sibling keys AND together; `or`/`not` introduce disjunction and negation, nestable arbitrarily:

```ts
import type { Filter } from 'query-spec';

const where: Filter = {
  status: { in: ['queued', 'retry'] },
  attempts: { lessThan: 5 },
  completed_at: { isNull: true },
  or: [
    { priority: { greaterThan: 0 } },
    { escalated: { equalTo: true } },
  ],
};
```

The same shape works in a generated SDK client (`api.jobs.findMany({ where })`) and in the SQL query builder (`new QueryBuilder().table('jobs').where(where)`).

### Operand generics

`Filter`, `FieldFilter`, and `RelationalFilter` are generic over the operand type, so each layer constrains what a field may be compared against:

```ts
import type { Filter } from 'query-spec';

type JsonFilter = Filter<string | number | boolean | null>; // SDK layer
type SqlFilter = Filter<SqlValue | Expr | QueryBuilder>;    // SQL layer
```

### Operators

| Group | Operators |
|-------|-----------|
| Null check | `isNull` |
| Comparison | `equalTo`, `notEqualTo`, `lessThan`, `lessThanOrEqualTo`, `greaterThan`, `greaterThanOrEqualTo` |
| Distinct | `distinctFrom`, `notDistinctFrom` |
| List membership | `in`, `notIn` |
| LIKE | `like`, `notLike`, `likeInsensitive`, `notLikeInsensitive` |
| Pattern sugar | `includes`, `startsWith`, `endsWith` (+ `not*` / `*Insensitive` variants) |
| Case-insensitive | `equalToInsensitive`, `notEqualToInsensitive`, `distinctFromInsensitive`, `notDistinctFromInsensitive`, `inInsensitive`, `notInInsensitive` |
| Array | `contains`, `containedBy`, `overlaps` |
| PostGIS | `intersects`, `within`, `touches`, `covers`, `bboxIntersects2D`, ... |

Each group is exported both as a `const` array (for runtime validation) and a string-literal union type:

```ts
import {
  FILTER_OPERATORS,        // readonly string[] of every operator
  COMPARISON_FILTER_OPERATORS,
  isFilterOperator,        // (op: string) => op is FilterOperator
  isLogicalOperator,       // 'and' | 'or' | 'not'
} from 'query-spec';

isFilterOperator('equalTo');  // true
isFilterOperator('bogus');    // false
```

### Relational filters

GraphQL/ORM layers filter on related records with `every` / `some` / `none`:

```ts
const where: Filter = {
  tags: { some: { name: { startsWith: 'infra' } } },
};
```

(The SQL layer expresses the same thing with joins or `{ in: subquery }`.)

## Ordering and pagination

```ts
import type { OrderByItem, PageInfo, ConnectionResult } from 'query-spec';

const orderBy: OrderByItem[] = [{ field: 'name', direction: 'asc' }];

const page: ConnectionResult<{ id: string }> = {
  nodes: [{ id: '1' }],
  totalCount: 1,
  pageInfo: { hasNextPage: false, hasPreviousPage: false },
};
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Filter<TOperand>` | The main nestable filter shape (`and`/`or`/`not` + field filters) |
| `FieldFilter<TOperand>` | Operator → operand map for a single field |
| `RelationalFilter<TOperand>` | `every`/`some`/`none` filters on related records |
| `FilterOperator` | Union of every supported operator |
| `LogicalOperator` | `'and' \| 'or' \| 'not'` |
| `OrderByItem`, `OrderDirection` | Ordering specification |
| `PageInfo`, `ConnectionResult<T>` | Relay-style pagination shapes |

### Runtime

| Export | Description |
|--------|-------------|
| `FILTER_OPERATORS` | All operators as a readonly array |
| `NULL_FILTER_OPERATORS`, `COMPARISON_FILTER_OPERATORS`, `DISTINCT_FILTER_OPERATORS`, `LIST_FILTER_OPERATORS`, `LIKE_FILTER_OPERATORS`, `PATTERN_FILTER_OPERATORS`, `INSENSITIVE_FILTER_OPERATORS`, `ARRAY_FILTER_OPERATORS`, `POSTGIS_FILTER_OPERATORS` | Operator groups |
| `LOGICAL_OPERATORS` | `['and', 'or', 'not']` |
| `isFilterOperator(op)` | Type-guard for `FilterOperator` |
| `isLogicalOperator(op)` | Type-guard for `LogicalOperator` |

## Related

* [`@constructive-io/query-builder`](https://www.npmjs.com/package/@constructive-io/query-builder) — AST-backed SQL builder consuming this grammar for `WHERE`/`HAVING`
* [`@constructive-io/graphql-codegen`](https://www.npmjs.com/package/@constructive-io/graphql-codegen) — generates SDK/ORM clients whose `where` arguments conform to this grammar
