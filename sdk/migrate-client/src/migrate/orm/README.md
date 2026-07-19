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
| `astMigration` | findMany, findOne, create, update, delete |
| `sqlAction` | findMany, findOne, create, update, delete |

## Table Operations

### `db.astMigration`

CRUD operations for AstMigration records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actionId` | UUID | Yes |
| `actionName` | String | Yes |
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `deploy` | JSON | Yes |
| `deploys` | String | Yes |
| `id` | Int | No |
| `name` | String | Yes |
| `payload` | JSON | Yes |
| `requires` | String | Yes |
| `revert` | JSON | Yes |
| `verify` | JSON | Yes |

**Operations:**

```typescript
// List all astMigration records
const items = await db.astMigration.findMany({ select: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } }).execute();

// Get one by id
const item = await db.astMigration.findOne({ id: '<Int>', select: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } }).execute();

// Create
const created = await db.astMigration.create({ data: { actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', databaseId: '<UUID>', deploy: '<JSON>', deploys: '<String>', name: '<String>', payload: '<JSON>', requires: '<String>', revert: '<JSON>', verify: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.astMigration.update({ where: { id: '<Int>' }, data: { actionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.astMigration.delete({ where: { id: '<Int>' } }).execute();
```

### `db.sqlAction`

CRUD operations for SqlAction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actionId` | UUID | Yes |
| `actionName` | String | Yes |
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
const items = await db.sqlAction.findMany({ select: { actionId: true, actionName: true, actorId: true, category: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Get one by id
const item = await db.sqlAction.findOne({ id: '<Int>', select: { actionId: true, actionName: true, actorId: true, category: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Create
const created = await db.sqlAction.create({ data: { actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', category: '<String>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlAction.update({ where: { id: '<Int>' }, data: { actionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sqlAction.delete({ where: { id: '<Int>' } }).execute();
```

## Custom Operations

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
