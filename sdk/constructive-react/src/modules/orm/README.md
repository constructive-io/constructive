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
| `defaultIdsModule` | findMany, findOne, create, update, delete |
| `membershipTypesModule` | findMany, findOne, create, update, delete |
| `userStateModule` | findMany, findOne, create, update, delete |
| `sessionSecretsModule` | findMany, findOne, create, update, delete |
| `configSecretsOrgModule` | findMany, findOne, create, update, delete |
| `devicesModule` | findMany, findOne, create, update, delete |
| `i18NModule` | findMany, findOne, create, update, delete |
| `userCredentialsModule` | findMany, findOne, create, update, delete |
| `userSettingsModule` | findMany, findOne, create, update, delete |
| `configSecretsUserModule` | findMany, findOne, create, update, delete |
| `connectedAccountsModule` | findMany, findOne, create, update, delete |
| `emailsModule` | findMany, findOne, create, update, delete |
| `phoneNumbersModule` | findMany, findOne, create, update, delete |
| `rateLimitsModule` | findMany, findOne, create, update, delete |
| `usersModule` | findMany, findOne, create, update, delete |
| `webauthnCredentialsModule` | findMany, findOne, create, update, delete |
| `cryptoAddressesModule` | findMany, findOne, create, update, delete |
| `identityProvidersModule` | findMany, findOne, create, update, delete |
| `denormalizedTableField` | findMany, findOne, create, update, delete |
| `rlsModule` | findMany, findOne, create, update, delete |
| `blueprint` | findMany, findOne, create, update, delete |
| `blueprintTemplate` | findMany, findOne, create, update, delete |
| `blueprintConstruction` | findMany, findOne, create, update, delete |
| `cryptoAuthModule` | findMany, findOne, create, update, delete |
| `sessionsModule` | findMany, findOne, create, update, delete |
| `configSecretsModule` | findMany, findOne, create, update, delete |
| `secureTableProvision` | findMany, findOne, create, update, delete |
| `rateLimitMetersModule` | findMany, findOne, create, update, delete |
| `invitesModule` | findMany, findOne, create, update, delete |
| `merkleStoreModule` | findMany, findOne, create, update, delete |
| `graphModule` | findMany, findOne, create, update, delete |
| `databaseProvisionModule` | findMany, findOne, create, update, delete |
| `realtimeModule` | findMany, findOne, create, update, delete |
| `webauthnAuthModule` | findMany, findOne, create, update, delete |
| `functionInvocationModule` | findMany, findOne, create, update, delete |
| `functionModule` | findMany, findOne, create, update, delete |
| `namespaceModule` | findMany, findOne, create, update, delete |
| `computeLogModule` | findMany, findOne, create, update, delete |
| `inferenceLogModule` | findMany, findOne, create, update, delete |
| `storageLogModule` | findMany, findOne, create, update, delete |
| `transferLogModule` | findMany, findOne, create, update, delete |
| `plansModule` | findMany, findOne, create, update, delete |
| `dbUsageModule` | findMany, findOne, create, update, delete |
| `notificationsModule` | findMany, findOne, create, update, delete |
| `billingProviderModule` | findMany, findOne, create, update, delete |
| `hierarchyModule` | findMany, findOne, create, update, delete |
| `profilesModule` | findMany, findOne, create, update, delete |
| `permissionsModule` | findMany, findOne, create, update, delete |
| `billingModule` | findMany, findOne, create, update, delete |
| `relationProvision` | findMany, findOne, create, update, delete |
| `userAuthModule` | findMany, findOne, create, update, delete |
| `agentModule` | findMany, findOne, create, update, delete |
| `limitsModule` | findMany, findOne, create, update, delete |
| `membershipsModule` | findMany, findOne, create, update, delete |
| `storageModule` | findMany, findOne, create, update, delete |
| `entityTypeProvision` | findMany, findOne, create, update, delete |
| `eventsModule` | findMany, findOne, create, update, delete |

## Table Operations

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

### `db.userStateModule`

