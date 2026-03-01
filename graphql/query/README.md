# `@constructive-io/graphql-query`

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-query"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fquery%2Fpackage.json"/></a>
</p>

> Browser-safe GraphQL query generation core for PostGraphile schemas. Build type-safe queries, mutations, and introspection pipelines — at runtime or build time.

## Installation

```sh
npm install @constructive-io/graphql-query
```

## Overview

This package is the **canonical source** for PostGraphile query generation logic. It provides:

- **Query generators** — `buildSelect`, `buildFindOne`, `buildCount` for read operations
- **Mutation generators** — `buildPostGraphileCreate`, `buildPostGraphileUpdate`, `buildPostGraphileDelete`
- **Introspection pipeline** — `inferTablesFromIntrospection` to convert a GraphQL schema into `CleanTable` metadata
- **AST builders** — low-level `getAll`, `getMany`, `getOne`, `createOne`, `patchOne`, `deleteOne`
- **Client utilities** — `TypedDocumentString`, `execute`, `DataError` for type-safe execution and error handling
- **Naming helpers** — server-aware inflection functions that respect PostGraphile's schema naming

All modules are **browser-safe** (no Node.js APIs). `@constructive-io/graphql-codegen` depends on this package for the core logic and adds Node.js-only features (CLI, file output, watch mode).

---

## Quick Start: Generate Queries from a Schema

The most common workflow: introspect a GraphQL schema, then generate queries and mutations for any table.

### Step 1 — Introspect

```ts
import {
  inferTablesFromIntrospection,
  SCHEMA_INTROSPECTION_QUERY,
} from '@constructive-io/graphql-query';

// Fetch introspection from any GraphQL endpoint
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: SCHEMA_INTROSPECTION_QUERY }),
});
const { data } = await response.json();

// Convert to CleanTable metadata
const tables = inferTablesFromIntrospection(data);
// tables = [{ name: 'User', fields: [...], relations: {...}, query: {...}, inflection: {...} }, ...]
```

### Step 2 — Generate a SELECT query

```ts
import { buildSelect } from '@constructive-io/graphql-query';

const userTable = tables.find(t => t.name === 'User')!;
const query = buildSelect(userTable, tables);

console.log(query.toString());
```

**Generated GraphQL:**

```graphql
query getUsersQuery(
  $first: Int
  $last: Int
  $after: Cursor
  $before: Cursor
  $offset: Int
  $condition: UserCondition
  $filter: UserFilter
  $orderBy: [UsersOrderBy!]
) {
  users(
    first: $first
    last: $last
    offset: $offset
    after: $after
    before: $before
    condition: $condition
    filter: $filter
    orderBy: $orderBy
  ) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
      startCursor
    }
    nodes {
      id
      name
      email
      createdAt
    }
  }
}
```

### Step 3 — Generate mutations

```ts
import {
  buildPostGraphileCreate,
  buildPostGraphileUpdate,
  buildPostGraphileDelete,
} from '@constructive-io/graphql-query';

const createQuery = buildPostGraphileCreate(userTable, tables);
const updateQuery = buildPostGraphileUpdate(userTable, tables);
const deleteQuery = buildPostGraphileDelete(userTable, tables);
```

**Generated CREATE mutation:**

```graphql
mutation createUserMutation($input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      name
      email
      createdAt
    }
  }
}
```

**Generated UPDATE mutation:**

```graphql
mutation updateUserMutation($input: UpdateUserInput!) {
  updateUser(input: $input) {
    user {
      id
      name
      email
      createdAt
    }
  }
}
```

**Generated DELETE mutation:**

```graphql
mutation deleteUserMutation($input: DeleteUserInput!) {
  deleteUser(input: $input) {
    clientMutationId
  }
}
```

---

## Nested Relations

Include related tables in your query with automatic Connection wrapping for hasMany relations:

