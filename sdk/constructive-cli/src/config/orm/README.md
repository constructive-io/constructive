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
| `config` | findMany, findOne, create, update, delete |
| `platformConfig` | findMany, findOne, create, update, delete |
| `platformInternalSecret` | findMany, findOne, create, update, delete |
| `platformSecret` | findMany, findOne, create, update, delete |
| `secret` | findMany, findOne, create, update, delete |

## Table Operations

### `db.config`

CRUD operations for Config records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `provider` | String | Yes |
| `updatedAt` | Datetime | No |
| `value` | String | Yes |

**Operations:**

```typescript
// List all config records
const items = await db.config.findMany({ select: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } }).execute();

// Get one by id
const item = await db.config.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } }).execute();

// Create
const created = await db.config.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.config.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.config.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformConfig`

CRUD operations for PlatformConfig records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `provider` | String | Yes |
| `updatedAt` | Datetime | No |
| `value` | String | Yes |

**Operations:**

```typescript
// List all platformConfig records
const items = await db.platformConfig.findMany({ select: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } }).execute();

// Get one by id
const item = await db.platformConfig.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } }).execute();

// Create
const created = await db.platformConfig.create({ data: { annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformConfig.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformConfig.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInternalSecret`

CRUD operations for PlatformInternalSecret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `retiredAt` | Datetime | Yes |
| `rotatedAt` | Datetime | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformInternalSecret records
const items = await db.platformInternalSecret.findMany({ select: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformInternalSecret.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Create
const created = await db.platformInternalSecret.create({ data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInternalSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInternalSecret.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformSecret`

CRUD operations for PlatformSecret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `provider` | String | Yes |
| `retiredAt` | Datetime | Yes |
| `rotatedAt` | Datetime | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformSecret records
const items = await db.platformSecret.findMany({ select: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformSecret.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Create
const created = await db.platformSecret.create({ data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformSecret.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secret`

CRUD operations for Secret records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `provider` | String | Yes |
| `retiredAt` | Datetime | Yes |
| `rotatedAt` | Datetime | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all secret records
const items = await db.secret.findMany({ select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.secret.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } }).execute();

// Create
const created = await db.secret.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.secret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secret.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation._secretsDel`

_secretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsDelInput (required) |

```typescript
const result = await db.mutation._secretsDel({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', secretName: '<String>' } }).execute();
```

### `db.mutation._secretsRemoveArray`

_secretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation._secretsRemoveArray({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', secretNames: '<String>' } }).execute();
```

### `db.mutation._secretsRotate`

_secretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRotateInput (required) |

```typescript
const result = await db.mutation._secretsRotate({ input: { algo: '<String>', databaseId: '<UUID>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
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

### `db.mutation.platformInternalSecretsDel`

platformInternalSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsDelInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsDel({ input: { namespaceId: '<UUID>', secretName: '<String>' } }).execute();
```

### `db.mutation.platformInternalSecretsRemoveArray`

platformInternalSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute();
```

### `db.mutation.platformInternalSecretsRotate`

platformInternalSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRotateInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
```

### `db.mutation.platformInternalSecretsSet`

platformInternalSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsSetInput (required) |

```typescript
const result = await db.mutation.platformInternalSecretsSet({ input: { algo: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute();
```

### `db.mutation.platformSecretsDel`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsDelInput (required) |

```typescript
const result = await db.mutation.platformSecretsDel({ input: { namespaceId: '<UUID>', secretName: '<String>' } }).execute();
```

### `db.mutation.platformSecretsRemoveArray`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRemoveArrayInput (required) |

```typescript
const result = await db.mutation.platformSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute();
```

### `db.mutation.platformSecretsRotate`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRotateInput (required) |

```typescript
const result = await db.mutation.platformSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
```

### `db.mutation.platformSecretsSet`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsSetInput (required) |

```typescript
const result = await db.mutation.platformSecretsSet({ input: { algo: '<String>', provider: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute();
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
