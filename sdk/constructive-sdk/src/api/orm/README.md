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
| `function` | findMany, findOne, create, update, delete |
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
| `schemaGrant` | findMany, findOne, create, update, delete |
| `defaultPrivilege` | findMany, findOne, create, update, delete |
| `enum` | findMany, findOne, create, update, delete |
| `apiSchema` | findMany, findOne, create, update, delete |
| `apiModule` | findMany, findOne, create, update, delete |
| `domain` | findMany, findOne, create, update, delete |
| `siteMetadatum` | findMany, findOne, create, update, delete |
| `siteModule` | findMany, findOne, create, update, delete |
| `siteTheme` | findMany, findOne, create, update, delete |
| `corsSetting` | findMany, findOne, create, update, delete |
| `triggerFunction` | findMany, findOne, create, update, delete |
| `partition` | findMany, findOne, create, update, delete |
| `databaseTransfer` | findMany, findOne, create, update, delete |
| `api` | findMany, findOne, create, update, delete |
| `site` | findMany, findOne, create, update, delete |
| `app` | findMany, findOne, create, update, delete |
| `apiSetting` | findMany, findOne, create, update, delete |
| `migrateFile` | findMany, findOne, create, update, delete |
| `nodeTypeRegistry` | findMany, findOne, create, update, delete |
| `pubkeySetting` | findMany, findOne, create, update, delete |
| `database` | findMany, findOne, create, update, delete |
| `rlsSetting` | findMany, findOne, create, update, delete |
| `sqlAction` | findMany, findOne, create, update, delete |
| `databaseSetting` | findMany, findOne, create, update, delete |
| `webauthnSetting` | findMany, findOne, create, update, delete |
| `astMigration` | findMany, findOne, create, update, delete |

## Table Operations

### `db.function`

CRUD operations for Function records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all function records
const items = await db.function.findMany({ select: { id: true, databaseId: true, schemaId: true, name: true } }).execute();

// Get one by id
const item = await db.function.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, name: true } }).execute();

// Create
const created = await db.function.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.function.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.function.delete({ where: { id: '<UUID>' } }).execute();
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
| `partitioned` | Boolean | Yes |
| `partitionStrategy` | String | Yes |
| `partitionKeyNames` | String | Yes |
| `partitionKeyTypes` | String | Yes |
| `inheritsId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all table records
const items = await db.table.findMany({ select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, inheritsId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.table.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, inheritsId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.table.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', partitioned: '<Boolean>', partitionStrategy: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', inheritsId: '<UUID>' }, select: { id: true } }).execute();

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
| `defaultValue` | JSON | Yes |
| `type` | JSON | Yes |
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
const items = await db.field.findMany({ select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.field.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.field.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<JSON>', type: '<JSON>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' }, select: { id: true } }).execute();

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
| `langColumn` | String | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all fullTextSearch records
const items = await db.fullTextSearch.findMany({ select: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, langColumn: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.fullTextSearch.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, langColumn: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.fullTextSearch.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>', langColumn: '<String>' }, select: { id: true } }).execute();

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
| `searchIndexes` | JSON | Yes |
| `enqueueChunkingJob` | Boolean | Yes |
| `chunkingTaskName` | String | Yes |
| `embeddingModel` | String | Yes |
| `embeddingProvider` | String | Yes |
| `parentFkFieldId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all embeddingChunk records
const items = await db.embeddingChunk.findMany({ select: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, searchIndexes: true, enqueueChunkingJob: true, chunkingTaskName: true, embeddingModel: true, embeddingProvider: true, parentFkFieldId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.embeddingChunk.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, searchIndexes: true, enqueueChunkingJob: true, chunkingTaskName: true, embeddingModel: true, embeddingProvider: true, parentFkFieldId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.embeddingChunk.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', searchIndexes: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', embeddingModel: '<String>', embeddingProvider: '<String>', parentFkFieldId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.embeddingChunk.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.embeddingChunk.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.corsSetting`

CRUD operations for CorsSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `apiId` | UUID | Yes |
| `allowedOrigins` | String | Yes |

**Operations:**

```typescript
// List all corsSetting records
const items = await db.corsSetting.findMany({ select: { id: true, databaseId: true, apiId: true, allowedOrigins: true } }).execute();

// Get one by id
const item = await db.corsSetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, apiId: true, allowedOrigins: true } }).execute();

// Create
const created = await db.corsSetting.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', allowedOrigins: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.corsSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.corsSetting.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.partition`