CRUD operations for UserStateModule records.

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
// List all userStateModule records
const items = await db.userStateModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.userStateModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.userStateModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userStateModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userStateModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.configSecretsOrgModule`

CRUD operations for ConfigSecretsOrgModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all configSecretsOrgModule records
const items = await db.configSecretsOrgModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.configSecretsOrgModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.configSecretsOrgModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.configSecretsOrgModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.configSecretsOrgModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.i18NModule`

CRUD operations for I18NModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `settingsTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all i18NModule records
const items = await db.i18NModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.i18NModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.i18NModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', settingsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.i18NModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.i18NModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userCredentialsModule`

CRUD operations for UserCredentialsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all userCredentialsModule records
const items = await db.userCredentialsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.userCredentialsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.userCredentialsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userCredentialsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userCredentialsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userSettingsModule`

CRUD operations for UserSettingsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `tableName` | String | Yes |
| `apiName` | String | Yes |

**Operations:**

```typescript
// List all userSettingsModule records
const items = await db.userSettingsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } }).execute();

// Get one by id
const item = await db.userSettingsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } }).execute();

// Create
const created = await db.userSettingsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userSettingsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userSettingsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.configSecretsUserModule`

CRUD operations for ConfigSecretsUserModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `configDefinitionsTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all configSecretsUserModule records
const items = await db.configSecretsUserModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, configDefinitionsTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.configSecretsUserModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, configDefinitionsTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.configSecretsUserModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', configDefinitionsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.configSecretsUserModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.configSecretsUserModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all connectedAccountsModule records
const items = await db.connectedAccountsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.connectedAccountsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.connectedAccountsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccountsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccountsModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all emailsModule records
const items = await db.emailsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.emailsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.emailsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.emailsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.emailsModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all phoneNumbersModule records
const items = await db.phoneNumbersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.phoneNumbersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.phoneNumbersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumbersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumbersModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all usersModule records
const items = await db.usersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.usersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.usersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.usersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.usersModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all webauthnCredentialsModule records
const items = await db.webauthnCredentialsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.webauthnCredentialsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.webauthnCredentialsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnCredentialsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnCredentialsModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all cryptoAddressesModule records
const items = await db.cryptoAddressesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.cryptoAddressesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.cryptoAddressesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddressesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddressesModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |

**Operations:**

```typescript
// List all identityProvidersModule records
const items = await db.identityProvidersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } }).execute();

// Get one by id
const item = await db.identityProvidersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } }).execute();

// Create
const created = await db.identityProvidersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.identityProvidersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.identityProvidersModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all rlsModule records
const items = await db.rlsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.rlsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.rlsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.configSecretsModule`

CRUD operations for ConfigSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `configDefinitionsTableId` | UUID | Yes |
| `tableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `hasConfig` | Boolean | Yes |

**Operations:**

```typescript
// List all configSecretsModule records
const items = await db.configSecretsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, configDefinitionsTableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, hasConfig: true } }).execute();

// Get one by id
const item = await db.configSecretsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, configDefinitionsTableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, hasConfig: true } }).execute();

// Create
const created = await db.configSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', configDefinitionsTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', hasConfig: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.configSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.configSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.rateLimitMetersModule`

CRUD operations for RateLimitMetersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `rateLimitStateTableId` | UUID | Yes |
| `rateLimitStateTableName` | String | Yes |
| `rateLimitOverridesTableId` | UUID | Yes |
| `rateLimitOverridesTableName` | String | Yes |
| `rateWindowLimitsTableId` | UUID | Yes |
| `rateWindowLimitsTableName` | String | Yes |
| `checkRateLimitFunction` | String | Yes |
| `prefix` | String | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all rateLimitMetersModule records
const items = await db.rateLimitMetersModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.rateLimitMetersModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.rateLimitMetersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.rateLimitMetersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rateLimitMetersModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all invitesModule records
const items = await db.invitesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.invitesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.invitesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.invitesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invitesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.merkleStoreModule`

CRUD operations for MerkleStoreModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `privateSchemaName` | String | Yes |
| `objectTableId` | UUID | Yes |
| `storeTableId` | UUID | Yes |
| `commitTableId` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `functionPrefix` | String | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all merkleStoreModule records
const items = await db.merkleStoreModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, createdAt: true } }).execute();

// Get one by id
const item = await db.merkleStoreModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, createdAt: true } }).execute();

