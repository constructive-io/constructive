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
| `orgGetManagersRecord` | findMany, findOne, create, update, delete |
| `orgGetSubordinatesRecord` | findMany, findOne, create, update, delete |
| `getAllRecord` | findMany, findOne, create, update, delete |
| `object` | findMany, findOne, create, update, delete |
| `appPermission` | findMany, findOne, create, update, delete |
| `orgPermission` | findMany, findOne, create, update, delete |
| `appLevelRequirement` | findMany, findOne, create, update, delete |
| `database` | findMany, findOne, create, update, delete |
| `schema` | findMany, findOne, create, update, delete |
| `table` | findMany, findOne, create, update, delete |
| `checkConstraint` | findMany, findOne, create, update, delete |
| `field` | findMany, findOne, create, update, delete |
| `spatialRelation` | findMany, findOne, create, update, delete |
| `foreignKeyConstraint` | findMany, findOne, create, update, delete |
| `fullTextSearch` | findMany, findOne, create, update, delete |
| `index` | findMany, findOne, create, update, delete |
| `policy` | findMany, findOne, create, update, delete |
| `primaryKeyConstraint` | findMany, findOne, create, update, delete |
| `tableGrant` | findMany, findOne, create, update, delete |
| `trigger` | findMany, findOne, create, update, delete |
| `uniqueConstraint` | findMany, findOne, create, update, delete |
| `view` | findMany, findOne, create, update, delete |
| `viewTable` | findMany, findOne, create, update, delete |
| `viewGrant` | findMany, findOne, create, update, delete |
| `viewRule` | findMany, findOne, create, update, delete |
| `embeddingChunk` | findMany, findOne, create, update, delete |
| `secureTableProvision` | findMany, findOne, create, update, delete |
| `relationProvision` | findMany, findOne, create, update, delete |
| `sessionSecretsModule` | findMany, findOne, create, update, delete |
| `identityProvidersModule` | findMany, findOne, create, update, delete |
| `schemaGrant` | findMany, findOne, create, update, delete |
| `defaultPrivilege` | findMany, findOne, create, update, delete |
| `enum` | findMany, findOne, create, update, delete |
| `apiSchema` | findMany, findOne, create, update, delete |
| `apiModule` | findMany, findOne, create, update, delete |
| `domain` | findMany, findOne, create, update, delete |
| `siteMetadatum` | findMany, findOne, create, update, delete |
| `siteModule` | findMany, findOne, create, update, delete |
| `siteTheme` | findMany, findOne, create, update, delete |
| `triggerFunction` | findMany, findOne, create, update, delete |
| `databaseTransfer` | findMany, findOne, create, update, delete |
| `api` | findMany, findOne, create, update, delete |
| `site` | findMany, findOne, create, update, delete |
| `app` | findMany, findOne, create, update, delete |
| `connectedAccountsModule` | findMany, findOne, create, update, delete |
| `cryptoAddressesModule` | findMany, findOne, create, update, delete |
| `cryptoAuthModule` | findMany, findOne, create, update, delete |
| `defaultIdsModule` | findMany, findOne, create, update, delete |
| `denormalizedTableField` | findMany, findOne, create, update, delete |
| `emailsModule` | findMany, findOne, create, update, delete |
| `encryptedSecretsModule` | findMany, findOne, create, update, delete |
| `invitesModule` | findMany, findOne, create, update, delete |
| `levelsModule` | findMany, findOne, create, update, delete |
| `limitsModule` | findMany, findOne, create, update, delete |
| `membershipTypesModule` | findMany, findOne, create, update, delete |
| `membershipsModule` | findMany, findOne, create, update, delete |
| `permissionsModule` | findMany, findOne, create, update, delete |
| `phoneNumbersModule` | findMany, findOne, create, update, delete |
| `profilesModule` | findMany, findOne, create, update, delete |
| `secretsModule` | findMany, findOne, create, update, delete |
| `sessionsModule` | findMany, findOne, create, update, delete |
| `userAuthModule` | findMany, findOne, create, update, delete |
| `usersModule` | findMany, findOne, create, update, delete |
| `blueprint` | findMany, findOne, create, update, delete |
| `blueprintTemplate` | findMany, findOne, create, update, delete |
| `blueprintConstruction` | findMany, findOne, create, update, delete |
| `storageModule` | findMany, findOne, create, update, delete |
| `entityTypeProvision` | findMany, findOne, create, update, delete |
| `webauthnCredentialsModule` | findMany, findOne, create, update, delete |
| `webauthnAuthModule` | findMany, findOne, create, update, delete |
| `notificationsModule` | findMany, findOne, create, update, delete |
| `databaseProvisionModule` | findMany, findOne, create, update, delete |
| `appAdminGrant` | findMany, findOne, create, update, delete |
| `appOwnerGrant` | findMany, findOne, create, update, delete |
| `appGrant` | findMany, findOne, create, update, delete |
| `orgMembership` | findMany, findOne, create, update, delete |
| `orgMember` | findMany, findOne, create, update, delete |
| `orgAdminGrant` | findMany, findOne, create, update, delete |
| `orgOwnerGrant` | findMany, findOne, create, update, delete |
| `orgMemberProfile` | findMany, findOne, create, update, delete |
| `orgGrant` | findMany, findOne, create, update, delete |
| `orgChartEdge` | findMany, findOne, create, update, delete |
| `orgChartEdgeGrant` | findMany, findOne, create, update, delete |
| `orgPermissionDefault` | findMany, findOne, create, update, delete |
| `appLimit` | findMany, findOne, create, update, delete |
| `orgLimit` | findMany, findOne, create, update, delete |
| `appStep` | findMany, findOne, create, update, delete |
| `appAchievement` | findMany, findOne, create, update, delete |
| `appLevel` | findMany, findOne, create, update, delete |
| `email` | findMany, findOne, create, update, delete |
| `phoneNumber` | findMany, findOne, create, update, delete |
| `cryptoAddress` | findMany, findOne, create, update, delete |
| `webauthnCredential` | findMany, findOne, create, update, delete |
| `appInvite` | findMany, findOne, create, update, delete |
| `appClaimedInvite` | findMany, findOne, create, update, delete |
| `orgInvite` | findMany, findOne, create, update, delete |
| `orgClaimedInvite` | findMany, findOne, create, update, delete |
| `auditLog` | findMany, findOne, create, update, delete |
| `agentThread` | findMany, findOne, create, update, delete |
| `agentMessage` | findMany, findOne, create, update, delete |
| `agentTask` | findMany, findOne, create, update, delete |
| `appPermissionDefault` | findMany, findOne, create, update, delete |
| `identityProvider` | findMany, findOne, create, update, delete |
| `ref` | findMany, findOne, create, update, delete |
| `store` | findMany, findOne, create, update, delete |
| `roleType` | findMany, findOne, create, update, delete |
| `migrateFile` | findMany, findOne, create, update, delete |
| `appLimitDefault` | findMany, findOne, create, update, delete |
| `orgLimitDefault` | findMany, findOne, create, update, delete |
| `devicesModule` | findMany, findOne, create, update, delete |
| `nodeTypeRegistry` | findMany, findOne, create, update, delete |
| `userConnectedAccount` | findMany, findOne, create, update, delete |
| `appMembershipDefault` | findMany, findOne, create, update, delete |
| `orgMembershipDefault` | findMany, findOne, create, update, delete |
| `commit` | findMany, findOne, create, update, delete |
| `rateLimitsModule` | findMany, findOne, create, update, delete |
| `membershipType` | findMany, findOne, create, update, delete |
| `rlsModule` | findMany, findOne, create, update, delete |
| `sqlAction` | findMany, findOne, create, update, delete |
| `orgMembershipSetting` | findMany, findOne, create, update, delete |
| `user` | findMany, findOne, create, update, delete |
| `astMigration` | findMany, findOne, create, update, delete |
| `appMembership` | findMany, findOne, create, update, delete |
| `hierarchyModule` | findMany, findOne, create, update, delete |

## Table Operations

### `db.orgGetManagersRecord`

CRUD operations for OrgGetManagersRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `userId` | UUID | Yes |
| `depth` | Int | Yes |

**Operations:**

```typescript
// List all orgGetManagersRecord records
const items = await db.orgGetManagersRecord.findMany({ select: { userId: true, depth: true } }).execute();

// Get one by id
const item = await db.orgGetManagersRecord.findOne({ id: '<UUID>', select: { userId: true, depth: true } }).execute();

// Create
const created = await db.orgGetManagersRecord.create({ data: { userId: '<UUID>', depth: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetManagersRecord.update({ where: { id: '<UUID>' }, data: { userId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetManagersRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGetSubordinatesRecord`

CRUD operations for OrgGetSubordinatesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `userId` | UUID | Yes |
| `depth` | Int | Yes |

**Operations:**

