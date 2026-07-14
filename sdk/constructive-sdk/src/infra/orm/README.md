# ORM Client

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { createClient } from './orm';

const db = createClient({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});
```

## Models

| Model | Operations |
|-------|------------|
| `dbPreset` | findMany, findOne, create, update, delete |
| `infraCommit` | findMany, findOne, create, update, delete |
| `infraGetAllRecord` | findMany, findOne, create, update, delete |
| `infraObject` | findMany, findOne, create, update, delete |
| `infraRef` | findMany, findOne, create, update, delete |
| `infraStore` | findMany, findOne, create, update, delete |
| `namespace` | findMany, findOne, create, update, delete |
| `namespaceEvent` | findMany, findOne, create, update, delete |
| `platformNamespace` | findMany, findOne, create, update, delete |
| `platformNamespaceEvent` | findMany, findOne, create, update, delete |

## Table Operations

### `db.dbPreset`

CRUD operations for DbPreset records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `active` | Boolean | Yes |
| `commitId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `definition` | JSON | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `label` | String | Yes |
| `modulesHash` | UUID | Yes |
| `slug` | String | Yes |
| `storeId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all dbPreset records
const items = await db.dbPreset.findMany({ select: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.dbPreset.findOne({ id: '<UUID>', select: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } }).execute();

// Create
const created = await db.dbPreset.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPreset.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPreset.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraCommit`

CRUD operations for InfraCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `date` | Datetime | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `parentIds` | UUID | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `treeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraCommit records
const items = await db.infraCommit.findMany({ select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.infraCommit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.infraCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraGetAllRecord`

CRUD operations for InfraGetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all infraGetAllRecord records
const items = await db.infraGetAllRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.infraGetAllRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.infraGetAllRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraGetAllRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraGetAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraObject`

CRUD operations for InfraObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `id` | UUID | No |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraObject records
const items = await db.infraObject.findMany({ select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Get one by id
const item = await db.infraObject.findOne({ id: '<UUID>', select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Create
const created = await db.infraObject.create({ data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraRef`

CRUD operations for InfraRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraRef records
const items = await db.infraRef.findMany({ select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Get one by id
const item = await db.infraRef.findOne({ id: '<UUID>', select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Create
const created = await db.infraRef.create({ data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraStore`

CRUD operations for InfraStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraStore records
const items = await db.infraStore.findMany({ select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Get one by id
const item = await db.infraStore.findOne({ id: '<UUID>', select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Create
const created = await db.infraStore.create({ data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraStore.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespace`

CRUD operations for Namespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isManaged` | Boolean | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all namespace records
const items = await db.namespace.findMany({ select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.namespace.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.namespace.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceEvent`

CRUD operations for NamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `cpuMillicores` | Int | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `memoryBytes` | BigInt | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `storageBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all namespaceEvent records
const items = await db.namespaceEvent.findMany({ select: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Get one by id
const item = await db.namespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Create
const created = await db.namespaceEvent.create({ data: { actorId: '<UUID>', cpuMillicores: '<Int>', databaseId: '<UUID>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespace`

CRUD operations for PlatformNamespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isManaged` | Boolean | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformNamespace records
const items = await db.platformNamespace.findMany({ select: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformNamespace.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.platformNamespace.create({ data: { annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespaceEvent`

CRUD operations for PlatformNamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `cpuMillicores` | Int | Yes |
| `createdAt` | Datetime | No |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `memoryBytes` | BigInt | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `storageBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all platformNamespaceEvent records
const items = await db.platformNamespaceEvent.findMany({ select: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Get one by id
const item = await db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Create
const created = await db.platformNamespaceEvent.create({ data: { actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation.infraInitEmptyRepo`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.infraInitEmptyRepo({ input: { sId: '<UUID>', storeId: '<UUID>' } }).execute();
```

### `db.mutation.infraInsertNodeAtPath`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

```typescript
const result = await db.mutation.infraInsertNodeAtPath({ input: '<InfraInsertNodeAtPathInput>' }).execute();
```

### `db.mutation.infraSetDataAtPath`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

```typescript
const result = await db.mutation.infraSetDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```

### `db.mutation.provisionBucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

```typescript
const result = await db.mutation.provisionBucket({ input: { bucketKey: '<String>', ownerId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
