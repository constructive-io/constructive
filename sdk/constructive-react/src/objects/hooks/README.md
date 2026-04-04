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
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useObjectsQuery` | Query | List all objects |
| `useObjectQuery` | Query | Get one object |
| `useCreateObjectMutation` | Mutation | Create a object |
| `useUpdateObjectMutation` | Mutation | Update a object |
| `useDeleteObjectMutation` | Mutation | Delete a object |
| `useRefsQuery` | Query | A ref is a data structure for pointing to a commit. |
| `useRefQuery` | Query | A ref is a data structure for pointing to a commit. |
| `useCreateRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useUpdateRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useDeleteRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useStoresQuery` | Query | A store represents an isolated object repository within a database. |
| `useStoreQuery` | Query | A store represents an isolated object repository within a database. |
| `useCreateStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useUpdateStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useDeleteStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useCommitsQuery` | Query | A commit records changes to the repository. |
| `useCommitQuery` | Query | A commit records changes to the repository. |
| `useCreateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useUpdateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useDeleteCommitMutation` | Mutation | A commit records changes to the repository. |
| `useRevParseQuery` | Query | revParse |
| `useGetAllObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetPathObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetObjectAtPathQuery` | Query | getObjectAtPath |
| `useFreezeObjectsMutation` | Mutation | freezeObjects |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useRemoveNodeAtPathMutation` | Mutation | removeNodeAtPath |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useSetPropsAndCommitMutation` | Mutation | setPropsAndCommit |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useUpdateNodeAtPathMutation` | Mutation | updateNodeAtPath |
| `useSetAndCommitMutation` | Mutation | setAndCommit |
| `useRequestUploadUrlMutation` | Mutation | Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl. |
| `useConfirmUploadMutation` | Mutation | Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'. |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### GetAllRecord

```typescript
// List all getAll
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { path: true, data: true } },
});

// Create a getAllRecord
const { mutate: create } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ path: '<String>', data: '<JSON>' });
```

### Object

```typescript
// List all objects
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Get one object
const { data: item } = useObjectQuery({
  id: '<UUID>',
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Create a object
const { mutate: create } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
create({ hashUuid: '<UUID>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' });
```

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', hash: '<UUID>' });
```

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

## Custom Operation Hooks

### `useRevParseQuery`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `refname` | String |

### `useGetAllObjectsFromRootQuery`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `id` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useGetPathObjectsFromRootQuery`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `id` | UUID |
  | `path` | [String] |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useGetObjectAtPathQuery`

getObjectAtPath

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `path` | [String] |
  | `refname` | String |

### `useFreezeObjectsMutation`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | FreezeObjectsInput (required) |

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useRemoveNodeAtPathMutation`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

### `useSetPropsAndCommitMutation`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPropsAndCommitInput (required) |

### `useInsertNodeAtPathMutation`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

### `useUpdateNodeAtPathMutation`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | UpdateNodeAtPathInput (required) |

### `useSetAndCommitMutation`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetAndCommitInput (required) |

### `useRequestUploadUrlMutation`

Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestUploadUrlInput (required) |

### `useConfirmUploadMutation`

Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmUploadInput (required) |

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

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
