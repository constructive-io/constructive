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
| `getAllRecord` | findMany, findOne, create, update, delete |
| `object` | findMany, findOne, create, update, delete |
| `ref` | findMany, findOne, create, update, delete |
| `store` | findMany, findOne, create, update, delete |
| `commit` | findMany, findOne, create, update, delete |

## Table Operations

### `db.getAllRecord`

CRUD operations for GetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `path` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all getAllRecord records
const items = await db.getAllRecord.findMany({ select: { path: true, data: true } }).execute();

// Get one by id
const item = await db.getAllRecord.findOne({ id: '<UUID>', select: { path: true, data: true } }).execute();

// Create
const created = await db.getAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.object`

CRUD operations for Object records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `hashUuid` | UUID | Yes |
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `data` | JSON | Yes |
| `frzn` | Boolean | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all object records
const items = await db.object.findMany({ select: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } }).execute();

// Get one by id
const item = await db.object.findOne({ id: '<UUID>', select: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } }).execute();

// Create
const created = await db.object.create({ data: { hashUuid: '<UUID>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.object.update({ where: { id: '<UUID>' }, data: { hashUuid: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.object.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.ref`

CRUD operations for Ref records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `databaseId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `commitId` | UUID | Yes |

**Operations:**

```typescript
// List all ref records
const items = await db.ref.findMany({ select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

// Get one by id
const item = await db.ref.findOne({ id: '<UUID>', select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.ref.create({ data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.ref.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.ref.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.store`

CRUD operations for Store records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `databaseId` | UUID | Yes |
| `hash` | UUID | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all store records
const items = await db.store.findMany({ select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Get one by id
const item = await db.store.findOne({ id: '<UUID>', select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.store.create({ data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.store.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.store.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.commit`

CRUD operations for Commit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `message` | String | Yes |
| `databaseId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `parentIds` | UUID | Yes |
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `treeId` | UUID | Yes |
| `date` | Datetime | Yes |

**Operations:**

```typescript
// List all commit records
const items = await db.commit.findMany({ select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Get one by id
const item = await db.commit.findOne({ id: '<UUID>', select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.commit.create({ data: { message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.commit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.commit.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.revParse`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `refname` | String |

```typescript
const result = await db.query.revParse({ dbId: '<UUID>', storeId: '<UUID>', refname: '<String>' }).execute();
```

### `db.query.getAllObjectsFromRoot`

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

```typescript
const result = await db.query.getAllObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.getPathObjectsFromRoot`

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

```typescript
const result = await db.query.getPathObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', path: '<String>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.getObjectAtPath`

getObjectAtPath

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `path` | [String] |
  | `refname` | String |

```typescript
const result = await db.query.getObjectAtPath({ dbId: '<UUID>', storeId: '<UUID>', path: '<String>', refname: '<String>' }).execute();
```

### `db.mutation.freezeObjects`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | FreezeObjectsInput (required) |

```typescript
const result = await db.mutation.freezeObjects({ input: { databaseId: '<UUID>', id: '<UUID>' } }).execute();
```

### `db.mutation.initEmptyRepo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.initEmptyRepo({ input: { dbId: '<UUID>', storeId: '<UUID>' } }).execute();
```

### `db.mutation.removeNodeAtPath`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

```typescript
const result = await db.mutation.removeNodeAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>' } }).execute();
```

### `db.mutation.setDataAtPath`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

```typescript
const result = await db.mutation.setDataAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
```

### `db.mutation.setPropsAndCommit`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPropsAndCommitInput (required) |

```typescript
const result = await db.mutation.setPropsAndCommit({ input: { dbId: '<UUID>', storeId: '<UUID>', refname: '<String>', path: '<String>', data: '<JSON>' } }).execute();
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

### `db.mutation.updateNodeAtPath`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | UpdateNodeAtPathInput (required) |

```typescript
const result = await db.mutation.updateNodeAtPath({ input: '<UpdateNodeAtPathInput>' }).execute();
```

### `db.mutation.setAndCommit`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetAndCommitInput (required) |

```typescript
const result = await db.mutation.setAndCommit({ input: '<SetAndCommitInput>' }).execute();
```

### `db.mutation.requestUploadUrl`

Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestUploadUrlInput (required) |

```typescript
const result = await db.mutation.requestUploadUrl({ input: '<RequestUploadUrlInput>' }).execute();
```

### `db.mutation.confirmUpload`

Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmUploadInput (required) |

```typescript
const result = await db.mutation.confirmUpload({ input: { fileId: '<UUID>' } }).execute();
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
