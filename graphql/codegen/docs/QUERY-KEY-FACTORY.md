# Query Key Factory Design Document

This document describes the centralized query key factory feature for `@constructive-io/graphql-codegen`, following the [lukemorales query-key-factory](https://tanstack.com/query/docs/framework/react/community/lukemorales-query-key-factory) pattern.

## Overview

The query key factory provides:

- **Centralized query keys** - Single source of truth for all React Query cache keys
- **Type-safe key access** - Full TypeScript autocomplete support
- **Hierarchical invalidation** - Invalidate all queries for an entity with one call
- **Mutation key tracking** - Track in-flight mutations for optimistic updates
- **Cache invalidation helpers** - Type-safe utilities for cache management

## Generated Files

When `queryKeys.generateScopedKeys` is enabled (default), the following files are generated:

| File | Purpose |
|------|---------|
| `query-keys.ts` | Centralized query key factories for all entities |
| `mutation-keys.ts` | Mutation key factories for tracking mutations |
| `invalidation.ts` | Type-safe cache invalidation helpers |

## Architecture

### Query Key Structure

Query keys follow a hierarchical pattern:

```typescript
// Entity key factory
export const userKeys = {
  all: ['user'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (variables?: object) => [...userKeys.lists(), variables] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...userKeys.details(), id] as const,
} as const;
```

This enables granular cache invalidation:

```typescript
// Invalidate ALL user queries
queryClient.invalidateQueries({ queryKey: userKeys.all });

// Invalidate only user list queries
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// Invalidate a specific user
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
```

### Mutation Key Structure

Mutation keys track in-flight mutations:

```typescript
export const userMutationKeys = {
  all: ['mutation', 'user'] as const,
  create: () => ['mutation', 'user', 'create'] as const,
  update: (id: string | number) => ['mutation', 'user', 'update', id] as const,
  delete: (id: string | number) => ['mutation', 'user', 'delete', id] as const,
} as const;
```

Usage with `useIsMutating`:

```typescript
import { useIsMutating } from '@tanstack/react-query';

// Check if any user mutations are in progress
const isMutating = useIsMutating({ mutationKey: userMutationKeys.all });

// Check if a specific user is being updated
const isUpdating = useIsMutating({ mutationKey: userMutationKeys.update(userId) });
```

### Invalidation Helpers

Type-safe cache invalidation utilities:

```typescript
export const invalidate = {
  user: {
    all: (queryClient: QueryClient) =>
      queryClient.invalidateQueries({ queryKey: userKeys.all }),
    lists: (queryClient: QueryClient) =>
      queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
    detail: (queryClient: QueryClient, id: string | number) =>
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
  },
};

// Usage
invalidate.user.all(queryClient);
invalidate.user.detail(queryClient, userId);
```

## Configuration

### Config Options

```typescript
// graphql-codegen.config.ts
export default defineConfig({
  queryKeys: {
    // Key structure style (default: 'hierarchical')
    style: 'hierarchical',

    // Entity relationships for cascade invalidation
    relationships: {
      table: { parent: 'database', foreignKey: 'databaseId' },
      field: { parent: 'table', foreignKey: 'tableId' },
    },

    // Generate scope-aware keys (default: true)
    generateScopedKeys: true,

    // Generate cascade invalidation helpers (default: true)
    generateCascadeHelpers: true,

    // Generate mutation keys (default: true)
    generateMutationKeys: true,
  },
});
```

### Relationship Configuration

For parent-child entity relationships, configure the `relationships` option to enable scoped queries and cascade invalidation:

```typescript
relationships: {
  // Child entity -> parent relationship
  database: { parent: 'organization', foreignKey: 'organizationId' },
  table: { parent: 'database', foreignKey: 'databaseId' },
  field: {
    parent: 'table',
    foreignKey: 'tableId',
    ancestors: ['database', 'organization'], // For deep cascade
  },
}
```

This generates scoped key factories:

```typescript
export const tableKeys = {
  all: ['table'] as const,

  // Scoped by parent
  byDatabase: (databaseId: string) => ['table', { databaseId }] as const,

  // Scope-aware helpers
  lists: (scope?: TableScope) => [...tableKeys.scoped(scope), 'list'] as const,
  detail: (id: string | number, scope?: TableScope) =>
    [...tableKeys.details(scope), id] as const,
} as const;
```

## Hook Integration

Generated hooks automatically use centralized keys:

```typescript
// Generated useUsersQuery hook
export function useUsersQuery(variables?: UsersQueryVariables, options?: ...) {
  return useQuery({
    queryKey: userKeys.list(variables),  // Uses centralized key
    queryFn: () => execute(...),
    ...options,
  });
}

// Generated useCreateUserMutation hook
export function useCreateUserMutation(options?: ...) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: userMutationKeys.all,  // Uses centralized key
    mutationFn: (variables) => execute(...),
    onSuccess: () => {
      // Auto-invalidates list queries
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}
```

## Type Design Decisions

### Variables Type: `object` vs `Record<string, unknown>`

Query key functions use `object` for variables:

```typescript
list: (variables?: object) => [...userKeys.lists(), variables] as const,
```

**Why not `Record<string, unknown>`?**

TypeScript interfaces don't satisfy `Record<string, unknown>` because they lack an index signature:

```typescript
interface UserFilter { name?: string; }

// Error: Index signature missing
const fn = (vars: Record<string, unknown>) => {};
fn({ name: 'test' } as UserFilter);  // Type error!

// Works with 'object'
const fn2 = (vars: object) => {};
fn2({ name: 'test' } as UserFilter);  // OK
```

### ID Type: `string | number`

Detail key functions accept both string and number IDs:

```typescript
detail: (id: string | number) => [...userKeys.details(), id] as const,
```

This supports both UUID primary keys (`string`) and serial/integer primary keys (`number`).

### Mutation Keys: Static vs Dynamic

Mutation hooks use static keys (`mutationKeys.all`) rather than per-mutation keys:

```typescript
// Generated hook uses static key
return useMutation({
  mutationKey: userMutationKeys.all,  // Not: userMutationKeys.create()
  mutationFn: (variables) => execute(...),
});
```

**Why?**

React Query's `mutationKey` is evaluated when `useMutation` is called, not per-mutation. The `variables` parameter is only available inside `mutationFn`, so dynamic keys like `mutationKeys.delete(variables.id)` would fail.

Users who need per-mutation tracking can:
1. Use `onMutate` callbacks to track specific mutations
2. Override `mutationKey` in options when calling the hook

## Scalar Type Handling

### Why Hardcoded Mappings?

GraphQL introspection only provides scalar **names**, not TypeScript type mappings:

```json
{
  "kind": "SCALAR",
  "name": "UUID",
  "description": "A universally unique identifier as defined by RFC 4122."
}
```

There's no field indicating `UUID` → `string` or `JSON` → `unknown`. The GraphQL spec leaves scalar implementation to the server.

### Current Approach

Scalars are mapped in `src/cli/codegen/scalars.ts`:

```typescript
export const SCALAR_TS_MAP: Record<string, string> = {
  // Standard GraphQL
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  ID: 'string',

  // PostGraphile
  UUID: 'string',
  Datetime: 'string',
  JSON: 'unknown',
  BigInt: 'string',

  // Geometry (PostGIS)
  GeoJSON: 'unknown',
  GeometryPoint: 'unknown',

  // ... more scalars
};
```

Unknown scalars default to `unknown` (type-safe fallback).

### Adding Custom Scalars

To add a new scalar, update `SCALAR_TS_MAP` in `scalars.ts`:

```typescript
// Add custom scalar mapping
MyCustomScalar: 'string',
GeometryPolygon: '{ type: string; coordinates: number[][] }',
```

## File Structure

```
generated/
├── index.ts              # Main barrel export
├── client.ts             # GraphQL client with configure() and execute()
├── types.ts              # Entity interfaces and filter types
├── schema-types.ts       # Input/payload/enum types from schema
├── query-keys.ts         # Centralized query key factories
├── mutation-keys.ts      # Mutation key factories
├── invalidation.ts       # Cache invalidation helpers
├── queries/
│   ├── index.ts          # Query hooks barrel
│   ├── useUsersQuery.ts  # List query hook
│   ├── useUserQuery.ts   # Single item query hook
│   └── ...
└── mutations/
    ├── index.ts          # Mutation hooks barrel
    ├── useCreateUserMutation.ts
    ├── useUpdateUserMutation.ts
    ├── useDeleteUserMutation.ts
    └── ...
```

## Usage Examples

### Basic Query with Cache Key

```typescript
import { useUsersQuery, userKeys } from './generated';

function UserList() {
  const { data } = useUsersQuery({ first: 10 });

  // Manual cache access using same key
  const cachedData = queryClient.getQueryData(userKeys.list({ first: 10 }));
}
```

### Prefetching

```typescript
import { prefetchUsersQuery, userKeys } from './generated';

// In a route loader or server component
await prefetchUsersQuery(queryClient, { first: 10 });
```

### Optimistic Updates

```typescript
import { useCreateUserMutation, userKeys } from './generated';

const mutation = useCreateUserMutation({
  onMutate: async (newUser) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: userKeys.lists() });

    // Snapshot previous value
    const previous = queryClient.getQueryData(userKeys.list());

    // Optimistically update
    queryClient.setQueryData(userKeys.list(), (old) => ({
      ...old,
      users: { ...old.users, nodes: [...old.users.nodes, newUser] },
    }));

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(userKeys.list(), context.previous);
  },
});
```

### Cascade Invalidation (with relationships configured)

```typescript
import { invalidate, tableKeys } from './generated';

// When a database is updated, invalidate all its tables
function onDatabaseUpdate(databaseId: string) {
  // Invalidate tables scoped to this database
  queryClient.invalidateQueries({
    queryKey: tableKeys.byDatabase(databaseId)
  });
}
```

## Implementation Files

| Source File | Purpose |
|-------------|---------|
| `src/cli/codegen/query-keys.ts` | Query key factory generator |
| `src/cli/codegen/mutation-keys.ts` | Mutation key factory generator |
| `src/cli/codegen/invalidation.ts` | Invalidation helpers generator |
| `src/cli/codegen/queries.ts` | Query hook generator (uses centralized keys) |
| `src/cli/codegen/mutations.ts` | Mutation hook generator (uses centralized keys) |
| `src/cli/codegen/scalars.ts` | Scalar type mappings |
| `src/types/config.ts` | Configuration types (`QueryKeyConfig`) |

## Testing

Run the test suite:

```bash
pnpm test
```

Generate example SDK and verify TypeScript:

```bash
pnpm example:codegen:sdk
cd examples/output/generated-sdk
npx tsc --noEmit
```
