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
| `commit` | findMany, findOne, create, update, delete |
| `getAllTreeNodesRecord` | findMany, findOne, create, update, delete |
| `object` | findMany, findOne, create, update, delete |
| `ref` | findMany, findOne, create, update, delete |
| `store` | findMany, findOne, create, update, delete |

## Table Operations

### `db.commit`

CRUD operations for Commit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `date` | Datetime | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `parentIds` | UUID | Yes |
| `storeId` | UUID | Yes |
| `treeId` | UUID | Yes |

**Operations:**

```typescript
// List all commit records
const items = await db.commit.findMany({ select: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.commit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.commit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.commit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.commit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.getAllTreeNodesRecord`

CRUD operations for GetAllTreeNodesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all getAllTreeNodesRecord records
const items = await db.getAllTreeNodesRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.getAllTreeNodesRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.getAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.object`

CRUD operations for Object records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |

**Operations:**

```typescript
// List all object records
const items = await db.object.findMany({ select: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } }).execute();

// Get one by id
const item = await db.object.findOne({ id: '<UUID>', select: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } }).execute();

// Create
const created = await db.object.create({ data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.object.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.object.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.ref`

CRUD operations for Ref records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all ref records
const items = await db.ref.findMany({ select: { commitId: true, databaseId: true, id: true, name: true, storeId: true } }).execute();

// Get one by id
const item = await db.ref.findOne({ id: '<UUID>', select: { commitId: true, databaseId: true, id: true, name: true, storeId: true } }).execute();

// Create
const created = await db.ref.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.ref.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.ref.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.store`

CRUD operations for Store records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all store records
const items = await db.store.findMany({ select: { createdAt: true, databaseId: true, hash: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.store.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, hash: true, id: true, name: true } }).execute();

// Create
const created = await db.store.create({ data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.store.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.store.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation.initEmptyRepo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.initEmptyRepo({ input: { sId: '<UUID>', storeId: '<UUID>' } }).execute();
```

### `db.mutation.insertNodeAtPath`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

```typescript
const result = await db.mutation.insertNodeAtPath({ input: '<InsertNodeAtPathInput>' }).execute();
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

### `db.mutation.setDataAtPath`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

```typescript
const result = await db.mutation.setDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
