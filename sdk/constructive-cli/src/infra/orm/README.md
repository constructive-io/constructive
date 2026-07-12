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
| `infraGetAllRecord` | findMany, findOne, create, update, delete |
| `infraRef` | findMany, findOne, create, update, delete |
| `infraStore` | findMany, findOne, create, update, delete |
| `infraObject` | findMany, findOne, create, update, delete |
| `infraCommit` | findMany, findOne, create, update, delete |
| `dbPreset` | findMany, findOne, create, update, delete |
| `platformNamespace` | findMany, findOne, create, update, delete |
| `namespace` | findMany, findOne, create, update, delete |
| `platformNamespaceEvent` | findMany, findOne, create, update, delete |
| `namespaceEvent` | findMany, findOne, create, update, delete |

## Table Operations

### `db.infraGetAllRecord`

CRUD operations for InfraGetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `path` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all infraGetAllRecord records
const items = await db.infraGetAllRecord.findMany({ select: { path: true, data: true } }).execute();

// Get one by id
const item = await db.infraGetAllRecord.findOne({ id: '<UUID>', select: { path: true, data: true } }).execute();

// Create
const created = await db.infraGetAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraGetAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraGetAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraRef`

CRUD operations for InfraRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `commitId` | UUID | Yes |

**Operations:**

```typescript
// List all infraRef records
const items = await db.infraRef.findMany({ select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Get one by id
const item = await db.infraRef.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.infraRef.create({ data: { name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraRef.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraStore`

CRUD operations for InfraStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `hash` | UUID | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all infraStore records
const items = await db.infraStore.findMany({ select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Get one by id
const item = await db.infraStore.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.infraStore.create({ data: { name: '<String>', scopeId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraStore.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraObject`

CRUD operations for InfraObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `scopeId` | UUID | Yes |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `data` | JSON | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all infraObject records
const items = await db.infraObject.findMany({ select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Get one by id
const item = await db.infraObject.findOne({ id: '<UUID>', select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Create
const created = await db.infraObject.create({ data: { scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraObject.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraCommit`

CRUD operations for InfraCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `message` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `parentIds` | UUID | Yes |
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `treeId` | UUID | Yes |
| `date` | Datetime | Yes |

**Operations:**

```typescript
// List all infraCommit records
const items = await db.infraCommit.findMany({ select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Get one by id
const item = await db.infraCommit.findOne({ id: '<UUID>', select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.infraCommit.create({ data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbPreset`

CRUD operations for DbPreset records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `storeId` | UUID | Yes |
| `slug` | String | Yes |
| `definition` | JSON | Yes |
| `commitId` | UUID | Yes |
| `modulesHash` | UUID | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `active` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all dbPreset records
const items = await db.dbPreset.findMany({ select: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.dbPreset.findOne({ id: '<UUID>', select: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.dbPreset.create({ data: { storeId: '<UUID>', slug: '<String>', definition: '<JSON>', commitId: '<UUID>', modulesHash: '<UUID>', label: '<String>', description: '<String>', active: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPreset.update({ where: { id: '<UUID>' }, data: { storeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPreset.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespace`

CRUD operations for PlatformNamespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `description` | String | Yes |
| `isActive` | Boolean | Yes |
| `status` | String | Yes |
| `lastError` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `isManaged` | Boolean | Yes |

**Operations:**

```typescript
// List all platformNamespace records
const items = await db.platformNamespace.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } }).execute();

// Get one by id
const item = await db.platformNamespace.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } }).execute();

// Create
const created = await db.platformNamespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', isManaged: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespace`

CRUD operations for Namespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `description` | String | Yes |
| `isActive` | Boolean | Yes |
| `status` | String | Yes |
| `lastError` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `isManaged` | Boolean | Yes |

**Operations:**

```typescript
// List all namespace records
const items = await db.namespace.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } }).execute();

// Get one by id
const item = await db.namespace.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } }).execute();

// Create
const created = await db.namespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespaceEvent`

CRUD operations for PlatformNamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `cpuMillicores` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `storageBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `metrics` | JSON | Yes |

**Operations:**

```typescript
// List all platformNamespaceEvent records
const items = await db.platformNamespaceEvent.findMany({ select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } }).execute();

// Get one by id
const item = await db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } }).execute();

// Create
const created = await db.platformNamespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceEvent`

CRUD operations for NamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `cpuMillicores` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `storageBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `metrics` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all namespaceEvent records
const items = await db.namespaceEvent.findMany({ select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } }).execute();

// Get one by id
const item = await db.namespaceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } }).execute();

// Create
const created = await db.namespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.mutation.infraSetDataAtPath`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

```typescript
const result = await db.mutation.infraSetDataAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
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