CRUD operations for Partition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `strategy` | String | Yes |
| `partitionKeyId` | UUID | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `retentionKeepTable` | Boolean | Yes |
| `premake` | Int | Yes |
| `namingPattern` | String | Yes |
| `isParented` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all partition records
const items = await db.partition.findMany({ select: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, isParented: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.partition.findOne({ id: '<UUID>', select: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, isParented: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.partition.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>', isParented: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.partition.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.partition.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.apiSetting`

CRUD operations for ApiSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `apiId` | UUID | Yes |
| `enableAggregates` | Boolean | Yes |
| `enablePostgis` | Boolean | Yes |
| `enableSearch` | Boolean | Yes |
| `enableDirectUploads` | Boolean | Yes |
| `enablePresignedUploads` | Boolean | Yes |
| `enableManyToMany` | Boolean | Yes |
| `enableConnectionFilter` | Boolean | Yes |
| `enableLtree` | Boolean | Yes |
| `enableLlm` | Boolean | Yes |
| `enableRealtime` | Boolean | Yes |
| `enableBulk` | Boolean | Yes |
| `enableI18N` | Boolean | Yes |
| `options` | JSON | Yes |

**Operations:**

```typescript
// List all apiSetting records
const items = await db.apiSetting.findMany({ select: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } }).execute();

// Get one by id
const item = await db.apiSetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } }).execute();

// Create
const created = await db.apiSetting.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.apiSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.apiSetting.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.pubkeySetting`

CRUD operations for PubkeySetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `cryptoNetwork` | String | Yes |
| `userField` | String | Yes |
| `signUpWithKeyFunctionId` | UUID | Yes |
| `signInRequestChallengeFunctionId` | UUID | Yes |
| `signInRecordFailureFunctionId` | UUID | Yes |
| `signInWithChallengeFunctionId` | UUID | Yes |

**Operations:**

```typescript
// List all pubkeySetting records
const items = await db.pubkeySetting.findMany({ select: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } }).execute();

// Get one by id
const item = await db.pubkeySetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } }).execute();

// Create
const created = await db.pubkeySetting.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', cryptoNetwork: '<String>', userField: '<String>', signUpWithKeyFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.pubkeySetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.pubkeySetting.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.rlsSetting`

CRUD operations for RlsSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `authenticateSchemaId` | UUID | Yes |
| `roleSchemaId` | UUID | Yes |
| `authenticateFunctionId` | UUID | Yes |
| `authenticateStrictFunctionId` | UUID | Yes |
| `currentRoleFunctionId` | UUID | Yes |
| `currentRoleIdFunctionId` | UUID | Yes |
| `currentUserAgentFunctionId` | UUID | Yes |
| `currentIpAddressFunctionId` | UUID | Yes |

**Operations:**

```typescript
// List all rlsSetting records
const items = await db.rlsSetting.findMany({ select: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } }).execute();

// Get one by id
const item = await db.rlsSetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } }).execute();

// Create
const created = await db.rlsSetting.create({ data: { databaseId: '<UUID>', authenticateSchemaId: '<UUID>', roleSchemaId: '<UUID>', authenticateFunctionId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsSetting.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.databaseSetting`

CRUD operations for DatabaseSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `enableAggregates` | Boolean | Yes |
| `enablePostgis` | Boolean | Yes |
| `enableSearch` | Boolean | Yes |
| `enableDirectUploads` | Boolean | Yes |
| `enablePresignedUploads` | Boolean | Yes |
| `enableManyToMany` | Boolean | Yes |
| `enableConnectionFilter` | Boolean | Yes |
| `enableLtree` | Boolean | Yes |
| `enableLlm` | Boolean | Yes |
| `enableRealtime` | Boolean | Yes |
| `enableBulk` | Boolean | Yes |
| `enableI18N` | Boolean | Yes |
| `options` | JSON | Yes |

**Operations:**

```typescript
// List all databaseSetting records
const items = await db.databaseSetting.findMany({ select: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } }).execute();

// Get one by id
const item = await db.databaseSetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } }).execute();

// Create
const created = await db.databaseSetting.create({ data: { databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnSetting`

CRUD operations for WebauthnSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `credentialsSchemaId` | UUID | Yes |
| `sessionsSchemaId` | UUID | Yes |
| `sessionSecretsSchemaId` | UUID | Yes |
| `credentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionSecretsTableId` | UUID | Yes |
| `userFieldId` | UUID | Yes |
| `rpId` | String | Yes |
| `rpName` | String | Yes |
| `originAllowlist` | String | Yes |
| `attestationType` | String | Yes |
| `requireUserVerification` | Boolean | Yes |
| `residentKey` | String | Yes |
| `challengeExpirySeconds` | BigInt | Yes |

**Operations:**

```typescript
// List all webauthnSetting records
const items = await db.webauthnSetting.findMany({ select: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } }).execute();

// Get one by id
const item = await db.webauthnSetting.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } }).execute();

// Create
const created = await db.webauthnSetting.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', credentialsSchemaId: '<UUID>', sessionsSchemaId: '<UUID>', sessionSecretsSchemaId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', userFieldId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpirySeconds: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnSetting.delete({ where: { id: '<UUID>' } }).execute();
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
const item = await db.astMigration.findOne({ id: '<Int>', select: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } }).execute();

// Create
const created = await db.astMigration.create({ data: { databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.astMigration.update({ where: { id: '<Int>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.astMigration.delete({ where: { id: '<Int>' } }).execute();
```

## Custom Operations

### `db.query.applyRegistryDefaults`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `nodeType` | String |
  | `data` | JSON |

```typescript
const result = await db.query.applyRegistryDefaults({ nodeType: '<String>', data: '<JSON>' }).execute();
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

### `db.mutation.provisionDatabaseWithUser`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionDatabaseWithUserInput (required) |

```typescript
const result = await db.mutation.provisionDatabaseWithUser({ input: { pDatabaseName: '<String>', pDomain: '<String>', pSubdomain: '<String>', pModules: '<JSON>', pOptions: '<JSON>' } }).execute();
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

### `db.mutation.createUserDatabase`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include events/analytics (default: false)
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
