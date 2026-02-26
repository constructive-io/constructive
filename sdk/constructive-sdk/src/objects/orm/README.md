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
const item = await db.getAllRecord.findOne({ where: { id: '<value>' }, select: { path: true, data: true } }).execute();

// Create
const created = await db.getAllRecord.create({ data: { path: '<value>', data: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllRecord.update({ where: { id: '<value>' }, data: { path: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllRecord.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.object.findOne({ where: { id: '<value>' }, select: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } }).execute();

// Create
const created = await db.object.create({ data: { hashUuid: '<value>', databaseId: '<value>', kids: '<value>', ktree: '<value>', data: '<value>', frzn: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.object.update({ where: { id: '<value>' }, data: { hashUuid: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.object.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.ref.findOne({ where: { id: '<value>' }, select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.ref.create({ data: { name: '<value>', databaseId: '<value>', storeId: '<value>', commitId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.ref.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.ref.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.store.findOne({ where: { id: '<value>' }, select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.store.create({ data: { name: '<value>', databaseId: '<value>', hash: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.store.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.store.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.commit.findOne({ where: { id: '<value>' }, select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.commit.create({ data: { message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.commit.update({ where: { id: '<value>' }, data: { message: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.commit.delete({ where: { id: '<value>' } }).execute();
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
const result = await db.query.revParse({ dbId: '<value>', storeId: '<value>', refname: '<value>' }).execute();
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
const result = await db.query.getAllObjectsFromRoot({ databaseId: '<value>', id: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
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
const result = await db.query.getPathObjectsFromRoot({ databaseId: '<value>', id: '<value>', path: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
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
const result = await db.query.getObjectAtPath({ dbId: '<value>', storeId: '<value>', path: '<value>', refname: '<value>' }).execute();
```

### `db.mutation.freezeObjects`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | FreezeObjectsInput (required) |

```typescript
const result = await db.mutation.freezeObjects({ input: '<value>' }).execute();
```

### `db.mutation.initEmptyRepo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.initEmptyRepo({ input: '<value>' }).execute();
```

### `db.mutation.removeNodeAtPath`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

```typescript
const result = await db.mutation.removeNodeAtPath({ input: '<value>' }).execute();
```

### `db.mutation.setDataAtPath`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

```typescript
const result = await db.mutation.setDataAtPath({ input: '<value>' }).execute();
```

### `db.mutation.setPropsAndCommit`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPropsAndCommitInput (required) |

```typescript
const result = await db.mutation.setPropsAndCommit({ input: '<value>' }).execute();
```

### `db.mutation.insertNodeAtPath`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

```typescript
const result = await db.mutation.insertNodeAtPath({ input: '<value>' }).execute();
```

### `db.mutation.updateNodeAtPath`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | UpdateNodeAtPathInput (required) |

```typescript
const result = await db.mutation.updateNodeAtPath({ input: '<value>' }).execute();
```

### `db.mutation.setAndCommit`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetAndCommitInput (required) |

```typescript
const result = await db.mutation.setAndCommit({ input: '<value>' }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
