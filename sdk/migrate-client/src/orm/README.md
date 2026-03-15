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
| `migrateFile` | findMany, findOne, create, update, delete |
| `sqlAction` | findMany, findOne, create, update, delete |

## Table Operations

### `db.migrateFile`

CRUD operations for MigrateFile records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `upload` | ConstructiveInternalTypeUpload | Yes |

**Operations:**

```typescript
// List all migrateFile records
const items = await db.migrateFile.findMany({ select: { id: true, databaseId: true, upload: true } }).execute();

// Get one by id
const item = await db.migrateFile.findOne({ id: '<value>', select: { id: true, databaseId: true, upload: true } }).execute();

// Create
const created = await db.migrateFile.create({ data: { databaseId: '<value>', upload: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.migrateFile.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.migrateFile.delete({ where: { id: '<value>' } }).execute();
```

### `db.sqlAction`

CRUD operations for SqlAction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `name` | String | Yes |
| `databaseId` | UUID | Yes |
| `deploy` | String | Yes |
| `deps` | String | Yes |
| `payload` | JSON | Yes |
| `content` | String | Yes |
| `revert` | String | Yes |
| `verify` | String | Yes |
| `createdAt` | Datetime | No |
| `action` | String | Yes |
| `actionId` | UUID | Yes |
| `actorId` | UUID | Yes |
| `nameTrgmSimilarity` | Float | Yes |
| `deployTrgmSimilarity` | Float | Yes |
| `contentTrgmSimilarity` | Float | Yes |
| `revertTrgmSimilarity` | Float | Yes |
| `verifyTrgmSimilarity` | Float | Yes |
| `actionTrgmSimilarity` | Float | Yes |
| `searchScore` | Float | Yes |

**Operations:**

```typescript
// List all sqlAction records
const items = await db.sqlAction.findMany({ select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } }).execute();

// Get one by id
const item = await db.sqlAction.findOne({ id: '<value>', select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } }).execute();

// Create
const created = await db.sqlAction.create({ data: { name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>', nameTrgmSimilarity: '<value>', deployTrgmSimilarity: '<value>', contentTrgmSimilarity: '<value>', revertTrgmSimilarity: '<value>', verifyTrgmSimilarity: '<value>', actionTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlAction.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sqlAction.delete({ where: { id: '<value>' } }).execute();
```

## Custom Operations

### `db.mutation.executeSql`

executeSql

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExecuteSqlInput (required) |

```typescript
const result = await db.mutation.executeSql({ input: '<value>' }).execute();
```

### `db.mutation.runMigration`

runMigration

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RunMigrationInput (required) |

```typescript
const result = await db.mutation.runMigration({ input: '<value>' }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
