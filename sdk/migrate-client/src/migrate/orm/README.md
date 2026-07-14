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
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `upload` | ConstructiveInternalTypeUpload | Yes |

**Operations:**

```typescript
// List all migrateFile records
const items = await db.migrateFile.findMany({ select: { databaseId: true, id: true, upload: true } }).execute();

// Get one by id
const item = await db.migrateFile.findOne({ id: '<UUID>', select: { databaseId: true, id: true, upload: true } }).execute();

// Create
const created = await db.migrateFile.create({ data: { databaseId: '<UUID>', upload: '<Upload>' }, select: { id: true } }).execute();

// Update
const updated = await db.migrateFile.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.migrateFile.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sqlAction`

CRUD operations for SqlAction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `action` | String | Yes |
| `actionId` | UUID | Yes |
| `actorId` | UUID | Yes |
| `category` | String | Yes |
| `content` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `deploy` | String | Yes |
| `deps` | String | Yes |
| `id` | Int | No |
| `name` | String | Yes |
| `payload` | JSON | Yes |
| `revert` | String | Yes |
| `verify` | String | Yes |

**Operations:**

```typescript
// List all sqlAction records
const items = await db.sqlAction.findMany({ select: { action: true, actionId: true, actorId: true, category: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Get one by id
const item = await db.sqlAction.findOne({ id: '<Int>', select: { action: true, actionId: true, actorId: true, category: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Create
const created = await db.sqlAction.create({ data: { action: '<String>', actionId: '<UUID>', actorId: '<UUID>', category: '<String>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlAction.update({ where: { id: '<Int>' }, data: { action: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sqlAction.delete({ where: { id: '<Int>' } }).execute();
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
const result = await db.mutation.executeSql({ input: { stmt: '<String>' } }).execute();
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

### `db.mutation.runMigration`

runMigration

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RunMigrationInput (required) |

```typescript
const result = await db.mutation.runMigration({ input: { databaseId: '<UUID>', kind: '<String>', migration: '<Int>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
