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
| `api` | findMany, findOne, create, update, delete |
| `apiModule` | findMany, findOne, create, update, delete |
| `apiSchema` | findMany, findOne, create, update, delete |
| `apiSetting` | findMany, findOne, create, update, delete |
| `app` | findMany, findOne, create, update, delete |
| `astMigration` | findMany, findOne, create, update, delete |
| `checkConstraint` | findMany, findOne, create, update, delete |
| `compositeType` | findMany, findOne, create, update, delete |
| `corsSetting` | findMany, findOne, create, update, delete |
| `database` | findMany, findOne, create, update, delete |
| `databaseSetting` | findMany, findOne, create, update, delete |
| `databaseTransfer` | findMany, findOne, create, update, delete |
| `defaultPrivilege` | findMany, findOne, create, update, delete |
| `domain` | findMany, findOne, create, update, delete |
| `domainEvent` | findMany, findOne, create, update, delete |
| `domainVerification` | findMany, findOne, create, update, delete |
| `embeddingChunk` | findMany, findOne, create, update, delete |
| `enum` | findMany, findOne, create, update, delete |
| `exclusionConstraint` | findMany, findOne, create, update, delete |
| `field` | findMany, findOne, create, update, delete |
| `foreignKeyConstraint` | findMany, findOne, create, update, delete |
| `fullTextSearch` | findMany, findOne, create, update, delete |
| `function` | findMany, findOne, create, update, delete |
| `httpRoute` | findMany, findOne, create, update, delete |
| `index` | findMany, findOne, create, update, delete |
| `managedDomain` | findMany, findOne, create, update, delete |
| `nodeTypeRegistry` | findMany, findOne, create, update, delete |
| `partition` | findMany, findOne, create, update, delete |
| `policy` | findMany, findOne, create, update, delete |
| `primaryKeyConstraint` | findMany, findOne, create, update, delete |
| `pubkeySetting` | findMany, findOne, create, update, delete |
| `rlsSetting` | findMany, findOne, create, update, delete |
| `schema` | findMany, findOne, create, update, delete |
| `schemaGrant` | findMany, findOne, create, update, delete |
| `site` | findMany, findOne, create, update, delete |
| `siteMetadatum` | findMany, findOne, create, update, delete |
| `siteModule` | findMany, findOne, create, update, delete |
| `siteTheme` | findMany, findOne, create, update, delete |
| `spatialRelation` | findMany, findOne, create, update, delete |
| `sqlAction` | findMany, findOne, create, update, delete |
| `table` | findMany, findOne, create, update, delete |
| `tableGrant` | findMany, findOne, create, update, delete |
| `trigger` | findMany, findOne, create, update, delete |
| `triggerFunction` | findMany, findOne, create, update, delete |
| `uniqueConstraint` | findMany, findOne, create, update, delete |
| `view` | findMany, findOne, create, update, delete |
| `viewGrant` | findMany, findOne, create, update, delete |
| `viewRule` | findMany, findOne, create, update, delete |
| `viewTable` | findMany, findOne, create, update, delete |
| `webauthnSetting` | findMany, findOne, create, update, delete |

## Table Operations

### `db.api`

CRUD operations for Api records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `anonRole` | String | Yes |
| `databaseId` | UUID | Yes |
| `dbname` | String | Yes |
| `id` | UUID | No |
| `isPublic` | Boolean | Yes |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `roleName` | String | Yes |

**Operations:**

```typescript
// List all api records
const items = await db.api.findMany({ select: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } }).execute();

// Get one by id
const item = await db.api.findOne({ id: '<UUID>', select: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } }).execute();

// Create
const created = await db.api.create({ data: { annotations: '<JSON>', anonRole: '<String>', databaseId: '<UUID>', dbname: '<String>', isPublic: '<Boolean>', labels: '<JSON>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.api.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.api.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.apiModule`

CRUD operations for ApiModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiId` | UUID | Yes |
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all apiModule records
const items = await db.apiModule.findMany({ select: { apiId: true, data: true, databaseId: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.apiModule.findOne({ id: '<UUID>', select: { apiId: true, data: true, databaseId: true, id: true, name: true } }).execute();

// Create
const created = await db.apiModule.create({ data: { apiId: '<UUID>', data: '<JSON>', databaseId: '<UUID>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiModule.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.apiSchema`

CRUD operations for ApiSchema records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all apiSchema records
const items = await db.apiSchema.findMany({ select: { apiId: true, databaseId: true, id: true, schemaId: true } }).execute();

// Get one by id
const item = await db.apiSchema.findOne({ id: '<UUID>', select: { apiId: true, databaseId: true, id: true, schemaId: true } }).execute();

