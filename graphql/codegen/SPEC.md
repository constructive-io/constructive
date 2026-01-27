# GraphQL Codegen ORM - Technical Specification

This document specifies the design and behavior of the ORM-style GraphQL SDK generator.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Type System Design](#type-system-design)
4. [Select Type Safety](#select-type-safety)
5. [Generated Code Structure](#generated-code-structure)
6. [API Reference](#api-reference)
7. [Testing Requirements](#testing-requirements)

---

## Overview

The GraphQL Codegen ORM generates a Prisma-like TypeScript SDK from a GraphQL schema. It provides:

- **Type-safe queries and mutations** with full IntelliSense support
- **Select-based field selection** that infers return types from the select object
- **Fluent API** with `.execute()`, `.unwrap()`, and `.unwrapOr()` methods
- **Query inspection** via `.toGraphQL()` for debugging

### Design Goals

1. **Type Safety**: Compile-time validation of all operations
2. **Developer Experience**: Autocomplete, type inference, clear error messages
3. **Zero Runtime Overhead**: All type checking happens at compile time
4. **GraphQL Fidelity**: Generated queries match the schema exactly

---

## Architecture

### Code Generation Pipeline

```
GraphQL Schema (endpoint or .graphql file)
    │
    ▼
┌─────────────────────────────────────┐
│  Schema Introspection               │
│  - Parse types, fields, relations   │
│  - Identify tables vs custom ops    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Code Generation                    │
│  - input-types.ts (types + filters) │
│  - select-types.ts (utilities)      │
│  - models/*.ts (table models)       │
│  - query/index.ts (custom queries)  │
│  - mutation/index.ts (custom muts)  │
│  - index.ts (createClient factory)  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Output Formatting (prettier)       │
└─────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Schema Source | `src/cli/introspect/source.ts` | Fetch schema from endpoint or file |
| Table Inference | `src/cli/introspect/infer-tables.ts` | Identify tables from schema |
| Input Types Generator | `src/cli/codegen/orm/input-types-generator.ts` | Generate TypeScript types |
| Model Generator | `src/cli/codegen/orm/model-generator.ts` | Generate table model classes |
| Custom Ops Generator | `src/cli/codegen/orm/custom-ops-generator.ts` | Generate query/mutation operations |
| Client Generator | `src/cli/codegen/orm/client-generator.ts` | Generate runtime utilities |

---

## Type System Design

### Entity Types

For each GraphQL type (table), we generate:

```typescript
// The entity interface (matches GraphQL type)
export interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  createdAt: string | null;
  // ... all fields
}

// Entity with relations (includes related entities)
export interface UserWithRelations extends User {
  posts?: PostConnection;
  profile?: Profile | null;
  // ... all relations
}
```

### Select Types

For each entity, we generate a select type that defines what fields can be selected:

```typescript
export type UserSelect = {
  id?: boolean;
  username?: boolean;
  displayName?: boolean;
  createdAt?: boolean;
  // Relation fields allow nested select
  posts?: boolean | {
    select?: PostSelect;
    first?: number;
    // ... pagination args
  };
  profile?: boolean | {
    select?: ProfileSelect;
  };
};
```

### Filter Types

PostGraphile filter types for `where` clauses:

```typescript
export type UserFilter = {
  id?: UUIDFilter;
  username?: StringFilter;
  createdAt?: DatetimeFilter;
  // Logical operators
  and?: UserFilter[];
  or?: UserFilter[];
  not?: UserFilter;
};
```

### Payload Types (for Mutations)

Custom mutations return payload types:

```typescript
export interface SignInPayload {
  clientMutationId?: string | null;
  apiToken?: ApiToken | null;
}

export type SignInPayloadSelect = {
  clientMutationId?: boolean;
  apiToken?: boolean | {
    select?: ApiTokenSelect;
  };
};
```

---

## Select Type Safety

### Requirements

The select system MUST enforce these invariants:

1. **Only valid fields**: Selecting a field that doesn't exist in the schema MUST produce a TypeScript error
2. **Nested validation**: Invalid fields in nested selects MUST also produce errors
3. **Mixed field handling**: Invalid fields MUST be caught even when mixed with valid fields
4. **Permissive for valid cases**: Empty selects, boolean shorthand, and omitting select entirely MUST work

### The Problem: TypeScript's Excess Property Checking

TypeScript has a quirk where excess property checking behaves differently depending on context:

```typescript
type UserSelect = { id?: boolean; name?: boolean; };

// ERROR: TypeScript catches this (only invalid field)
const a: UserSelect = { invalid: true };

// NO ERROR: TypeScript allows this (valid + invalid mixed)
function fn<T extends UserSelect>(s: T) {}
fn({ id: true, invalid: true }); // Compiles!
```

This is because:
1. Direct assignment uses "freshness" checking
2. Generic type parameters use structural subtyping
3. An object with extra optional properties is still a valid subtype

### Solution: DeepExact Utility Type

We use a recursive type that explicitly rejects excess keys:

```typescript
/**
 * Recursively validates select objects, rejecting unknown keys.
 * Returns `never` if any excess keys are found at any nesting level.
 */
export type DeepExact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? {
        [K in keyof T]: K extends keyof Shape
          ? T[K] extends { select: infer NS }
            ? Shape[K] extends { select?: infer ShapeNS }
              ? { select: DeepExact<NS, NonNullable<ShapeNS>> }
              : T[K]
            : T[K]
          : never
      }
    : never  // Has excess keys at this level
  : never;   // Doesn't extend Shape at all
```

**How it works:**

1. `T extends Shape` - Basic structural check
2. `Exclude<keyof T, keyof Shape> extends never` - Check for excess keys
3. If excess keys exist, return `never` (causes type error)
4. For nested `{ select: ... }` objects, recursively apply validation

### Application in Generated Code

The `DeepExact` type is applied in function signatures:

```typescript
// Table model methods
findMany<const S extends UserSelect>(
  args?: FindManyArgs<DeepExact<S, UserSelect>, UserFilter, UsersOrderBy>
): QueryBuilder<...>

// Custom mutations
signIn<const S extends SignInPayloadSelect>(
  args: SignInVariables,
  options?: { select?: DeepExact<S, SignInPayloadSelect> }
): QueryBuilder<...>
```

### Expected Behavior

```typescript
// MUST ERROR: Invalid nested field
db.mutation.signIn(
  { input: { email: 'e', password: 'p' } },
  { select: { apiToken: { select: { refreshToken: true } } } }
  //                                 ~~~~~~~~~~~~ Error!
);

// MUST ERROR: Invalid field mixed with valid
db.user.findMany({
  select: { id: true, invalid: true }
  //                  ~~~~~~~ Error!
});

// MUST WORK: Valid fields only
db.user.findMany({
  select: { id: true, username: true }
});

// MUST WORK: Empty select (returns all fields)
db.user.findMany({ select: {} });

// MUST WORK: No select parameter
db.user.findMany({ where: { id: { equalTo: '123' } } });

// MUST WORK: Boolean shorthand for relations
db.mutation.signIn(
  { input: { email: 'e', password: 'p' } },
  { select: { apiToken: true } }
);
```

---

## Generated Code Structure

### Output Directory Layout

```
generated-orm/
├── index.ts              # createClient factory, re-exports
├── client.ts             # OrmClient class, QueryResult types
├── query-builder.ts      # QueryBuilder class, document builders
├── select-types.ts       # Type utilities (DeepExact, InferSelectResult, etc.)
├── input-types.ts        # All TypeScript types (entities, filters, inputs)
├── types.ts              # Scalar type mappings
├── models/
│   ├── user.ts           # UserModel class
│   ├── post.ts           # PostModel class
│   └── ...               # One file per table
├── query/
│   └── index.ts          # Custom query operations
└── mutation/
    └── index.ts          # Custom mutation operations
```

### createClient Factory

```typescript
export function createClient(config: OrmClientConfig) {
  const client = new OrmClient(config);
  return {
    // Table models
    user: new UserModel(client),
    post: new PostModel(client),
    // ...

    // Custom operations
    query: createQueryOperations(client),
    mutation: createMutationOperations(client),
  };
}
```

### Table Model Class

```typescript
export class UserModel {
  constructor(private client: OrmClient) {}

  findMany<const S extends UserSelect>(
    args?: FindManyArgs<DeepExact<S, UserSelect>, UserFilter, UsersOrderBy>
  ): QueryBuilder<{ users: ConnectionResult<InferSelectResult<UserWithRelations, S>> }> {
    // Build GraphQL document and return QueryBuilder
  }

  findFirst<const S extends UserSelect>(
    args?: FindFirstArgs<DeepExact<S, UserSelect>, UserFilter>
  ): QueryBuilder<{ users: { nodes: InferSelectResult<UserWithRelations, S>[] } }> {
    // ...
  }

  create<const S extends UserSelect>(
    args: CreateArgs<DeepExact<S, UserSelect>, CreateUserInput['user']>
  ): QueryBuilder<{ createUser: { user: InferSelectResult<UserWithRelations, S> } }> {
    // ...
  }

  update<const S extends UserSelect>(
    args: UpdateArgs<DeepExact<S, UserSelect>, UserFilter, UserPatch>
  ): QueryBuilder<{ updateUser: { user: InferSelectResult<UserWithRelations, S> } }> {
    // ...
  }

  delete(args: DeleteArgs<UserFilter>): QueryBuilder<{ deleteUser: { deletedUserId: string } }> {
    // ...
  }
}
```

### QueryBuilder Class

```typescript
export class QueryBuilder<TResult> {
  constructor(private config: QueryBuilderConfig) {}

  // Get the generated GraphQL query string
  toGraphQL(): string { ... }

  // Execute and return discriminated union
  async execute(): Promise<QueryResult<TResult>> { ... }

  // Execute and throw on error
  async unwrap(): Promise<TResult> { ... }

  // Execute with fallback on error
  async unwrapOr<D>(defaultValue: D): Promise<TResult | D> { ... }
}
```

### InferSelectResult Type

Maps the select object to the result type:

```typescript
export type InferSelectResult<TEntity, TSelect> = TSelect extends undefined
  ? TEntity
  : {
      [K in keyof TSelect as TSelect[K] extends false | undefined ? never : K]:
        TSelect[K] extends true
          ? K extends keyof TEntity
            ? TEntity[K]
            : never
          : TSelect[K] extends { select: infer NestedSelect }
            ? K extends keyof TEntity
              ? InferSelectResult<NonNullable<TEntity[K]>, NestedSelect>
              : never
            : K extends keyof TEntity
              ? TEntity[K]
              : never;
    };
```

---

## API Reference

### Client Configuration

```typescript
interface OrmClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}
```

### QueryResult (Discriminated Union)

```typescript
type QueryResult<T> =
  | { ok: true; data: T; errors: undefined }
  | { ok: false; data: null; errors: GraphQLError[] };
```

### FindManyArgs

```typescript
interface FindManyArgs<TSelect, TWhere, TOrderBy> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  offset?: number;
}
```

### ConnectionResult

```typescript
interface ConnectionResult<T> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}
```

---

## Testing Requirements

### Type-Level Tests

The following scenarios MUST produce TypeScript compile errors:

1. **Invalid field in select** (top-level)
2. **Invalid field in nested select**
3. **Invalid field mixed with valid fields**
4. **Invalid field in relation select**
5. **Typo in field name**

### Type-Level Tests (Must Compile)

The following scenarios MUST compile successfully:

1. **All valid fields**
2. **Subset of valid fields**
3. **Empty select object**
4. **No select parameter**
5. **Boolean shorthand for relations**
6. **Nested select with valid fields**
7. **Deep nesting (3+ levels)**

### Runtime Tests

1. **Execute returns correct data structure**
2. **Error handling works (execute, unwrap, unwrapOr)**
3. **Generated GraphQL matches expected format**
4. **Variables are correctly passed**
5. **Pagination parameters work**
6. **Filters work correctly**

### Integration Tests

1. **Full flow: createClient -> query -> execute**
2. **Authentication flow with token refresh**
3. **Complex nested queries**
4. **Mutation with optimistic updates**

---

## Appendix: TypeScript Behavior Notes

### Why `const` Type Parameters?

The `const` modifier on type parameters (TypeScript 5.0+) enables:

1. **Literal type inference**: `{ id: true }` is inferred as `{ id: true }` not `{ id: boolean }`
2. **Precise select tracking**: We know exactly which fields were selected
3. **Accurate return types**: The result type only includes selected fields

### Why Structural Typing Allows Excess Properties

TypeScript uses structural typing, meaning a type is compatible if it has at least the required properties. For optional properties, an object with extra properties is still a valid subtype:

```typescript
type A = { x?: number };
type B = { x?: number; y: string };
// B extends A is true, because B has all of A's properties
```

This is why we need `DeepExact` to explicitly check for and reject excess keys.

### Error Message Quality

When `DeepExact` rejects a select object, TypeScript produces errors like:

- `Type 'true' is not assignable to type 'never'`
- `Object literal may only specify known properties`

These are not the most intuitive, but they do indicate the location of the invalid field.
