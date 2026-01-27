# @constructive-io/graphql-codegen

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-codegen"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fcodegen%2Fpackage.json"/></a>
</p>

GraphQL SDK generator for Constructive databases. Generate type-safe React Query hooks or a Prisma-like ORM client from your GraphQL schema.

## Features

- **Two Output Modes**: React Query hooks OR Prisma-like ORM client
- **Full Schema Coverage**: Generates code for ALL queries and mutations, not just table CRUD
- **PostGraphile Optimized**: Uses `_meta` query for table metadata and `__schema` introspection for custom operations
- **React Query Integration**: Generates `useQuery` and `useMutation` hooks with proper typing
- **Prisma-like ORM**: Fluent API with `db.user.findMany()`, `db.mutation.login()`, etc.
- **Advanced Type Inference**: Const generics for narrowed return types based on select clauses
- **Relation Support**: Typed nested selects for belongsTo, hasMany, and manyToMany relations
- **Error Handling**: Discriminated unions with `.unwrap()`, `.unwrapOr()`, `.unwrapOrElse()` methods
- **AST-Based Generation**: Uses Babel for reliable code generation
- **Configurable**: Filter tables, queries, and mutations with glob patterns
- **Type-Safe**: Full TypeScript support with generated interfaces

## Table of Contents