```typescript
// List all orgGetSubordinatesRecord records
const items = await db.orgGetSubordinatesRecord.findMany({ select: { userId: true, depth: true } }).execute();

// Get one by id
const item = await db.orgGetSubordinatesRecord.findOne({ id: '<UUID>', select: { userId: true, depth: true } }).execute();

// Create
const created = await db.orgGetSubordinatesRecord.create({ data: { userId: '<UUID>', depth: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetSubordinatesRecord.update({ where: { id: '<UUID>' }, data: { userId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetSubordinatesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

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

### `db.appPermission`

CRUD operations for AppPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |

**Operations:**

```typescript
// List all appPermission records
const items = await db.appPermission.findMany({ select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Get one by id
const item = await db.appPermission.findOne({ id: '<UUID>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.appPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermission`

CRUD operations for OrgPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |

**Operations:**

```typescript
// List all orgPermission records
const items = await db.orgPermission.findMany({ select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Get one by id
const item = await db.orgPermission.findOne({ id: '<UUID>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.orgPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevelRequirement`

CRUD operations for AppLevelRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `level` | String | Yes |
| `description` | String | Yes |
| `requiredCount` | Int | Yes |
| `priority` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevelRequirement records
const items = await db.appLevelRequirement.findMany({ select: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevelRequirement.findOne({ id: '<UUID>', select: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevelRequirement.create({ data: { name: '<String>', level: '<String>', description: '<String>', requiredCount: '<Int>', priority: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevelRequirement.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevelRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.database`

CRUD operations for Database records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `schemaHash` | String | Yes |
| `name` | String | Yes |
| `label` | String | Yes |
| `hash` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all database records
const items = await db.database.findMany({ select: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.database.findOne({ id: '<UUID>', select: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.database.create({ data: { ownerId: '<UUID>', schemaHash: '<String>', name: '<String>', label: '<String>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.database.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.database.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.schema`

CRUD operations for Schema records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `schemaName` | String | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `isPublic` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all schema records
const items = await db.schema.findMany({ select: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.schema.findOne({ id: '<UUID>', select: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.schema.create({ data: { databaseId: '<UUID>', name: '<String>', schemaName: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>', isPublic: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.schema.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schema.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.table`

CRUD operations for Table records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `name` | String | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `useRls` | Boolean | Yes |
| `timestamps` | Boolean | Yes |
| `peoplestamps` | Boolean | Yes |
| `pluralName` | String | Yes |
| `singularName` | String | Yes |
| `tags` | String | Yes |
| `inheritsId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all table records
const items = await db.table.findMany({ select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.table.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.table.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', inheritsId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.table.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.table.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.checkConstraint`

CRUD operations for CheckConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `type` | String | Yes |
| `fieldIds` | UUID | Yes |
| `expr` | JSON | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all checkConstraint records
const items = await db.checkConstraint.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.checkConstraint.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.checkConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', expr: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.checkConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.checkConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.field`

CRUD operations for Field records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `smartTags` | JSON | Yes |
| `isRequired` | Boolean | Yes |
| `apiRequired` | Boolean | Yes |
| `defaultValue` | String | Yes |
| `defaultValueAst` | JSON | Yes |
| `type` | String | Yes |
| `fieldOrder` | Int | Yes |
| `regexp` | String | Yes |
| `chk` | JSON | Yes |
| `chkExpr` | JSON | Yes |
| `min` | Float | Yes |
| `max` | Float | Yes |
| `tags` | String | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all field records
const items = await db.field.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.field.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.field.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<String>', defaultValueAst: '<JSON>', type: '<String>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.field.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.field.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.spatialRelation`

CRUD operations for SpatialRelation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `refFieldId` | UUID | Yes |
| `name` | String | Yes |
| `operator` | String | Yes |
| `paramName` | String | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all spatialRelation records
const items = await db.spatialRelation.findMany({ select: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.spatialRelation.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.spatialRelation.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.spatialRelation.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.spatialRelation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.foreignKeyConstraint`

CRUD operations for ForeignKeyConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `description` | String | Yes |
| `smartTags` | JSON | Yes |
| `type` | String | Yes |
| `fieldIds` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `refFieldIds` | UUID | Yes |
| `deleteAction` | String | Yes |
| `updateAction` | String | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all foreignKeyConstraint records
const items = await db.foreignKeyConstraint.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.foreignKeyConstraint.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.foreignKeyConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', refTableId: '<UUID>', refFieldIds: '<UUID>', deleteAction: '<String>', updateAction: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.foreignKeyConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.foreignKeyConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.fullTextSearch`

CRUD operations for FullTextSearch records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `fieldIds` | UUID | Yes |
| `weights` | String | Yes |
| `langs` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all fullTextSearch records
const items = await db.fullTextSearch.findMany({ select: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.fullTextSearch.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.fullTextSearch.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.fullTextSearch.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.fullTextSearch.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.index`

CRUD operations for Index records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `fieldIds` | UUID | Yes |
| `includeFieldIds` | UUID | Yes |
| `accessMethod` | String | Yes |
| `indexParams` | JSON | Yes |
| `whereClause` | JSON | Yes |
| `isUnique` | Boolean | Yes |
| `options` | JSON | Yes |
| `opClasses` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all index records
const items = await db.index.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.index.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.index.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', accessMethod: '<String>', indexParams: '<JSON>', whereClause: '<JSON>', isUnique: '<Boolean>', options: '<JSON>', opClasses: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.index.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.index.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.policy`

CRUD operations for Policy records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `granteeName` | String | Yes |
| `privilege` | String | Yes |
| `permissive` | Boolean | Yes |
| `disabled` | Boolean | Yes |
| `policyType` | String | Yes |
| `data` | JSON | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all policy records
const items = await db.policy.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.policy.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.policy.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', granteeName: '<String>', privilege: '<String>', permissive: '<Boolean>', disabled: '<Boolean>', policyType: '<String>', data: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.policy.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.policy.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.primaryKeyConstraint`

CRUD operations for PrimaryKeyConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `type` | String | Yes |
| `fieldIds` | UUID | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all primaryKeyConstraint records
const items = await db.primaryKeyConstraint.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.primaryKeyConstraint.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.primaryKeyConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.primaryKeyConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.primaryKeyConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.tableGrant`

CRUD operations for TableGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `privilege` | String | Yes |
| `granteeName` | String | Yes |
| `fieldIds` | UUID | Yes |
| `isGrant` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all tableGrant records
const items = await db.tableGrant.findMany({ select: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.tableGrant.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.tableGrant.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', privilege: '<String>', granteeName: '<String>', fieldIds: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

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
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `event` | String | Yes |
| `functionName` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all trigger records
const items = await db.trigger.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.trigger.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.trigger.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', event: '<String>', functionName: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.trigger.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.trigger.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.uniqueConstraint`

CRUD operations for UniqueConstraint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `description` | String | Yes |
| `smartTags` | JSON | Yes |
| `type` | String | Yes |
| `fieldIds` | UUID | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all uniqueConstraint records
const items = await db.uniqueConstraint.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.uniqueConstraint.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.uniqueConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.uniqueConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.uniqueConstraint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.view`

CRUD operations for View records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `name` | String | Yes |
| `tableId` | UUID | Yes |
| `viewType` | String | Yes |
| `data` | JSON | Yes |
| `filterType` | String | Yes |
| `filterData` | JSON | Yes |
| `securityInvoker` | Boolean | Yes |
| `isReadOnly` | Boolean | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |

**Operations:**

```typescript
// List all view records
const items = await db.view.findMany({ select: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } }).execute();

// Get one by id
const item = await db.view.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } }).execute();

// Create
const created = await db.view.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', tableId: '<UUID>', viewType: '<String>', data: '<JSON>', filterType: '<String>', filterData: '<JSON>', securityInvoker: '<Boolean>', isReadOnly: '<Boolean>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.view.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.view.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.viewTable`

CRUD operations for ViewTable records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `viewId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `joinOrder` | Int | Yes |

**Operations:**

```typescript
// List all viewTable records
const items = await db.viewTable.findMany({ select: { id: true, viewId: true, tableId: true, joinOrder: true } }).execute();

// Get one by id
const item = await db.viewTable.findOne({ id: '<UUID>', select: { id: true, viewId: true, tableId: true, joinOrder: true } }).execute();

// Create
const created = await db.viewTable.create({ data: { viewId: '<UUID>', tableId: '<UUID>', joinOrder: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewTable.update({ where: { id: '<UUID>' }, data: { viewId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewTable.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.viewGrant`

CRUD operations for ViewGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `viewId` | UUID | Yes |
| `granteeName` | String | Yes |
| `privilege` | String | Yes |
| `withGrantOption` | Boolean | Yes |
| `isGrant` | Boolean | Yes |

**Operations:**

```typescript
// List all viewGrant records
const items = await db.viewGrant.findMany({ select: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true } }).execute();

// Get one by id
const item = await db.viewGrant.findOne({ id: '<UUID>', select: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true } }).execute();

// Create
const created = await db.viewGrant.create({ data: { databaseId: '<UUID>', viewId: '<UUID>', granteeName: '<String>', privilege: '<String>', withGrantOption: '<Boolean>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

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
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `viewId` | UUID | Yes |
| `name` | String | Yes |
| `event` | String | Yes |
| `action` | String | Yes |

**Operations:**

```typescript
// List all viewRule records
const items = await db.viewRule.findMany({ select: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } }).execute();

// Get one by id
const item = await db.viewRule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } }).execute();

// Create
const created = await db.viewRule.create({ data: { databaseId: '<UUID>', viewId: '<UUID>', name: '<String>', event: '<String>', action: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewRule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewRule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.embeddingChunk`

CRUD operations for EmbeddingChunk records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `embeddingFieldId` | UUID | Yes |
| `chunksTableId` | UUID | Yes |
| `chunksTableName` | String | Yes |
| `contentFieldName` | String | Yes |
| `dimensions` | Int | Yes |
| `metric` | String | Yes |
| `chunkSize` | Int | Yes |
| `chunkOverlap` | Int | Yes |
| `chunkStrategy` | String | Yes |
| `metadataFields` | JSON | Yes |
| `enqueueChunkingJob` | Boolean | Yes |
| `chunkingTaskName` | String | Yes |
| `parentFkFieldId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all embeddingChunk records
const items = await db.embeddingChunk.findMany({ select: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.embeddingChunk.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.embeddingChunk.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', parentFkFieldId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.embeddingChunk.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.embeddingChunk.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secureTableProvision`

CRUD operations for SecureTableProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `nodes` | JSON | Yes |
| `useRls` | Boolean | Yes |
| `fields` | JSON | Yes |
| `grants` | JSON | Yes |
| `policies` | JSON | Yes |
| `outFields` | UUID | Yes |

**Operations:**

```typescript
// List all secureTableProvision records
const items = await db.secureTableProvision.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grants: true, policies: true, outFields: true } }).execute();

// Get one by id
const item = await db.secureTableProvision.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grants: true, policies: true, outFields: true } }).execute();

// Create
const created = await db.secureTableProvision.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodes: '<JSON>', useRls: '<Boolean>', fields: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFields: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.secureTableProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secureTableProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.relationProvision`

CRUD operations for RelationProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `relationType` | String | Yes |
| `sourceTableId` | UUID | Yes |
| `targetTableId` | UUID | Yes |
| `fieldName` | String | Yes |
| `deleteAction` | String | Yes |
| `isRequired` | Boolean | Yes |
| `apiRequired` | Boolean | Yes |
| `junctionTableId` | UUID | Yes |
| `junctionTableName` | String | Yes |
| `junctionSchemaId` | UUID | Yes |
| `sourceFieldName` | String | Yes |
| `targetFieldName` | String | Yes |
| `useCompositeKey` | Boolean | Yes |
| `createIndex` | Boolean | Yes |
| `exposeInApi` | Boolean | Yes |
| `nodes` | JSON | Yes |
| `grants` | JSON | Yes |
| `policies` | JSON | Yes |
| `outFieldId` | UUID | Yes |
| `outJunctionTableId` | UUID | Yes |
| `outSourceFieldId` | UUID | Yes |
| `outTargetFieldId` | UUID | Yes |

**Operations:**

```typescript
// List all relationProvision records
const items = await db.relationProvision.findMany({ select: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grants: true, policies: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } }).execute();

// Get one by id
const item = await db.relationProvision.findOne({ id: '<UUID>', select: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grants: true, policies: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } }).execute();

// Create
const created = await db.relationProvision.create({ data: { databaseId: '<UUID>', relationType: '<String>', sourceTableId: '<UUID>', targetTableId: '<UUID>', fieldName: '<String>', deleteAction: '<String>', isRequired: '<Boolean>', apiRequired: '<Boolean>', junctionTableId: '<UUID>', junctionTableName: '<String>', junctionSchemaId: '<UUID>', sourceFieldName: '<String>', targetFieldName: '<String>', useCompositeKey: '<Boolean>', createIndex: '<Boolean>', exposeInApi: '<Boolean>', nodes: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.relationProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.relationProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sessionSecretsModule`

CRUD operations for SessionSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `sessionsTableId` | UUID | Yes |

**Operations:**

```typescript
// List all sessionSecretsModule records
const items = await db.sessionSecretsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } }).execute();

// Get one by id
const item = await db.sessionSecretsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } }).execute();

// Create
const created = await db.sessionSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', sessionsTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.sessionSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sessionSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.identityProvidersModule`

CRUD operations for IdentityProvidersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all identityProvidersModule records
const items = await db.identityProvidersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.identityProvidersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.identityProvidersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.identityProvidersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.identityProvidersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.schemaGrant`

CRUD operations for SchemaGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `granteeName` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all schemaGrant records
const items = await db.schemaGrant.findMany({ select: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.schemaGrant.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.schemaGrant.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', granteeName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.schemaGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schemaGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.defaultPrivilege`

CRUD operations for DefaultPrivilege records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `objectType` | String | Yes |
| `privilege` | String | Yes |
| `granteeName` | String | Yes |
| `isGrant` | Boolean | Yes |

**Operations:**

```typescript
// List all defaultPrivilege records
const items = await db.defaultPrivilege.findMany({ select: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } }).execute();

// Get one by id
const item = await db.defaultPrivilege.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } }).execute();

// Create
const created = await db.defaultPrivilege.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', objectType: '<String>', privilege: '<String>', granteeName: '<String>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.defaultPrivilege.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.defaultPrivilege.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.enum`

CRUD operations for Enum records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `name` | String | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `values` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |

**Operations:**

```typescript
// List all enum records
const items = await db.enum.findMany({ select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } }).execute();

// Get one by id
const item = await db.enum.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } }).execute();

// Create
const created = await db.enum.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', values: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.enum.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.enum.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.apiSchema`

CRUD operations for ApiSchema records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `apiId` | UUID | Yes |

**Operations:**

```typescript
// List all apiSchema records
const items = await db.apiSchema.findMany({ select: { id: true, databaseId: true, schemaId: true, apiId: true } }).execute();

// Get one by id
const item = await db.apiSchema.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, apiId: true } }).execute();

// Create
const created = await db.apiSchema.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', apiId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiSchema.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiSchema.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.apiModule`

CRUD operations for ApiModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `apiId` | UUID | Yes |
| `name` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all apiModule records
const items = await db.apiModule.findMany({ select: { id: true, databaseId: true, apiId: true, name: true, data: true } }).execute();

// Get one by id
const item = await db.apiModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, apiId: true, name: true, data: true } }).execute();

// Create
const created = await db.apiModule.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', name: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.domain`

CRUD operations for Domain records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `apiId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `subdomain` | ConstructiveInternalTypeHostname | Yes |
| `domain` | ConstructiveInternalTypeHostname | Yes |

**Operations:**

```typescript
// List all domain records
const items = await db.domain.findMany({ select: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } }).execute();

// Get one by id
const item = await db.domain.findOne({ id: '<UUID>', select: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } }).execute();

// Create
const created = await db.domain.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>', domain: '<Hostname>' }, select: { id: true } }).execute();

// Update
const updated = await db.domain.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.domain.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.siteMetadatum`

CRUD operations for SiteMetadatum records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `title` | String | Yes |
| `description` | String | Yes |
| `ogImage` | ConstructiveInternalTypeImage | Yes |

**Operations:**

```typescript
// List all siteMetadatum records
const items = await db.siteMetadatum.findMany({ select: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } }).execute();

// Get one by id
const item = await db.siteMetadatum.findOne({ id: '<UUID>', select: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } }).execute();

// Create
const created = await db.siteMetadatum.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>' }, select: { id: true } }).execute();

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
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `name` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all siteModule records
const items = await db.siteModule.findMany({ select: { id: true, databaseId: true, siteId: true, name: true, data: true } }).execute();

// Get one by id
const item = await db.siteModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, siteId: true, name: true, data: true } }).execute();

// Create
const created = await db.siteModule.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.siteTheme`

CRUD operations for SiteTheme records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `theme` | JSON | Yes |

**Operations:**

```typescript
// List all siteTheme records
const items = await db.siteTheme.findMany({ select: { id: true, databaseId: true, siteId: true, theme: true } }).execute();

// Get one by id
const item = await db.siteTheme.findOne({ id: '<UUID>', select: { id: true, databaseId: true, siteId: true, theme: true } }).execute();

// Create
const created = await db.siteTheme.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteTheme.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteTheme.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.triggerFunction`

CRUD operations for TriggerFunction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `code` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all triggerFunction records
const items = await db.triggerFunction.findMany({ select: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.triggerFunction.findOne({ id: '<UUID>', select: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.triggerFunction.create({ data: { databaseId: '<UUID>', name: '<String>', code: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.triggerFunction.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.triggerFunction.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.databaseTransfer`

CRUD operations for DatabaseTransfer records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `targetOwnerId` | UUID | Yes |
| `sourceApproved` | Boolean | Yes |
| `targetApproved` | Boolean | Yes |
| `sourceApprovedAt` | Datetime | Yes |
| `targetApprovedAt` | Datetime | Yes |
| `status` | String | Yes |
| `initiatedBy` | UUID | Yes |
| `notes` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `completedAt` | Datetime | Yes |

**Operations:**

```typescript
// List all databaseTransfer records
const items = await db.databaseTransfer.findMany({ select: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } }).execute();

// Get one by id
const item = await db.databaseTransfer.findOne({ id: '<UUID>', select: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } }).execute();

// Create
const created = await db.databaseTransfer.create({ data: { databaseId: '<UUID>', targetOwnerId: '<UUID>', sourceApproved: '<Boolean>', targetApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', targetApprovedAt: '<Datetime>', status: '<String>', initiatedBy: '<UUID>', notes: '<String>', expiresAt: '<Datetime>', completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseTransfer.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseTransfer.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.api`

CRUD operations for Api records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `dbname` | String | Yes |
| `roleName` | String | Yes |
| `anonRole` | String | Yes |
| `isPublic` | Boolean | Yes |

**Operations:**

```typescript
// List all api records
const items = await db.api.findMany({ select: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } }).execute();

// Get one by id
const item = await db.api.findOne({ id: '<UUID>', select: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } }).execute();

// Create
const created = await db.api.create({ data: { databaseId: '<UUID>', name: '<String>', dbname: '<String>', roleName: '<String>', anonRole: '<String>', isPublic: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.api.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.api.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.site`

CRUD operations for Site records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `title` | String | Yes |
| `description` | String | Yes |
| `ogImage` | ConstructiveInternalTypeImage | Yes |
| `favicon` | ConstructiveInternalTypeAttachment | Yes |
| `appleTouchIcon` | ConstructiveInternalTypeImage | Yes |
| `logo` | ConstructiveInternalTypeImage | Yes |
| `dbname` | String | Yes |

**Operations:**

```typescript
// List all site records
const items = await db.site.findMany({ select: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } }).execute();

// Get one by id
const item = await db.site.findOne({ id: '<UUID>', select: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } }).execute();

// Create
const created = await db.site.create({ data: { databaseId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>', favicon: '<Attachment>', appleTouchIcon: '<Image>', logo: '<Image>', dbname: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.site.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.site.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.app`

CRUD operations for App records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `siteId` | UUID | Yes |
| `name` | String | Yes |
| `appImage` | ConstructiveInternalTypeImage | Yes |
| `appStoreLink` | ConstructiveInternalTypeUrl | Yes |
| `appStoreId` | String | Yes |
| `appIdPrefix` | String | Yes |
| `playStoreLink` | ConstructiveInternalTypeUrl | Yes |

**Operations:**

```typescript
// List all app records
const items = await db.app.findMany({ select: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } }).execute();

// Get one by id
const item = await db.app.findOne({ id: '<UUID>', select: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } }).execute();

// Create
const created = await db.app.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', appImage: '<Image>', appStoreLink: '<Url>', appStoreId: '<String>', appIdPrefix: '<String>', playStoreLink: '<Url>' }, select: { id: true } }).execute();

// Update
const updated = await db.app.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.app.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.connectedAccountsModule`

CRUD operations for ConnectedAccountsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all connectedAccountsModule records
const items = await db.connectedAccountsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.connectedAccountsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.connectedAccountsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccountsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccountsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.cryptoAddressesModule`

CRUD operations for CryptoAddressesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |
| `cryptoNetwork` | String | Yes |

**Operations:**

```typescript
// List all cryptoAddressesModule records
const items = await db.cryptoAddressesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } }).execute();

// Get one by id
const item = await db.cryptoAddressesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } }).execute();

// Create
const created = await db.cryptoAddressesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddressesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddressesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.cryptoAuthModule`

CRUD operations for CryptoAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `secretsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `addressesTableId` | UUID | Yes |
| `userField` | String | Yes |
| `cryptoNetwork` | String | Yes |
| `signInRequestChallenge` | String | Yes |
| `signInRecordFailure` | String | Yes |
| `signUpWithKey` | String | Yes |
| `signInWithChallenge` | String | Yes |

**Operations:**

```typescript
// List all cryptoAuthModule records
const items = await db.cryptoAuthModule.findMany({ select: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } }).execute();

// Get one by id
const item = await db.cryptoAuthModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } }).execute();

// Create
const created = await db.cryptoAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', addressesTableId: '<UUID>', userField: '<String>', cryptoNetwork: '<String>', signInRequestChallenge: '<String>', signInRecordFailure: '<String>', signUpWithKey: '<String>', signInWithChallenge: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.defaultIdsModule`

CRUD operations for DefaultIdsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all defaultIdsModule records
const items = await db.defaultIdsModule.findMany({ select: { id: true, databaseId: true } }).execute();

// Get one by id
const item = await db.defaultIdsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true } }).execute();

