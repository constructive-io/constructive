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
| `useInfraGetAllQuery` | Query | List all infraGetAll |
| `useCreateInfraGetAllRecordMutation` | Mutation | Create a infraGetAllRecord |
| `useInfraRefsQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useInfraRefQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useCreateInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useUpdateInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useDeleteInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useInfraStoresQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useInfraStoreQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useCreateInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useUpdateInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useDeleteInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useInfraObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useInfraObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useInfraCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useInfraCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDbPresetsQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDbPresetQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useCreateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useUpdateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDeleteDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `usePlatformNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeletePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeleteNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeletePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeleteNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useInfraInitEmptyRepoMutation` | Mutation | infraInitEmptyRepo |
| `useInfraSetDataAtPathMutation` | Mutation | infraSetDataAtPath |
| `useInfraInsertNodeAtPathMutation` | Mutation | infraInsertNodeAtPath |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### InfraGetAllRecord

```typescript
// List all infraGetAll
const { data, isLoading } = useInfraGetAllQuery({
  selection: { fields: { path: true, data: true } },
});

// Create a infraGetAllRecord
const { mutate: create } = useCreateInfraGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ path: '<String>', data: '<JSON>' });
```

### InfraRef

```typescript
// List all infraRefs
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Get one infraRef
const { data: item } = useInfraRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Create a infraRef
const { mutate: create } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### InfraStore

```typescript
// List all infraStores
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Get one infraStore
const { data: item } = useInfraStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Create a infraStore
const { mutate: create } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', hash: '<UUID>' });
```

### InfraObject

```typescript
// List all infraObjects
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Get one infraObject
const { data: item } = useInfraObjectQuery({
  id: '<UUID>',
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Create a infraObject
const { mutate: create } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
create({ scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```

### InfraCommit

```typescript
// List all infraCommits
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one infraCommit
const { data: item } = useInfraCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a infraCommit
const { mutate: create } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

### DbPreset

```typescript
// List all dbPresets
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } },
});

// Get one dbPreset
const { data: item } = useDbPresetQuery({
  id: '<UUID>',
  selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } },
});

// Create a dbPreset
const { mutate: create } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
create({ storeId: '<UUID>', slug: '<String>', definition: '<JSON>', commitId: '<UUID>', modulesHash: '<UUID>', label: '<String>', description: '<String>', active: '<Boolean>' });
```

### PlatformNamespace

```typescript
// List all platformNamespaces
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } },
});

// Get one platformNamespace
const { data: item } = usePlatformNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } },
});

// Create a platformNamespace
const { mutate: create } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', isManaged: '<Boolean>' });
```

### Namespace

```typescript
// List all namespaces
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } },
});

// Get one namespace
const { data: item } = useNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } },
});

// Create a namespace
const { mutate: create } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' });
```

### PlatformNamespaceEvent

```typescript
// List all platformNamespaceEvents
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } },
});

// Get one platformNamespaceEvent
const { data: item } = usePlatformNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } },
});

// Create a platformNamespaceEvent
const { mutate: create } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' });
```

### NamespaceEvent

```typescript
// List all namespaceEvents
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Get one namespaceEvent
const { data: item } = useNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Create a namespaceEvent
const { mutate: create } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' });
```

## Custom Operation Hooks

### `useInfraInitEmptyRepoMutation`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

### `useInfraSetDataAtPathMutation`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

### `useInfraInsertNodeAtPathMutation`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

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
