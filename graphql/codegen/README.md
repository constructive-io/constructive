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

GraphQL SDK generator for Constructive databases with React Query hooks. Generate type-safe React Query hooks or a Prisma-like ORM client from your GraphQL schema.

## Features

- **Two Output Modes**: React Query hooks OR Prisma-like ORM client
- **Full Schema Coverage**: Generates code for ALL queries and mutations, not just table CRUD
- **PostGraphile Optimized**: Uses `_meta` query for table metadata and `__schema` introspection for custom operations
- **React Query Integration**: Generates `useQuery` and `useMutation` hooks with proper typing
- **Prisma-like ORM**: Fluent API with `db.user.findMany()`, `db.mutation.login()`, etc.
- **Advanced Type Inference**: Const generics for narrowed return types based on select clauses
- **Relation Support**: Typed nested selects for belongsTo, hasMany, and manyToMany relations
- **Error Handling**: Discriminated unions with `.unwrap()`, `.unwrapOr()`, `.unwrapOrElse()` methods
- **AST-Based Generation**: Uses `ts-morph` for reliable code generation
- **Configurable**: Filter tables, queries, and mutations with glob patterns
- **Type-Safe**: Full TypeScript support with generated interfaces

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Configuration](#configuration)
- [React Query Hooks](#react-query-hooks)
- [ORM Client](#orm-client)
  - [Basic Usage](#basic-usage)
  - [Select & Type Inference](#select--type-inference)
  - [Relations](#relations)
  - [Filtering & Ordering](#filtering--ordering)
  - [Pagination](#pagination)
  - [Error Handling](#error-handling)
  - [Custom Operations](#custom-operations)
- [Architecture](#architecture)
- [Generated Types](#generated-types)
- [Development](#development)
- [Roadmap](#roadmap)

## Installation

```bash
pnpm add @constructive-io/graphql-codegen
```

## Quick Start

### 1. Initialize Config (Optional)

```bash
npx graphql-sdk init
```

Creates a `graphql-sdk.config.ts` file:

```typescript
import { defineConfig } from '@constructive-io/graphql-codegen';

export default defineConfig({
  endpoint: 'https://api.example.com/graphql',
  output: './generated/graphql',
  headers: {
    Authorization: 'Bearer <token>',
  },
});
```

### 2. Generate SDK

```bash
# Generate React Query hooks from an endpoint
npx graphql-sdk generate --endpoint https://api.example.com/graphql --output ./generated/hooks --reactquery

# Generate ORM client from an endpoint
npx graphql-sdk generate --endpoint https://api.example.com/graphql --output ./generated/orm --orm

# Generate from a database directly
npx graphql-sdk generate --database postgres://localhost/mydb --schemas public,app_public --reactquery

# Generate from a PGPM module
npx graphql-sdk generate --pgpm-module-path ./packages/my-module --schemas public --orm

# Generate using apiNames for automatic schema discovery
npx graphql-sdk generate --database postgres://localhost/mydb --api-names my_api --reactquery --orm
```

### 3. Use the Generated Code

```typescript
// ORM Client
import { createClient } from './generated/orm';

const db = createClient({ endpoint: 'https://api.example.com/graphql' });

const users = await db.user.findMany({
  select: { id: true, username: true },
  first: 10,
}).execute();

// React Query Hooks
import { useCarsQuery } from './generated/hooks';

function CarList() {
  const { data } = useCarsQuery({ first: 10 });
  return <ul>{data?.cars.nodes.map(car => <li key={car.id}>{car.name}</li>)}</ul>;
}
```

## CLI Commands

### `graphql-sdk generate`

Generate React Query hooks and/or ORM client from various sources.

```bash
Source Options (choose one):
  -c, --config <path>              Path to config file (graphql-sdk.config.ts)
  -e, --endpoint <url>             GraphQL endpoint URL
  -s, --schema <path>              Path to GraphQL schema file
  --database <url>                 Database connection URL (postgres://...)
  --pgpm-module-path <path>        Path to PGPM module directory
  --pgpm-workspace-path <path>     Path to PGPM workspace (requires --pgpm-module-name)
  --pgpm-module-name <name>        PGPM module name in workspace

Schema Options (for database/pgpm modes):
  --schemas <list>                 Comma-separated list of schemas to introspect
  --api-names <list>               Comma-separated API names for automatic schema discovery
                                   (mutually exclusive with --schemas)

Generator Options:
  --reactquery                     Generate React Query hooks
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

## Configuration

```typescript
interface GraphQLSDKConfigTarget {
  // Required (choose one)
  endpoint?: string;
  schema?: string;

  // Output
  output?: string; // default: './generated/graphql'

  // Authentication
  headers?: Record<string, string>;

  // Table filtering (for CRUD operations from _meta)
  tables?: {
    include?: string[]; // default: ['*']
    exclude?: string[]; // default: []
  };

  // Query filtering (for ALL queries from __schema)
  queries?: {
    include?: string[]; // default: ['*']
    exclude?: string[]; // default: ['_meta', 'query']
  };

  // Mutation filtering (for ALL mutations from __schema)
  mutations?: {
    include?: string[]; // default: ['*']
    exclude?: string[]; // default: []
  };

  // Code generation options
  codegen?: {
    maxFieldDepth?: number; // default: 2
    skipQueryField?: boolean; // default: true
  };

  // ORM-specific config
  orm?: {
    output?: string; // default: './generated/orm'
    useSharedTypes?: boolean; // default: true
  };
}

interface GraphQLSDKMultiConfig {
  defaults?: GraphQLSDKConfigTarget;
  targets: Record<string, GraphQLSDKConfigTarget>;
}

type GraphQLSDKConfig = GraphQLSDKConfigTarget | GraphQLSDKMultiConfig;
```

### Multi-target Configuration

Configure multiple schema sources and outputs in one file:

```typescript
export default defineConfig({
  defaults: {
    headers: { Authorization: 'Bearer <token>' },
  },
  targets: {
    public: {
      endpoint: 'https://api.example.com/graphql',
      output: './generated/public',
    },
    admin: {
      schema: './admin.schema.graphql',
      output: './generated/admin',
    },
  },
});
```

CLI behavior:

- `graphql-codegen generate` runs all targets
- `graphql-codegen generate --target admin` runs a single target
- `--output` requires `--target` when multiple targets exist

### Glob Patterns

Filter patterns support wildcards:

- `*` - matches any string
- `?` - matches single character

Examples:

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

## React Query Hooks

The React Query hooks generator creates type-safe `useQuery` and `useMutation` hooks for your PostGraphile API, fully integrated with TanStack Query (React Query v5).

### Generated Output Structure

```
generated/hooks/
├── index.ts              # Main barrel export (configure, hooks, types)
├── client.ts             # configure() and execute() functions
├── types.ts              # Entity interfaces, filter types, enums
├── hooks.ts              # All hooks re-exported
├── queries/
│   ├── index.ts          # Query hooks barrel
│   ├── useCarsQuery.ts   # Table list query (findMany)
│   ├── useCarQuery.ts    # Table single item query (findOne)
│   ├── useCurrentUserQuery.ts  # Custom query
│   └── ...
└── mutations/
    ├── index.ts          # Mutation hooks barrel
    ├── useCreateCarMutation.ts
    ├── useUpdateCarMutation.ts
    ├── useDeleteCarMutation.ts
    ├── useLoginMutation.ts     # Custom mutation
    └── ...
```

### Setup & Configuration

#### 1. Configure the Client

Configure the GraphQL client once at your app's entry point:

```tsx
// App.tsx or main.tsx
import { configure } from './generated/hooks';

// Basic configuration
configure({
  endpoint: 'https://api.example.com/graphql',
});

// With authentication
configure({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    Authorization: 'Bearer <token>',
    'X-Custom-Header': 'value',
  },
});
```

#### 2. Update Headers at Runtime

```tsx
import { configure } from './generated/hooks';

// After login, update the authorization header
function handleLoginSuccess(token: string) {
  configure({
    endpoint: 'https://api.example.com/graphql',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

### Table Query Hooks

For each table, two query hooks are generated:

#### List Query (`use{Table}sQuery`)

Fetches multiple records with pagination, filtering, and ordering:

```tsx
import { useCarsQuery } from './generated/hooks';

function CarList() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCarsQuery(
    {
      // Pagination
      first: 10, // First N records
      // last: 10,         // Last N records
      // after: 'cursor',  // Cursor-based pagination
      // before: 'cursor',
      // offset: 20,       // Offset pagination

      // Filtering
      filter: {
        brand: { equalTo: 'Tesla' },
        price: { greaterThan: 50000 },
      },

      // Ordering
      orderBy: ['CREATED_AT_DESC', 'NAME_ASC'],
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Total: {data?.cars.totalCount}</p>
      <ul>
        {data?.cars.nodes.map((car) => (
          <li key={car.id}>
            {car.brand} - ${car.price}
          </li>
        ))}
      </ul>

      {/* Pagination info */}
      {data?.cars.pageInfo.hasNextPage && (
        <button onClick={() => refetch()}>Load More</button>
      )}
    </div>
  );
}
```

#### Single Item Query (`use{Table}Query`)

Fetches a single record by ID:

```tsx
import { useCarQuery } from './generated/hooks';

function CarDetails({ carId }: { carId: string }) {
  const { data, isLoading, isError } = useCarQuery({
    id: carId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Car not found</div>;

  return (
    <div>
      <h1>{data?.car?.brand}</h1>
      <p>Price: ${data?.car?.price}</p>
      <p>Created: {data?.car?.createdAt}</p>
    </div>
  );
}
```

### Mutation Hooks

For each table, three mutation hooks are generated:

#### Create Mutation (`useCreate{Table}Mutation`)

```tsx
import { useCreateCarMutation } from './generated/hooks';

function CreateCarForm() {
  const createCar = useCreateCarMutation({
    onSuccess: (data) => {
      console.log('Created car:', data.createCar.car.id);
      // Invalidate queries, redirect, show toast, etc.
    },
    onError: (error) => {
      console.error('Failed to create car:', error);
    },
  });

  const handleSubmit = (formData: { brand: string; price: number }) => {
    createCar.mutate({
      input: {
        car: {
          brand: formData.brand,
          price: formData.price,
        },
      },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit({ brand: 'Tesla', price: 80000 });
      }}
    >
      {/* form fields */}
      <button type="submit" disabled={createCar.isPending}>
        {createCar.isPending ? 'Creating...' : 'Create Car'}
      </button>
      {createCar.isError && <p>Error: {createCar.error.message}</p>}
    </form>
  );
}
```

#### Update Mutation (`useUpdate{Table}Mutation`)

```tsx
import { useUpdateCarMutation } from './generated/hooks';

function EditCarForm({
  carId,
  currentBrand,
}: {
  carId: string;
  currentBrand: string;
}) {
  const updateCar = useUpdateCarMutation({
    onSuccess: (data) => {
      console.log('Updated car:', data.updateCar.car.brand);
    },
  });

  const handleUpdate = (newBrand: string) => {
    updateCar.mutate({
      input: {
        id: carId,
        patch: {
          brand: newBrand,
        },
      },
    });
  };

  return (
    <button
      onClick={() => handleUpdate('Updated Brand')}
      disabled={updateCar.isPending}
    >
      Update
    </button>
  );
}
```

#### Delete Mutation (`useDelete{Table}Mutation`)

```tsx
import { useDeleteCarMutation } from './generated/hooks';

function DeleteCarButton({ carId }: { carId: string }) {
  const deleteCar = useDeleteCarMutation({
    onSuccess: () => {
      console.log('Car deleted');
      // Navigate away, refetch list, etc.
    },
  });

  return (
    <button
      onClick={() => deleteCar.mutate({ input: { id: carId } })}
      disabled={deleteCar.isPending}
    >
      {deleteCar.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Custom Query Hooks

Custom queries from your schema (like `currentUser`, `nodeById`, etc.) get their own hooks:

```tsx
import { useCurrentUserQuery, useNodeByIdQuery } from './generated/hooks';

// Simple custom query
function UserProfile() {
  const { data, isLoading } = useCurrentUserQuery();

  if (isLoading) return <div>Loading...</div>;
  if (!data?.currentUser) return <div>Not logged in</div>;

  return (
    <div>
      <h1>Welcome, {data.currentUser.username}</h1>
      <p>Email: {data.currentUser.email}</p>
    </div>
  );
}

// Custom query with arguments
function NodeViewer({ nodeId }: { nodeId: string }) {
  const { data } = useNodeByIdQuery({
    id: nodeId,
  });

  return <pre>{JSON.stringify(data?.node, null, 2)}</pre>;
}
```

### Custom Mutation Hooks

Custom mutations (like `login`, `register`, `logout`) get dedicated hooks:

```tsx
import {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
} from './generated/hooks';

// Login
function LoginForm() {
  const login = useLoginMutation({
    onSuccess: (data) => {
      const token = data.login.apiToken?.accessToken;
      if (token) {
        localStorage.setItem('token', token);
        // Reconfigure client with new token
        configure({
          endpoint: 'https://api.example.com/graphql',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    },
    onError: (error) => {
      alert('Login failed: ' + error.message);
    },
  });

  const handleLogin = (email: string, password: string) => {
    login.mutate({
      input: { email, password },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin('user@example.com', 'password');
      }}
    >
      {/* email and password inputs */}
      <button disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// Register
function RegisterForm() {
  const register = useRegisterMutation({
    onSuccess: () => {
      alert('Registration successful! Please check your email.');
    },
  });

  const handleRegister = (data: {
    email: string;
    password: string;
    username: string;
  }) => {
    register.mutate({
      input: {
        email: data.email,
        password: data.password,
        username: data.username,
      },
    });
  };

  return (
    <button
      onClick={() =>
        handleRegister({
          email: 'new@example.com',
          password: 'secret',
          username: 'newuser',
        })
      }
    >
      Register
    </button>
  );
}

// Logout
function LogoutButton() {
  const logout = useLogoutMutation({
    onSuccess: () => {
      localStorage.removeItem('token');
      window.location.href = '/login';
    },
  });

  return <button onClick={() => logout.mutate({ input: {} })}>Logout</button>;
}

// Forgot Password
function ForgotPasswordForm() {
  const forgotPassword = useForgotPasswordMutation({
    onSuccess: () => {
      alert('Password reset email sent!');
    },
  });

  return (
    <button
      onClick={() =>
        forgotPassword.mutate({ input: { email: 'user@example.com' } })
      }
    >
      Reset Password
    </button>
  );
}
```

### Filtering

All filter types from your PostGraphile schema are available:

```tsx
// String filters
useCarsQuery({
  filter: {
    brand: {
      equalTo: 'Tesla',
      notEqualTo: 'Ford',
      in: ['Tesla', 'BMW', 'Mercedes'],
      notIn: ['Unknown'],
      contains: 'es', // LIKE '%es%'
      startsWith: 'Tes', // LIKE 'Tes%'
      endsWith: 'la', // LIKE '%la'
      includesInsensitive: 'TESLA', // Case-insensitive
    },
  },
});

// Number filters
useProductsQuery({
  filter: {
    price: {
      equalTo: 100,
      greaterThan: 50,
      greaterThanOrEqualTo: 50,
      lessThan: 200,
      lessThanOrEqualTo: 200,
    },
  },
});

// Boolean filters
useUsersQuery({
  filter: {
    isActive: { equalTo: true },
    isAdmin: { equalTo: false },
  },
});

// Date/DateTime filters
useOrdersQuery({
  filter: {
    createdAt: {
      greaterThan: '2024-01-01T00:00:00Z',
      lessThan: '2024-12-31T23:59:59Z',
    },
  },
});

// Null checks
useUsersQuery({
  filter: {
    deletedAt: { isNull: true }, // Only non-deleted
  },
});

// Logical operators
useUsersQuery({
  filter: {
    // AND (implicit)
    isActive: { equalTo: true },
    role: { equalTo: 'ADMIN' },
  },
});

useUsersQuery({
  filter: {
    // OR
    or: [{ role: { equalTo: 'ADMIN' } }, { role: { equalTo: 'MODERATOR' } }],
  },
});

useUsersQuery({
  filter: {
    // Complex: active AND (admin OR moderator)
    and: [
      { isActive: { equalTo: true } },
      {
        or: [
          { role: { equalTo: 'ADMIN' } },
          { role: { equalTo: 'MODERATOR' } },
        ],
      },
    ],
  },
});

useUsersQuery({
  filter: {
    // NOT
    not: { status: { equalTo: 'DELETED' } },
  },
});
```

### Ordering

```tsx
// Single order
useCarsQuery({
  orderBy: ['CREATED_AT_DESC'],
});

// Multiple orders (fallback)
useCarsQuery({
  orderBy: ['BRAND_ASC', 'CREATED_AT_DESC'],
});

// Available OrderBy values per table:
// - PRIMARY_KEY_ASC / PRIMARY_KEY_DESC
// - NATURAL
// - {FIELD_NAME}_ASC / {FIELD_NAME}_DESC
```

### Pagination

```tsx
// First N records
useCarsQuery({ first: 10 });

// Last N records
useCarsQuery({ last: 10 });

// Offset pagination
useCarsQuery({ first: 10, offset: 20 }); // Skip 20, take 10

// Cursor-based pagination
function PaginatedList() {
  const [cursor, setCursor] = useState<string | null>(null);

  const { data } = useCarsQuery({
    first: 10,
    after: cursor,
  });

  return (
    <div>
      {data?.cars.nodes.map((car) => (
        <div key={car.id}>{car.brand}</div>
      ))}

      {data?.cars.pageInfo.hasNextPage && (
        <button onClick={() => setCursor(data.cars.pageInfo.endCursor)}>
          Load More
        </button>
      )}
    </div>
  );
}

// PageInfo structure
// {
//   hasNextPage: boolean;
//   hasPreviousPage: boolean;
//   startCursor: string | null;
//   endCursor: string | null;
// }
```

### React Query Options

All hooks accept standard React Query options:

```tsx
// Query hooks
useCarsQuery(
  { first: 10 }, // Variables
  {
    // React Query options
    enabled: isAuthenticated, // Conditional fetching
    refetchInterval: 30000, // Poll every 30s
    refetchOnWindowFocus: true, // Refetch on tab focus
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 min
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 min
    retry: 3, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    placeholderData: previousData, // Show previous data while loading
    select: (data) => data.cars.nodes, // Transform data
  }
);

// Mutation hooks
useCreateCarMutation({
  onSuccess: (data, variables, context) => {
    console.log('Created:', data);
    queryClient.invalidateQueries({ queryKey: ['cars'] });
  },
  onError: (error, variables, context) => {
    console.error('Error:', error);
  },
  onSettled: (data, error, variables, context) => {
    console.log('Mutation completed');
  },
  onMutate: async (variables) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['cars'] });
    const previousCars = queryClient.getQueryData(['cars']);
    queryClient.setQueryData(['cars'], (old) => ({
      ...old,
      cars: {
        ...old.cars,
        nodes: [...old.cars.nodes, { id: 'temp', ...variables.input.car }],
      },
    }));
    return { previousCars };
  },
});
```

### Cache Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useCreateCarMutation, useCarsQuery } from './generated/hooks';

function CreateCarWithInvalidation() {
  const queryClient = useQueryClient();

  const createCar = useCreateCarMutation({
    onSuccess: () => {
      // Invalidate all car queries to refetch
      queryClient.invalidateQueries({ queryKey: ['cars'] });

      // Or invalidate specific queries
      queryClient.invalidateQueries({ queryKey: ['cars', { first: 10 }] });
    },
  });

  // ...
}
```

### Centralized Query Keys

The codegen generates a centralized query key factory following the [lukemorales query-key-factory](https://tanstack.com/query/docs/framework/react/community/lukemorales-query-key-factory) pattern. This provides type-safe cache management with autocomplete support.

#### Generated Files

| File               | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `query-keys.ts`    | Query key factories for all entities                    |
| `mutation-keys.ts` | Mutation key factories for tracking in-flight mutations |
| `invalidation.ts`  | Type-safe cache invalidation helpers                    |

#### Using Query Keys

```tsx
import { userKeys, invalidate } from './generated/hooks';
import { useQueryClient } from '@tanstack/react-query';

// Query key structure
userKeys.all; // ['user']
userKeys.lists(); // ['user', 'list']
userKeys.list({ first: 10 }); // ['user', 'list', { first: 10 }]
userKeys.details(); // ['user', 'detail']
userKeys.detail('user-123'); // ['user', 'detail', 'user-123']

// Granular cache invalidation
const queryClient = useQueryClient();

// Invalidate ALL user queries
queryClient.invalidateQueries({ queryKey: userKeys.all });

// Invalidate only list queries
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// Invalidate a specific user
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
```

#### Invalidation Helpers

Type-safe invalidation utilities:

```tsx
import { invalidate, remove } from './generated/hooks';

// Invalidate queries (triggers refetch)
invalidate.user.all(queryClient);
invalidate.user.lists(queryClient);
invalidate.user.detail(queryClient, userId);

// Remove from cache (for delete operations)
remove.user(queryClient, userId);
```

#### Mutation Key Tracking

Track in-flight mutations with `useIsMutating`:

```tsx
import { useIsMutating } from '@tanstack/react-query';
import { userMutationKeys } from './generated/hooks';

function UserList() {
  // Check if any user mutations are in progress
  const isMutating = useIsMutating({ mutationKey: userMutationKeys.all });

  // Check if a specific user is being deleted
  const isDeleting = useIsMutating({
    mutationKey: userMutationKeys.delete(userId),
  });

  return (
    <div>
      {isMutating > 0 && <Spinner />}
      <button disabled={isDeleting > 0}>Delete</button>
    </div>
  );
}
```

#### Optimistic Updates with Query Keys

```tsx
import { useCreateUserMutation, userKeys } from './generated/hooks';

const createUser = useCreateUserMutation({
  onMutate: async (newUser) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: userKeys.lists() });

    // Snapshot previous value
    const previous = queryClient.getQueryData(userKeys.list());

    // Optimistically update cache
    queryClient.setQueryData(userKeys.list(), (old) => ({
      ...old,
      users: {
        ...old.users,
        nodes: [...old.users.nodes, { id: 'temp', ...newUser.input.user }],
      },
    }));

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(userKeys.list(), context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: userKeys.lists() });
  },
});
```

#### Configuration

Query key generation is enabled by default. Configure in your config file:

```typescript
// graphql-sdk.config.ts
export default defineConfig({
  endpoint: 'https://api.example.com/graphql',

  queryKeys: {
    // Generate scope-aware keys (default: true)
    generateScopedKeys: true,

    // Generate mutation keys (default: true)
    generateMutationKeys: true,

    // Generate invalidation helpers (default: true)
    generateCascadeHelpers: true,

    // Define entity relationships for cascade invalidation
    relationships: {
      table: { parent: 'database', foreignKey: 'databaseId' },
      field: { parent: 'table', foreignKey: 'tableId' },
    },
  },
});
```

For detailed documentation on query key factory design and implementation, see [docs/QUERY-KEY-FACTORY.md](./docs/QUERY-KEY-FACTORY.md).

### Prefetching

```tsx
import { useQueryClient } from '@tanstack/react-query';

function CarListItem({ car }: { car: Car }) {
  const queryClient = useQueryClient();

  // Prefetch details on hover
  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: ['car', { id: car.id }],
      queryFn: () => execute(carQuery, { id: car.id }),
    });
  };

  return (
    <Link to={`/cars/${car.id}`} onMouseEnter={handleHover}>
      {car.brand}
    </Link>
  );
}
```

### Type Exports

All generated types are exported for use in your application:

```tsx
import type {
  // Entity types
  Car,
  User,
  Product,
  Order,

  // Filter types
  CarFilter,
  UserFilter,
  StringFilter,
  IntFilter,
  UUIDFilter,
  DatetimeFilter,

  // OrderBy types
  CarsOrderBy,
  UsersOrderBy,

  // Input types
  CreateCarInput,
  UpdateCarInput,
  CarPatch,
  LoginInput,

  // Payload types
  LoginPayload,
  CreateCarPayload,
} from './generated/hooks';

// Use in your components
interface CarListProps {
  filter?: CarFilter;
  orderBy?: CarsOrderBy[];
}

function CarList({ filter, orderBy }: CarListProps) {
  const { data } = useCarsQuery({ filter, orderBy, first: 10 });
  // ...
}
```

### Error Handling

```tsx
function CarList() {
  const { data, isLoading, isError, error, failureCount } = useCarsQuery({
    first: 10,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    // error is typed as Error
    return (
      <div>
        <p>Error: {error.message}</p>
        <p>Failed {failureCount} times</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return <div>{/* render data */}</div>;
}

// Global error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('Query error:', error);
        // Show toast, log to monitoring, etc.
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
```

### Generated Types Reference

```typescript
// Query hook return type
type UseQueryResult<TData> = {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<QueryObserverResult<TData>>;
  // ... more React Query properties
};

// Mutation hook return type
type UseMutationResult<TData, TVariables> = {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean; // deprecated, use isPending
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  // ... more React Query properties
};

// Connection result (for list queries)
interface CarsConnection {
  nodes: Car[];
  totalCount: number;
  pageInfo: PageInfo;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}
```

---

## ORM Client

The ORM client provides a Prisma-like fluent API for GraphQL operations without React dependencies.

### Generated Output Structure

```
generated/orm/
├── index.ts              # createClient() factory + re-exports
├── client.ts             # OrmClient class (GraphQL executor)
├── query-builder.ts      # QueryBuilder with execute(), unwrap(), etc.
├── select-types.ts       # Type utilities for select inference
├── input-types.ts        # All generated types (entities, filters, inputs, etc.)
├── types.ts              # Re-exports from input-types
├── models/
│   ├── index.ts          # Barrel export for all models
│   ├── user.ts           # UserModel class
│   ├── product.ts        # ProductModel class
│   ├── order.ts          # OrderModel class
│   └── ...
├── query/
│   └── index.ts          # Custom query operations (currentUser, etc.)
└── mutation/
    └── index.ts          # Custom mutation operations (login, register, etc.)
```

### Basic Usage

```typescript
import { createClient } from './generated/orm';

// Create client instance
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

// Find first matching user
const user = await db.user
  .findFirst({
    select: { id: true, username: true },
    where: { username: { equalTo: 'john' } },
  })
  .execute();

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
  .delete({
    where: { id: 'user-id' },
  })
  .execute();
```

### Select & Type Inference

The ORM uses **const generics** to infer return types based on your select clause. Only the fields you select will be in the return type.

```typescript
// Select specific fields - return type is narrowed
const users = await db.user
  .findMany({
    select: { id: true, username: true }, // Only id and username
  })
  .unwrap();

// TypeScript knows the exact shape:
// users.users.nodes[0] is { id: string; username: string | null }

// If you try to access a field you didn't select, TypeScript will error:
// users.users.nodes[0].email  // Error: Property 'email' does not exist

// Without select, you get the full entity type
const allFields = await db.user.findMany({}).unwrap();
// allFields.users.nodes[0] has all User fields
```

### Relations

Relations are fully typed in Select types. The ORM supports all PostGraphile relation types:

#### BelongsTo Relations (Single Entity)

```typescript
// Order.customer is a belongsTo relation to User
const orders = await db.order
  .findMany({
    select: {
      id: true,
      orderNumber: true,
      // Nested select for belongsTo relation
      customer: {
        select: { id: true, username: true, displayName: true },
      },
    },
  })
  .unwrap();

// TypeScript knows:
// orders.orders.nodes[0].customer is { id: string; username: string | null; displayName: string | null }
```

#### HasMany Relations (Connection/Collection)

```typescript
// Order.orderItems is a hasMany relation to OrderItem
const orders = await db.order
  .findMany({
    select: {
      id: true,
      // HasMany with pagination and filtering
      orderItems: {
        select: { id: true, quantity: true, price: true },
        first: 10, // Pagination
        filter: { quantity: { greaterThan: 0 } }, // Filtering
        orderBy: ['QUANTITY_DESC'], // Ordering
      },
    },
  })
  .unwrap();

// orders.orders.nodes[0].orderItems is a connection:
// { nodes: Array<{ id: string; quantity: number | null; price: number | null }>, totalCount: number, pageInfo: PageInfo }
```

#### ManyToMany Relations

```typescript
// Order.productsByOrderItemOrderIdAndProductId is a manyToMany through OrderItem
const orders = await db.order
  .findMany({
    select: {
      id: true,
      productsByOrderItemOrderIdAndProductId: {
        select: { id: true, name: true, price: true },
        first: 5,
      },
    },
  })
  .unwrap();
```

#### Deeply Nested Relations

```typescript
// Multiple levels of nesting
const products = await db.product
  .findMany({
    select: {
      id: true,
      name: true,
      // BelongsTo: Product -> User (seller)
      seller: {
        select: {
          id: true,
          username: true,
          // Even deeper nesting if needed
        },
      },
      // BelongsTo: Product -> Category
      category: {
        select: { id: true, name: true },
      },
      // HasMany: Product -> Review
      reviews: {
        select: {
          id: true,
          rating: true,
          comment: true,
        },
        first: 5,
        orderBy: ['CREATED_AT_DESC'],
      },
    },
  })
  .unwrap();
```

### Filtering & Ordering

#### Filter Types

Each entity has a generated Filter type with field-specific operators:

```typescript
// String filters
where: {
  username: {
    equalTo: 'john',
    notEqualTo: 'jane',
    in: ['john', 'jane', 'bob'],
    notIn: ['admin'],
    contains: 'oh',           // LIKE '%oh%'
    startsWith: 'j',          // LIKE 'j%'
    endsWith: 'n',            // LIKE '%n'
    includesInsensitive: 'OH', // Case-insensitive
  }
}

// Number filters (Int, Float, BigInt, BigFloat)
where: {
  price: {
    equalTo: 100,
    greaterThan: 50,
    greaterThanOrEqualTo: 50,
    lessThan: 200,
    lessThanOrEqualTo: 200,
    in: [100, 200, 300],
  }
}

// Boolean filters
where: {
  isActive: { equalTo: true }
}

// UUID filters
where: {
  id: {
    equalTo: 'uuid-string',
    in: ['uuid-1', 'uuid-2'],
  }
}

// DateTime filters
where: {
  createdAt: {
    greaterThan: '2024-01-01T00:00:00Z',
    lessThan: '2024-12-31T23:59:59Z',
  }
}

// JSON filters
where: {
  metadata: {
    contains: { key: 'value' },
    containsKey: 'key',
    containsAllKeys: ['key1', 'key2'],
  }
}

// Null checks (all filters)
where: {
  deletedAt: { isNull: true }
}
```

#### Logical Operators

```typescript
// AND (implicit - all conditions must match)
where: {
  isActive: { equalTo: true },
  username: { startsWith: 'j' }
}

// AND (explicit)
where: {
  and: [
    { isActive: { equalTo: true } },
    { username: { startsWith: 'j' } }
  ]
}

// OR
where: {
  or: [
    { status: { equalTo: 'ACTIVE' } },
    { status: { equalTo: 'PENDING' } }
  ]
}

// NOT
where: {
  not: { status: { equalTo: 'DELETED' } }
}

// Complex combinations
where: {
  and: [
    { isActive: { equalTo: true } },
    {
      or: [
        { role: { equalTo: 'ADMIN' } },
        { role: { equalTo: 'MODERATOR' } }
      ]
    }
  ]
}
```

#### Ordering

```typescript
const users = await db.user
  .findMany({
    select: { id: true, username: true, createdAt: true },
    orderBy: [
      'CREATED_AT_DESC', // Newest first
      'USERNAME_ASC', // Then alphabetical
    ],
  })
  .unwrap();

// Available OrderBy values (generated per entity):
// - PRIMARY_KEY_ASC / PRIMARY_KEY_DESC
// - NATURAL
// - {FIELD_NAME}_ASC / {FIELD_NAME}_DESC
```

### Pagination

The ORM supports cursor-based and offset pagination:

```typescript
// First N records
const first10 = await db.user
  .findMany({
    select: { id: true },
    first: 10,
  })
  .unwrap();

// Last N records
const last10 = await db.user
  .findMany({
    select: { id: true },
    last: 10,
  })
  .unwrap();

// Cursor-based pagination (after/before)
const page1 = await db.user
  .findMany({
    select: { id: true },
    first: 10,
  })
  .unwrap();

const endCursor = page1.users.pageInfo.endCursor;

const page2 = await db.user
  .findMany({
    select: { id: true },
    first: 10,
    after: endCursor, // Get records after this cursor
  })
  .unwrap();

// Offset pagination
const page3 = await db.user
  .findMany({
    select: { id: true },
    first: 10,
    offset: 20, // Skip first 20 records
  })
  .unwrap();

// PageInfo structure
// {
//   hasNextPage: boolean;
//   hasPreviousPage: boolean;
//   startCursor: string | null;
//   endCursor: string | null;
// }

// Total count is always included
console.log(page1.users.totalCount); // Total matching records
```

### Error Handling

The ORM provides multiple ways to handle errors:

#### Discriminated Union (Recommended)

```typescript
const result = await db.user
  .findMany({
    select: { id: true },
  })
  .execute();

if (result.ok) {
  // TypeScript knows result.data is non-null
  console.log(result.data.users.nodes);
  // result.errors is undefined in this branch
} else {
  // TypeScript knows result.errors is non-null
  console.error(result.errors[0].message);
  // result.data is null in this branch
}
```

#### `.unwrap()` - Throw on Error

```typescript
import { GraphQLRequestError } from './generated/orm';

try {
  // Throws GraphQLRequestError if query fails
  const data = await db.user
    .findMany({
      select: { id: true },
    })
    .unwrap();

  console.log(data.users.nodes);
} catch (error) {
  if (error instanceof GraphQLRequestError) {
    console.error('GraphQL errors:', error.errors);
    console.error('Message:', error.message);
  }
}
```

#### `.unwrapOr()` - Default Value on Error

```typescript
// Returns default value if query fails (no throwing)
const data = await db.user
  .findMany({
    select: { id: true },
  })
  .unwrapOr({
    users: {
      nodes: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
  });

// Always returns data (either real or default)
console.log(data.users.nodes);
```

#### `.unwrapOrElse()` - Callback on Error

```typescript
// Call a function to handle errors and return fallback
const data = await db.user
  .findMany({
    select: { id: true },
  })
  .unwrapOrElse((errors) => {
    // Log errors, send to monitoring, etc.
    console.error('Query failed:', errors.map((e) => e.message).join(', '));

    // Return fallback data
    return {
      users: {
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      },
    };
  });
```

#### Error Types

```typescript
interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

class GraphQLRequestError extends Error {
  readonly errors: GraphQLError[];
  readonly data: unknown; // Partial data if available
}

type QueryResult<T> =
  | { ok: true; data: T; errors: undefined }
  | { ok: false; data: null; errors: GraphQLError[] };
```

### Custom Operations

Custom queries and mutations (like `login`, `currentUser`, etc.) are available on `db.query` and `db.mutation`:

#### Custom Queries

```typescript
// Query with select
const currentUser = await db.query
  .currentUser({
    select: { id: true, username: true, email: true },
  })
  .unwrap();

// Query without select (returns full type)
const me = await db.query.currentUser({}).unwrap();

// Query with arguments
const node = await db.query
  .nodeById(
    {
      id: 'some-node-id',
    },
    {
      select: { id: true },
    }
  )
  .unwrap();
```

#### Custom Mutations

```typescript
// Login mutation with typed select
const login = await db.mutation
  .login(
    {
      input: {
        email: 'user@example.com',
        password: 'secret123',
      },
    },
    {
      select: {
        clientMutationId: true,
        apiToken: {
          select: {
            accessToken: true,
            accessTokenExpiresAt: true,
          },
        },
      },
    }
  )
  .unwrap();

console.log(login.login.apiToken?.accessToken);

// Register mutation
const register = await db.mutation
  .register({
    input: {
      email: 'new@example.com',
      password: 'secret123',
      username: 'newuser',
    },
  })
  .unwrap();

// Logout mutation
await db.mutation
  .logout({
    input: { clientMutationId: 'optional-id' },
  })
  .execute();
```

### Query Builder API

Every operation returns a `QueryBuilder` that can be inspected before execution:

```typescript
const query = db.user.findMany({
  select: { id: true, username: true },
  where: { isActive: { equalTo: true } },
  first: 10,
});

// Inspect the generated GraphQL
console.log(query.toGraphQL());
// query UserQuery($where: UserFilter, $first: Int) {
//   users(filter: $where, first: $first) {
//     nodes { id username }
//     totalCount
//     pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
//   }
// }

// Get variables
console.log(query.getVariables());
// { where: { isActive: { equalTo: true } }, first: 10 }

// Execute when ready
const result = await query.execute();
// Or: const data = await query.unwrap();
```

### Client Configuration

```typescript
import { createClient } from './generated/orm';

// Basic configuration
const db = createClient({
  endpoint: 'https://api.example.com/graphql',
});

// With authentication
const db = createClient({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    Authorization: 'Bearer <token>',
    'X-Custom-Header': 'value',
  },
});

// Update headers at runtime
db.setHeaders({
  Authorization: 'Bearer <new-token>',
});

// Get current endpoint
console.log(db.getEndpoint());
```

---

## Architecture

### How It Works

1. **Fetch `_meta`**: Gets table metadata from PostGraphile's `_meta` query including:
   - Table names and fields
   - Relations (belongsTo, hasMany, manyToMany)
   - Constraints (primary key, foreign key, unique)
   - Inflection rules (query names, type names)

2. **Fetch `__schema`**: Gets full schema introspection for ALL operations:
   - All queries (including custom ones like `currentUser`)
   - All mutations (including custom ones like `login`, `register`)
   - All types (entities, inputs, enums, scalars)

3. **Filter Operations**: Removes table CRUD from custom operations to avoid duplicates

4. **Generate Code**: Creates type-safe code using AST-based generation (`ts-morph`)

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

### Key Concepts

#### Type Inference with Const Generics

The ORM uses TypeScript const generics to infer return types:

```typescript
// Model method signature
findMany<const S extends UserSelect>(
  args?: FindManyArgs<S, UserFilter, UsersOrderBy>
): QueryBuilder<{ users: ConnectionResult<InferSelectResult<User, S>> }>

// InferSelectResult maps select object to result type
type InferSelectResult<TEntity, TSelect> = {
  [K in keyof TSelect & keyof TEntity as TSelect[K] extends false | undefined
    ? never
    : K]: TSelect[K] extends true
    ? TEntity[K]
    : TSelect[K] extends { select: infer NestedSelect }
      ? /* handle nested select */
      : TEntity[K];
};
```

#### Select Types with Relations

Select types include relation fields with proper typing:

```typescript
export type OrderSelect = {
  // Scalar fields
  id?: boolean;
  orderNumber?: boolean;
  status?: boolean;

  // BelongsTo relation
  customer?: boolean | { select?: UserSelect };

  // HasMany relation
  orderItems?:
    | boolean
    | {
        select?: OrderItemSelect;
        first?: number;
        filter?: OrderItemFilter;
        orderBy?: OrderItemsOrderBy[];
      };

  // ManyToMany relation
  productsByOrderItemOrderIdAndProductId?:
    | boolean
    | {
        select?: ProductSelect;
        first?: number;
        filter?: ProductFilter;
        orderBy?: ProductsOrderBy[];
      };
};
```

---

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
  // ... more operators
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

export interface UserPatch {
  username?: string | null;
  email?: string | null;
  displayName?: string | null;
}
```

### Payload Types (Custom Operations)

```typescript
export interface LoginPayload {
  clientMutationId?: string | null;
  apiToken?: ApiToken | null;
}

export interface ApiToken {
  accessToken: string;
  accessTokenExpiresAt?: string | null;
}

export type LoginPayloadSelect = {
  clientMutationId?: boolean;
  apiToken?: boolean | { select?: ApiTokenSelect };
};
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run in watch mode
pnpm dev

# Test React Query hooks generation
node bin/graphql-sdk.js generate \
  -e http://public-0e394519.localhost:3000/graphql \
  -o ./output-rq \
  --verbose

# Test ORM client generation
node bin/graphql-sdk.js generate-orm \
  -e http://public-0e394519.localhost:3000/graphql \
  -o ./output-orm \
  --verbose

# Type check generated output
npx tsc --noEmit output-orm/*.ts output-orm/**/*.ts \
  --skipLibCheck --target ES2022 --module ESNext \
  --moduleResolution bundler --strict

# Run example tests
npx tsx examples/test-orm.ts
npx tsx examples/type-inference-test.ts

# Type check
pnpm lint:types

# Run tests
pnpm test
```

---

## Roadmap

- [x] **Relations**: Typed nested select with relation loading
- [x] **Type Inference**: Const generics for narrowed return types
- [x] **Error Handling**: Discriminated unions with unwrap methods
- [ ] **Aggregations**: Count, sum, avg operations
- [ ] **Batch Operations**: Bulk create/update/delete
- [ ] **Transactions**: Transaction support where available
- [ ] **Subscriptions**: Real-time subscription support
- [ ] **Custom Scalars**: Better handling of PostGraphile custom types
- [ ] **Query Caching**: Optional caching layer for ORM client
- [ ] **Middleware**: Request/response interceptors
- [ ] **Connection Pooling**: For high-throughput scenarios

## Requirements

- Node.js >= 18
- PostGraphile endpoint with `_meta` query enabled
- React Query v5 (peer dependency for React Query hooks)
- No dependencies for ORM client (uses native fetch)

## License

MIT