// Create
const created = await db.merkleStoreModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', objectTableId: '<UUID>', storeTableId: '<UUID>', commitTableId: '<UUID>', refTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', functionPrefix: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.merkleStoreModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.merkleStoreModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.graphModule`

CRUD operations for GraphModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `publicSchemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `privateSchemaName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `merkleStoreModuleId` | UUID | Yes |
| `graphsTableId` | UUID | Yes |
| `executionsTableId` | UUID | Yes |
| `outputsTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `defaultPermissions` | String | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all graphModule records
const items = await db.graphModule.findMany({ select: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, executionsTableId: true, outputsTableId: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } }).execute();

// Get one by id
const item = await db.graphModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, executionsTableId: true, outputsTableId: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } }).execute();

// Create
const created = await db.graphModule.create({ data: { databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', graphsTableId: '<UUID>', executionsTableId: '<UUID>', outputsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.graphModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.graphModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `modules` | JSON | Yes |
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
const created = await db.databaseProvisionModule.create({ data: { databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<JSON>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseProvisionModule.update({ where: { id: '<UUID>' }, data: { databaseName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseProvisionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.realtimeModule`

CRUD operations for RealtimeModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `subscriptionsSchemaId` | UUID | Yes |
| `changeLogTableId` | UUID | Yes |
| `listenerNodeTableId` | UUID | Yes |
| `sourceRegistryTableId` | UUID | Yes |
| `retentionHours` | Int | Yes |
| `premake` | Int | Yes |
| `interval` | String | Yes |
| `notifyChannel` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all realtimeModule records
const items = await db.realtimeModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.realtimeModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.realtimeModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.realtimeModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.realtimeModule.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.functionInvocationModule`

CRUD operations for FunctionInvocationModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `privateSchemaName` | String | Yes |
| `invocationsTableId` | UUID | Yes |
| `executionLogsTableId` | UUID | Yes |
| `invocationsTableName` | String | Yes |
| `executionLogsTableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `defaultPermissions` | String | Yes |

**Operations:**

```typescript
// List all functionInvocationModule records
const items = await db.functionInvocationModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Get one by id
const item = await db.functionInvocationModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Create
const created = await db.functionInvocationModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', invocationsTableName: '<String>', executionLogsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocationModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocationModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionModule`

CRUD operations for FunctionModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `privateSchemaName` | String | Yes |
| `definitionsTableId` | UUID | Yes |
| `secretDefinitionsTableId` | UUID | Yes |
| `definitionsTableName` | String | Yes |
| `secretDefinitionsTableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `defaultPermissions` | String | Yes |

**Operations:**

```typescript
// List all functionModule records
const items = await db.functionModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, secretDefinitionsTableId: true, definitionsTableName: true, secretDefinitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Get one by id
const item = await db.functionModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, secretDefinitionsTableId: true, definitionsTableName: true, secretDefinitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Create
const created = await db.functionModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', secretDefinitionsTableId: '<UUID>', definitionsTableName: '<String>', secretDefinitionsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceModule`

CRUD operations for NamespaceModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `privateSchemaName` | String | Yes |
| `namespacesTableId` | UUID | Yes |
| `namespaceEventsTableId` | UUID | Yes |
| `namespacesTableName` | String | Yes |
| `namespaceEventsTableName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `defaultPermissions` | String | Yes |

**Operations:**

```typescript
// List all namespaceModule records
const items = await db.namespaceModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Get one by id
const item = await db.namespaceModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } }).execute();

// Create
const created = await db.namespaceModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', namespacesTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespacesTableName: '<String>', namespaceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.computeLogModule`

CRUD operations for ComputeLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `computeLogTableId` | UUID | Yes |
| `computeLogTableName` | String | Yes |
| `usageDailyTableId` | UUID | Yes |
| `usageDailyTableName` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `actorFkTableId` | UUID | Yes |
| `entityFkTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all computeLogModule records
const items = await db.computeLogModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.computeLogModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.computeLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.computeLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.computeLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.inferenceLogModule`

CRUD operations for InferenceLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `inferenceLogTableId` | UUID | Yes |
| `inferenceLogTableName` | String | Yes |
| `usageDailyTableId` | UUID | Yes |
| `usageDailyTableName` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `actorFkTableId` | UUID | Yes |
| `entityFkTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all inferenceLogModule records
const items = await db.inferenceLogModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.inferenceLogModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.inferenceLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.inferenceLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.inferenceLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.storageLogModule`

CRUD operations for StorageLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `storageLogTableId` | UUID | Yes |
| `storageLogTableName` | String | Yes |
| `usageDailyTableId` | UUID | Yes |
| `usageDailyTableName` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `actorFkTableId` | UUID | Yes |
| `entityFkTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all storageLogModule records
const items = await db.storageLogModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.storageLogModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.storageLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.storageLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.storageLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.transferLogModule`

CRUD operations for TransferLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `transferLogTableId` | UUID | Yes |
| `transferLogTableName` | String | Yes |
| `usageDailyTableId` | UUID | Yes |
| `usageDailyTableName` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `actorFkTableId` | UUID | Yes |
| `entityFkTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all transferLogModule records
const items = await db.transferLogModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.transferLogModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.transferLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.transferLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.transferLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.plansModule`

CRUD operations for PlansModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `plansTableId` | UUID | Yes |
| `plansTableName` | String | Yes |
| `planLimitsTableId` | UUID | Yes |
| `planLimitsTableName` | String | Yes |
| `planPricingTableId` | UUID | Yes |
| `planOverridesTableId` | UUID | Yes |
| `planMeterLimitsTableId` | UUID | Yes |
| `planCapsTableId` | UUID | Yes |
| `applyPlanFunction` | String | Yes |
| `applyPlanAggregateFunction` | String | Yes |
| `applyBillingPlanFunction` | String | Yes |
| `applyPlanCapsFunction` | String | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all plansModule records
const items = await db.plansModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.plansModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.plansModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', planMeterLimitsTableId: '<UUID>', planCapsTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyBillingPlanFunction: '<String>', applyPlanCapsFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.plansModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.plansModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbUsageModule`

CRUD operations for DbUsageModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `tableStatsLogTableId` | UUID | Yes |
| `tableStatsLogTableName` | String | Yes |
| `tableStatsDailyTableId` | UUID | Yes |
| `tableStatsDailyTableName` | String | Yes |
| `queryStatsLogTableId` | UUID | Yes |
| `queryStatsLogTableName` | String | Yes |
| `queryStatsDailyTableId` | UUID | Yes |
| `queryStatsDailyTableName` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all dbUsageModule records
const items = await db.dbUsageModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.dbUsageModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.dbUsageModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbUsageModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbUsageModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `suppressionsTableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `userSettingsTableId` | UUID | Yes |
| `organizationSettingsTableId` | UUID | Yes |
| `hasChannels` | Boolean | Yes |
| `hasPreferences` | Boolean | Yes |
| `hasSettingsExtension` | Boolean | Yes |
| `hasDigestMetadata` | Boolean | Yes |
| `hasSubscriptions` | Boolean | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all notificationsModule records
const items = await db.notificationsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.notificationsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.notificationsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', readStateTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', suppressionsTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', hasChannels: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasDigestMetadata: '<Boolean>', hasSubscriptions: '<Boolean>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.notificationsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.notificationsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.billingProviderModule`

CRUD operations for BillingProviderModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `provider` | String | Yes |
| `productsTableId` | UUID | Yes |
| `pricesTableId` | UUID | Yes |
| `subscriptionsTableId` | UUID | Yes |
| `billingCustomersTableId` | UUID | Yes |
| `billingCustomersTableName` | String | Yes |
| `billingProductsTableId` | UUID | Yes |
| `billingProductsTableName` | String | Yes |
| `billingPricesTableId` | UUID | Yes |
| `billingPricesTableName` | String | Yes |
| `billingSubscriptionsTableId` | UUID | Yes |
| `billingSubscriptionsTableName` | String | Yes |
| `billingWebhookEventsTableId` | UUID | Yes |
| `billingWebhookEventsTableName` | String | Yes |
| `processBillingEventFunction` | String | Yes |
| `prefix` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all billingProviderModule records
const items = await db.billingProviderModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.billingProviderModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.billingProviderModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.billingProviderModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.billingProviderModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `privateSchemaName` | String | Yes |
| `sprtTableName` | String | Yes |
| `rebuildHierarchyFunction` | String | Yes |
| `getSubordinatesFunction` | String | Yes |
| `getManagersFunction` | String | Yes |
| `isManagerOfFunction` | String | Yes |
| `defaultPermissions` | String | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all hierarchyModule records
const items = await db.hierarchyModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, scope: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, defaultPermissions: true, createdAt: true } }).execute();

// Get one by id
const item = await db.hierarchyModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, scope: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, defaultPermissions: true, createdAt: true } }).execute();