// Create
const created = await db.defaultIdsModule.create({ data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.defaultIdsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.defaultIdsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.denormalizedTableField`

CRUD operations for DenormalizedTableField records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `setIds` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `refFieldId` | UUID | Yes |
| `refIds` | UUID | Yes |
| `useUpdates` | Boolean | Yes |
| `updateDefaults` | Boolean | Yes |
| `funcName` | String | Yes |
| `funcOrder` | Int | Yes |

**Operations:**

```typescript
// List all denormalizedTableField records
const items = await db.denormalizedTableField.findMany({ select: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } }).execute();

// Get one by id
const item = await db.denormalizedTableField.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } }).execute();

// Create
const created = await db.denormalizedTableField.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', setIds: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', refIds: '<UUID>', useUpdates: '<Boolean>', updateDefaults: '<Boolean>', funcName: '<String>', funcOrder: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.denormalizedTableField.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.denormalizedTableField.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.emailsModule`

CRUD operations for EmailsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all emailsModule records
const items = await db.emailsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.emailsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.emailsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.emailsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.emailsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.encryptedSecretsModule`

CRUD operations for EncryptedSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all encryptedSecretsModule records
const items = await db.encryptedSecretsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.encryptedSecretsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.encryptedSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.encryptedSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.encryptedSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.invitesModule`

CRUD operations for InvitesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `emailsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `invitesTableId` | UUID | Yes |
| `claimedInvitesTableId` | UUID | Yes |
| `invitesTableName` | String | Yes |
| `claimedInvitesTableName` | String | Yes |
| `submitInviteCodeFunction` | String | Yes |
| `prefix` | String | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |

