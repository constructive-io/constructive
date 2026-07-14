# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useRefsQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useRefQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useCreateRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useUpdateRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useDeleteRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useStoresQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useStoreQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useCreateStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useUpdateStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useDeleteStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |

## Table Hooks

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<UUID>',
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```

### GetAllRecord

```typescript
// List all getAll
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { data: true, path: true } },
});

// Create a getAllRecord
const { mutate: create } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', path: '<String>' });
```

### Object

```typescript
// List all objects
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});

// Get one object
const { data: item } = useObjectQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});

// Create a object
const { mutate: create } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' });
```

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', hash: '<UUID>', name: '<String>' });
```

## Custom Operation Hooks

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useInsertNodeAtPathMutation`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