// Create
const created = await db.hierarchyModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', scope: '<String>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.hierarchyModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.hierarchyModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `profileTemplatesTableId` | UUID | Yes |
| `profileTemplatesTableName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `membershipsTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all profilesModule records
const items = await db.profilesModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.profilesModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.profilesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.profilesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.profilesModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `getPaddedMask` | String | Yes |
| `getMask` | String | Yes |
| `getByMask` | String | Yes |
| `getMaskByName` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all permissionsModule records
const items = await db.permissionsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.permissionsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.permissionsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.permissionsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.permissionsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.billingModule`

CRUD operations for BillingModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `metersTableId` | UUID | Yes |
| `metersTableName` | String | Yes |
| `planSubscriptionsTableId` | UUID | Yes |
| `planSubscriptionsTableName` | String | Yes |
| `ledgerTableId` | UUID | Yes |
| `ledgerTableName` | String | Yes |
| `balancesTableId` | UUID | Yes |
| `balancesTableName` | String | Yes |
| `meterCreditsTableId` | UUID | Yes |
| `meterCreditsTableName` | String | Yes |
| `meterSourcesTableId` | UUID | Yes |
| `meterSourcesTableName` | String | Yes |
| `meterDefaultsTableId` | UUID | Yes |
| `meterDefaultsTableName` | String | Yes |
| `recordUsageFunction` | String | Yes |
| `prefix` | String | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all billingModule records
const items = await db.billingModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.billingModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.billingModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', recordUsageFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.billingModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.billingModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all userAuthModule records
const items = await db.userAuthModule.findMany({ select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.userAuthModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.userAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInCrossOriginFunction: '<String>', requestCrossOriginTokenFunction: '<String>', extendTokenExpires: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentModule`

