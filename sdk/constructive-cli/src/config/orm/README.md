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
| `platformConfigDefinition` | findMany, findOne, create, update, delete |
| `platformConfig` | findMany, findOne, create, update, delete |

## Table Operations

### `db.platformConfigDefinition`

CRUD operations for PlatformConfigDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `defaultValue` | String | Yes |
| `isBuiltIn` | Boolean | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |

**Operations:**

```typescript
// List all platformConfigDefinition records
const items = await db.platformConfigDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } }).execute();

// Get one by id
const item = await db.platformConfigDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } }).execute();

// Create
const created = await db.platformConfigDefinition.create({ data: { name: '<String>', description: '<String>', defaultValue: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformConfigDefinition.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformConfigDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformConfig`

CRUD operations for PlatformConfig records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `name` | String | Yes |
| `value` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `description` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `expiresAt` | Datetime | Yes |

**Operations:**

```typescript
// List all platformConfig records
const items = await db.platformConfig.findMany({ select: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Get one by id
const item = await db.platformConfig.findOne({ id: '<UUID>', select: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Create
const created = await db.platformConfig.create({ data: { namespaceId: '<UUID>', name: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformConfig.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformConfig.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation.platformSecretsDel`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsDelInput (required) |

```typescript
const result = await db.mutation.platformSecretsDel({ input: { secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.orgSecretsDel`

orgSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsDelInput (required) |

```typescript
const result = await db.mutation.orgSecretsDel({ input: { ownerId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.platformSecretsRemoveArray`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation.platformSecretsRemoveArray({ input: { secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.orgSecretsRemoveArray`

orgSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation.orgSecretsRemoveArray({ input: { ownerId: '<UUID>', secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.platformSecretsRotate`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRotateInput (required) |

```typescript
const result = await db.mutation.platformSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```

### `db.mutation.platformSecretsSet`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsSetInput (required) |

```typescript
const result = await db.mutation.platformSecretsSet({ input: { secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute();
```

### `db.mutation.orgSecretsRotate`

orgSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsRotateInput (required) |

```typescript
const result = await db.mutation.orgSecretsRotate({ input: { ownerId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```

### `db.mutation.orgSecretsSet`

orgSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsSetInput (required) |

```typescript
const result = await db.mutation.orgSecretsSet({ input: { scopeOwnerId: '<UUID>', secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute();
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