// Create
const created = await db.apiSchema.create({ data: { apiId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiSchema.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiSchema.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.apiSetting`

CRUD operations for ApiSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `enableAggregates` | Boolean | Yes |
| `enableBulk` | Boolean | Yes |
| `enableConnectionFilter` | Boolean | Yes |
| `enableDirectUploads` | Boolean | Yes |
| `enableI18N` | Boolean | Yes |
| `enableLlm` | Boolean | Yes |
| `enableLtree` | Boolean | Yes |
| `enableManyToMany` | Boolean | Yes |
| `enablePostgis` | Boolean | Yes |
| `enablePresignedUploads` | Boolean | Yes |
| `enableRealtime` | Boolean | Yes |
| `enableSearch` | Boolean | Yes |
| `id` | UUID | No |
| `options` | JSON | Yes |

**Operations:**

```typescript
// List all apiSetting records
const items = await db.apiSetting.findMany({ select: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } }).execute();

// Get one by id
const item = await db.apiSetting.findOne({ id: '<UUID>', select: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } }).execute();

// Create
const created = await db.apiSetting.create({ data: { apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiSetting.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.app`

CRUD operations for App records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `appIdPrefix` | String | Yes |
| `appImage` | ConstructiveInternalTypeImage | Yes |
| `appStoreId` | String | Yes |
| `appStoreLink` | ConstructiveInternalTypeUrl | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `playStoreLink` | ConstructiveInternalTypeUrl | Yes |
| `siteId` | UUID | Yes |

**Operations:**

```typescript
// List all app records
const items = await db.app.findMany({ select: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } }).execute();

// Get one by id
const item = await db.app.findOne({ id: '<UUID>', select: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } }).execute();

// Create
const created = await db.app.create({ data: { appIdPrefix: '<String>', appImage: '<Image>', appStoreId: '<String>', appStoreLink: '<Url>', databaseId: '<UUID>', name: '<String>', playStoreLink: '<Url>', siteId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.app.update({ where: { id: '<UUID>' }, data: { appIdPrefix: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.app.delete({ where: { id: '<UUID>' } }).execute();
```

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

### `db.checkConstraint`

CRUD operations for CheckConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `expr` | JSON | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `initiallyDeferred` | Boolean | Yes |
| `isDeferrable` | Boolean | Yes |
| `name` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all checkConstraint records
const items = await db.checkConstraint.findMany({ select: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.checkConstraint.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } }).execute();

// Create
const created = await db.checkConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', expr: '<JSON>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.checkConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.checkConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.compositeType`

CRUD operations for CompositeType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `attributes` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `label` | String | Yes |
| `name` | String | Yes |
| `schemaId` | UUID | Yes |
| `smartTags` | JSON | Yes |
| `tags` | String | Yes |

**Operations:**

```typescript
// List all compositeType records
const items = await db.compositeType.findMany({ select: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } }).execute();

// Get one by id
const item = await db.compositeType.findOne({ id: '<UUID>', select: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } }).execute();

// Create
const created = await db.compositeType.create({ data: { attributes: '<JSON>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.compositeType.update({ where: { id: '<UUID>' }, data: { attributes: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.compositeType.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.corsSetting`

CRUD operations for CorsSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `allowedOrigins` | String | Yes |
| `apiId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |

**Operations:**

```typescript
// List all corsSetting records
const items = await db.corsSetting.findMany({ select: { allowedOrigins: true, apiId: true, databaseId: true, id: true } }).execute();

// Get one by id
const item = await db.corsSetting.findOne({ id: '<UUID>', select: { allowedOrigins: true, apiId: true, databaseId: true, id: true } }).execute();

// Create
const created = await db.corsSetting.create({ data: { allowedOrigins: '<String>', apiId: '<UUID>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.corsSetting.update({ where: { id: '<UUID>' }, data: { allowedOrigins: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.corsSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.database`

CRUD operations for Database records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `label` | String | Yes |
| `name` | String | Yes |
| `ownerId` | UUID | Yes |
| `platform` | Boolean | Yes |
| `schemaHash` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all database records
const items = await db.database.findMany({ select: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.database.findOne({ id: '<UUID>', select: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } }).execute();

// Create
const created = await db.database.create({ data: { hash: '<UUID>', label: '<String>', name: '<String>', ownerId: '<UUID>', platform: '<Boolean>', schemaHash: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.database.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.database.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.databaseSetting`

CRUD operations for DatabaseSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `enableAggregates` | Boolean | Yes |
| `enableBulk` | Boolean | Yes |
| `enableConnectionFilter` | Boolean | Yes |
| `enableDirectUploads` | Boolean | Yes |
| `enableI18N` | Boolean | Yes |
| `enableLlm` | Boolean | Yes |
| `enableLtree` | Boolean | Yes |
| `enableManyToMany` | Boolean | Yes |
| `enablePostgis` | Boolean | Yes |
| `enablePresignedUploads` | Boolean | Yes |
| `enableRealtime` | Boolean | Yes |
| `enableSearch` | Boolean | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `options` | JSON | Yes |

**Operations:**

```typescript
// List all databaseSetting records
const items = await db.databaseSetting.findMany({ select: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } }).execute();

// Get one by id
const item = await db.databaseSetting.findOne({ id: '<UUID>', select: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } }).execute();

// Create
const created = await db.databaseSetting.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', labels: '<JSON>', options: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseSetting.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.databaseTransfer`

CRUD operations for DatabaseTransfer records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `initiatedBy` | UUID | Yes |
| `notes` | String | Yes |
| `sourceApproved` | Boolean | Yes |
| `sourceApprovedAt` | Datetime | Yes |
| `status` | String | Yes |
| `targetApproved` | Boolean | Yes |
| `targetApprovedAt` | Datetime | Yes |
| `targetOwnerId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all databaseTransfer records
const items = await db.databaseTransfer.findMany({ select: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.databaseTransfer.findOne({ id: '<UUID>', select: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } }).execute();

// Create
const created = await db.databaseTransfer.create({ data: { completedAt: '<Datetime>', databaseId: '<UUID>', expiresAt: '<Datetime>', initiatedBy: '<UUID>', notes: '<String>', sourceApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', status: '<String>', targetApproved: '<Boolean>', targetApprovedAt: '<Datetime>', targetOwnerId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseTransfer.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseTransfer.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.defaultPrivilege`

CRUD operations for DefaultPrivilege records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `granteeName` | String | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `objectType` | String | Yes |
| `privilege` | String | Yes |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all defaultPrivilege records
const items = await db.defaultPrivilege.findMany({ select: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } }).execute();

// Get one by id
const item = await db.defaultPrivilege.findOne({ id: '<UUID>', select: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } }).execute();

// Create
const created = await db.defaultPrivilege.create({ data: { databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', objectType: '<String>', privilege: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.defaultPrivilege.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.defaultPrivilege.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.domain`

CRUD operations for Domain records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `apiId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `domain` | ConstructiveInternalTypeHostname | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `serviceId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `subdomain` | ConstructiveInternalTypeHostname | Yes |

**Operations:**

```typescript
// List all domain records
const items = await db.domain.findMany({ select: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } }).execute();

// Get one by id
const item = await db.domain.findOne({ id: '<UUID>', select: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } }).execute();

// Create
const created = await db.domain.create({ data: { annotations: '<JSON>', apiId: '<UUID>', databaseId: '<UUID>', domain: '<Hostname>', labels: '<JSON>', serviceId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>' }, select: { id: true } }).execute();

// Update
const updated = await db.domain.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.domain.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.domainEvent`

CRUD operations for DomainEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `domainVerificationId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `managedDomainId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `ownerId` | UUID | Yes |

**Operations:**

```typescript
// List all domainEvent records
const items = await db.domainEvent.findMany({ select: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } }).execute();

// Get one by id
const item = await db.domainEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } }).execute();

// Create
const created = await db.domainEvent.create({ data: { actorId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>', ownerId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.domainEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.domainEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.domainVerification`

CRUD operations for DomainVerification records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `attempts` | Int | Yes |
| `createdAt` | Datetime | No |
| `error` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `lastCheckedAt` | Datetime | Yes |
| `managedDomainId` | UUID | Yes |
| `method` | String | Yes |
| `ownerId` | UUID | Yes |
| `recordName` | String | Yes |
| `recordType` | String | Yes |
| `recordValue` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |
| `verifiedAt` | Datetime | Yes |

**Operations:**

```typescript
// List all domainVerification records
const items = await db.domainVerification.findMany({ select: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } }).execute();

// Get one by id
const item = await db.domainVerification.findOne({ id: '<UUID>', select: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } }).execute();

// Create
const created = await db.domainVerification.create({ data: { attempts: '<Int>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', ownerId: '<UUID>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.domainVerification.update({ where: { id: '<UUID>' }, data: { attempts: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.domainVerification.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.embeddingChunk`

CRUD operations for EmbeddingChunk records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `chunkOverlap` | Int | Yes |
| `chunkSize` | Int | Yes |
| `chunkStrategy` | String | Yes |
| `chunkingTaskName` | String | Yes |
| `chunksTableId` | UUID | Yes |
| `chunksTableName` | String | Yes |
| `contentFieldName` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `dimensions` | Int | Yes |
| `embeddingFieldId` | UUID | Yes |
| `embeddingModel` | String | Yes |
| `embeddingProvider` | String | Yes |
| `enqueueChunkingJob` | Boolean | Yes |
| `id` | UUID | No |
| `metadataFields` | JSON | Yes |
| `metric` | String | Yes |
| `parentFkFieldId` | UUID | Yes |
| `searchIndexes` | JSON | Yes |
| `tableId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all embeddingChunk records
const items = await db.embeddingChunk.findMany({ select: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.embeddingChunk.findOne({ id: '<UUID>', select: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } }).execute();

// Create
const created = await db.embeddingChunk.create({ data: { chunkOverlap: '<Int>', chunkSize: '<Int>', chunkStrategy: '<String>', chunkingTaskName: '<String>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', databaseId: '<UUID>', dimensions: '<Int>', embeddingFieldId: '<UUID>', embeddingModel: '<String>', embeddingProvider: '<String>', enqueueChunkingJob: '<Boolean>', metadataFields: '<JSON>', metric: '<String>', parentFkFieldId: '<UUID>', searchIndexes: '<JSON>', tableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.embeddingChunk.update({ where: { id: '<UUID>' }, data: { chunkOverlap: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.embeddingChunk.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.enum`

CRUD operations for Enum records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `label` | String | Yes |
| `name` | String | Yes |
| `schemaId` | UUID | Yes |
| `smartTags` | JSON | Yes |
| `tags` | String | Yes |
| `values` | String | Yes |

**Operations:**

```typescript
// List all enum records
const items = await db.enum.findMany({ select: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } }).execute();

// Get one by id
const item = await db.enum.findOne({ id: '<UUID>', select: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } }).execute();

// Create
const created = await db.enum.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>', values: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.enum.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.enum.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.exclusionConstraint`

CRUD operations for ExclusionConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `accessMethod` | String | Yes |
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `elementExpr` | JSON | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `operators` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | String | Yes |
| `updatedAt` | Datetime | No |
| `whereClause` | JSON | Yes |

**Operations:**

```typescript
// List all exclusionConstraint records
const items = await db.exclusionConstraint.findMany({ select: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } }).execute();

// Get one by id
const item = await db.exclusionConstraint.findOne({ id: '<UUID>', select: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } }).execute();

// Create
const created = await db.exclusionConstraint.create({ data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', elementExpr: '<JSON>', fieldIds: '<UUID>', name: '<String>', operators: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', whereClause: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.exclusionConstraint.update({ where: { id: '<UUID>' }, data: { accessMethod: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.exclusionConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.field`

CRUD operations for Field records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiRequired` | Boolean | Yes |
| `category` | ObjectCategory | Yes |
| `chk` | JSON | Yes |
| `chkExpr` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `defaultValue` | JSON | Yes |
| `description` | String | Yes |
| `fieldOrder` | Int | Yes |
| `generationExpression` | JSON | Yes |
| `generationType` | String | Yes |
| `id` | UUID | No |
| `identityGeneration` | String | Yes |
| `identityOptions` | JSON | Yes |
| `isRequired` | Boolean | Yes |
| `label` | String | Yes |
| `max` | Float | Yes |
| `min` | Float | Yes |
| `name` | String | Yes |
| `regexp` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | JSON | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all field records
const items = await db.field.findMany({ select: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, identityGeneration: true, identityOptions: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.field.findOne({ id: '<UUID>', select: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, identityGeneration: true, identityOptions: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } }).execute();

// Create
const created = await db.field.create({ data: { apiRequired: '<Boolean>', category: '<ObjectCategory>', chk: '<JSON>', chkExpr: '<JSON>', databaseId: '<UUID>', defaultValue: '<JSON>', description: '<String>', fieldOrder: '<Int>', generationExpression: '<JSON>', generationType: '<String>', identityGeneration: '<String>', identityOptions: '<JSON>', isRequired: '<Boolean>', label: '<String>', max: '<Float>', min: '<Float>', name: '<String>', regexp: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.field.update({ where: { id: '<UUID>' }, data: { apiRequired: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.field.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.foreignKeyConstraint`

CRUD operations for ForeignKeyConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `deleteAction` | String | Yes |
| `deleteSetFieldIds` | UUID | Yes |
| `description` | String | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `initiallyDeferred` | Boolean | Yes |
| `isDeferrable` | Boolean | Yes |
| `name` | String | Yes |
| `refFieldIds` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | String | Yes |
| `updateAction` | String | Yes |
| `updatedAt` | Datetime | No |
| `withPeriod` | Boolean | Yes |

**Operations:**

```typescript
// List all foreignKeyConstraint records
const items = await db.foreignKeyConstraint.findMany({ select: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } }).execute();

// Get one by id
const item = await db.foreignKeyConstraint.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } }).execute();

// Create
const created = await db.foreignKeyConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', deleteAction: '<String>', deleteSetFieldIds: '<UUID>', description: '<String>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', refFieldIds: '<UUID>', refTableId: '<UUID>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', updateAction: '<String>', withPeriod: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.foreignKeyConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.foreignKeyConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.fullTextSearch`

CRUD operations for FullTextSearch records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `langColumn` | String | Yes |
| `langs` | String | Yes |
| `tableId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `weights` | String | Yes |

**Operations:**

```typescript
// List all fullTextSearch records
const items = await db.fullTextSearch.findMany({ select: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } }).execute();

// Get one by id
const item = await db.fullTextSearch.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } }).execute();

// Create
const created = await db.fullTextSearch.create({ data: { databaseId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', langColumn: '<String>', langs: '<String>', tableId: '<UUID>', weights: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.fullTextSearch.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.fullTextSearch.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.function`

CRUD operations for Function records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all function records
const items = await db.function.findMany({ select: { databaseId: true, id: true, name: true, schemaId: true } }).execute();

// Get one by id
const item = await db.function.findOne({ id: '<UUID>', select: { databaseId: true, id: true, name: true, schemaId: true } }).execute();

// Create
const created = await db.function.create({ data: { databaseId: '<UUID>', name: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.function.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.function.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.httpRoute`

CRUD operations for HttpRoute records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `domainId` | UUID | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `method` | String | Yes |
| `path` | String | Yes |
| `priority` | Int | Yes |
| `targetId` | UUID | Yes |
| `targetKind` | String | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all httpRoute records
const items = await db.httpRoute.findMany({ select: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.httpRoute.findOne({ id: '<UUID>', select: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.httpRoute.create({ data: { createdBy: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetId: '<UUID>', targetKind: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.httpRoute.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.httpRoute.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.index`

CRUD operations for Index records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `accessMethod` | String | Yes |
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `includeFieldIds` | UUID | Yes |
| `indexParams` | JSON | Yes |
| `isUnique` | Boolean | Yes |
| `name` | String | Yes |
| `opClasses` | String | Yes |
| `options` | JSON | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |
| `whereClause` | JSON | Yes |

**Operations:**

```typescript
// List all index records
const items = await db.index.findMany({ select: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } }).execute();

// Get one by id
const item = await db.index.findOne({ id: '<UUID>', select: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } }).execute();

// Create
const created = await db.index.create({ data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', indexParams: '<JSON>', isUnique: '<Boolean>', name: '<String>', opClasses: '<String>', options: '<JSON>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', whereClause: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.index.update({ where: { id: '<UUID>' }, data: { accessMethod: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.index.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.managedDomain`

CRUD operations for ManagedDomain records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `allowPublicUsage` | Boolean | Yes |
| `annotations` | JSON | Yes |
| `certStatus` | String | Yes |
| `databaseId` | UUID | Yes |
| `domain` | ConstructiveInternalTypeHostname | Yes |
| `id` | UUID | No |
| `isWildcard` | Boolean | Yes |
| `tlsReadyAt` | Datetime | Yes |
| `tlsStatus` | String | Yes |
| `verificationStatus` | String | Yes |
| `verifiedAt` | Datetime | Yes |

**Operations:**

```typescript
// List all managedDomain records
const items = await db.managedDomain.findMany({ select: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } }).execute();

// Get one by id
const item = await db.managedDomain.findOne({ id: '<UUID>', select: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } }).execute();

// Create
const created = await db.managedDomain.create({ data: { allowPublicUsage: '<Boolean>', annotations: '<JSON>', certStatus: '<String>', databaseId: '<UUID>', domain: '<Hostname>', isWildcard: '<Boolean>', tlsReadyAt: '<Datetime>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.managedDomain.update({ where: { id: '<UUID>' }, data: { allowPublicUsage: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.managedDomain.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.nodeTypeRegistry`

CRUD operations for NodeTypeRegistry records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | String | Yes |
| `description` | String | Yes |
| `displayName` | String | Yes |
| `name` | String | No |
| `parameterSchema` | JSON | Yes |
| `slug` | String | Yes |
| `tags` | String | Yes |

**Operations:**

```typescript
// List all nodeTypeRegistry records
const items = await db.nodeTypeRegistry.findMany({ select: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } }).execute();

// Get one by name
const item = await db.nodeTypeRegistry.findOne({ name: '<String>', select: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } }).execute();

// Create
const created = await db.nodeTypeRegistry.create({ data: { category: '<String>', description: '<String>', displayName: '<String>', parameterSchema: '<JSON>', slug: '<String>', tags: '<String>' }, select: { name: true } }).execute();

// Update
const updated = await db.nodeTypeRegistry.update({ where: { name: '<String>' }, data: { category: '<String>' }, select: { name: true } }).execute();

// Delete
const deleted = await db.nodeTypeRegistry.delete({ where: { name: '<String>' } }).execute();
```

### `db.partition`

CRUD operations for Partition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `isParented` | Boolean | Yes |
| `namingPattern` | String | Yes |
| `partitionKeyId` | UUID | Yes |
| `premake` | Int | Yes |
| `retention` | String | Yes |
| `retentionKeepTable` | Boolean | Yes |
| `strategy` | String | Yes |
| `tableId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all partition records
const items = await db.partition.findMany({ select: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.partition.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } }).execute();

// Create
const created = await db.partition.create({ data: { databaseId: '<UUID>', interval: '<String>', isParented: '<Boolean>', namingPattern: '<String>', partitionKeyId: '<UUID>', premake: '<Int>', retention: '<String>', retentionKeepTable: '<Boolean>', strategy: '<String>', tableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.partition.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.partition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.policy`

CRUD operations for Policy records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `disabled` | Boolean | Yes |
| `granteeName` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `permissive` | Boolean | Yes |
| `policyType` | String | Yes |
| `privilege` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |
| `withCheck` | JSON | Yes |

**Operations:**

```typescript
// List all policy records
const items = await db.policy.findMany({ select: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } }).execute();

// Get one by id
const item = await db.policy.findOne({ id: '<UUID>', select: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } }).execute();

// Create
const created = await db.policy.create({ data: { category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', disabled: '<Boolean>', granteeName: '<String>', name: '<String>', permissive: '<Boolean>', policyType: '<String>', privilege: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', withCheck: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.policy.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.policy.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.primaryKeyConstraint`

CRUD operations for PrimaryKeyConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `initiallyDeferred` | Boolean | Yes |
| `isDeferrable` | Boolean | Yes |
| `name` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | String | Yes |
| `updatedAt` | Datetime | No |
| `withoutOverlaps` | Boolean | Yes |

**Operations:**

```typescript
// List all primaryKeyConstraint records
const items = await db.primaryKeyConstraint.findMany({ select: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } }).execute();

// Get one by id
const item = await db.primaryKeyConstraint.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } }).execute();

// Create
const created = await db.primaryKeyConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.primaryKeyConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.primaryKeyConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.pubkeySetting`

CRUD operations for PubkeySetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `cryptoNetwork` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `signInRecordFailureFunctionId` | UUID | Yes |
| `signInRequestChallengeFunctionId` | UUID | Yes |
| `signInWithChallengeFunctionId` | UUID | Yes |
| `signUpWithKeyFunctionId` | UUID | Yes |
| `userField` | String | Yes |

**Operations:**

```typescript
// List all pubkeySetting records
const items = await db.pubkeySetting.findMany({ select: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } }).execute();

// Get one by id
const item = await db.pubkeySetting.findOne({ id: '<UUID>', select: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } }).execute();

// Create
const created = await db.pubkeySetting.create({ data: { cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.pubkeySetting.update({ where: { id: '<UUID>' }, data: { cryptoNetwork: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.pubkeySetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.rlsSetting`

CRUD operations for RlsSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authenticateFunctionId` | UUID | Yes |
| `authenticateSchemaId` | UUID | Yes |
| `authenticateStrictFunctionId` | UUID | Yes |
| `currentIpAddressFunctionId` | UUID | Yes |
| `currentRoleFunctionId` | UUID | Yes |
| `currentRoleIdFunctionId` | UUID | Yes |
| `currentUserAgentFunctionId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `roleSchemaId` | UUID | Yes |

**Operations:**

```typescript
// List all rlsSetting records
const items = await db.rlsSetting.findMany({ select: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } }).execute();

// Get one by id
const item = await db.rlsSetting.findOne({ id: '<UUID>', select: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } }).execute();

// Create
const created = await db.rlsSetting.create({ data: { authenticateFunctionId: '<UUID>', authenticateSchemaId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', databaseId: '<UUID>', roleSchemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsSetting.update({ where: { id: '<UUID>' }, data: { authenticateFunctionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.schema`

CRUD operations for Schema records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiExposure` | ApiExposureLevel | Yes |
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isPublic` | Boolean | Yes |
| `label` | String | Yes |
| `name` | String | Yes |
| `schemaName` | String | Yes |
| `smartTags` | JSON | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all schema records
const items = await db.schema.findMany({ select: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.schema.findOne({ id: '<UUID>', select: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } }).execute();

// Create
const created = await db.schema.create({ data: { apiExposure: '<ApiExposureLevel>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', isPublic: '<Boolean>', label: '<String>', name: '<String>', schemaName: '<String>', smartTags: '<JSON>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.schema.update({ where: { id: '<UUID>' }, data: { apiExposure: '<ApiExposureLevel>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schema.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.schemaGrant`

CRUD operations for SchemaGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `granteeName` | String | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all schemaGrant records
const items = await db.schemaGrant.findMany({ select: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.schemaGrant.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } }).execute();

// Create
const created = await db.schemaGrant.create({ data: { databaseId: '<UUID>', granteeName: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.schemaGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schemaGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.site`

CRUD operations for Site records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `appleTouchIcon` | ConstructiveInternalTypeImage | Yes |
| `databaseId` | UUID | Yes |
| `dbname` | String | Yes |
| `description` | String | Yes |
| `favicon` | ConstructiveInternalTypeAttachment | Yes |
| `id` | UUID | No |
| `labels` | JSON | Yes |
| `logo` | ConstructiveInternalTypeImage | Yes |
| `ogImage` | ConstructiveInternalTypeImage | Yes |
| `title` | String | Yes |

**Operations:**

```typescript
// List all site records
const items = await db.site.findMany({ select: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } }).execute();

// Get one by id
const item = await db.site.findOne({ id: '<UUID>', select: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } }).execute();

// Create
const created = await db.site.create({ data: { annotations: '<JSON>', appleTouchIcon: '<Image>', databaseId: '<UUID>', dbname: '<String>', description: '<String>', favicon: '<Attachment>', labels: '<JSON>', logo: '<Image>', ogImage: '<Image>', title: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.site.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.site.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.siteMetadatum`

CRUD operations for SiteMetadatum records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `ogImage` | ConstructiveInternalTypeImage | Yes |
| `siteId` | UUID | Yes |
| `title` | String | Yes |

**Operations:**

```typescript
// List all siteMetadatum records
const items = await db.siteMetadatum.findMany({ select: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } }).execute();

// Get one by id
const item = await db.siteMetadatum.findOne({ id: '<UUID>', select: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } }).execute();

// Create
const created = await db.siteMetadatum.create({ data: { databaseId: '<UUID>', description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteMetadatum.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteMetadatum.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.siteModule`

CRUD operations for SiteModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `siteId` | UUID | Yes |

**Operations:**

```typescript
// List all siteModule records
const items = await db.siteModule.findMany({ select: { data: true, databaseId: true, id: true, name: true, siteId: true } }).execute();

// Get one by id
const item = await db.siteModule.findOne({ id: '<UUID>', select: { data: true, databaseId: true, id: true, name: true, siteId: true } }).execute();

// Create
const created = await db.siteModule.create({ data: { data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteModule.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.siteTheme`

CRUD operations for SiteTheme records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `siteId` | UUID | Yes |
| `theme` | JSON | Yes |

**Operations:**

```typescript
// List all siteTheme records
const items = await db.siteTheme.findMany({ select: { databaseId: true, id: true, siteId: true, theme: true } }).execute();

// Get one by id
const item = await db.siteTheme.findOne({ id: '<UUID>', select: { databaseId: true, id: true, siteId: true, theme: true } }).execute();

// Create
const created = await db.siteTheme.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteTheme.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteTheme.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.spatialRelation`

CRUD operations for SpatialRelation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `operator` | String | Yes |
| `paramName` | String | Yes |
| `refFieldId` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all spatialRelation records
const items = await db.spatialRelation.findMany({ select: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.spatialRelation.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } }).execute();

// Create
const created = await db.spatialRelation.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', refFieldId: '<UUID>', refTableId: '<UUID>', tableId: '<UUID>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.spatialRelation.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.spatialRelation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sqlAction`

CRUD operations for SqlAction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actionId` | UUID | Yes |
| `actionName` | String | Yes |
| `actorId` | UUID | Yes |
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
const items = await db.sqlAction.findMany({ select: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Get one by id
const item = await db.sqlAction.findOne({ id: '<Int>', select: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } }).execute();

// Create
const created = await db.sqlAction.create({ data: { actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlAction.update({ where: { id: '<Int>' }, data: { actionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sqlAction.delete({ where: { id: '<Int>' } }).execute();
```

### `db.table`

CRUD operations for Table records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `inheritsId` | UUID | Yes |
| `label` | String | Yes |
| `name` | String | Yes |
| `partitionKeyNames` | String | Yes |
| `partitionKeyTypes` | String | Yes |
| `partitionStrategy` | String | Yes |
| `partitioned` | Boolean | Yes |
| `peoplestamps` | Boolean | Yes |
| `pluralName` | String | Yes |
| `schemaId` | UUID | Yes |
| `singularName` | String | Yes |
| `smartTags` | JSON | Yes |
| `stepUp` | JSON | Yes |
| `tags` | String | Yes |
| `timestamps` | Boolean | Yes |
| `updatedAt` | Datetime | No |
| `useRls` | Boolean | Yes |

**Operations:**

```typescript
// List all table records
const items = await db.table.findMany({ select: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } }).execute();

// Get one by id
const item = await db.table.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } }).execute();

// Create
const created = await db.table.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', inheritsId: '<UUID>', label: '<String>', name: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', partitionStrategy: '<String>', partitioned: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', schemaId: '<UUID>', singularName: '<String>', smartTags: '<JSON>', stepUp: '<JSON>', tags: '<String>', timestamps: '<Boolean>', useRls: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.table.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.table.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.tableGrant`

CRUD operations for TableGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `fieldIds` | UUID | Yes |
| `granteeName` | String | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `privilege` | String | Yes |
| `tableId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all tableGrant records
const items = await db.tableGrant.findMany({ select: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.tableGrant.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } }).execute();

// Create
const created = await db.tableGrant.create({ data: { databaseId: '<UUID>', fieldIds: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', tableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.tableGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.tableGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.trigger`

CRUD operations for Trigger records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `event` | String | Yes |
| `functionName` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all trigger records
const items = await db.trigger.findMany({ select: { category: true, createdAt: true, databaseId: true, event: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.trigger.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, event: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, updatedAt: true } }).execute();

// Create
const created = await db.trigger.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', functionName: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.trigger.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.trigger.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.triggerFunction`

CRUD operations for TriggerFunction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `code` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all triggerFunction records
const items = await db.triggerFunction.findMany({ select: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.triggerFunction.findOne({ id: '<UUID>', select: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } }).execute();

// Create
const created = await db.triggerFunction.create({ data: { code: '<String>', databaseId: '<UUID>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.triggerFunction.update({ where: { id: '<UUID>' }, data: { code: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.triggerFunction.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.uniqueConstraint`

CRUD operations for UniqueConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `fieldIds` | UUID | Yes |
| `id` | UUID | No |
| `initiallyDeferred` | Boolean | Yes |
| `isDeferrable` | Boolean | Yes |
| `name` | String | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `type` | String | Yes |
| `updatedAt` | Datetime | No |
| `withoutOverlaps` | Boolean | Yes |

**Operations:**

```typescript
// List all uniqueConstraint records
const items = await db.uniqueConstraint.findMany({ select: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } }).execute();

// Get one by id
const item = await db.uniqueConstraint.findOne({ id: '<UUID>', select: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } }).execute();

// Create
const created = await db.uniqueConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.uniqueConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.uniqueConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.view`

CRUD operations for View records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `category` | ObjectCategory | Yes |
| `checkOption` | String | Yes |
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `filterData` | JSON | Yes |
| `filterType` | String | Yes |
| `id` | UUID | No |
| `isReadOnly` | Boolean | Yes |
| `name` | String | Yes |
| `schemaId` | UUID | Yes |
| `securityBarrier` | Boolean | Yes |
| `securityInvoker` | Boolean | Yes |
| `smartTags` | JSON | Yes |
| `tableId` | UUID | Yes |
| `tags` | String | Yes |
| `viewType` | String | Yes |

**Operations:**

```typescript
// List all view records
const items = await db.view.findMany({ select: { category: true, checkOption: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityBarrier: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } }).execute();

// Get one by id
const item = await db.view.findOne({ id: '<UUID>', select: { category: true, checkOption: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityBarrier: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } }).execute();

// Create
const created = await db.view.create({ data: { category: '<ObjectCategory>', checkOption: '<String>', data: '<JSON>', databaseId: '<UUID>', filterData: '<JSON>', filterType: '<String>', isReadOnly: '<Boolean>', name: '<String>', schemaId: '<UUID>', securityBarrier: '<Boolean>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', viewType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.view.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.view.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.viewGrant`

CRUD operations for ViewGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `granteeName` | String | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `privilege` | String | Yes |
| `viewId` | UUID | Yes |
| `withGrantOption` | Boolean | Yes |

**Operations:**

```typescript
// List all viewGrant records
const items = await db.viewGrant.findMany({ select: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } }).execute();

// Get one by id
const item = await db.viewGrant.findOne({ id: '<UUID>', select: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } }).execute();

// Create
const created = await db.viewGrant.create({ data: { databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', viewId: '<UUID>', withGrantOption: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.viewRule`

CRUD operations for ViewRule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `action` | String | Yes |
| `databaseId` | UUID | Yes |
| `event` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `viewId` | UUID | Yes |

**Operations:**

```typescript
// List all viewRule records
const items = await db.viewRule.findMany({ select: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } }).execute();

// Get one by id
const item = await db.viewRule.findOne({ id: '<UUID>', select: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } }).execute();

// Create
const created = await db.viewRule.create({ data: { action: '<String>', databaseId: '<UUID>', event: '<String>', name: '<String>', viewId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewRule.update({ where: { id: '<UUID>' }, data: { action: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewRule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.viewTable`

CRUD operations for ViewTable records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `joinOrder` | Int | Yes |
| `tableId` | UUID | Yes |
| `viewId` | UUID | Yes |

**Operations:**

```typescript
// List all viewTable records
const items = await db.viewTable.findMany({ select: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } }).execute();

// Get one by id
const item = await db.viewTable.findOne({ id: '<UUID>', select: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } }).execute();

// Create
const created = await db.viewTable.create({ data: { databaseId: '<UUID>', joinOrder: '<Int>', tableId: '<UUID>', viewId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewTable.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewTable.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnSetting`

CRUD operations for WebauthnSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `attestationType` | String | Yes |
| `challengeExpirySeconds` | BigInt | Yes |
| `credentialsSchemaId` | UUID | Yes |
| `credentialsTableId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `originAllowlist` | String | Yes |
| `requireUserVerification` | Boolean | Yes |
| `residentKey` | String | Yes |
| `rpId` | String | Yes |
| `rpName` | String | Yes |
| `schemaId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionSecretsSchemaId` | UUID | Yes |
| `sessionSecretsTableId` | UUID | Yes |
| `sessionsSchemaId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `userFieldId` | UUID | Yes |

**Operations:**

```typescript
// List all webauthnSetting records
const items = await db.webauthnSetting.findMany({ select: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } }).execute();

// Get one by id
const item = await db.webauthnSetting.findOne({ id: '<UUID>', select: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } }).execute();

// Create
const created = await db.webauthnSetting.create({ data: { attestationType: '<String>', challengeExpirySeconds: '<BigInt>', credentialsSchemaId: '<UUID>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsSchemaId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsSchemaId: '<UUID>', sessionsTableId: '<UUID>', userFieldId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnSetting.update({ where: { id: '<UUID>' }, data: { attestationType: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnSetting.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.applyRegistryDefaults`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `data` | JSON |
  | `nodeType` | String |

```typescript
const result = await db.query.applyRegistryDefaults({ data: '<JSON>', nodeType: '<String>' }).execute();
```

### `db.query.resolveHttpRoute`

resolveHttpRoute

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `requestHost` | String |
  | `requestMethod` | String |
  | `requestPath` | String |

```typescript
const result = await db.query.resolveHttpRoute({ requestHost: '<String>', requestMethod: '<String>', requestPath: '<String>' }).execute();
```

### `db.mutation.acceptDatabaseTransfer`

acceptDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AcceptDatabaseTransferInput (required) |

```typescript
const result = await db.mutation.acceptDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute();
```

### `db.mutation.applyRls`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ApplyRlsInput (required) |

```typescript
const result = await db.mutation.applyRls({ input: '<ApplyRlsInput>' }).execute();
```

### `db.mutation.cancelDatabaseTransfer`

cancelDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CancelDatabaseTransferInput (required) |

```typescript
const result = await db.mutation.cancelDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute();
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

### `db.mutation.rejectDatabaseTransfer`

rejectDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RejectDatabaseTransferInput (required) |

```typescript
const result = await db.mutation.rejectDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute();
```

### `db.mutation.requestDatabase`

Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb);

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestDatabaseInput (required) |

```typescript
const result = await db.mutation.requestDatabase({ input: '<RequestDatabaseInput>' }).execute();
```

### `db.mutation.setFieldOrder`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

```typescript
const result = await db.mutation.setFieldOrder({ input: { fieldIds: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
