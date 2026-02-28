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
| `appPermission` | findMany, findOne, create, update, delete |
| `orgPermission` | findMany, findOne, create, update, delete |
| `object` | findMany, findOne, create, update, delete |
| `appLevelRequirement` | findMany, findOne, create, update, delete |
| `database` | findMany, findOne, create, update, delete |
| `schema` | findMany, findOne, create, update, delete |
| `table` | findMany, findOne, create, update, delete |
| `checkConstraint` | findMany, findOne, create, update, delete |
| `field` | findMany, findOne, create, update, delete |
| `foreignKeyConstraint` | findMany, findOne, create, update, delete |
| `fullTextSearch` | findMany, findOne, create, update, delete |
| `index` | findMany, findOne, create, update, delete |
| `limitFunction` | findMany, findOne, create, update, delete |
| `policy` | findMany, findOne, create, update, delete |
| `primaryKeyConstraint` | findMany, findOne, create, update, delete |
| `tableGrant` | findMany, findOne, create, update, delete |
| `trigger` | findMany, findOne, create, update, delete |
| `uniqueConstraint` | findMany, findOne, create, update, delete |
| `view` | findMany, findOne, create, update, delete |
| `viewTable` | findMany, findOne, create, update, delete |
| `viewGrant` | findMany, findOne, create, update, delete |
| `viewRule` | findMany, findOne, create, update, delete |
| `tableModule` | findMany, findOne, create, update, delete |
| `tableTemplateModule` | findMany, findOne, create, update, delete |
| `schemaGrant` | findMany, findOne, create, update, delete |
| `apiSchema` | findMany, findOne, create, update, delete |
| `apiModule` | findMany, findOne, create, update, delete |
| `domain` | findMany, findOne, create, update, delete |
| `siteMetadatum` | findMany, findOne, create, update, delete |
| `siteModule` | findMany, findOne, create, update, delete |
| `siteTheme` | findMany, findOne, create, update, delete |
| `procedure` | findMany, findOne, create, update, delete |
| `triggerFunction` | findMany, findOne, create, update, delete |
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
| `fieldModule` | findMany, findOne, create, update, delete |
| `invitesModule` | findMany, findOne, create, update, delete |
| `levelsModule` | findMany, findOne, create, update, delete |
| `limitsModule` | findMany, findOne, create, update, delete |
| `membershipTypesModule` | findMany, findOne, create, update, delete |
| `membershipsModule` | findMany, findOne, create, update, delete |
| `permissionsModule` | findMany, findOne, create, update, delete |
| `phoneNumbersModule` | findMany, findOne, create, update, delete |
| `profilesModule` | findMany, findOne, create, update, delete |
| `rlsModule` | findMany, findOne, create, update, delete |
| `secretsModule` | findMany, findOne, create, update, delete |
| `sessionsModule` | findMany, findOne, create, update, delete |
| `userAuthModule` | findMany, findOne, create, update, delete |
| `usersModule` | findMany, findOne, create, update, delete |
| `uuidModule` | findMany, findOne, create, update, delete |
| `databaseProvisionModule` | findMany, findOne, create, update, delete |
| `appAdminGrant` | findMany, findOne, create, update, delete |
| `appOwnerGrant` | findMany, findOne, create, update, delete |
| `appGrant` | findMany, findOne, create, update, delete |
| `orgMembership` | findMany, findOne, create, update, delete |
| `orgMember` | findMany, findOne, create, update, delete |
| `orgAdminGrant` | findMany, findOne, create, update, delete |
| `orgOwnerGrant` | findMany, findOne, create, update, delete |
| `orgGrant` | findMany, findOne, create, update, delete |
| `appLimit` | findMany, findOne, create, update, delete |
| `orgLimit` | findMany, findOne, create, update, delete |
| `appStep` | findMany, findOne, create, update, delete |
| `appAchievement` | findMany, findOne, create, update, delete |
| `invite` | findMany, findOne, create, update, delete |
| `claimedInvite` | findMany, findOne, create, update, delete |
| `orgInvite` | findMany, findOne, create, update, delete |
| `orgClaimedInvite` | findMany, findOne, create, update, delete |
| `appPermissionDefault` | findMany, findOne, create, update, delete |
| `ref` | findMany, findOne, create, update, delete |
| `store` | findMany, findOne, create, update, delete |
| `roleType` | findMany, findOne, create, update, delete |
| `orgPermissionDefault` | findMany, findOne, create, update, delete |
| `appLimitDefault` | findMany, findOne, create, update, delete |
| `orgLimitDefault` | findMany, findOne, create, update, delete |
| `cryptoAddress` | findMany, findOne, create, update, delete |
| `membershipType` | findMany, findOne, create, update, delete |
| `connectedAccount` | findMany, findOne, create, update, delete |
| `phoneNumber` | findMany, findOne, create, update, delete |
| `appMembershipDefault` | findMany, findOne, create, update, delete |
| `nodeTypeRegistry` | findMany, findOne, create, update, delete |
| `commit` | findMany, findOne, create, update, delete |
| `orgMembershipDefault` | findMany, findOne, create, update, delete |
| `email` | findMany, findOne, create, update, delete |
| `auditLog` | findMany, findOne, create, update, delete |
| `appLevel` | findMany, findOne, create, update, delete |
| `sqlMigration` | findMany, findOne, create, update, delete |
| `astMigration` | findMany, findOne, create, update, delete |
| `appMembership` | findMany, findOne, create, update, delete |
| `user` | findMany, findOne, create, update, delete |
| `hierarchyModule` | findMany, findOne, create, update, delete |

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
const item = await db.getAllRecord.findOne({ id: '<value>', select: { path: true, data: true } }).execute();