**Operations:**

```typescript
// List all invitesModule records
const items = await db.invitesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } }).execute();

// Get one by id
const item = await db.invitesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } }).execute();

// Create
const created = await db.invitesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.invitesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invitesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.levelsModule`

CRUD operations for LevelsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `stepsTableId` | UUID | Yes |
| `stepsTableName` | String | Yes |
| `achievementsTableId` | UUID | Yes |
| `achievementsTableName` | String | Yes |
| `levelsTableId` | UUID | Yes |
| `levelsTableName` | String | Yes |
| `levelRequirementsTableId` | UUID | Yes |
| `levelRequirementsTableName` | String | Yes |
| `completedStep` | String | Yes |
| `incompletedStep` | String | Yes |
| `tgAchievement` | String | Yes |
| `tgAchievementToggle` | String | Yes |
| `tgAchievementToggleBoolean` | String | Yes |
| `tgAchievementBoolean` | String | Yes |
| `upsertAchievement` | String | Yes |
| `tgUpdateAchievements` | String | Yes |
| `stepsRequired` | String | Yes |
| `levelAchieved` | String | Yes |
| `prefix` | String | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |

**Operations:**

```typescript
// List all levelsModule records
const items = await db.levelsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Get one by id
const item = await db.levelsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Create
const created = await db.levelsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', stepsTableId: '<UUID>', stepsTableName: '<String>', achievementsTableId: '<UUID>', achievementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', completedStep: '<String>', incompletedStep: '<String>', tgAchievement: '<String>', tgAchievementToggle: '<String>', tgAchievementToggleBoolean: '<String>', tgAchievementBoolean: '<String>', upsertAchievement: '<String>', tgUpdateAchievements: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.levelsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.levelsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.limitsModule`

CRUD operations for LimitsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `defaultTableId` | UUID | Yes |
| `defaultTableName` | String | Yes |
| `limitIncrementFunction` | String | Yes |
| `limitDecrementFunction` | String | Yes |
| `limitIncrementTrigger` | String | Yes |
| `limitDecrementTrigger` | String | Yes |
| `limitUpdateTrigger` | String | Yes |
| `limitCheckFunction` | String | Yes |
| `prefix` | String | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |

**Operations:**

```typescript
// List all limitsModule records
const items = await db.limitsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Get one by id
const item = await db.limitsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Create
const created = await db.limitsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.limitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.limitsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipTypesModule`

CRUD operations for MembershipTypesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all membershipTypesModule records
const items = await db.membershipTypesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.membershipTypesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.membershipTypesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipTypesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipTypesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipsModule`

CRUD operations for MembershipsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `membershipsTableId` | UUID | Yes |
| `membershipsTableName` | String | Yes |
| `membersTableId` | UUID | Yes |
| `membersTableName` | String | Yes |
| `membershipDefaultsTableId` | UUID | Yes |
| `membershipDefaultsTableName` | String | Yes |
| `membershipSettingsTableId` | UUID | Yes |
| `membershipSettingsTableName` | String | Yes |
| `grantsTableId` | UUID | Yes |
| `grantsTableName` | String | Yes |
| `actorTableId` | UUID | Yes |
| `limitsTableId` | UUID | Yes |
| `defaultLimitsTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `defaultPermissionsTableId` | UUID | Yes |
| `sprtTableId` | UUID | Yes |
| `adminGrantsTableId` | UUID | Yes |
| `adminGrantsTableName` | String | Yes |
| `ownerGrantsTableId` | UUID | Yes |
| `ownerGrantsTableName` | String | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `entityTableOwnerId` | UUID | Yes |
| `prefix` | String | Yes |
| `actorMaskCheck` | String | Yes |
| `actorPermCheck` | String | Yes |
| `entityIdsByMask` | String | Yes |
| `entityIdsByPerm` | String | Yes |
| `entityIdsFunction` | String | Yes |
| `memberProfilesTableId` | UUID | Yes |

**Operations:**

```typescript
// List all membershipsModule records
const items = await db.membershipsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true } }).execute();

// Get one by id
const item = await db.membershipsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true } }).execute();

// Create
const created = await db.membershipsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', prefix: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', memberProfilesTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.permissionsModule`

CRUD operations for PermissionsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `defaultTableId` | UUID | Yes |
| `defaultTableName` | String | Yes |
| `bitlen` | Int | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `getPaddedMask` | String | Yes |
| `getMask` | String | Yes |
| `getByMask` | String | Yes |
| `getMaskByName` | String | Yes |

**Operations:**

```typescript
// List all permissionsModule records
const items = await db.permissionsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } }).execute();

// Get one by id
const item = await db.permissionsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } }).execute();

// Create
const created = await db.permissionsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', prefix: '<String>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.permissionsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.permissionsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.phoneNumbersModule`

CRUD operations for PhoneNumbersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all phoneNumbersModule records
const items = await db.phoneNumbersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.phoneNumbersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.phoneNumbersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumbersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumbersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.profilesModule`

CRUD operations for ProfilesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `profilePermissionsTableId` | UUID | Yes |
| `profilePermissionsTableName` | String | Yes |
| `profileGrantsTableId` | UUID | Yes |
| `profileGrantsTableName` | String | Yes |
| `profileDefinitionGrantsTableId` | UUID | Yes |
| `profileDefinitionGrantsTableName` | String | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `membershipsTableId` | UUID | Yes |
| `prefix` | String | Yes |

**Operations:**

```typescript
// List all profilesModule records
const items = await db.profilesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } }).execute();

// Get one by id
const item = await db.profilesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } }).execute();

// Create
const created = await db.profilesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.profilesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.profilesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secretsModule`

CRUD operations for SecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all secretsModule records
const items = await db.secretsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.secretsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.secretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.secretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sessionsModule`

CRUD operations for SessionsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `authSettingsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `sessionsDefaultExpiration` | Interval | Yes |
| `sessionsTable` | String | Yes |
| `sessionCredentialsTable` | String | Yes |
| `authSettingsTable` | String | Yes |

**Operations:**

```typescript
// List all sessionsModule records
const items = await db.sessionsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } }).execute();

// Get one by id
const item = await db.sessionsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } }).execute();

// Create
const created = await db.sessionsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', authSettingsTableId: '<UUID>', usersTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionCredentialsTable: '<String>', authSettingsTable: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.sessionsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sessionsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userAuthModule`