CRUD operations for AgentModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `threadTableId` | UUID | Yes |
| `messageTableId` | UUID | Yes |
| `taskTableId` | UUID | Yes |
| `promptsTableId` | UUID | Yes |
| `planTableId` | UUID | Yes |
| `agentTableId` | UUID | Yes |
| `personaTableId` | UUID | Yes |
| `resourceTableId` | UUID | Yes |
| `threadTableName` | String | Yes |
| `messageTableName` | String | Yes |
| `taskTableName` | String | Yes |
| `promptsTableName` | String | Yes |
| `planTableName` | String | Yes |
| `agentTableName` | String | Yes |
| `personaTableName` | String | Yes |
| `resourceTableName` | String | Yes |
| `hasPlans` | Boolean | Yes |
| `hasResources` | Boolean | Yes |
| `hasAgents` | Boolean | Yes |
| `shared` | Boolean | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `resources` | JSON | Yes |
| `provisions` | JSON | Yes |
| `defaultPermissions` | String | Yes |

**Operations:**

```typescript
// List all agentModule records
const items = await db.agentModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } }).execute();

// Get one by id
const item = await db.agentModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } }).execute();

// Create
const created = await db.agentModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', planTableId: '<UUID>', agentTableId: '<UUID>', personaTableId: '<UUID>', resourceTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', planTableName: '<String>', agentTableName: '<String>', personaTableName: '<String>', resourceTableName: '<String>', hasPlans: '<Boolean>', hasResources: '<Boolean>', hasAgents: '<Boolean>', shared: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', resources: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `limitCreditsTableId` | UUID | Yes |
| `eventsTableId` | UUID | Yes |
| `creditCodesTableId` | UUID | Yes |
| `creditCodeItemsTableId` | UUID | Yes |
| `creditRedemptionsTableId` | UUID | Yes |
| `aggregateTableId` | UUID | Yes |
| `limitCapsTableId` | UUID | Yes |
| `limitCapsDefaultsTableId` | UUID | Yes |
| `capCheckTrigger` | String | Yes |
| `resolveCapFunction` | String | Yes |
| `limitWarningsTableId` | UUID | Yes |
| `limitWarningStateTableId` | UUID | Yes |
| `limitCheckSoftFunction` | String | Yes |
| `limitAggregateCheckSoftFunction` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all limitsModule records
const items = await db.limitsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.limitsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.limitsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', limitCreditsTableId: '<UUID>', eventsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditCodeItemsTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', aggregateTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCapsDefaultsTableId: '<UUID>', capCheckTrigger: '<String>', resolveCapFunction: '<String>', limitWarningsTableId: '<UUID>', limitWarningStateTableId: '<UUID>', limitCheckSoftFunction: '<String>', limitAggregateCheckSoftFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.limitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.limitsModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `entityTableOwnerId` | UUID | Yes |
| `getOrgFn` | String | Yes |
| `actorMaskCheck` | String | Yes |
| `actorPermCheck` | String | Yes |
| `entityIdsByMask` | String | Yes |
| `entityIdsByPerm` | String | Yes |
| `entityIdsFunction` | String | Yes |
| `memberProfilesTableId` | UUID | Yes |
| `permissionDefaultPermissionsTableId` | UUID | Yes |
| `permissionDefaultGrantsTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all membershipsModule records
const items = await db.membershipsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, scope: true, prefix: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true, permissionDefaultPermissionsTableId: true, permissionDefaultGrantsTableId: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.membershipsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, scope: true, prefix: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true, permissionDefaultPermissionsTableId: true, permissionDefaultGrantsTableId: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.membershipsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', memberProfilesTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionDefaultGrantsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipsModule.delete({ where: { id: '<UUID>' } }).execute();
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
| `bucketsTableName` | String | Yes |
| `filesTableName` | String | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `policies` | JSON | Yes |
| `provisions` | JSON | Yes |
| `entityTableId` | UUID | Yes |
| `endpoint` | String | Yes |
| `publicUrlPrefix` | String | Yes |
| `provider` | String | Yes |
| `allowedOrigins` | String | Yes |
| `restrictReads` | Boolean | Yes |
| `hasPathShares` | Boolean | Yes |
| `pathSharesTableId` | UUID | Yes |
| `uploadUrlExpirySeconds` | Int | Yes |
| `downloadUrlExpirySeconds` | Int | Yes |
| `defaultMaxFileSize` | BigInt | Yes |
| `maxFilenameLength` | Int | Yes |
| `cacheTtlSeconds` | Int | Yes |
| `maxBulkFiles` | Int | Yes |
| `maxBulkTotalSize` | BigInt | Yes |
| `hasVersioning` | Boolean | Yes |
| `hasContentHash` | Boolean | Yes |
| `hasCustomKeys` | Boolean | Yes |
| `hasAuditLog` | Boolean | Yes |
| `hasConfirmUpload` | Boolean | Yes |
| `confirmUploadDelay` | Interval | Yes |
| `fileEventsTableId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all storageModule records
const items = await db.storageModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.storageModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.storageModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', scope: '<String>', prefix: '<String>', policies: '<JSON>', provisions: '<JSON>', entityTableId: '<UUID>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

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
| `hasInvites` | Boolean | Yes |
| `hasInviteAchievements` | Boolean | Yes |
| `storage` | JSON | Yes |
| `namespaces` | JSON | Yes |
| `functions` | JSON | Yes |
| `graphs` | JSON | Yes |
| `agents` | JSON | Yes |
| `skipEntityPolicies` | Boolean | Yes |
| `tableProvision` | JSON | Yes |
| `outMembershipType` | Int | Yes |
| `outEntityTableId` | UUID | Yes |
| `outEntityTableName` | String | Yes |
| `outInstalledModules` | String | Yes |
| `outStorageModuleId` | UUID | Yes |
| `outBucketsTableId` | UUID | Yes |
| `outFilesTableId` | UUID | Yes |
| `outPathSharesTableId` | UUID | Yes |
| `outInvitesModuleId` | UUID | Yes |
| `outNamespaceModuleId` | UUID | Yes |
| `outNamespacesTableId` | UUID | Yes |
| `outNamespaceEventsTableId` | UUID | Yes |
| `outFunctionModuleId` | UUID | Yes |
| `outDefinitionsTableId` | UUID | Yes |
| `outInvocationsTableId` | UUID | Yes |
| `outExecutionLogsTableId` | UUID | Yes |
| `outSecretDefinitionsTableId` | UUID | Yes |
| `outGraphModuleId` | UUID | Yes |
| `outGraphsTableId` | UUID | Yes |
| `outAgentModuleId` | UUID | Yes |

**Operations:**

```typescript
// List all entityTypeProvision records
const items = await db.entityTypeProvision.findMany({ select: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outSecretDefinitionsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } }).execute();