// Create
const created = await db.getAllRecord.create({ data: { path: '<value>', data: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllRecord.update({ where: { id: '<value>' }, data: { path: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllRecord.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appPermission.findOne({ id: '<value>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.appPermission.create({ data: { name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermission.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermission.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgPermission.findOne({ id: '<value>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.orgPermission.create({ data: { name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermission.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermission.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.object.findOne({ id: '<value>', select: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } }).execute();

// Create
const created = await db.object.create({ data: { hashUuid: '<value>', databaseId: '<value>', kids: '<value>', ktree: '<value>', data: '<value>', frzn: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.object.update({ where: { id: '<value>' }, data: { hashUuid: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.object.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appLevelRequirement.findOne({ id: '<value>', select: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevelRequirement.create({ data: { name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevelRequirement.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevelRequirement.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.database.findOne({ id: '<value>', select: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.database.create({ data: { ownerId: '<value>', schemaHash: '<value>', name: '<value>', label: '<value>', hash: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.database.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.database.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.schema.findOne({ id: '<value>', select: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.schema.create({ data: { databaseId: '<value>', name: '<value>', schemaName: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', isPublic: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.schema.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schema.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.table.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.table.create({ data: { databaseId: '<value>', schemaId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', useRls: '<value>', timestamps: '<value>', peoplestamps: '<value>', pluralName: '<value>', singularName: '<value>', tags: '<value>', inheritsId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.table.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.table.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.checkConstraint.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.checkConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', expr: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.checkConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.checkConstraint.delete({ where: { id: '<value>' } }).execute();
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
| `defaultValue` | String | Yes |
| `defaultValueAst` | JSON | Yes |
| `isHidden` | Boolean | Yes |
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
const items = await db.field.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.field.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.field.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', isRequired: '<value>', defaultValue: '<value>', defaultValueAst: '<value>', isHidden: '<value>', type: '<value>', fieldOrder: '<value>', regexp: '<value>', chk: '<value>', chkExpr: '<value>', min: '<value>', max: '<value>', tags: '<value>', category: '<value>', module: '<value>', scope: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.field.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.field.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.foreignKeyConstraint.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.foreignKeyConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', refTableId: '<value>', refFieldIds: '<value>', deleteAction: '<value>', updateAction: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.foreignKeyConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.foreignKeyConstraint.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.fullTextSearch.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.fullTextSearch.create({ data: { databaseId: '<value>', tableId: '<value>', fieldId: '<value>', fieldIds: '<value>', weights: '<value>', langs: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.fullTextSearch.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.fullTextSearch.delete({ where: { id: '<value>' } }).execute();
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
const items = await db.index.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.index.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.index.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', fieldIds: '<value>', includeFieldIds: '<value>', accessMethod: '<value>', indexParams: '<value>', whereClause: '<value>', isUnique: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.index.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.index.delete({ where: { id: '<value>' } }).execute();
```

### `db.limitFunction`

CRUD operations for LimitFunction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `name` | String | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `data` | JSON | Yes |
| `security` | Int | Yes |

**Operations:**

```typescript
// List all limitFunction records
const items = await db.limitFunction.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } }).execute();

// Get one by id
const item = await db.limitFunction.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } }).execute();

// Create
const created = await db.limitFunction.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', data: '<value>', security: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.limitFunction.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.limitFunction.delete({ where: { id: '<value>' } }).execute();
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
| `roleName` | String | Yes |
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
const items = await db.policy.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, roleName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.policy.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, roleName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.policy.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', roleName: '<value>', privilege: '<value>', permissive: '<value>', disabled: '<value>', policyType: '<value>', data: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.policy.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.policy.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.primaryKeyConstraint.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.primaryKeyConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.primaryKeyConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.primaryKeyConstraint.delete({ where: { id: '<value>' } }).execute();
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
| `roleName` | String | Yes |
| `fieldIds` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all tableGrant records
const items = await db.tableGrant.findMany({ select: { id: true, databaseId: true, tableId: true, privilege: true, roleName: true, fieldIds: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.tableGrant.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, privilege: true, roleName: true, fieldIds: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.tableGrant.create({ data: { databaseId: '<value>', tableId: '<value>', privilege: '<value>', roleName: '<value>', fieldIds: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.tableGrant.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.tableGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.trigger.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.trigger.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', event: '<value>', functionName: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.trigger.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.trigger.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.uniqueConstraint.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.uniqueConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.uniqueConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.uniqueConstraint.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.view.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } }).execute();

// Create
const created = await db.view.create({ data: { databaseId: '<value>', schemaId: '<value>', name: '<value>', tableId: '<value>', viewType: '<value>', data: '<value>', filterType: '<value>', filterData: '<value>', securityInvoker: '<value>', isReadOnly: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.view.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.view.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.viewTable.findOne({ id: '<value>', select: { id: true, viewId: true, tableId: true, joinOrder: true } }).execute();

// Create
const created = await db.viewTable.create({ data: { viewId: '<value>', tableId: '<value>', joinOrder: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewTable.update({ where: { id: '<value>' }, data: { viewId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewTable.delete({ where: { id: '<value>' } }).execute();
```

### `db.viewGrant`

CRUD operations for ViewGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `viewId` | UUID | Yes |
| `roleName` | String | Yes |
| `privilege` | String | Yes |
| `withGrantOption` | Boolean | Yes |

**Operations:**

```typescript
// List all viewGrant records
const items = await db.viewGrant.findMany({ select: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } }).execute();

// Get one by id
const item = await db.viewGrant.findOne({ id: '<value>', select: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } }).execute();

// Create
const created = await db.viewGrant.create({ data: { databaseId: '<value>', viewId: '<value>', roleName: '<value>', privilege: '<value>', withGrantOption: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewGrant.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.viewRule.findOne({ id: '<value>', select: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } }).execute();

// Create
const created = await db.viewRule.create({ data: { databaseId: '<value>', viewId: '<value>', name: '<value>', event: '<value>', action: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.viewRule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.viewRule.delete({ where: { id: '<value>' } }).execute();
```

### `db.tableModule`

CRUD operations for TableModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `nodeType` | String | Yes |
| `data` | JSON | Yes |
| `fields` | UUID | Yes |

**Operations:**

```typescript
// List all tableModule records
const items = await db.tableModule.findMany({ select: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } }).execute();

// Get one by id
const item = await db.tableModule.findOne({ id: '<value>', select: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } }).execute();

// Create
const created = await db.tableModule.create({ data: { databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', nodeType: '<value>', data: '<value>', fields: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.tableModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.tableModule.delete({ where: { id: '<value>' } }).execute();
```

### `db.tableTemplateModule`

CRUD operations for TableTemplateModule records.

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
| `nodeType` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all tableTemplateModule records
const items = await db.tableTemplateModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } }).execute();

// Get one by id
const item = await db.tableTemplateModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } }).execute();

// Create
const created = await db.tableTemplateModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', nodeType: '<value>', data: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.tableTemplateModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.tableTemplateModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.schemaGrant.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.schemaGrant.create({ data: { databaseId: '<value>', schemaId: '<value>', granteeName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.schemaGrant.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.schemaGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.apiSchema.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, apiId: true } }).execute();

// Create
const created = await db.apiSchema.create({ data: { databaseId: '<value>', schemaId: '<value>', apiId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiSchema.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiSchema.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.apiModule.findOne({ id: '<value>', select: { id: true, databaseId: true, apiId: true, name: true, data: true } }).execute();

// Create
const created = await db.apiModule.create({ data: { databaseId: '<value>', apiId: '<value>', name: '<value>', data: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.domain.findOne({ id: '<value>', select: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } }).execute();

// Create
const created = await db.domain.create({ data: { databaseId: '<value>', apiId: '<value>', siteId: '<value>', subdomain: '<value>', domain: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.domain.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.domain.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.siteMetadatum.findOne({ id: '<value>', select: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } }).execute();

// Create
const created = await db.siteMetadatum.create({ data: { databaseId: '<value>', siteId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteMetadatum.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteMetadatum.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.siteModule.findOne({ id: '<value>', select: { id: true, databaseId: true, siteId: true, name: true, data: true } }).execute();

// Create
const created = await db.siteModule.create({ data: { databaseId: '<value>', siteId: '<value>', name: '<value>', data: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.siteTheme.findOne({ id: '<value>', select: { id: true, databaseId: true, siteId: true, theme: true } }).execute();

// Create
const created = await db.siteTheme.create({ data: { databaseId: '<value>', siteId: '<value>', theme: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.siteTheme.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.siteTheme.delete({ where: { id: '<value>' } }).execute();
```

### `db.procedure`

CRUD operations for Procedure records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `name` | String | Yes |
| `argnames` | String | Yes |
| `argtypes` | String | Yes |
| `argdefaults` | String | Yes |
| `langName` | String | Yes |
| `definition` | String | Yes |
| `smartTags` | JSON | Yes |
| `category` | ObjectCategory | Yes |
| `module` | String | Yes |
| `scope` | Int | Yes |
| `tags` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all procedure records
const items = await db.procedure.findMany({ select: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.procedure.findOne({ id: '<value>', select: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.procedure.create({ data: { databaseId: '<value>', name: '<value>', argnames: '<value>', argtypes: '<value>', argdefaults: '<value>', langName: '<value>', definition: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.procedure.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.procedure.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.triggerFunction.findOne({ id: '<value>', select: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.triggerFunction.create({ data: { databaseId: '<value>', name: '<value>', code: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.triggerFunction.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.triggerFunction.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.api.findOne({ id: '<value>', select: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } }).execute();

// Create
const created = await db.api.create({ data: { databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.api.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.api.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.site.findOne({ id: '<value>', select: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } }).execute();

// Create
const created = await db.site.create({ data: { databaseId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', favicon: '<value>', appleTouchIcon: '<value>', logo: '<value>', dbname: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.site.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.site.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.app.findOne({ id: '<value>', select: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } }).execute();

// Create
const created = await db.app.create({ data: { databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.app.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.app.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.connectedAccountsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.connectedAccountsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccountsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccountsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.cryptoAddressesModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } }).execute();

// Create
const created = await db.cryptoAddressesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', cryptoNetwork: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddressesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddressesModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.cryptoAuthModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } }).execute();

// Create
const created = await db.cryptoAuthModule.create({ data: { databaseId: '<value>', schemaId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', addressesTableId: '<value>', userField: '<value>', cryptoNetwork: '<value>', signInRequestChallenge: '<value>', signInRecordFailure: '<value>', signUpWithKey: '<value>', signInWithChallenge: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAuthModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAuthModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.defaultIdsModule.findOne({ id: '<value>', select: { id: true, databaseId: true } }).execute();

// Create
const created = await db.defaultIdsModule.create({ data: { databaseId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.defaultIdsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.defaultIdsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.denormalizedTableField.findOne({ id: '<value>', select: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } }).execute();

// Create
const created = await db.denormalizedTableField.create({ data: { databaseId: '<value>', tableId: '<value>', fieldId: '<value>', setIds: '<value>', refTableId: '<value>', refFieldId: '<value>', refIds: '<value>', useUpdates: '<value>', updateDefaults: '<value>', funcName: '<value>', funcOrder: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.denormalizedTableField.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.denormalizedTableField.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.emailsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.emailsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.emailsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.emailsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.encryptedSecretsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.encryptedSecretsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.encryptedSecretsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.encryptedSecretsModule.delete({ where: { id: '<value>' } }).execute();
```

### `db.fieldModule`

CRUD operations for FieldModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `nodeType` | String | Yes |
| `data` | JSON | Yes |
| `triggers` | String | Yes |
| `functions` | String | Yes |

**Operations:**

```typescript
// List all fieldModule records
const items = await db.fieldModule.findMany({ select: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } }).execute();

// Get one by id
const item = await db.fieldModule.findOne({ id: '<value>', select: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } }).execute();

// Create
const created = await db.fieldModule.create({ data: { databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', fieldId: '<value>', nodeType: '<value>', data: '<value>', triggers: '<value>', functions: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.fieldModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.fieldModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.invitesModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } }).execute();

// Create
const created = await db.invitesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', invitesTableId: '<value>', claimedInvitesTableId: '<value>', invitesTableName: '<value>', claimedInvitesTableName: '<value>', submitInviteCodeFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.invitesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invitesModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.levelsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Create
const created = await db.levelsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', stepsTableId: '<value>', stepsTableName: '<value>', achievementsTableId: '<value>', achievementsTableName: '<value>', levelsTableId: '<value>', levelsTableName: '<value>', levelRequirementsTableId: '<value>', levelRequirementsTableName: '<value>', completedStep: '<value>', incompletedStep: '<value>', tgAchievement: '<value>', tgAchievementToggle: '<value>', tgAchievementToggleBoolean: '<value>', tgAchievementBoolean: '<value>', upsertAchievement: '<value>', tgUpdateAchievements: '<value>', stepsRequired: '<value>', levelAchieved: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.levelsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.levelsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.limitsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } }).execute();

// Create
const created = await db.limitsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.limitsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.limitsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.membershipTypesModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.membershipTypesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipTypesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipTypesModule.delete({ where: { id: '<value>' } }).execute();
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

**Operations:**

```typescript
// List all membershipsModule records
const items = await db.membershipsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } }).execute();

// Get one by id
const item = await db.membershipsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } }).execute();

// Create
const created = await db.membershipsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', membershipsTableId: '<value>', membershipsTableName: '<value>', membersTableId: '<value>', membersTableName: '<value>', membershipDefaultsTableId: '<value>', membershipDefaultsTableName: '<value>', grantsTableId: '<value>', grantsTableName: '<value>', actorTableId: '<value>', limitsTableId: '<value>', defaultLimitsTableId: '<value>', permissionsTableId: '<value>', defaultPermissionsTableId: '<value>', sprtTableId: '<value>', adminGrantsTableId: '<value>', adminGrantsTableName: '<value>', ownerGrantsTableId: '<value>', ownerGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', entityTableOwnerId: '<value>', prefix: '<value>', actorMaskCheck: '<value>', actorPermCheck: '<value>', entityIdsByMask: '<value>', entityIdsByPerm: '<value>', entityIdsFunction: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.permissionsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } }).execute();

// Create
const created = await db.permissionsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', prefix: '<value>', getPaddedMask: '<value>', getMask: '<value>', getByMask: '<value>', getMaskByName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.permissionsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.permissionsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.phoneNumbersModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } }).execute();

// Create
const created = await db.phoneNumbersModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumbersModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumbersModule.delete({ where: { id: '<value>' } }).execute();
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
| `bitlen` | Int | Yes |
| `membershipType` | Int | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `membershipsTableId` | UUID | Yes |
| `prefix` | String | Yes |

**Operations:**

```typescript
// List all profilesModule records
const items = await db.profilesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } }).execute();

// Get one by id
const item = await db.profilesModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } }).execute();

// Create
const created = await db.profilesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', profilePermissionsTableId: '<value>', profilePermissionsTableName: '<value>', profileGrantsTableId: '<value>', profileGrantsTableName: '<value>', profileDefinitionGrantsTableId: '<value>', profileDefinitionGrantsTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', permissionsTableId: '<value>', membershipsTableId: '<value>', prefix: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.profilesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.profilesModule.delete({ where: { id: '<value>' } }).execute();
```

### `db.rlsModule`

CRUD operations for RlsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `apiId` | UUID | Yes |
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
const items = await db.rlsModule.findMany({ select: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } }).execute();

// Get one by id
const item = await db.rlsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } }).execute();

// Create
const created = await db.rlsModule.create({ data: { databaseId: '<value>', apiId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.secretsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.secretsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.secretsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secretsModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.sessionsModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } }).execute();

// Create
const created = await db.sessionsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', authSettingsTableId: '<value>', usersTableId: '<value>', sessionsDefaultExpiration: '<value>', sessionsTable: '<value>', sessionCredentialsTable: '<value>', authSettingsTable: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.sessionsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sessionsModule.delete({ where: { id: '<value>' } }).execute();
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
| `signInOneTimeTokenFunction` | String | Yes |
| `oneTimeTokenFunction` | String | Yes |
| `extendTokenExpires` | String | Yes |

**Operations:**

```typescript
// List all userAuthModule records
const items = await db.userAuthModule.findMany({ select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } }).execute();

// Get one by id
const item = await db.userAuthModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } }).execute();

// Create
const created = await db.userAuthModule.create({ data: { databaseId: '<value>', schemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', encryptedTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', auditsTableId: '<value>', auditsTableName: '<value>', signInFunction: '<value>', signUpFunction: '<value>', signOutFunction: '<value>', setPasswordFunction: '<value>', resetPasswordFunction: '<value>', forgotPasswordFunction: '<value>', sendVerificationEmailFunction: '<value>', verifyEmailFunction: '<value>', verifyPasswordFunction: '<value>', checkPasswordFunction: '<value>', sendAccountDeletionEmailFunction: '<value>', deleteAccountFunction: '<value>', signInOneTimeTokenFunction: '<value>', oneTimeTokenFunction: '<value>', extendTokenExpires: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.userAuthModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userAuthModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.usersModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } }).execute();

// Create
const created = await db.usersModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', typeTableId: '<value>', typeTableName: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.usersModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.usersModule.delete({ where: { id: '<value>' } }).execute();
```

### `db.uuidModule`

CRUD operations for UuidModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `uuidFunction` | String | Yes |
| `uuidSeed` | String | Yes |

**Operations:**

```typescript
// List all uuidModule records
const items = await db.uuidModule.findMany({ select: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } }).execute();

// Get one by id
const item = await db.uuidModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } }).execute();

// Create
const created = await db.uuidModule.create({ data: { databaseId: '<value>', schemaId: '<value>', uuidFunction: '<value>', uuidSeed: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.uuidModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.uuidModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.databaseProvisionModule.findOne({ id: '<value>', select: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } }).execute();

// Create
const created = await db.databaseProvisionModule.create({ data: { databaseName: '<value>', ownerId: '<value>', subdomain: '<value>', domain: '<value>', modules: '<value>', options: '<value>', bootstrapUser: '<value>', status: '<value>', errorMessage: '<value>', databaseId: '<value>', completedAt: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseProvisionModule.update({ where: { id: '<value>' }, data: { databaseName: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseProvisionModule.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appAdminGrant.findOne({ id: '<value>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAdminGrant.create({ data: { isGrant: '<value>', actorId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAdminGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAdminGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appOwnerGrant.findOne({ id: '<value>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appOwnerGrant.create({ data: { isGrant: '<value>', actorId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appOwnerGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appOwnerGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appGrant.findOne({ id: '<value>', select: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appGrant.create({ data: { permissions: '<value>', isGrant: '<value>', actorId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appGrant.update({ where: { id: '<value>' }, data: { permissions: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appGrant.delete({ where: { id: '<value>' } }).execute();
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
| `isOwner` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `granted` | BitString | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembership records
const items = await db.orgMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgMembership.findOne({ id: '<value>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } }).execute();

// Create
const created = await db.orgMembership.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembership.update({ where: { id: '<value>' }, data: { createdBy: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembership.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgMember.findOne({ id: '<value>', select: { id: true, isAdmin: true, actorId: true, entityId: true } }).execute();

// Create
const created = await db.orgMember.create({ data: { isAdmin: '<value>', actorId: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMember.update({ where: { id: '<value>' }, data: { isAdmin: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMember.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgAdminGrant.findOne({ id: '<value>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgAdminGrant.create({ data: { isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgAdminGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgAdminGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgOwnerGrant.findOne({ id: '<value>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgOwnerGrant.create({ data: { isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgOwnerGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgOwnerGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgGrant.findOne({ id: '<value>', select: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgGrant.create({ data: { permissions: '<value>', isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGrant.update({ where: { id: '<value>' }, data: { permissions: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGrant.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appLimit.findOne({ id: '<value>', select: { id: true, name: true, actorId: true, num: true, max: true } }).execute();

// Create
const created = await db.appLimit.create({ data: { name: '<value>', actorId: '<value>', num: '<value>', max: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimit.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimit.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgLimit.findOne({ id: '<value>', select: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } }).execute();

// Create
const created = await db.orgLimit.create({ data: { name: '<value>', actorId: '<value>', num: '<value>', max: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimit.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimit.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appStep.findOne({ id: '<value>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appStep.create({ data: { actorId: '<value>', name: '<value>', count: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appStep.update({ where: { id: '<value>' }, data: { actorId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appStep.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appAchievement.findOne({ id: '<value>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAchievement.create({ data: { actorId: '<value>', name: '<value>', count: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAchievement.update({ where: { id: '<value>' }, data: { actorId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAchievement.delete({ where: { id: '<value>' } }).execute();
```

### `db.invite`

CRUD operations for Invite records.

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
// List all invite records
const items = await db.invite.findMany({ select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.invite.findOne({ id: '<value>', select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.invite.create({ data: { email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.invite.update({ where: { id: '<value>' }, data: { email: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invite.delete({ where: { id: '<value>' } }).execute();
```

### `db.claimedInvite`

CRUD operations for ClaimedInvite records.

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
// List all claimedInvite records
const items = await db.claimedInvite.findMany({ select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.claimedInvite.findOne({ id: '<value>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.claimedInvite.create({ data: { data: '<value>', senderId: '<value>', receiverId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.claimedInvite.update({ where: { id: '<value>' }, data: { data: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.claimedInvite.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgInvite.findOne({ id: '<value>', select: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgInvite.create({ data: { email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgInvite.update({ where: { id: '<value>' }, data: { email: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgInvite.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgClaimedInvite.findOne({ id: '<value>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgClaimedInvite.create({ data: { data: '<value>', senderId: '<value>', receiverId: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgClaimedInvite.update({ where: { id: '<value>' }, data: { data: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgClaimedInvite.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appPermissionDefault.findOne({ id: '<value>', select: { id: true, permissions: true } }).execute();

// Create
const created = await db.appPermissionDefault.create({ data: { permissions: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermissionDefault.update({ where: { id: '<value>' }, data: { permissions: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermissionDefault.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.ref.findOne({ id: '<value>', select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

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
const item = await db.store.findOne({ id: '<value>', select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.store.create({ data: { name: '<value>', databaseId: '<value>', hash: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.store.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.store.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.roleType.findOne({ id: '<value>', select: { id: true, name: true } }).execute();

// Create
const created = await db.roleType.create({ data: { name: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.roleType.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.roleType.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgPermissionDefault.findOne({ id: '<value>', select: { id: true, permissions: true, entityId: true } }).execute();

// Create
const created = await db.orgPermissionDefault.create({ data: { permissions: '<value>', entityId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefault.update({ where: { id: '<value>' }, data: { permissions: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefault.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appLimitDefault.findOne({ id: '<value>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.appLimitDefault.create({ data: { name: '<value>', max: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitDefault.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitDefault.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.orgLimitDefault.findOne({ id: '<value>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.orgLimitDefault.create({ data: { name: '<value>', max: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitDefault.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitDefault.delete({ where: { id: '<value>' } }).execute();
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
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all cryptoAddress records
const items = await db.cryptoAddress.findMany({ select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.cryptoAddress.findOne({ id: '<value>', select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.cryptoAddress.create({ data: { ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddress.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddress.delete({ where: { id: '<value>' } }).execute();
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

**Operations:**

```typescript
// List all membershipType records
const items = await db.membershipType.findMany({ select: { id: true, name: true, description: true, prefix: true } }).execute();

// Get one by id
const item = await db.membershipType.findOne({ id: '<value>', select: { id: true, name: true, description: true, prefix: true } }).execute();

// Create
const created = await db.membershipType.create({ data: { name: '<value>', description: '<value>', prefix: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipType.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipType.delete({ where: { id: '<value>' } }).execute();
```

### `db.connectedAccount`

CRUD operations for ConnectedAccount records.

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
// List all connectedAccount records
const items = await db.connectedAccount.findMany({ select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.connectedAccount.findOne({ id: '<value>', select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.connectedAccount.create({ data: { ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccount.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccount.delete({ where: { id: '<value>' } }).execute();
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
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all phoneNumber records
const items = await db.phoneNumber.findMany({ select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.phoneNumber.findOne({ id: '<value>', select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.phoneNumber.create({ data: { ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumber.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumber.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appMembershipDefault.findOne({ id: '<value>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } }).execute();

// Create
const created = await db.appMembershipDefault.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isVerified: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembershipDefault.update({ where: { id: '<value>' }, data: { createdBy: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembershipDefault.delete({ where: { id: '<value>' } }).execute();
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
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all nodeTypeRegistry records
const items = await db.nodeTypeRegistry.findMany({ select: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Get one by name
const item = await db.nodeTypeRegistry.findOne({ name: '<value>', select: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.nodeTypeRegistry.create({ data: { slug: '<value>', category: '<value>', displayName: '<value>', description: '<value>', parameterSchema: '<value>', tags: '<value>' }, select: { name: true } }).execute();

// Update
const updated = await db.nodeTypeRegistry.update({ where: { name: '<value>' }, data: { slug: '<new-value>' }, select: { name: true } }).execute();

// Delete
const deleted = await db.nodeTypeRegistry.delete({ where: { name: '<value>' } }).execute();
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
const item = await db.commit.findOne({ id: '<value>', select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.commit.create({ data: { message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.commit.update({ where: { id: '<value>' }, data: { message: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.commit.delete({ where: { id: '<value>' } }).execute();
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
| `deleteMemberCascadeGroups` | Boolean | Yes |
| `createGroupsCascadeMembers` | Boolean | Yes |

**Operations:**

```typescript
// List all orgMembershipDefault records
const items = await db.orgMembershipDefault.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } }).execute();

// Get one by id
const item = await db.orgMembershipDefault.findOne({ id: '<value>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } }).execute();

// Create
const created = await db.orgMembershipDefault.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', entityId: '<value>', deleteMemberCascadeGroups: '<value>', createGroupsCascadeMembers: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipDefault.update({ where: { id: '<value>' }, data: { createdBy: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipDefault.delete({ where: { id: '<value>' } }).execute();
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
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all email records
const items = await db.email.findMany({ select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.email.findOne({ id: '<value>', select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.email.create({ data: { ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.email.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.email.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.auditLog.findOne({ id: '<value>', select: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } }).execute();

// Create
const created = await db.auditLog.create({ data: { event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.auditLog.update({ where: { id: '<value>' }, data: { event: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.auditLog.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.appLevel.findOne({ id: '<value>', select: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevel.create({ data: { name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevel.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevel.delete({ where: { id: '<value>' } }).execute();
```

### `db.sqlMigration`

CRUD operations for SqlMigration records.

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
// List all sqlMigration records
const items = await db.sqlMigration.findMany({ select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Get one by id
const item = await db.sqlMigration.findOne({ id: '<value>', select: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Create
const created = await db.sqlMigration.create({ data: { name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.sqlMigration.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sqlMigration.delete({ where: { id: '<value>' } }).execute();
```

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
const item = await db.astMigration.findOne({ id: '<value>', select: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Create
const created = await db.astMigration.create({ data: { databaseId: '<value>', name: '<value>', requires: '<value>', payload: '<value>', deploys: '<value>', deploy: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.astMigration.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.astMigration.delete({ where: { id: '<value>' } }).execute();
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

**Operations:**

```typescript
// List all appMembership records
const items = await db.appMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } }).execute();

// Get one by id
const item = await db.appMembership.findOne({ id: '<value>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } }).execute();

// Create
const created = await db.appMembership.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembership.update({ where: { id: '<value>' }, data: { createdBy: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembership.delete({ where: { id: '<value>' } }).execute();
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

**Operations:**

```typescript
// List all user records
const items = await db.user.findMany({ select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } }).execute();

// Get one by id
const item = await db.user.findOne({ id: '<value>', select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } }).execute();

// Create
const created = await db.user.create({ data: { username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.user.update({ where: { id: '<value>' }, data: { username: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.user.delete({ where: { id: '<value>' } }).execute();
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
const item = await db.hierarchyModule.findOne({ id: '<value>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } }).execute();

// Create
const created = await db.hierarchyModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.hierarchyModule.update({ where: { id: '<value>' }, data: { databaseId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.hierarchyModule.delete({ where: { id: '<value>' } }).execute();
```

## Custom Operations

### `db.query.currentUserId`

currentUserId

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserId().execute();
```

### `db.query.currentIpAddress`

currentIpAddress

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentIpAddress().execute();
```

### `db.query.currentUserAgent`

currentUserAgent

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserAgent().execute();
```

### `db.query.appPermissionsGetPaddedMask`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.appPermissionsGetPaddedMask({ mask: '<value>' }).execute();
```

### `db.query.orgPermissionsGetPaddedMask`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.orgPermissionsGetPaddedMask({ mask: '<value>' }).execute();
```

### `db.query.stepsAchieved`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |

```typescript
const result = await db.query.stepsAchieved({ vlevel: '<value>', vroleId: '<value>' }).execute();
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
const result = await db.query.revParse({ dbId: '<value>', storeId: '<value>', refname: '<value>' }).execute();
```

### `db.query.appPermissionsGetMask`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.appPermissionsGetMask({ ids: '<value>' }).execute();
```

### `db.query.orgPermissionsGetMask`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.orgPermissionsGetMask({ ids: '<value>' }).execute();
```

### `db.query.appPermissionsGetMaskByNames`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.appPermissionsGetMaskByNames({ names: '<value>' }).execute();
```

### `db.query.orgPermissionsGetMaskByNames`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.orgPermissionsGetMaskByNames({ names: '<value>' }).execute();
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
const result = await db.query.appPermissionsGetByMask({ mask: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
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
const result = await db.query.orgPermissionsGetByMask({ mask: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
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

### `db.query.stepsRequired`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.stepsRequired({ vlevel: '<value>', vroleId: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
```

### `db.query.currentUser`

currentUser

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUser().execute();
```

### `db.mutation.signOut`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

```typescript
const result = await db.mutation.signOut({ input: '<value>' }).execute();
```

### `db.mutation.sendAccountDeletionEmail`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

```typescript
const result = await db.mutation.sendAccountDeletionEmail({ input: '<value>' }).execute();
```

### `db.mutation.checkPassword`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

```typescript
const result = await db.mutation.checkPassword({ input: '<value>' }).execute();
```

### `db.mutation.submitInviteCode`

submitInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitInviteCode({ input: '<value>' }).execute();
```

### `db.mutation.submitOrgInviteCode`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitOrgInviteCode({ input: '<value>' }).execute();
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

### `db.mutation.confirmDeleteAccount`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

```typescript
const result = await db.mutation.confirmDeleteAccount({ input: '<value>' }).execute();
```

### `db.mutation.setPassword`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

```typescript
const result = await db.mutation.setPassword({ input: '<value>' }).execute();
```

### `db.mutation.verifyEmail`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

```typescript
const result = await db.mutation.verifyEmail({ input: '<value>' }).execute();
```

### `db.mutation.resetPassword`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

```typescript
const result = await db.mutation.resetPassword({ input: '<value>' }).execute();
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

### `db.mutation.bootstrapUser`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

```typescript
const result = await db.mutation.bootstrapUser({ input: '<value>' }).execute();
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

### `db.mutation.provisionDatabaseWithUser`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionDatabaseWithUserInput (required) |

```typescript
const result = await db.mutation.provisionDatabaseWithUser({ input: '<value>' }).execute();
```

### `db.mutation.signInOneTimeToken`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInOneTimeTokenInput (required) |

```typescript
const result = await db.mutation.signInOneTimeToken({ input: '<value>' }).execute();
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
const result = await db.mutation.createUserDatabase({ input: '<value>' }).execute();
```

### `db.mutation.extendTokenExpires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

```typescript
const result = await db.mutation.extendTokenExpires({ input: '<value>' }).execute();
```

### `db.mutation.signIn`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

```typescript
const result = await db.mutation.signIn({ input: '<value>' }).execute();
```

### `db.mutation.signUp`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

```typescript
const result = await db.mutation.signUp({ input: '<value>' }).execute();
```

### `db.mutation.setFieldOrder`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

```typescript
const result = await db.mutation.setFieldOrder({ input: '<value>' }).execute();
```

### `db.mutation.oneTimeToken`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

```typescript
const result = await db.mutation.oneTimeToken({ input: '<value>' }).execute();
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

### `db.mutation.applyRls`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ApplyRlsInput (required) |

```typescript
const result = await db.mutation.applyRls({ input: '<value>' }).execute();
```

### `db.mutation.forgotPassword`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

```typescript
const result = await db.mutation.forgotPassword({ input: '<value>' }).execute();
```

### `db.mutation.sendVerificationEmail`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

```typescript
const result = await db.mutation.sendVerificationEmail({ input: '<value>' }).execute();
```

### `db.mutation.verifyPassword`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

```typescript
const result = await db.mutation.verifyPassword({ input: '<value>' }).execute();
```

### `db.mutation.verifyTotp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

```typescript
const result = await db.mutation.verifyTotp({ input: '<value>' }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