CRUD operations for UserAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `emailsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `secretsTableId` | UUID | Yes |
| `encryptedTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `auditsTableId` | UUID | Yes |
| `auditsTableName` | String | Yes |
| `signInFunction` | String | Yes |
| `signUpFunction` | String | Yes |
| `signOutFunction` | String | Yes |
| `setPasswordFunction` | String | Yes |
| `resetPasswordFunction` | String | Yes |
| `forgotPasswordFunction` | String | Yes |
| `sendVerificationEmailFunction` | String | Yes |
| `verifyEmailFunction` | String | Yes |
| `verifyPasswordFunction` | String | Yes |
| `checkPasswordFunction` | String | Yes |
| `sendAccountDeletionEmailFunction` | String | Yes |
| `deleteAccountFunction` | String | Yes |
| `signInCrossOriginFunction` | String | Yes |
| `requestCrossOriginTokenFunction` | String | Yes |
| `extendTokenExpires` | String | Yes |

**Operations:**

```typescript
// List all userAuthModule records
const items = await db.userAuthModule.findMany({ select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } }).execute();

// Get one by id
const item = await db.userAuthModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } }).execute();

// Create
const created = await db.userAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInCrossOriginFunction: '<String>', requestCrossOriginTokenFunction: '<String>', extendTokenExpires: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.usersModule`

CRUD operations for UsersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `typeTableId` | UUID | Yes |
| `typeTableName` | String | Yes |

**Operations:**

```typescript
// List all usersModule records
const items = await db.usersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } }).execute();

// Get one by id
const item = await db.usersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } }).execute();

// Create
const created = await db.usersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.usersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.usersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprint`