```ts
import { buildSelect } from '@constructive-io/graphql-query';

const actionTable = tables.find(t => t.name === 'Action')!;

const query = buildSelect(actionTable, tables, {
  fieldSelection: {
    select: ['id', 'name', 'photo', 'title'],
    include: {
      actionResults: ['id', 'actionId'],  // hasMany → wrapped in nodes { ... }
      category: true,                      // belongsTo → direct nesting
    },
  },
});
```

**Generated GraphQL:**

```graphql
query actionsQuery {
  actions {
    totalCount
    nodes {
      id
      name
      photo
      title
      actionResults(first: 20) {
        nodes {
          id
          actionId
        }
      }
      category {
        id
        name
      }
    }
  }
}
```

> **hasMany** relations are automatically wrapped in the PostGraphile Connection pattern (`nodes { ... }` with a default `first: 20` limit).
> **belongsTo** relations are nested directly.

---

## FindOne Query

```ts
import { buildFindOne } from '@constructive-io/graphql-query';

const findOneQuery = buildFindOne(userTable);
console.log(findOneQuery.toString());
```

**Generated GraphQL:**

```graphql
query getUserQuery($id: UUID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
```

---

## Count Query

```ts
import { buildCount } from '@constructive-io/graphql-query';

const countQuery = buildCount(userTable);
console.log(countQuery.toString());
```

**Generated GraphQL:**

```graphql
query getUsersCountQuery(
  $condition: UserCondition
  $filter: UserFilter
) {
  users(condition: $condition, filter: $filter) {
    totalCount
  }
}
```

---

## Field Selection

Control which fields and relations are included using presets or custom selection:

```ts
import { buildSelect } from '@constructive-io/graphql-query';

// Preset: just id + a few display fields
const minimal = buildSelect(userTable, tables, { fieldSelection: 'minimal' });

// Preset: all scalar fields (no relations)
const allFields = buildSelect(userTable, tables, { fieldSelection: 'all' });

// Preset: everything including relations
const full = buildSelect(userTable, tables, { fieldSelection: 'full' });

// Custom: pick specific fields + exclude some + include specific relations
const custom = buildSelect(userTable, tables, {
  fieldSelection: {
    select: ['id', 'name', 'email'],
    exclude: ['internalNotes'],
    include: { posts: ['id', 'title'] },
  },
});
```

---

## Relation Field Mapping (Aliases)

Remap relation field names when the server-side name differs from what your consumer expects:

```ts
const query = buildSelect(userTable, tables, {
  relationFieldMap: {
    contact: 'contactByOwnerId',   // emits: contact: contactByOwnerId { ... }
    internalNotes: null,           // omits this relation entirely
  },
});
```

---

## Type-Safe Execution

```ts
import { createGraphQLClient } from '@constructive-io/graphql-query';

const client = createGraphQLClient({
  url: '/graphql',
  headers: { Authorization: `Bearer ${token}` },
});

const { data, errors } = await client.execute(query, {
  first: 10,
  filter: { name: { includesInsensitive: 'search' } },
});
```

---

## Error Handling

```ts
import { DataError, parseGraphQLError, DataErrorType } from '@constructive-io/graphql-query';

try {
  const result = await client.execute(createQuery, { input: { user: { name: 'Alice' } } });
  if (result.errors) {
    const error = parseGraphQLError(result.errors[0]);
    if (error.type === DataErrorType.UNIQUE_VIOLATION) {
      console.log('Duplicate entry:', error.constraintName);
    }
  }
} catch (err) {
  if (err instanceof DataError) {
    console.log(err.type, err.message);
  }
}
```

---

## Server-Aware Naming

All generators automatically use server-inferred names from introspection when available, falling back to local inflection conventions:

