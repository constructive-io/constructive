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
const item = await db.migrateFile.findOne({ id: '<UUID>', select: { id: true, databaseId: true, upload: true } }).execute();

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

**Operations:**

```typescript
// List all sqlAction records
const items = await db.sqlAction.findMany({ select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Get one by id
const item = await db.sqlAction.findOne({ id: '<Int>', select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Create
const created = await db.sqlAction.create({ data: { name: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', payload: '<JSON>', content: '<String>', revert: '<String>', verify: '<String>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlAction.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute();

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

### `db.mutation.runMigration`

runMigration

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RunMigrationInput (required) |

```typescript
const result = await db.mutation.runMigration({ input: { databaseId: '<UUID>', migration: '<Int>', kind: '<String>' } }).execute();
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
