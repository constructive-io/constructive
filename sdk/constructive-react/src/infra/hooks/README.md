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
| `useDbPresetsQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDbPresetQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useCreateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useUpdateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDeleteDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useInfraCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useInfraCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useInfraGetAllQuery` | Query | List all infraGetAll |
| `useCreateInfraGetAllRecordMutation` | Mutation | Create a infraGetAllRecord |
| `useInfraObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useInfraObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
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
| `useNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeleteNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeleteNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeletePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeletePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useInfraInitEmptyRepoMutation` | Mutation | infraInitEmptyRepo |
| `useInfraInsertNodeAtPathMutation` | Mutation | infraInsertNodeAtPath |
| `useInfraSetDataAtPathMutation` | Mutation | infraSetDataAtPath |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### DbPreset

```typescript
// List all dbPresets
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } },
});

// Get one dbPreset
const { data: item } = useDbPresetQuery({
  id: '<UUID>',
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } },
});

// Create a dbPreset
const { mutate: create } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
create({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' });
```

### InfraCommit

```typescript
// List all infraCommits
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Get one infraCommit
const { data: item } = useInfraCommitQuery({
  id: '<UUID>',
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Create a infraCommit
const { mutate: create } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
create({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```

### InfraGetAllRecord

```typescript
// List all infraGetAll
const { data, isLoading } = useInfraGetAllQuery({
  selection: { fields: { data: true, path: true } },
});

// Create a infraGetAllRecord
const { mutate: create } = useCreateInfraGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', path: '<String>' });
```

### InfraObject

```typescript
// List all infraObjects
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Get one infraObject
const { data: item } = useInfraObjectQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Create a infraObject
const { mutate: create } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```

### InfraRef

```typescript
// List all infraRefs
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Get one infraRef
const { data: item } = useInfraRefQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Create a infraRef
const { mutate: create } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' });
```

### InfraStore

```typescript
// List all infraStores
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Get one infraStore
const { data: item } = useInfraStoreQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Create a infraStore
const { mutate: create } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
create({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```

### Namespace

```typescript
// List all namespaces
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Get one namespace
const { data: item } = useNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Create a namespace
const { mutate: create } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```

### NamespaceEvent

```typescript
// List all namespaceEvents
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});

// Get one namespaceEvent
const { data: item } = useNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});

// Create a namespaceEvent
const { mutate: create } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', cpuMillicores: '<Int>', databaseId: '<UUID>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' });
```

### PlatformNamespace

```typescript
// List all platformNamespaces
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Get one platformNamespace
const { data: item } = usePlatformNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Create a platformNamespace
const { mutate: create } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```

### PlatformNamespaceEvent

```typescript
// List all platformNamespaceEvents
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});

// Get one platformNamespaceEvent
const { data: item } = usePlatformNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});

// Create a platformNamespaceEvent
const { mutate: create } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' });
```

## Custom Operation Hooks

### `useInfraInitEmptyRepoMutation`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

### `useInfraInsertNodeAtPathMutation`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

### `useInfraSetDataAtPathMutation`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

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