// Get one by id
const item = await db.entityTypeProvision.findOne({ id: '<UUID>', select: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outSecretDefinitionsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } }).execute();

// Create
const created = await db.entityTypeProvision.create({ data: { databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', hasInvites: '<Boolean>', hasInviteAchievements: '<Boolean>', storage: '<JSON>', namespaces: '<JSON>', functions: '<JSON>', graphs: '<JSON>', agents: '<JSON>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>', outStorageModuleId: '<UUID>', outBucketsTableId: '<UUID>', outFilesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outInvitesModuleId: '<UUID>', outNamespaceModuleId: '<UUID>', outNamespacesTableId: '<UUID>', outNamespaceEventsTableId: '<UUID>', outFunctionModuleId: '<UUID>', outDefinitionsTableId: '<UUID>', outInvocationsTableId: '<UUID>', outExecutionLogsTableId: '<UUID>', outSecretDefinitionsTableId: '<UUID>', outGraphModuleId: '<UUID>', outGraphsTableId: '<UUID>', outAgentModuleId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.entityTypeProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.entityTypeProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.eventsModule`

CRUD operations for EventsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `privateSchemaId` | UUID | Yes |
| `eventsTableId` | UUID | Yes |
| `eventsTableName` | String | Yes |
| `eventAggregatesTableId` | UUID | Yes |
| `eventAggregatesTableName` | String | Yes |
| `eventTypesTableId` | UUID | Yes |
| `eventTypesTableName` | String | Yes |
| `levelsTableId` | UUID | Yes |
| `levelsTableName` | String | Yes |
| `levelRequirementsTableId` | UUID | Yes |
| `levelRequirementsTableName` | String | Yes |
| `levelGrantsTableId` | UUID | Yes |
| `levelGrantsTableName` | String | Yes |
| `achievementRewardsTableId` | UUID | Yes |
| `achievementRewardsTableName` | String | Yes |
| `recordEvent` | String | Yes |
| `removeEvent` | String | Yes |
| `tgEvent` | String | Yes |
| `tgEventToggle` | String | Yes |
| `tgEventToggleBool` | String | Yes |
| `tgEventBool` | String | Yes |
| `upsertAggregate` | String | Yes |
| `tgUpdateAggregates` | String | Yes |
| `pruneEvents` | String | Yes |
| `stepsRequired` | String | Yes |
| `levelAchieved` | String | Yes |
| `tgCheckAchievements` | String | Yes |
| `grantAchievement` | String | Yes |
| `tgAchievementReward` | String | Yes |
| `interval` | String | Yes |
| `retention` | String | Yes |
| `premake` | Int | Yes |
| `scope` | String | Yes |
| `prefix` | String | Yes |
| `entityTableId` | UUID | Yes |
| `actorTableId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `apiName` | String | Yes |
| `privateApiName` | String | Yes |

**Operations:**

```typescript
// List all eventsModule records
const items = await db.eventsModule.findMany({ select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, pruneEvents: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Get one by id
const item = await db.eventsModule.findOne({ id: '<UUID>', select: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, pruneEvents: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } }).execute();

// Create
const created = await db.eventsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', pruneEvents: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.eventsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.eventsModule.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

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

### `db.mutation.constructBlueprint`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

```typescript
const result = await db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute();
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

### `db.mutation.provisionCheckConstraint`

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionCheckConstraintInput (required) |

```typescript
const result = await db.mutation.provisionCheckConstraint({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } }).execute();
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