```ts
import {
  toCamelCaseSingular,
  toCamelCasePlural,
  toCreateMutationName,
  toPatchFieldName,
  toFilterTypeName,
} from '@constructive-io/graphql-query';

// Uses table.query/table.inflection if available, falls back to convention
toCamelCaseSingular('DeliveryZone', table);   // "deliveryZone" (from table.inflection.tableFieldName)
toCamelCasePlural('DeliveryZone', table);     // "deliveryZones" (from table.query.all)
toCreateMutationName('User', table);          // "createUser" (from table.query.create)
toPatchFieldName('User', table);              // "userPatch" (from table.query.patchFieldName)
toFilterTypeName('User', table);              // "UserFilter" (from table.inflection.filterType)
```

---

## Architecture

```
GraphQL Schema (introspection or _meta)
        |
        v
  inferTablesFromIntrospection()
        |
        v
  CleanTable[] (normalized metadata with inflection + query names)
        |
        v
  buildSelect / buildFindOne / buildCount / buildPostGraphileCreate / ...
        |
        v
  gql-ast (AST node factories)
        |
        v
  graphql print() -> query string
        |
        v
  TypedDocumentString (type-safe wrapper)
```

### Package Relationship

```
@constructive-io/graphql-query  (this package — browser-safe core)
        |
        v
@constructive-io/graphql-codegen  (Node.js CLI — depends on graphql-query)
  + CLI entry points
  + File output (writes .ts files to disk)
  + Watch mode
  + Database introspection
  + React Query hook generation
  + Babel codegen templates
```

---

## API Reference

### Generators

| Function | Description |
|---|---|
| `buildSelect(table, allTables, options?)` | Build a paginated SELECT query with filters, sorting, field selection |
| `buildFindOne(table, pkField?)` | Build a single-row query by primary key |
| `buildCount(table)` | Build a count query with optional condition/filter |
| `buildPostGraphileCreate(table, allTables, options?)` | Build a CREATE mutation |
| `buildPostGraphileUpdate(table, allTables, options?)` | Build an UPDATE mutation |
| `buildPostGraphileDelete(table, allTables, options?)` | Build a DELETE mutation |

### Introspection

| Function | Description |
|---|---|
| `inferTablesFromIntrospection(data, options?)` | Convert GraphQL introspection to `CleanTable[]` |
| `transformSchemaToOperations(types, queryType, mutationType)` | Extract operations from schema types |
| `SCHEMA_INTROSPECTION_QUERY` | Full introspection query string |

### Client

| Export | Description |
|---|---|
| `TypedDocumentString` | Type-safe GraphQL document wrapper (compatible with codegen client) |
| `createGraphQLClient(options)` | Create a typed GraphQL client |
| `execute(url, query, variables, options?)` | Execute a GraphQL query |
| `DataError` | Structured error class with PG SQLSTATE classification |
| `parseGraphQLError(error)` | Parse raw GraphQL error into `DataError` |

### Naming Helpers

| Function | Description |
|---|---|
| `toCamelCaseSingular(name, table?)` | Server-aware singular name |
| `toCamelCasePlural(name, table?)` | Server-aware plural name |
| `toCreateMutationName(name, table?)` | Create mutation operation name |
| `toUpdateMutationName(name, table?)` | Update mutation operation name |
| `toDeleteMutationName(name, table?)` | Delete mutation operation name |
| `toPatchFieldName(name, table?)` | Patch field name in update input |
| `toFilterTypeName(name, table?)` | Filter type name |
| `toOrderByEnumValue(fieldName)` | Convert field name to OrderBy enum value |
| `normalizeInflectionValue(value, fallback)` | Safe inflection value lookup |

### Types

| Type | Description |
|---|---|
| `CleanTable` | Normalized table metadata with fields, relations, inflection, query names |
| `CleanField` | Field with type info, `isNotNull`, `hasDefault` |
| `QueryOptions` | Options for `buildSelect` (pagination, filters, field selection, relation mapping) |
| `MutationOptions` | Options for mutation builders |
| `FieldSelection` | Field selection presets and custom configuration |
| `ConnectionResult<T>` | Relay-style connection result type |
| `Filter` | PostGraphile connection filter type |