CRUD operations for Blueprint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `displayName` | String | Yes |
| `description` | String | Yes |
| `definition` | JSON | Yes |
| `templateId` | UUID | Yes |
| `definitionHash` | UUID | Yes |
| `tableHashes` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all blueprint records
const items = await db.blueprint.findMany({ select: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.blueprint.findOne({ id: '<UUID>', select: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.blueprint.create({ data: { ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprint.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprintTemplate`

CRUD operations for BlueprintTemplate records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `version` | String | Yes |
| `displayName` | String | Yes |
| `description` | String | Yes |
| `ownerId` | UUID | Yes |
| `visibility` | String | Yes |
| `categories` | String | Yes |
| `tags` | String | Yes |
| `definition` | JSON | Yes |
| `definitionSchemaVersion` | String | Yes |
| `source` | String | Yes |
| `complexity` | String | Yes |
| `copyCount` | Int | Yes |
| `forkCount` | Int | Yes |
| `forkedFromId` | UUID | Yes |
| `definitionHash` | UUID | Yes |
| `tableHashes` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all blueprintTemplate records
const items = await db.blueprintTemplate.findMany({ select: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.blueprintTemplate.findOne({ id: '<UUID>', select: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.blueprintTemplate.create({ data: { name: '<String>', version: '<String>', displayName: '<String>', description: '<String>', ownerId: '<UUID>', visibility: '<String>', categories: '<String>', tags: '<String>', definition: '<JSON>', definitionSchemaVersion: '<String>', source: '<String>', complexity: '<String>', copyCount: '<Int>', forkCount: '<Int>', forkedFromId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprintTemplate.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprintTemplate.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprintConstruction`

CRUD operations for BlueprintConstruction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `blueprintId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `status` | String | Yes |
| `errorDetails` | String | Yes |
| `tableMap` | JSON | Yes |
| `constructedDefinition` | JSON | Yes |
| `constructedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all blueprintConstruction records
const items = await db.blueprintConstruction.findMany({ select: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.blueprintConstruction.findOne({ id: '<UUID>', select: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.blueprintConstruction.create({ data: { blueprintId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', status: '<String>', errorDetails: '<String>', tableMap: '<JSON>', constructedDefinition: '<JSON>', constructedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprintConstruction.update({ where: { id: '<UUID>' }, data: { blueprintId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprintConstruction.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.storageModule`

CRUD operations for StorageModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `bucketsTableId` | UUID | Yes |
| `filesTableId` | UUID | Yes |
| `uploadRequestsTableId` | UUID | Yes |
| `bucketsTableName` | String | Yes |
| `filesTableName` | String | Yes |
| `uploadRequestsTableName` | String | Yes |
| `membershipType` | Int | Yes |
| `policies` | JSON | Yes |
| `skipDefaultPolicyTables` | String | Yes |
| `entityTableId` | UUID | Yes |
| `endpoint` | String | Yes |
| `publicUrlPrefix` | String | Yes |
| `provider` | String | Yes |
| `allowedOrigins` | String | Yes |
| `uploadUrlExpirySeconds` | Int | Yes |
| `downloadUrlExpirySeconds` | Int | Yes |
| `defaultMaxFileSize` | BigInt | Yes |
| `maxFilenameLength` | Int | Yes |
| `cacheTtlSeconds` | Int | Yes |

**Operations:**

```typescript
// List all storageModule records
const items = await db.storageModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, membershipType: true, policies: true, skipDefaultPolicyTables: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } }).execute();

// Get one by id
const item = await db.storageModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, membershipType: true, policies: true, skipDefaultPolicyTables: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } }).execute();

// Create
const created = await db.storageModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', uploadRequestsTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', uploadRequestsTableName: '<String>', membershipType: '<Int>', policies: '<JSON>', skipDefaultPolicyTables: '<String>', entityTableId: '<UUID>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.storageModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.storageModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.entityTypeProvision`

CRUD operations for EntityTypeProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `prefix` | String | Yes |
| `description` | String | Yes |
| `parentEntity` | String | Yes |
| `tableName` | String | Yes |
| `isVisible` | Boolean | Yes |
| `hasLimits` | Boolean | Yes |
| `hasProfiles` | Boolean | Yes |
| `hasLevels` | Boolean | Yes |
| `hasStorage` | Boolean | Yes |
| `hasInvites` | Boolean | Yes |
| `storageConfig` | JSON | Yes |
| `skipEntityPolicies` | Boolean | Yes |
| `tableProvision` | JSON | Yes |
| `outMembershipType` | Int | Yes |
| `outEntityTableId` | UUID | Yes |
| `outEntityTableName` | String | Yes |
| `outInstalledModules` | String | Yes |
| `outStorageModuleId` | UUID | Yes |
| `outBucketsTableId` | UUID | Yes |
| `outFilesTableId` | UUID | Yes |
| `outInvitesModuleId` | UUID | Yes |

**Operations:**

```typescript
// List all entityTypeProvision records
const items = await db.entityTypeProvision.findMany({ select: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasStorage: true, hasInvites: true, storageConfig: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outInvitesModuleId: true } }).execute();

// Get one by id
const item = await db.entityTypeProvision.findOne({ id: '<UUID>', select: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasStorage: true, hasInvites: true, storageConfig: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outInvitesModuleId: true } }).execute();

// Create
const created = await db.entityTypeProvision.create({ data: { databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', hasStorage: '<Boolean>', hasInvites: '<Boolean>', storageConfig: '<JSON>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>', outStorageModuleId: '<UUID>', outBucketsTableId: '<UUID>', outFilesTableId: '<UUID>', outInvitesModuleId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.entityTypeProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.entityTypeProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnCredentialsModule`

CRUD operations for WebauthnCredentialsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all webauthnCredentialsModule records
const items = await db.webauthnCredentialsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.webauthnCredentialsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.webauthnCredentialsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnCredentialsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnCredentialsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnAuthModule`

CRUD operations for WebauthnAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `credentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionSecretsTableId` | UUID | Yes |
| `authSettingsTableId` | UUID | Yes |
| `rpId` | String | Yes |
| `rpName` | String | Yes |
| `originAllowlist` | String | Yes |
| `attestationType` | String | Yes |
| `requireUserVerification` | Boolean | Yes |
| `residentKey` | String | Yes |
| `challengeExpiry` | Interval | Yes |

**Operations:**

```typescript
// List all webauthnAuthModule records
const items = await db.webauthnAuthModule.findMany({ select: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } }).execute();

// Get one by id
const item = await db.webauthnAuthModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } }).execute();

// Create
const created = await db.webauthnAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', authSettingsTableId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpiry: '<Interval>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.notificationsModule`

CRUD operations for NotificationsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `notificationsTableId` | UUID | Yes |
| `readStateTableId` | UUID | Yes |
| `preferencesTableId` | UUID | Yes |
| `channelsTableId` | UUID | Yes |
| `deliveryLogTableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `userSettingsTableId` | UUID | Yes |
| `organizationSettingsTableId` | UUID | Yes |
| `hasChannels` | Boolean | Yes |
| `hasPreferences` | Boolean | Yes |
| `hasSettingsExtension` | Boolean | Yes |
| `hasDigestMetadata` | Boolean | Yes |
| `hasSubscriptions` | Boolean | Yes |

**Operations:**

```typescript
// List all notificationsModule records
const items = await db.notificationsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true } }).execute();

// Get one by id
const item = await db.notificationsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true } }).execute();

// Create
const created = await db.notificationsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', readStateTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', hasChannels: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasDigestMetadata: '<Boolean>', hasSubscriptions: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.notificationsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.notificationsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.databaseProvisionModule`

CRUD operations for DatabaseProvisionModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseName` | String | Yes |
| `ownerId` | UUID | Yes |
| `subdomain` | String | Yes |
| `domain` | String | Yes |
| `modules` | String | Yes |
| `options` | JSON | Yes |
| `bootstrapUser` | Boolean | Yes |
| `status` | String | Yes |
| `errorMessage` | String | Yes |
| `databaseId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `completedAt` | Datetime | Yes |

**Operations:**

```typescript
// List all databaseProvisionModule records
const items = await db.databaseProvisionModule.findMany({ select: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } }).execute();

// Get one by id
const item = await db.databaseProvisionModule.findOne({ id: '<UUID>', select: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } }).execute();

// Create
const created = await db.databaseProvisionModule.create({ data: { databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<String>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseProvisionModule.update({ where: { id: '<UUID>' }, data: { databaseName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseProvisionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appAdminGrant`

CRUD operations for AppAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAdminGrant records
const items = await db.appAdminGrant.findMany({ select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAdminGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appOwnerGrant`

CRUD operations for AppOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appOwnerGrant records
const items = await db.appOwnerGrant.findMany({ select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appOwnerGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appOwnerGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appOwnerGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appGrant`

CRUD operations for AppGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appGrant records
const items = await db.appGrant.findMany({ select: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appGrant.findOne({ id: '<UUID>', select: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appGrant.create({ data: { permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appGrant.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembership`

CRUD operations for OrgMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isActive` | Boolean | Yes |
| `isExternal` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `granted` | BitString | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `isReadOnly` | Boolean | Yes |
| `profileId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembership records
const items = await db.orgMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } }).execute();

// Get one by id
const item = await db.orgMembership.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } }).execute();

// Create
const created = await db.orgMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMember`

CRUD operations for OrgMember records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isAdmin` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMember records
const items = await db.orgMember.findMany({ select: { id: true, isAdmin: true, actorId: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgMember.findOne({ id: '<UUID>', select: { id: true, isAdmin: true, actorId: true, entityId: true } }).execute();

// Create
const created = await db.orgMember.create({ data: { isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMember.update({ where: { id: '<UUID>' }, data: { isAdmin: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMember.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgAdminGrant`

CRUD operations for OrgAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgAdminGrant records
const items = await db.orgAdminGrant.findMany({ select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgAdminGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgOwnerGrant`

CRUD operations for OrgOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgOwnerGrant records
const items = await db.orgOwnerGrant.findMany({ select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgOwnerGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgOwnerGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgOwnerGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMemberProfile`

CRUD operations for OrgMemberProfile records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `membershipId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `actorId` | UUID | Yes |
| `displayName` | String | Yes |
| `email` | String | Yes |
| `title` | String | Yes |
| `bio` | String | Yes |
| `profilePicture` | ConstructiveInternalTypeImage | Yes |

**Operations:**

```typescript
// List all orgMemberProfile records
const items = await db.orgMemberProfile.findMany({ select: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } }).execute();

// Get one by id
const item = await db.orgMemberProfile.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } }).execute();

// Create
const created = await db.orgMemberProfile.create({ data: { membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMemberProfile.update({ where: { id: '<UUID>' }, data: { membershipId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMemberProfile.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGrant`

CRUD operations for OrgGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgGrant records
const items = await db.orgGrant.findMany({ select: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgGrant.findOne({ id: '<UUID>', select: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgGrant.create({ data: { permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGrant.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdge`

CRUD operations for OrgChartEdge records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `childId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `positionTitle` | String | Yes |
| `positionLevel` | Int | Yes |

**Operations:**

```typescript
// List all orgChartEdge records
const items = await db.orgChartEdge.findMany({ select: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } }).execute();

// Get one by id
const item = await db.orgChartEdge.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } }).execute();

// Create
const created = await db.orgChartEdge.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdge.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdge.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdgeGrant`

CRUD operations for OrgChartEdgeGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `entityId` | UUID | Yes |
| `childId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `isGrant` | Boolean | Yes |
| `positionTitle` | String | Yes |
| `positionLevel` | Int | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all orgChartEdgeGrant records
const items = await db.orgChartEdgeGrant.findMany({ select: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } }).execute();

// Get one by id
const item = await db.orgChartEdgeGrant.findOne({ id: '<UUID>', select: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } }).execute();

// Create
const created = await db.orgChartEdgeGrant.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdgeGrant.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdgeGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermissionDefault`

CRUD operations for OrgPermissionDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgPermissionDefault records
const items = await db.orgPermissionDefault.findMany({ select: { id: true, permissions: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgPermissionDefault.findOne({ id: '<UUID>', select: { id: true, permissions: true, entityId: true } }).execute();

// Create
const created = await db.orgPermissionDefault.create({ data: { permissions: '<BitString>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefault.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimit`

CRUD operations for AppLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | Int | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all appLimit records
const items = await db.appLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true } }).execute();

// Get one by id
const item = await db.appLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true } }).execute();

// Create
const created = await db.appLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimit`

CRUD operations for OrgLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | Int | Yes |
| `max` | Int | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgLimit records
const items = await db.orgLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } }).execute();

// Create
const created = await db.orgLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appStep`

CRUD operations for AppStep records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `name` | String | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appStep records
const items = await db.appStep.findMany({ select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appStep.findOne({ id: '<UUID>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appStep.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appStep.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appStep.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appAchievement`

CRUD operations for AppAchievement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `name` | String | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAchievement records
const items = await db.appAchievement.findMany({ select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAchievement.findOne({ id: '<UUID>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAchievement.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAchievement.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAchievement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevel`

CRUD operations for AppLevel records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `image` | ConstructiveInternalTypeImage | Yes |
| `ownerId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevel records
const items = await db.appLevel.findMany({ select: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevel.findOne({ id: '<UUID>', select: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevel.create({ data: { name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevel.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevel.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.email`

CRUD operations for Email records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `name` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all email records
const items = await db.email.findMany({ select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.email.findOne({ id: '<UUID>', select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.email.create({ data: { ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.email.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.email.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.phoneNumber`

CRUD operations for PhoneNumber records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `cc` | String | Yes |
| `number` | String | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `name` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all phoneNumber records
const items = await db.phoneNumber.findMany({ select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.phoneNumber.findOne({ id: '<UUID>', select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.phoneNumber.create({ data: { ownerId: '<UUID>', cc: '<String>', number: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumber.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumber.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.cryptoAddress`

CRUD operations for CryptoAddress records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `address` | String | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `name` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all cryptoAddress records
const items = await db.cryptoAddress.findMany({ select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.cryptoAddress.findOne({ id: '<UUID>', select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.cryptoAddress.create({ data: { ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddress.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddress.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnCredential`

CRUD operations for WebauthnCredential records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `credentialId` | String | Yes |
| `publicKey` | Base64EncodedBinary | Yes |
| `signCount` | BigInt | Yes |
| `webauthnUserId` | String | Yes |
| `transports` | String | Yes |
| `credentialDeviceType` | String | Yes |
| `backupEligible` | Boolean | Yes |
| `backupState` | Boolean | Yes |
| `name` | String | Yes |
| `lastUsedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all webauthnCredential records
const items = await db.webauthnCredential.findMany({ select: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.webauthnCredential.findOne({ id: '<UUID>', select: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.webauthnCredential.create({ data: { ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnCredential.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnCredential.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appInvite`

CRUD operations for AppInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `senderId` | UUID | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `inviteLimit` | Int | Yes |
| `inviteCount` | Int | Yes |
| `multiple` | Boolean | Yes |
| `data` | JSON | Yes |
| `expiresAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appInvite records
const items = await db.appInvite.findMany({ select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appInvite.findOne({ id: '<UUID>', select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appInvite.create({ data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.appInvite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appClaimedInvite`

CRUD operations for AppClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `data` | JSON | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appClaimedInvite records
const items = await db.appClaimedInvite.findMany({ select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appClaimedInvite.findOne({ id: '<UUID>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appClaimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appClaimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgInvite`

CRUD operations for OrgInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `inviteLimit` | Int | Yes |
| `inviteCount` | Int | Yes |
| `multiple` | Boolean | Yes |
| `data` | JSON | Yes |
| `expiresAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgInvite records
const items = await db.orgInvite.findMany({ select: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgInvite.findOne({ id: '<UUID>', select: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgInvite.create({ data: { email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgInvite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgClaimedInvite`

CRUD operations for OrgClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `data` | JSON | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgClaimedInvite records
const items = await db.orgClaimedInvite.findMany({ select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgClaimedInvite.findOne({ id: '<UUID>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgClaimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgClaimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.auditLog`

CRUD operations for AuditLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `event` | String | Yes |
| `actorId` | UUID | Yes |
| `origin` | ConstructiveInternalTypeOrigin | Yes |
| `userAgent` | String | Yes |
| `ipAddress` | InternetAddress | Yes |
| `success` | Boolean | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all auditLog records
const items = await db.auditLog.findMany({ select: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } }).execute();

// Get one by id
const item = await db.auditLog.findOne({ id: '<UUID>', select: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } }).execute();

// Create
const created = await db.auditLog.create({ data: { event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.auditLog.update({ where: { id: '<UUID>' }, data: { event: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.auditLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentThread`

CRUD operations for AgentThread records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `title` | String | Yes |
| `mode` | String | Yes |
| `model` | String | Yes |
| `systemPrompt` | String | Yes |
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all agentThread records
const items = await db.agentThread.findMany({ select: { title: true, mode: true, model: true, systemPrompt: true, id: true, createdAt: true, updatedAt: true, ownerId: true, entityId: true, status: true } }).execute();

// Get one by id
const item = await db.agentThread.findOne({ id: '<UUID>', select: { title: true, mode: true, model: true, systemPrompt: true, id: true, createdAt: true, updatedAt: true, ownerId: true, entityId: true, status: true } }).execute();

// Create
const created = await db.agentThread.create({ data: { title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', ownerId: '<UUID>', entityId: '<UUID>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentThread.update({ where: { id: '<UUID>' }, data: { title: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentThread.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentMessage`

CRUD operations for AgentMessage records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `threadId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `authorRole` | String | Yes |
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `parts` | JSON | Yes |

**Operations:**

```typescript
// List all agentMessage records
const items = await db.agentMessage.findMany({ select: { threadId: true, entityId: true, authorRole: true, id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true } }).execute();

// Get one by id
const item = await db.agentMessage.findOne({ id: '<UUID>', select: { threadId: true, entityId: true, authorRole: true, id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true } }).execute();

// Create
const created = await db.agentMessage.create({ data: { threadId: '<UUID>', entityId: '<UUID>', authorRole: '<String>', ownerId: '<UUID>', parts: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentMessage.update({ where: { id: '<UUID>' }, data: { threadId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentMessage.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentTask`

CRUD operations for AgentTask records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `threadId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `description` | String | Yes |
| `source` | String | Yes |
| `error` | String | Yes |
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all agentTask records
const items = await db.agentTask.findMany({ select: { threadId: true, entityId: true, description: true, source: true, error: true, id: true, createdAt: true, updatedAt: true, ownerId: true, status: true } }).execute();

// Get one by id
const item = await db.agentTask.findOne({ id: '<UUID>', select: { threadId: true, entityId: true, description: true, source: true, error: true, id: true, createdAt: true, updatedAt: true, ownerId: true, status: true } }).execute();

// Create
const created = await db.agentTask.create({ data: { threadId: '<UUID>', entityId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', ownerId: '<UUID>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentTask.update({ where: { id: '<UUID>' }, data: { threadId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentTask.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appPermissionDefault`

CRUD operations for AppPermissionDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |

**Operations:**

```typescript
// List all appPermissionDefault records
const items = await db.appPermissionDefault.findMany({ select: { id: true, permissions: true } }).execute();

// Get one by id
const item = await db.appPermissionDefault.findOne({ id: '<UUID>', select: { id: true, permissions: true } }).execute();

// Create
const created = await db.appPermissionDefault.create({ data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermissionDefault.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermissionDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.identityProvider`

CRUD operations for IdentityProvider records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `slug` | String | Yes |
| `kind` | String | Yes |
| `displayName` | String | Yes |
| `enabled` | Boolean | Yes |
| `isBuiltIn` | Boolean | Yes |

**Operations:**

```typescript
// List all identityProvider records
const items = await db.identityProvider.findMany({ select: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } }).execute();

// Get one by id
const item = await db.identityProvider.findOne({ id: '<UUID>', select: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } }).execute();

// Create
const created = await db.identityProvider.create({ data: { slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.identityProvider.update({ where: { id: '<UUID>' }, data: { slug: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.identityProvider.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.roleType`

CRUD operations for RoleType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all roleType records
const items = await db.roleType.findMany({ select: { id: true, name: true } }).execute();

// Get one by id
const item = await db.roleType.findOne({ id: '<Int>', select: { id: true, name: true } }).execute();

// Create
const created = await db.roleType.create({ data: { name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.roleType.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.roleType.delete({ where: { id: '<Int>' } }).execute();
```

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

### `db.appLimitDefault`

CRUD operations for AppLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all appLimitDefault records
const items = await db.appLimitDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.appLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.appLimitDefault.create({ data: { name: '<String>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitDefault`

CRUD operations for OrgLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all orgLimitDefault records
const items = await db.orgLimitDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.orgLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.orgLimitDefault.create({ data: { name: '<String>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.devicesModule`

CRUD operations for DevicesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `userDevicesTableId` | UUID | Yes |
| `deviceSettingsTableId` | UUID | Yes |
| `userDevicesTable` | String | Yes |
| `deviceSettingsTable` | String | Yes |

**Operations:**

```typescript
// List all devicesModule records
const items = await db.devicesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } }).execute();

// Get one by id
const item = await db.devicesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } }).execute();

// Create
const created = await db.devicesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', deviceSettingsTableId: '<UUID>', userDevicesTable: '<String>', deviceSettingsTable: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.devicesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.devicesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.nodeTypeRegistry`

CRUD operations for NodeTypeRegistry records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `name` | String | No |
| `slug` | String | Yes |
| `category` | String | Yes |
| `displayName` | String | Yes |
| `description` | String | Yes |
| `parameterSchema` | JSON | Yes |
| `tags` | String | Yes |

**Operations:**

```typescript
// List all nodeTypeRegistry records
const items = await db.nodeTypeRegistry.findMany({ select: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } }).execute();

// Get one by name
const item = await db.nodeTypeRegistry.findOne({ name: '<String>', select: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } }).execute();

// Create
const created = await db.nodeTypeRegistry.create({ data: { slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', parameterSchema: '<JSON>', tags: '<String>' }, select: { name: true } }).execute();

// Update
const updated = await db.nodeTypeRegistry.update({ where: { name: '<String>' }, data: { slug: '<String>' }, select: { name: true } }).execute();

// Delete
const deleted = await db.nodeTypeRegistry.delete({ where: { name: '<String>' } }).execute();
```

### `db.userConnectedAccount`

CRUD operations for UserConnectedAccount records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `service` | String | Yes |
| `identifier` | String | Yes |
| `details` | JSON | Yes |
| `isVerified` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all userConnectedAccount records
const items = await db.userConnectedAccount.findMany({ select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.userConnectedAccount.findOne({ id: '<UUID>', select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.userConnectedAccount.create({ data: { ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.userConnectedAccount.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userConnectedAccount.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appMembershipDefault`

CRUD operations for AppMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isVerified` | Boolean | Yes |

**Operations:**

```typescript
// List all appMembershipDefault records
const items = await db.appMembershipDefault.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } }).execute();

// Get one by id
const item = await db.appMembershipDefault.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } }).execute();

// Create
const created = await db.appMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembershipDefault`

CRUD operations for OrgMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembershipDefault records
const items = await db.orgMembershipDefault.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgMembershipDefault.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } }).execute();

// Create
const created = await db.orgMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.rateLimitsModule`

CRUD operations for RateLimitsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `rateLimitSettingsTableId` | UUID | Yes |
| `ipRateLimitsTableId` | UUID | Yes |
| `rateLimitsTableId` | UUID | Yes |
| `rateLimitSettingsTable` | String | Yes |
| `ipRateLimitsTable` | String | Yes |
| `rateLimitsTable` | String | Yes |

**Operations:**

```typescript
// List all rateLimitsModule records
const items = await db.rateLimitsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } }).execute();

// Get one by id
const item = await db.rateLimitsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } }).execute();

// Create
const created = await db.rateLimitsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', rateLimitSettingsTableId: '<UUID>', ipRateLimitsTableId: '<UUID>', rateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', ipRateLimitsTable: '<String>', rateLimitsTable: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.rateLimitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rateLimitsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipType`

CRUD operations for MembershipType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `prefix` | String | Yes |
| `parentMembershipType` | Int | Yes |
| `hasUsersTableEntry` | Boolean | Yes |

**Operations:**

```typescript
// List all membershipType records
const items = await db.membershipType.findMany({ select: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } }).execute();

// Get one by id
const item = await db.membershipType.findOne({ id: '<Int>', select: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } }).execute();

// Create
const created = await db.membershipType.create({ data: { name: '<String>', description: '<String>', prefix: '<String>', parentMembershipType: '<Int>', hasUsersTableEntry: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipType.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipType.delete({ where: { id: '<Int>' } }).execute();
```

### `db.rlsModule`

CRUD operations for RlsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `authenticate` | String | Yes |
| `authenticateStrict` | String | Yes |
| `currentRole` | String | Yes |
| `currentRoleId` | String | Yes |

**Operations:**

```typescript
// List all rlsModule records
const items = await db.rlsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } }).execute();

// Get one by id
const item = await db.rlsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } }).execute();

// Create
const created = await db.rlsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.orgMembershipSetting`

CRUD operations for OrgMembershipSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `entityId` | UUID | Yes |
| `deleteMemberCascadeChildren` | Boolean | Yes |
| `createChildCascadeOwners` | Boolean | Yes |
| `createChildCascadeAdmins` | Boolean | Yes |
| `createChildCascadeMembers` | Boolean | Yes |
| `allowExternalMembers` | Boolean | Yes |
| `populateMemberEmail` | Boolean | Yes |

**Operations:**

```typescript
// List all orgMembershipSetting records
const items = await db.orgMembershipSetting.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, populateMemberEmail: true } }).execute();

// Get one by id
const item = await db.orgMembershipSetting.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, populateMemberEmail: true } }).execute();

// Create
const created = await db.orgMembershipSetting.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', populateMemberEmail: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipSetting.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.user`

CRUD operations for User records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `username` | String | Yes |
| `displayName` | String | Yes |
| `profilePicture` | ConstructiveInternalTypeImage | Yes |
| `searchTsv` | FullText | Yes |
| `type` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `searchTsvRank` | Float | Yes |
| `displayNameTrgmSimilarity` | Float | Yes |
| `searchScore` | Float | Yes |

**Operations:**

```typescript
// List all user records
const items = await db.user.findMany({ select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } }).execute();

// Get one by id
const item = await db.user.findOne({ id: '<UUID>', select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } }).execute();

// Create
const created = await db.user.create({ data: { username: '<String>', displayName: '<String>', profilePicture: '<Image>', searchTsv: '<FullText>', type: '<Int>', searchTsvRank: '<Float>', displayNameTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute();

// Update
const updated = await db.user.update({ where: { id: '<UUID>' }, data: { username: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.user.delete({ where: { id: '<UUID>' } }).execute();
```

> **Unified Search API fields:** `searchTsv`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

### `db.astMigration`

CRUD operations for AstMigration records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `requires` | String | Yes |
| `payload` | JSON | Yes |
| `deploys` | String | Yes |
| `deploy` | JSON | Yes |
| `revert` | JSON | Yes |
| `verify` | JSON | Yes |
| `createdAt` | Datetime | No |
| `action` | String | Yes |
| `actionId` | UUID | Yes |
| `actorId` | UUID | Yes |

**Operations:**

```typescript
// List all astMigration records
const items = await db.astMigration.findMany({ select: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Get one by id
const item = await db.astMigration.findOne({ id: '<Int>', select: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Create
const created = await db.astMigration.create({ data: { databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.astMigration.update({ where: { id: '<Int>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.astMigration.delete({ where: { id: '<Int>' } }).execute();
```

### `db.appMembership`

CRUD operations for AppMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isVerified` | Boolean | Yes |
| `isActive` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `granted` | BitString | Yes |
| `actorId` | UUID | Yes |
| `profileId` | UUID | Yes |

**Operations:**

```typescript
// List all appMembership records
const items = await db.appMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } }).execute();

// Get one by id
const item = await db.appMembership.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } }).execute();

// Create
const created = await db.appMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.hierarchyModule`

CRUD operations for HierarchyModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `chartEdgesTableId` | UUID | Yes |
| `chartEdgesTableName` | String | Yes |
| `hierarchySprtTableId` | UUID | Yes |
| `hierarchySprtTableName` | String | Yes |
| `chartEdgeGrantsTableId` | UUID | Yes |
| `chartEdgeGrantsTableName` | String | Yes |
| `entityTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `privateSchemaName` | String | Yes |
| `sprtTableName` | String | Yes |
| `rebuildHierarchyFunction` | String | Yes |
| `getSubordinatesFunction` | String | Yes |
| `getManagersFunction` | String | Yes |
| `isManagerOfFunction` | String | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all hierarchyModule records
const items = await db.hierarchyModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } }).execute();

// Get one by id
const item = await db.hierarchyModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } }).execute();

// Create
const created = await db.hierarchyModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.hierarchyModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.hierarchyModule.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.currentUserId`

currentUserId

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserId().execute();
```

### `db.query.currentUserAgent`

currentUserAgent

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserAgent().execute();
```

### `db.query.currentIpAddress`

currentIpAddress

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentIpAddress().execute();
```

### `db.query.requireStepUp`

requireStepUp

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `stepUpType` | String |

```typescript
const result = await db.query.requireStepUp({ stepUpType: '<String>' }).execute();
```

### `db.query.appPermissionsGetPaddedMask`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.appPermissionsGetPaddedMask({ mask: '<BitString>' }).execute();
```

### `db.query.orgPermissionsGetPaddedMask`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.orgPermissionsGetPaddedMask({ mask: '<BitString>' }).execute();
```

### `db.query.stepsAchieved`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |

```typescript
const result = await db.query.stepsAchieved({ level: '<String>', roleId: '<UUID>' }).execute();
```

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

### `db.query.resolveBlueprintField`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `tableId` | UUID |
  | `fieldName` | String |

```typescript
const result = await db.query.resolveBlueprintField({ databaseId: '<UUID>', tableId: '<UUID>', fieldName: '<String>' }).execute();
```

### `db.query.orgIsManagerOf`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pUserId` | UUID |
  | `pMaxDepth` | Int |

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pUserId: '<UUID>', pMaxDepth: '<Int>' }).execute();
```

### `db.query.appPermissionsGetMask`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.appPermissionsGetMask({ ids: '<UUID>' }).execute();
```

### `db.query.orgPermissionsGetMask`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.orgPermissionsGetMask({ ids: '<UUID>' }).execute();
```

### `db.query.resolveBlueprintTable`

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `tableName` | String |
  | `schemaName` | String |
  | `tableMap` | JSON |
  | `defaultSchemaId` | UUID |

```typescript
const result = await db.query.resolveBlueprintTable({ databaseId: '<UUID>', tableName: '<String>', schemaName: '<String>', tableMap: '<JSON>', defaultSchemaId: '<UUID>' }).execute();
```

### `db.query.appPermissionsGetMaskByNames`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.appPermissionsGetMaskByNames({ names: '<String>' }).execute();
```

### `db.query.orgPermissionsGetMaskByNames`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.orgPermissionsGetMaskByNames({ names: '<String>' }).execute();
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

### `db.query.appPermissionsGetByMask`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.appPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.orgPermissionsGetByMask`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.orgPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.stepsRequired`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.stepsRequired({ level: '<String>', roleId: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.currentUser`

currentUser

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUser().execute();
```

### `db.mutation.sendAccountDeletionEmail`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

```typescript
const result = await db.mutation.sendAccountDeletionEmail({ input: '<SendAccountDeletionEmailInput>' }).execute();
```

### `db.mutation.signOut`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

```typescript
const result = await db.mutation.signOut({ input: '<SignOutInput>' }).execute();
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

### `db.mutation.disconnectAccount`

disconnectAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | DisconnectAccountInput (required) |

```typescript
const result = await db.mutation.disconnectAccount({ input: { accountId: '<UUID>' } }).execute();
```

### `db.mutation.revokeApiKey`

revokeApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeApiKeyInput (required) |

```typescript
const result = await db.mutation.revokeApiKey({ input: { keyId: '<UUID>' } }).execute();
```

### `db.mutation.revokeSession`

revokeSession

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeSessionInput (required) |

```typescript
const result = await db.mutation.revokeSession({ input: { sessionId: '<UUID>' } }).execute();
```

### `db.mutation.verifyPassword`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

```typescript
const result = await db.mutation.verifyPassword({ input: { password: '<String>' } }).execute();
```

### `db.mutation.verifyTotp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

```typescript
const result = await db.mutation.verifyTotp({ input: { totpValue: '<String>' } }).execute();
```

### `db.mutation.submitAppInviteCode`

submitAppInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitAppInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitAppInviteCode({ input: { token: '<String>' } }).execute();
```

### `db.mutation.submitOrgInviteCode`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitOrgInviteCode({ input: { token: '<String>' } }).execute();
```

### `db.mutation.checkPassword`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

```typescript
const result = await db.mutation.checkPassword({ input: { password: '<String>' } }).execute();
```

### `db.mutation.confirmDeleteAccount`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

```typescript
const result = await db.mutation.confirmDeleteAccount({ input: { userId: '<UUID>', token: '<String>' } }).execute();
```

### `db.mutation.setPassword`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

```typescript
const result = await db.mutation.setPassword({ input: { currentPassword: '<String>', newPassword: '<String>' } }).execute();
```

### `db.mutation.verifyEmail`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

```typescript
const result = await db.mutation.verifyEmail({ input: { emailId: '<UUID>', token: '<String>' } }).execute();
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

### `db.mutation.constructBlueprint`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Six phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security, (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints are deferred), (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level indexes/fts/unique_constraints are deferred to phases 3-5 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

```typescript
const result = await db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute();
```

### `db.mutation.provisionNewUser`

provisionNewUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionNewUserInput (required) |

```typescript
const result = await db.mutation.provisionNewUser({ input: { email: '<String>', password: '<String>' } }).execute();
```

### `db.mutation.resetPassword`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

```typescript
const result = await db.mutation.resetPassword({ input: { roleId: '<UUID>', resetToken: '<String>', newPassword: '<String>' } }).execute();
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

### `db.mutation.copyTemplateToBlueprint`

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyTemplateToBlueprintInput (required) |

```typescript
const result = await db.mutation.copyTemplateToBlueprint({ input: { templateId: '<UUID>', databaseId: '<UUID>', ownerId: '<UUID>', nameOverride: '<String>', displayNameOverride: '<String>' } }).execute();
```

### `db.mutation.provisionSpatialRelation`

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionSpatialRelationInput (required) |

```typescript
const result = await db.mutation.provisionSpatialRelation({ input: '<ProvisionSpatialRelationInput>' }).execute();
```

### `db.mutation.bootstrapUser`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

```typescript
const result = await db.mutation.bootstrapUser({ input: '<BootstrapUserInput>' }).execute();
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

### `db.mutation.provisionUniqueConstraint`

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionUniqueConstraintInput (required) |

```typescript
const result = await db.mutation.provisionUniqueConstraint({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } }).execute();
```

### `db.mutation.provisionFullTextSearch`

Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionFullTextSearchInput (required) |

```typescript
const result = await db.mutation.provisionFullTextSearch({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } }).execute();
```

### `db.mutation.provisionIndex`

Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionIndexInput (required) |

```typescript
const result = await db.mutation.provisionIndex({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } }).execute();
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

### `db.mutation.provisionDatabaseWithUser`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionDatabaseWithUserInput (required) |

```typescript
const result = await db.mutation.provisionDatabaseWithUser({ input: { pDatabaseName: '<String>', pDomain: '<String>', pSubdomain: '<String>', pModules: '<String>', pOptions: '<JSON>' } }).execute();
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

### `db.mutation.provisionRelation`

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionRelationInput (required) |

```typescript
const result = await db.mutation.provisionRelation({ input: '<ProvisionRelationInput>' }).execute();
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

### `db.mutation.signInCrossOrigin`

signInCrossOrigin

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInCrossOriginInput (required) |

```typescript
const result = await db.mutation.signInCrossOrigin({ input: { token: '<String>', credentialKind: '<String>' } }).execute();
```

### `db.mutation.createUserDatabase`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include levels/achievements (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups


- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateUserDatabaseInput (required) |

```typescript
const result = await db.mutation.createUserDatabase({ input: '<CreateUserDatabaseInput>' }).execute();
```

### `db.mutation.extendTokenExpires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

```typescript
const result = await db.mutation.extendTokenExpires({ input: { amount: '<IntervalInput>' } }).execute();
```

### `db.mutation.createApiKey`

createApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateApiKeyInput (required) |

```typescript
const result = await db.mutation.createApiKey({ input: { keyName: '<String>', accessLevel: '<String>', mfaLevel: '<String>', expiresIn: '<IntervalInput>' } }).execute();
```

### `db.mutation.signUp`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

```typescript
const result = await db.mutation.signUp({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } }).execute();
```

### `db.mutation.requestCrossOriginToken`

requestCrossOriginToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestCrossOriginTokenInput (required) |

```typescript
const result = await db.mutation.requestCrossOriginToken({ input: { email: '<String>', password: '<String>', origin: '<Origin>', rememberMe: '<Boolean>' } }).execute();
```

### `db.mutation.signIn`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

```typescript
const result = await db.mutation.signIn({ input: '<SignInInput>' }).execute();
```

### `db.mutation.provisionTable`

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionTableInput (required) |

```typescript
const result = await db.mutation.provisionTable({ input: '<ProvisionTableInput>' }).execute();
```

### `db.mutation.sendVerificationEmail`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

```typescript
const result = await db.mutation.sendVerificationEmail({ input: { email: '<Email>' } }).execute();
```

### `db.mutation.forgotPassword`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

```typescript
const result = await db.mutation.forgotPassword({ input: { email: '<Email>' } }).execute();
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
