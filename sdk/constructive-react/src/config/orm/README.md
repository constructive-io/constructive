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
| `platformConfig` | findMany, findOne, create, update, delete |
| `config` | findMany, findOne, create, update, delete |
| `platformInternalSecret` | findMany, findOne, create, update, delete |
| `platformSecret` | findMany, findOne, create, update, delete |
| `secret` | findMany, findOne, create, update, delete |

## Table Operations

### `db.platformConfig`

CRUD operations for PlatformConfig records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `name` | String | Yes |
| `provider` | String | Yes |
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
const items = await db.platformConfig.findMany({ select: { id: true, namespaceId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Get one by id
const item = await db.platformConfig.findOne({ id: '<UUID>', select: { id: true, namespaceId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Create
const created = await db.platformConfig.create({ data: { namespaceId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformConfig.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformConfig.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.config`

CRUD operations for Config records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `provider` | String | Yes |
| `value` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `description` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `expiresAt` | Datetime | Yes |

**Operations:**

```typescript
// List all config records
const items = await db.config.findMany({ select: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Get one by id
const item = await db.config.findOne({ id: '<UUID>', select: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } }).execute();

// Create
const created = await db.config.create({ data: { namespaceId: '<UUID>', databaseId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.config.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.config.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInternalSecret`

CRUD operations for PlatformInternalSecret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `description` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `rotatedAt` | Datetime | Yes |
| `retiredAt` | Datetime | Yes |

**Operations:**

```typescript
// List all platformInternalSecret records
const items = await db.platformInternalSecret.findMany({ select: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Get one by id
const item = await db.platformInternalSecret.findOne({ id: '<UUID>', select: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Create
const created = await db.platformInternalSecret.create({ data: { name: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInternalSecret.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInternalSecret.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformSecret`

CRUD operations for PlatformSecret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `provider` | String | Yes |
| `namespaceId` | UUID | Yes |
| `description` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `rotatedAt` | Datetime | Yes |
| `retiredAt` | Datetime | Yes |

**Operations:**

```typescript
// List all platformSecret records
const items = await db.platformSecret.findMany({ select: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Get one by id
const item = await db.platformSecret.findOne({ id: '<UUID>', select: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Create
const created = await db.platformSecret.create({ data: { name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformSecret.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformSecret.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secret`

CRUD operations for Secret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `provider` | String | Yes |
| `namespaceId` | UUID | Yes |
| `description` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `rotatedAt` | Datetime | Yes |
| `retiredAt` | Datetime | Yes |

**Operations:**

```typescript
// List all secret records
const items = await db.secret.findMany({ select: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Get one by id
const item = await db.secret.findOne({ id: '<UUID>', select: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } }).execute();

// Create
const created = await db.secret.create({ data: { databaseId: '<UUID>', name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.secret.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secret.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation.platformInternalSecretsDel`

platformInternalSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsDelInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsDel({ input: { secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```

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

### `db.mutation._secretsDel`

_secretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsDelInput (required) |

```typescript
const result = await db.mutation._secretsDel({ input: { databaseId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.platformInternalSecretsRemoveArray`

platformInternalSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsRemoveArray({ input: { secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
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

### `db.mutation._secretsRemoveArray`

_secretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation._secretsRemoveArray({ input: { databaseId: '<UUID>', secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
```

### `db.mutation.platformInternalSecretsRotate`

platformInternalSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRotateInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```

### `db.mutation.platformInternalSecretsSet`

platformInternalSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsSetInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsSet({ input: { secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute();
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

### `db.mutation._secretsRotate`

_secretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRotateInput (required) |

```typescript
const result = await db.mutation._secretsRotate({ input: { databaseId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```

### `db.mutation.platformSecretsSet`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsSetInput (required) |

```typescript
const result = await db.mutation.platformSecretsSet({ input: { secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>', provider: '<String>' } }).execute();
```

### `db.mutation._secretsSet`

_secretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsSetInput (required) |

```typescript
const result = await db.mutation._secretsSet({ input: '<_SecretsSetInput>' }).execute();
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