- [Installation](#installation)
- [Programmatic API](#programmatic-api)
- [React Query Hooks](#react-query-hooks)
- [ORM Client](#orm-client)
- [Configuration](#configuration)
- [CLI Commands](#cli-commands)
- [Architecture](#architecture)
- [Generated Types](#generated-types)
- [Development](#development)

## Installation

```bash
pnpm add @constructive-io/graphql-codegen
```

## Programmatic API

The primary way to use this package is through the programmatic API. Import the `generate` function and call it with your configuration.

### Generate from Endpoint

```typescript
import { generate } from '@constructive-io/graphql-codegen';

// Generate React Query hooks from a GraphQL endpoint
await generate({
  endpoint: 'https://api.example.com/graphql',
  output: './generated',
  headers: { Authorization: 'Bearer <token>' },
  reactQuery: true,
});

// Generate ORM client from a GraphQL endpoint
await generate({
  endpoint: 'https://api.example.com/graphql',
  output: './generated',
  headers: { Authorization: 'Bearer <token>' },
  orm: true,
});

// Generate both React Query hooks and ORM client
await generate({
  endpoint: 'https://api.example.com/graphql',
  output: './generated',
  reactQuery: true,
  orm: true,
});
```

### Generate from Database

Connect directly to a PostgreSQL database to generate code:

```typescript
import { generate } from '@constructive-io/graphql-codegen';

// Generate from database with explicit schemas
await generate({
  db: {
    schemas: ['public', 'app_public'],
  },
  output: './generated',
  reactQuery: true,
});

// Generate from database using API names for automatic schema discovery
await generate({
  db: {
    apiNames: ['my_api'],
  },
  output: './generated',
  orm: true,
});

// Generate with explicit database config (overrides environment variables)
await generate({
  db: {
    config: {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      user: 'postgres',
    },
    schemas: ['public'],
  },
  output: './generated',
  reactQuery: true,
});
```

### Generate from PGPM Module

Generate code from a PGPM module path:

```typescript
import { generate } from '@constructive-io/graphql-codegen';

// Generate from a PGPM module directory
await generate({
  db: {
    pgpm: { modulePath: './packages/my-module' },
    schemas: ['public'],
  },
  output: './generated',
  reactQuery: true,
});

// Generate from a PGPM workspace with module name
await generate({
  db: {
    pgpm: {
      workspacePath: '/path/to/workspace',
      moduleName: 'my-module',
    },
    schemas: ['public'],
  },
  output: './generated',
  orm: true,
});

// Keep the ephemeral database after generation (for debugging)
await generate({
  db: {
    pgpm: { modulePath: './packages/my-module' },
    schemas: ['public'],
    keepDb: true,
  },
  output: './generated',
  reactQuery: true,
});
```

### Configuration Options

The `generate` function accepts a configuration object with the following options:

```typescript
interface GraphQLSDKConfigTarget {
  // Source (choose one)
  endpoint?: string;                    // GraphQL endpoint URL
  schemaFile?: string;                  // Path to GraphQL schema file (.graphql)
  db?: DbConfig;                        // Database configuration (see below)

  // Output
  output?: string;                      // Output directory (default: './generated/graphql')

  // Authentication
  headers?: Record<string, string>;     // HTTP headers for endpoint requests

  // Generator flags
  reactQuery?: boolean;                 // Generate React Query hooks (output: {output}/hooks)
  orm?: boolean;                        // Generate ORM client (output: {output}/orm)

  // Table filtering (for CRUD operations from _meta)
  tables?: {
    include?: string[];                 // Glob patterns (default: ['*'])
    exclude?: string[];                 // Glob patterns (default: [])
  };

  // Query filtering (for ALL queries from __schema)
  queries?: {
    include?: string[];                 // Glob patterns (default: ['*'])
    exclude?: string[];                 // Glob patterns (default: ['_meta', 'query'])
  };

  // Mutation filtering (for ALL mutations from __schema)
  mutations?: {
    include?: string[];                 // Glob patterns (default: ['*'])
    exclude?: string[];                 // Glob patterns (default: [])
  };

  // Code generation options
  codegen?: {
    maxFieldDepth?: number;             // Max depth for nested fields (default: 2)
    skipQueryField?: boolean;           // Skip 'query' field (default: true)
  };

  // Query key generation
  queryKeys?: {
    generateScopedKeys?: boolean;       // Generate scope-aware keys (default: true)
    generateMutationKeys?: boolean;     // Generate mutation keys (default: true)
    generateCascadeHelpers?: boolean;   // Generate invalidation helpers (default: true)
    relationships?: Record<string, { parent: string; foreignKey: string }>;
  };
}

// Database configuration for direct database introspection or PGPM module
interface DbConfig {
  // PostgreSQL connection config (falls back to PGHOST, PGPORT, etc. env vars)
  config?: Partial<PgConfig>;

  // PGPM module configuration for ephemeral database creation
  pgpm?: {
    modulePath?: string;                // Path to PGPM module directory
    workspacePath?: string;             // Path to PGPM workspace (with moduleName)
    moduleName?: string;                // Module name within workspace
  };

  // Schema selection (choose one)
  schemas?: string[];                   // Explicit PostgreSQL schema names
  apiNames?: string[];                  // API names for automatic schema discovery

  // Debugging
  keepDb?: boolean;                     // Keep ephemeral database after generation
}
```

## React Query Hooks

The React Query hooks generator creates type-safe `useQuery` and `useMutation` hooks for your PostGraphile API, fully integrated with TanStack Query (React Query v5).

### Generated Output Structure

```
generated/hooks/
├── index.ts              # Main barrel export (configure, hooks, types)
├── client.ts             # configure() and execute() functions
├── types.ts              # Entity interfaces, filter types, enums
├── queries/
│   ├── index.ts          # Query hooks barrel
│   ├── useCarsQuery.ts   # Table list query (findMany)
│   ├── useCarQuery.ts    # Table single item query (findOne)
│   └── ...
└── mutations/
    ├── index.ts          # Mutation hooks barrel
    ├── useCreateCarMutation.ts
    ├── useUpdateCarMutation.ts
    ├── useDeleteCarMutation.ts
    └── ...
```

### Setup & Configuration

Configure the GraphQL client once at your app's entry point:

```tsx
import { configure } from './generated/hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    Authorization: 'Bearer <token>',
  },
});
```

### Table Query Hooks

For each table, two query hooks are generated:

```tsx
import { useCarsQuery, useCarQuery } from './generated/hooks';

// List query with filtering, pagination, and ordering
function CarList() {
  const { data, isLoading, isError, error } = useCarsQuery({
    first: 10,
    filter: {
      brand: { equalTo: 'Tesla' },
      price: { greaterThan: 50000 },
    },
    orderBy: ['CREATED_AT_DESC'],
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.cars.nodes.map((car) => (
        <li key={car.id}>{car.brand} - ${car.price}</li>
      ))}
    </ul>
  );
}

// Single item query by ID
function CarDetails({ carId }: { carId: string }) {
  const { data, isLoading } = useCarQuery({ id: carId });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data?.car?.brand}</h1>
      <p>Price: ${data?.car?.price}</p>
    </div>
  );
}
```

### Mutation Hooks

For each table, three mutation hooks are generated:

```tsx
import {
  useCreateCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
} from './generated/hooks';

function CarForm() {
  const createCar = useCreateCarMutation({
    onSuccess: (data) => {
      console.log('Created car:', data.createCar.car.id);
    },
  });

  return (
    <button
      onClick={() =>
        createCar.mutate({
          input: { car: { brand: 'Tesla', price: 80000 } },
        })
      }
      disabled={createCar.isPending}
    >
      Create
    </button>
  );
}
```

### Custom Query and Mutation Hooks

Custom queries and mutations from your schema get their own hooks:

```tsx
import { useCurrentUserQuery, useLoginMutation } from './generated/hooks';

function UserProfile() {
  const { data } = useCurrentUserQuery();
  return <h1>Welcome, {data?.currentUser?.username}</h1>;
}

function LoginForm() {
  const login = useLoginMutation({
    onSuccess: (data) => {
      const token = data.login.apiToken?.accessToken;
      if (token) localStorage.setItem('token', token);
    },
  });

  return (
    <button onClick={() => login.mutate({ input: { email: 'user@example.com', password: 'secret' } })}>
      Login
    </button>
  );
}
```

### Centralized Query Keys

The codegen generates a centralized query key factory for type-safe cache management:

```tsx
import { userKeys, invalidate } from './generated/hooks';
import { useQueryClient } from '@tanstack/react-query';

// Query key structure
userKeys.all;                    // ['user']
userKeys.lists();                // ['user', 'list']
userKeys.list({ first: 10 });    // ['user', 'list', { first: 10 }]
userKeys.details();              // ['user', 'detail']
userKeys.detail('user-123');     // ['user', 'detail', 'user-123']

// Invalidation helpers
const queryClient = useQueryClient();
invalidate.user.all(queryClient);
invalidate.user.lists(queryClient);
invalidate.user.detail(queryClient, userId);
```

## ORM Client

The ORM client provides a Prisma-like fluent API for GraphQL operations without React dependencies.

### Generated Output Structure

```
generated/orm/
├── index.ts              # createClient() factory + re-exports
├── client.ts             # OrmClient class (GraphQL executor)
├── query-builder.ts      # QueryBuilder with execute(), unwrap(), etc.
├── select-types.ts       # Type utilities for select inference
├── input-types.ts        # All generated types
├── models/
│   ├── index.ts          # Barrel export for all models
│   ├── user.ts           # UserModel class
│   └── ...
├── query/
│   └── index.ts          # Custom query operations
└── mutation/
    └── index.ts          # Custom mutation operations
```

### Basic Usage

```typescript
import { createClient } from './generated/orm';

const db = createClient({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

// Query users
const result = await db.user
  .findMany({
    select: { id: true, username: true, email: true },
    first: 20,
  })
  .execute();

if (result.ok) {
  console.log(result.data.users.nodes);
} else {
  console.error(result.errors);
}

// Create a user
const newUser = await db.user
  .create({
    data: { username: 'john', email: 'john@example.com' },
    select: { id: true, username: true },
  })
  .execute();

// Update a user
const updated = await db.user
  .update({
    where: { id: 'user-id' },
    data: { displayName: 'John Doe' },
    select: { id: true, displayName: true },
  })
  .execute();

// Delete a user
const deleted = await db.user
  .delete({ where: { id: 'user-id' } })
  .execute();
```

### Select & Type Inference

The ORM uses const generics to infer return types based on your select clause:

```typescript
const users = await db.user
  .findMany({
    select: { id: true, username: true },
  })
  .unwrap();

// TypeScript knows the exact shape:
// users.users.nodes[0] is { id: string; username: string | null }

// Accessing unselected fields is a compile error:
// users.users.nodes[0].email  // Error: Property 'email' does not exist
```

### Relations

Relations are fully typed in Select types:

```typescript
// BelongsTo relation
const orders = await db.order
  .findMany({
    select: {
      id: true,
      customer: {
        select: { id: true, username: true },
      },
    },
  })
  .unwrap();

// HasMany relation with pagination
const users = await db.user
  .findMany({
    select: {
      id: true,
      orders: {
        select: { id: true, total: true },
        first: 10,
        orderBy: ['CREATED_AT_DESC'],
      },
    },
  })
  .unwrap();
```

### Error Handling

The ORM provides multiple ways to handle errors:

```typescript
// Discriminated union (recommended)
const result = await db.user.findMany({ select: { id: true } }).execute();

if (result.ok) {
  console.log(result.data.users.nodes);
} else {
  console.error(result.errors);
}

// .unwrap() - throws on error
try {
  const data = await db.user.findMany({ select: { id: true } }).unwrap();
} catch (error) {
  if (error instanceof GraphQLRequestError) {
    console.error('GraphQL errors:', error.errors);
  }
}

// .unwrapOr() - returns default on error
const data = await db.user
  .findMany({ select: { id: true } })
  .unwrapOr({ users: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } } });

// .unwrapOrElse() - callback on error
const data = await db.user
  .findMany({ select: { id: true } })
  .unwrapOrElse((errors) => {
    console.error('Query failed:', errors);
    return { users: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } } };
  });
```

### Custom Operations

Custom queries and mutations are available on `db.query` and `db.mutation`:

```typescript
// Custom query
const currentUser = await db.query
  .currentUser({ select: { id: true, username: true } })
  .unwrap();

// Custom mutation
const login = await db.mutation
  .login(
    { input: { email: 'user@example.com', password: 'secret' } },
    { select: { apiToken: { select: { accessToken: true } } } }
  )
  .unwrap();

console.log(login.login.apiToken?.accessToken);
```

## Configuration

### Config File

Create a `graphql-codegen.config.ts` file:

```typescript
import type { GraphQLSDKConfig } from '@constructive-io/graphql-codegen';

export default {
  endpoint: 'https://api.example.com/graphql',
  output: './generated/graphql',
  headers: {
    Authorization: 'Bearer <token>',
  },
  reactQuery: true,
  orm: true,
} satisfies GraphQLSDKConfig;
```

### Multi-target Configuration

For multiple schema sources, export a record of named configs:

```typescript
import type { GraphQLSDKMultiConfig } from '@constructive-io/graphql-codegen';

export default {
  public: {
    endpoint: 'https://api.example.com/graphql',
    output: './generated/public',
    headers: { Authorization: 'Bearer <token>' },
    reactQuery: true,
  },
  admin: {
    schemaFile: './admin.schema.graphql',
    output: './generated/admin',
    orm: true,
  },
  database: {
    db: {
      pgpm: { modulePath: './packages/my-module' },
      schemas: ['public'],
    },
    output: './generated/db',
    reactQuery: true,
    orm: true,
  },
} satisfies GraphQLSDKMultiConfig;
```

Run all targets with `graphql-codegen` or a specific target with `graphql-codegen --target public`.

### Glob Patterns

Filter patterns support wildcards:

```typescript
{
  tables: {
    include: ['User', 'Product', 'Order*'],
    exclude: ['*_archive', 'temp_*'],
  },
  queries: {
    exclude: ['_meta', 'query', '*Debug*'],
  },
  mutations: {
    include: ['create*', 'update*', 'delete*', 'login', 'register', 'logout'],
  },
}
```

## CLI Commands

The CLI provides a convenient way to run code generation from the command line.

### `graphql-sdk generate`

Generate React Query hooks and/or ORM client from various sources.

```bash
Source Options (choose one):
  -c, --config <path>              Path to config file (graphql-sdk.config.ts)
  -e, --endpoint <url>             GraphQL endpoint URL
  -s, --schema-file <path>         Path to GraphQL schema file (.graphql)
  --pgpm-module-path <path>        Path to PGPM module directory
  --pgpm-workspace-path <path>     Path to PGPM workspace (requires --pgpm-module-name)
  --pgpm-module-name <name>        PGPM module name in workspace

Database Options (for pgpm modes):
  --schemas <list>                 Comma-separated list of PostgreSQL schemas to introspect
  --api-names <list>               Comma-separated API names for automatic schema discovery
                                   (mutually exclusive with --schemas)

Generator Options:
  --react-query                    Generate React Query hooks
  --orm                            Generate ORM client
  -t, --target <name>              Target name in config file
  -o, --output <dir>               Output directory
  -a, --authorization <token>      Authorization header value
  --skip-custom-operations         Only generate table CRUD operations
  --dry-run                        Preview without writing files
  --keep-db                        Keep ephemeral database after generation (pgpm modes)
  -v, --verbose                    Show detailed output

Watch Mode Options:
  -w, --watch                      Watch for schema changes and regenerate
  --poll-interval <ms>             Polling interval in milliseconds (default: 5000)
  --debounce <ms>                  Debounce delay in milliseconds (default: 500)
  --touch <path>                   Touch file after regeneration
  --no-clear                       Don't clear console on regeneration
```

Examples:

```bash
# Generate React Query hooks from an endpoint
npx graphql-sdk generate --endpoint https://api.example.com/graphql --output ./generated --react-query

# Generate ORM client from an endpoint
npx graphql-sdk generate --endpoint https://api.example.com/graphql --output ./generated --orm

# Generate both React Query hooks and ORM client
npx graphql-sdk generate --endpoint https://api.example.com/graphql --output ./generated --react-query --orm

# Generate from a PGPM module
npx graphql-sdk generate --pgpm-module-path ./packages/my-module --schemas public --react-query

# Generate using apiNames for automatic schema discovery
npx graphql-sdk generate --pgpm-module-path ./packages/my-module --api-names my_api --react-query --orm
```

### `graphql-sdk init`

Create a configuration file.

```bash
Options:
  -f, --format <format>    Config format: ts, js, json (default: ts)
  -o, --output <path>      Output path for config file
```

### `graphql-sdk introspect`

Inspect schema without generating code.

```bash
Options:
  -e, --endpoint <url>     GraphQL endpoint URL
  --json                   Output as JSON
  -v, --verbose            Show detailed output
```

## Architecture

### How It Works

The codegen fetches `_meta` for table metadata (names, fields, relations, constraints) and `__schema` for full schema introspection (all queries, mutations, types). It then filters operations to avoid duplicates and generates type-safe code using Babel AST.

### Code Generation Pipeline

```
PostGraphile Endpoint
        │
        ▼
┌───────────────────┐
│  Introspection    │
│  - _meta query    │
│  - __schema       │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Schema Parser    │
│  - CleanTable     │
│  - CleanOperation │
│  - TypeRegistry   │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Code Generators  │
│  - Models         │
│  - Types          │
│  - Client         │
│  - Custom Ops     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Output Files     │
│  - TypeScript     │
│  - Formatted      │
└───────────────────┘
```

### Type Inference with Const Generics

The ORM uses TypeScript const generics to infer return types:

```typescript
findMany<const S extends UserSelect>(
  args?: FindManyArgs<S, UserFilter, UsersOrderBy>
): QueryBuilder<{ users: ConnectionResult<InferSelectResult<User, S>> }>
```

## Generated Types

### Entity Types

```typescript
export interface User {
  id: string;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
```

### Filter Types

```typescript
export interface UserFilter {
  id?: UUIDFilter;
  username?: StringFilter;
  email?: StringFilter;
  isActive?: BooleanFilter;
  createdAt?: DatetimeFilter;
  and?: UserFilter[];
  or?: UserFilter[];
  not?: UserFilter;
}

export interface StringFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  in?: string[];
  notIn?: string[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}
```

### OrderBy Types

```typescript
export type UsersOrderBy =
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'NATURAL'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'USERNAME_ASC'
  | 'USERNAME_DESC'
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC';
```

### Input Types

```typescript
export interface CreateUserInput {
  clientMutationId?: string;
  user: {
    username?: string;
    email?: string;
    displayName?: string;
  };
}

export interface UpdateUserInput {
  clientMutationId?: string;
  id: string;
  patch: UserPatch;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run in watch mode
pnpm dev

# Type check
pnpm lint:types

# Run tests
pnpm test
```

## Requirements

- Node.js >= 18
- PostGraphile endpoint with `_meta` query enabled
- React Query v5 (peer dependency for React Query hooks)
- No dependencies for ORM client (uses native fetch)

## License

MIT
