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
| `agentModule` | findMany, findOne, create, update, delete |
| `billingModule` | findMany, findOne, create, update, delete |
| `billingProviderModule` | findMany, findOne, create, update, delete |
| `blueprint` | findMany, findOne, create, update, delete |
| `blueprintConstruction` | findMany, findOne, create, update, delete |
| `blueprintTemplate` | findMany, findOne, create, update, delete |
| `computeLogModule` | findMany, findOne, create, update, delete |
| `configSecretsUserModule` | findMany, findOne, create, update, delete |
| `connectedAccountsModule` | findMany, findOne, create, update, delete |
| `cryptoAddressesModule` | findMany, findOne, create, update, delete |
| `cryptoAuthModule` | findMany, findOne, create, update, delete |
| `databaseProvisionModule` | findMany, findOne, create, update, delete |
| `dbPoolConfig` | findMany, findOne, create, update, delete |
| `dbPool` | findMany, findOne, create, update, delete |
| `dbPresetModule` | findMany, findOne, create, update, delete |
| `dbUsageModule` | findMany, findOne, create, update, delete |
| `defaultIdsModule` | findMany, findOne, create, update, delete |
| `denormalizedTableField` | findMany, findOne, create, update, delete |
| `devicesModule` | findMany, findOne, create, update, delete |
| `emailsModule` | findMany, findOne, create, update, delete |
| `entityTypeProvision` | findMany, findOne, create, update, delete |
| `eventsModule` | findMany, findOne, create, update, delete |
| `functionDeploymentModule` | findMany, findOne, create, update, delete |
| `functionInvocationModule` | findMany, findOne, create, update, delete |
| `functionModule` | findMany, findOne, create, update, delete |
| `graphExecutionModule` | findMany, findOne, create, update, delete |
| `graphModule` | findMany, findOne, create, update, delete |
| `hierarchyModule` | findMany, findOne, create, update, delete |
| `httpRouteModule` | findMany, findOne, create, update, delete |
| `i18NModule` | findMany, findOne, create, update, delete |
| `identityProvidersModule` | findMany, findOne, create, update, delete |
| `inferenceLogModule` | findMany, findOne, create, update, delete |
| `infraConfigModule` | findMany, findOne, create, update, delete |
| `infraSecretsModule` | findMany, findOne, create, update, delete |
| `integrationProvidersModule` | findMany, findOne, create, update, delete |
| `internalSecretsModule` | findMany, findOne, create, update, delete |
| `invitesModule` | findMany, findOne, create, update, delete |
| `limitsModule` | findMany, findOne, create, update, delete |
| `membershipTypesModule` | findMany, findOne, create, update, delete |
| `membershipsModule` | findMany, findOne, create, update, delete |
| `merkleStoreModule` | findMany, findOne, create, update, delete |
| `namespaceModule` | findMany, findOne, create, update, delete |
| `notificationsModule` | findMany, findOne, create, update, delete |
| `permissionsModule` | findMany, findOne, create, update, delete |
| `phoneNumbersModule` | findMany, findOne, create, update, delete |
| `plansModule` | findMany, findOne, create, update, delete |
| `principalAuthModule` | findMany, findOne, create, update, delete |
| `profilesModule` | findMany, findOne, create, update, delete |
| `rateLimitMetersModule` | findMany, findOne, create, update, delete |
| `rateLimitsModule` | findMany, findOne, create, update, delete |
| `realtimeModule` | findMany, findOne, create, update, delete |
| `relationProvision` | findMany, findOne, create, update, delete |
| `resourceModule` | findMany, findOne, create, update, delete |
| `rlsModule` | findMany, findOne, create, update, delete |
| `secureTableProvision` | findMany, findOne, create, update, delete |
| `sessionSecretsModule` | findMany, findOne, create, update, delete |
| `sessionsModule` | findMany, findOne, create, update, delete |
| `storageLogModule` | findMany, findOne, create, update, delete |
| `storageModule` | findMany, findOne, create, update, delete |
| `transferLogModule` | findMany, findOne, create, update, delete |
| `userAuthModule` | findMany, findOne, create, update, delete |
| `userCredentialsModule` | findMany, findOne, create, update, delete |
| `userSettingsModule` | findMany, findOne, create, update, delete |
| `userStateModule` | findMany, findOne, create, update, delete |
| `usersModule` | findMany, findOne, create, update, delete |
| `webauthnAuthModule` | findMany, findOne, create, update, delete |
| `webauthnCredentialsModule` | findMany, findOne, create, update, delete |
| `webhookModule` | findMany, findOne, create, update, delete |

## Table Operations

### `db.agentModule`

CRUD operations for AgentModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `agentTableId` | UUID | Yes |
| `agentTableName` | String | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `hasAgents` | Boolean | Yes |
| `hasPlans` | Boolean | Yes |
| `hasResources` | Boolean | Yes |
| `id` | UUID | No |
| `messageTableId` | UUID | Yes |
| `messageTableName` | String | Yes |
| `personaTableId` | UUID | Yes |
| `personaTableName` | String | Yes |
| `planTableId` | UUID | Yes |
| `planTableName` | String | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `promptsTableId` | UUID | Yes |
| `promptsTableName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `resourceTableId` | UUID | Yes |
| `resourceTableName` | String | Yes |
| `resources` | JSON | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `shared` | Boolean | Yes |
| `taskTableId` | UUID | Yes |
| `taskTableName` | String | Yes |
| `threadTableId` | UUID | Yes |
| `threadTableName` | String | Yes |

**Operations:**

```typescript
// List all agentModule records
const items = await db.agentModule.findMany({ select: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } }).execute();

// Get one by id
const item = await db.agentModule.findOne({ id: '<UUID>', select: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } }).execute();

// Create
const created = await db.agentModule.create({ data: { agentTableId: '<UUID>', agentTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAgents: '<Boolean>', hasPlans: '<Boolean>', hasResources: '<Boolean>', messageTableId: '<UUID>', messageTableName: '<String>', personaTableId: '<UUID>', personaTableName: '<String>', planTableId: '<UUID>', planTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', promptsTableId: '<UUID>', promptsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceTableId: '<UUID>', resourceTableName: '<String>', resources: '<JSON>', schemaId: '<UUID>', scope: '<String>', shared: '<Boolean>', taskTableId: '<UUID>', taskTableName: '<String>', threadTableId: '<UUID>', threadTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentModule.update({ where: { id: '<UUID>' }, data: { agentTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.billingModule`

CRUD operations for BillingModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `balancesTableId` | UUID | Yes |
| `balancesTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `id` | UUID | No |
| `ledgerTableId` | UUID | Yes |
| `ledgerTableName` | String | Yes |
| `meterCreditsTableId` | UUID | Yes |
| `meterCreditsTableName` | String | Yes |
| `meterDefaultsTableId` | UUID | Yes |
| `meterDefaultsTableName` | String | Yes |
| `meterSourcesTableId` | UUID | Yes |
| `meterSourcesTableName` | String | Yes |
| `metersTableId` | UUID | Yes |
| `metersTableName` | String | Yes |
| `planSubscriptionsTableId` | UUID | Yes |
| `planSubscriptionsTableName` | String | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `recordUsageFunction` | String | Yes |
| `rollupUsageSummaryFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `sweepExpiredSubscriptionsFunction` | String | Yes |

**Operations:**

```typescript
// List all billingModule records
const items = await db.billingModule.findMany({ select: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } }).execute();

// Get one by id
const item = await db.billingModule.findOne({ id: '<UUID>', select: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } }).execute();

// Create
const created = await db.billingModule.create({ data: { apiName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordUsageFunction: '<String>', rollupUsageSummaryFunction: '<String>', schemaId: '<UUID>', sweepExpiredSubscriptionsFunction: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.billingModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.billingModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.billingProviderModule`

CRUD operations for BillingProviderModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `billingCustomersTableId` | UUID | Yes |
| `billingCustomersTableName` | String | Yes |
| `billingPricesTableId` | UUID | Yes |
| `billingPricesTableName` | String | Yes |
| `billingProductsTableId` | UUID | Yes |
| `billingProductsTableName` | String | Yes |
| `billingSubscriptionsTableId` | UUID | Yes |
| `billingSubscriptionsTableName` | String | Yes |
| `billingWebhookEventsTableId` | UUID | Yes |
| `billingWebhookEventsTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `prefix` | String | Yes |
| `pricesTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `processBillingEventFunction` | String | Yes |
| `productsTableId` | UUID | Yes |
| `provider` | String | Yes |
| `schemaId` | UUID | Yes |
| `subscriptionsTableId` | UUID | Yes |

**Operations:**

```typescript
// List all billingProviderModule records
const items = await db.billingProviderModule.findMany({ select: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, schemaId: true, subscriptionsTableId: true } }).execute();

// Get one by id
const item = await db.billingProviderModule.findOne({ id: '<UUID>', select: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, schemaId: true, subscriptionsTableId: true } }).execute();

// Create
const created = await db.billingProviderModule.create({ data: { apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.billingProviderModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.billingProviderModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprint`

CRUD operations for Blueprint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `definition` | JSON | Yes |
| `definitionHash` | UUID | Yes |
| `description` | String | Yes |
| `displayName` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `ownerId` | UUID | Yes |
| `tableHashes` | JSON | Yes |
| `templateId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all blueprint records
const items = await db.blueprint.findMany({ select: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.blueprint.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } }).execute();

// Create
const created = await db.blueprint.create({ data: { databaseId: '<UUID>', definition: '<JSON>', definitionHash: '<UUID>', description: '<String>', displayName: '<String>', name: '<String>', ownerId: '<UUID>', tableHashes: '<JSON>', templateId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprintConstruction`

CRUD operations for BlueprintConstruction records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `blueprintId` | UUID | Yes |
| `constructedAt` | Datetime | Yes |
| `constructedDefinition` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `errorDetails` | String | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `status` | String | Yes |
| `tableMap` | JSON | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all blueprintConstruction records
const items = await db.blueprintConstruction.findMany({ select: { blueprintId: true, constructedAt: true, constructedDefinition: true, createdAt: true, databaseId: true, errorDetails: true, id: true, schemaId: true, status: true, tableMap: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.blueprintConstruction.findOne({ id: '<UUID>', select: { blueprintId: true, constructedAt: true, constructedDefinition: true, createdAt: true, databaseId: true, errorDetails: true, id: true, schemaId: true, status: true, tableMap: true, updatedAt: true } }).execute();

// Create
const created = await db.blueprintConstruction.create({ data: { blueprintId: '<UUID>', constructedAt: '<Datetime>', constructedDefinition: '<JSON>', databaseId: '<UUID>', errorDetails: '<String>', schemaId: '<UUID>', status: '<String>', tableMap: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprintConstruction.update({ where: { id: '<UUID>' }, data: { blueprintId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprintConstruction.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.blueprintTemplate`

CRUD operations for BlueprintTemplate records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `categories` | String | Yes |
| `complexity` | String | Yes |
| `copyCount` | Int | Yes |
| `createdAt` | Datetime | No |
| `definition` | JSON | Yes |
| `definitionHash` | UUID | Yes |
| `definitionSchemaVersion` | String | Yes |
| `description` | String | Yes |
| `displayName` | String | Yes |
| `forkCount` | Int | Yes |
| `forkedFromId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `ownerId` | UUID | Yes |
| `source` | String | Yes |
| `tableHashes` | JSON | Yes |
| `tags` | String | Yes |
| `updatedAt` | Datetime | No |
| `version` | String | Yes |
| `visibility` | String | Yes |

**Operations:**

```typescript
// List all blueprintTemplate records
const items = await db.blueprintTemplate.findMany({ select: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } }).execute();

// Get one by id
const item = await db.blueprintTemplate.findOne({ id: '<UUID>', select: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } }).execute();

// Create
const created = await db.blueprintTemplate.create({ data: { categories: '<String>', complexity: '<String>', copyCount: '<Int>', definition: '<JSON>', definitionHash: '<UUID>', definitionSchemaVersion: '<String>', description: '<String>', displayName: '<String>', forkCount: '<Int>', forkedFromId: '<UUID>', name: '<String>', ownerId: '<UUID>', source: '<String>', tableHashes: '<JSON>', tags: '<String>', version: '<String>', visibility: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.blueprintTemplate.update({ where: { id: '<UUID>' }, data: { categories: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.blueprintTemplate.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.computeLogModule`

CRUD operations for ComputeLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorFkTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `computeLogTableId` | UUID | Yes |
| `computeLogTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityFkTableId` | UUID | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `retention` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `usageSummaryTableId` | UUID | Yes |
| `usageSummaryTableName` | String | Yes |

**Operations:**

```typescript
// List all computeLogModule records
const items = await db.computeLogModule.findMany({ select: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Get one by id
const item = await db.computeLogModule.findOne({ id: '<UUID>', select: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Create
const created = await db.computeLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.computeLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.computeLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.configSecretsUserModule`

CRUD operations for ConfigSecretsUserModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all configSecretsUserModule records
const items = await db.configSecretsUserModule.findMany({ select: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.configSecretsUserModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.configSecretsUserModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.configSecretsUserModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.configSecretsUserModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.connectedAccountsModule`

CRUD operations for ConnectedAccountsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all connectedAccountsModule records
const items = await db.connectedAccountsModule.findMany({ select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.connectedAccountsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.connectedAccountsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccountsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccountsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.cryptoAddressesModule`

CRUD operations for CryptoAddressesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `cryptoNetwork` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all cryptoAddressesModule records
const items = await db.cryptoAddressesModule.findMany({ select: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.cryptoAddressesModule.findOne({ id: '<UUID>', select: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.cryptoAddressesModule.create({ data: { apiName: '<String>', cryptoNetwork: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddressesModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddressesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.cryptoAuthModule`

CRUD operations for CryptoAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `addressesTableId` | UUID | Yes |
| `cryptoNetwork` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `secretsTableId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `signInRecordFailure` | String | Yes |
| `signInRequestChallenge` | String | Yes |
| `signInWithChallenge` | String | Yes |
| `signUpWithKey` | String | Yes |
| `userField` | String | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all cryptoAuthModule records
const items = await db.cryptoAuthModule.findMany({ select: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.cryptoAuthModule.findOne({ id: '<UUID>', select: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } }).execute();

// Create
const created = await db.cryptoAuthModule.create({ data: { addressesTableId: '<UUID>', cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', secretsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', signInRecordFailure: '<String>', signInRequestChallenge: '<String>', signInWithChallenge: '<String>', signUpWithKey: '<String>', userField: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAuthModule.update({ where: { id: '<UUID>' }, data: { addressesTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.databaseProvisionModule`

CRUD operations for DatabaseProvisionModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `bootstrapError` | String | Yes |
| `bootstrapStatus` | String | Yes |
| `bootstrapUser` | Boolean | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `databaseName` | String | Yes |
| `domain` | String | Yes |
| `errorMessage` | String | Yes |
| `fulfilledAt` | Datetime | Yes |
| `id` | UUID | No |
| `modules` | JSON | Yes |
| `options` | JSON | Yes |
| `ownerId` | UUID | Yes |
| `sourceDatabaseId` | UUID | Yes |
| `status` | String | Yes |
| `subdomain` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all databaseProvisionModule records
const items = await db.databaseProvisionModule.findMany({ select: { bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.databaseProvisionModule.findOne({ id: '<UUID>', select: { bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } }).execute();

// Create
const created = await db.databaseProvisionModule.create({ data: { bootstrapError: '<String>', bootstrapStatus: '<String>', bootstrapUser: '<Boolean>', completedAt: '<Datetime>', databaseId: '<UUID>', databaseName: '<String>', domain: '<String>', errorMessage: '<String>', fulfilledAt: '<Datetime>', modules: '<JSON>', options: '<JSON>', ownerId: '<UUID>', sourceDatabaseId: '<UUID>', status: '<String>', subdomain: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.databaseProvisionModule.update({ where: { id: '<UUID>' }, data: { bootstrapError: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.databaseProvisionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbPoolConfig`

CRUD operations for DbPoolConfig records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `domain` | String | Yes |
| `enabled` | Boolean | Yes |
| `id` | UUID | No |
| `max` | Int | Yes |
| `min` | Int | Yes |
| `poolOwnerId` | UUID | Yes |
| `presetSlug` | String | Yes |
| `updatedAt` | Datetime | No |
| `warmTtl` | Interval | Yes |

**Operations:**

```typescript
// List all dbPoolConfig records
const items = await db.dbPoolConfig.findMany({ select: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } }).execute();

// Get one by id
const item = await db.dbPoolConfig.findOne({ id: '<UUID>', select: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } }).execute();

// Create
const created = await db.dbPoolConfig.create({ data: { domain: '<String>', enabled: '<Boolean>', max: '<Int>', min: '<Int>', poolOwnerId: '<UUID>', presetSlug: '<String>', warmTtl: '<Interval>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPoolConfig.update({ where: { id: '<UUID>' }, data: { domain: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPoolConfig.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbPool`

CRUD operations for DbPool records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `bootstrapError` | String | Yes |
| `bootstrapStatus` | String | Yes |
| `claimedAt` | Datetime | Yes |
| `claimedBy` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `errorMessage` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `presetCommitId` | UUID | Yes |
| `presetSlug` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all dbPool records
const items = await db.dbPool.findMany({ select: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.dbPool.findOne({ id: '<UUID>', select: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.dbPool.create({ data: { bootstrapError: '<String>', bootstrapStatus: '<String>', claimedAt: '<Datetime>', claimedBy: '<UUID>', databaseId: '<UUID>', errorMessage: '<String>', expiresAt: '<Datetime>', presetCommitId: '<UUID>', presetSlug: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPool.update({ where: { id: '<UUID>' }, data: { bootstrapError: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPool.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbPresetModule`

CRUD operations for DbPresetModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `dbPresetsTableId` | UUID | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `merkleStoreModuleId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `scope` | String | Yes |
| `storeName` | String | Yes |

**Operations:**

```typescript
// List all dbPresetModule records
const items = await db.dbPresetModule.findMany({ select: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } }).execute();

// Get one by id
const item = await db.dbPresetModule.findOne({ id: '<UUID>', select: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } }).execute();

// Create
const created = await db.dbPresetModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', dbPresetsTableId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPresetModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPresetModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbUsageModule`

CRUD operations for DbUsageModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `collectDbQueryStatsFunction` | String | Yes |
| `collectDbTableStatsFunction` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `queryStatsLogTableId` | UUID | Yes |
| `queryStatsLogTableName` | String | Yes |
| `queryStatsSummaryTableId` | UUID | Yes |
| `queryStatsSummaryTableName` | String | Yes |
| `retention` | String | Yes |
| `rollupDbQueryStatsUsageSummaryFunction` | String | Yes |
| `rollupDbTableStatsUsageSummaryFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableStatsLogTableId` | UUID | Yes |
| `tableStatsLogTableName` | String | Yes |
| `tableStatsSummaryTableId` | UUID | Yes |
| `tableStatsSummaryTableName` | String | Yes |

**Operations:**

```typescript
// List all dbUsageModule records
const items = await db.dbUsageModule.findMany({ select: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } }).execute();

// Get one by id
const item = await db.dbUsageModule.findOne({ id: '<UUID>', select: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } }).execute();

// Create
const created = await db.dbUsageModule.create({ data: { apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsSummaryTableId: '<UUID>', queryStatsSummaryTableName: '<String>', retention: '<String>', rollupDbQueryStatsUsageSummaryFunction: '<String>', rollupDbTableStatsUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsSummaryTableId: '<UUID>', tableStatsSummaryTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbUsageModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbUsageModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.defaultIdsModule`

CRUD operations for DefaultIdsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |

**Operations:**

```typescript
// List all defaultIdsModule records
const items = await db.defaultIdsModule.findMany({ select: { databaseId: true, id: true } }).execute();

// Get one by id
const item = await db.defaultIdsModule.findOne({ id: '<UUID>', select: { databaseId: true, id: true } }).execute();

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
| `databaseId` | UUID | Yes |
| `fieldId` | UUID | Yes |
| `funcName` | String | Yes |
| `funcOrder` | Int | Yes |
| `id` | UUID | No |
| `refFieldId` | UUID | Yes |
| `refIds` | UUID | Yes |
| `refTableId` | UUID | Yes |
| `setIds` | UUID | Yes |
| `tableId` | UUID | Yes |
| `updateDefaults` | Boolean | Yes |
| `useUpdates` | Boolean | Yes |

**Operations:**

```typescript
// List all denormalizedTableField records
const items = await db.denormalizedTableField.findMany({ select: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } }).execute();

// Get one by id
const item = await db.denormalizedTableField.findOne({ id: '<UUID>', select: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } }).execute();

// Create
const created = await db.denormalizedTableField.create({ data: { databaseId: '<UUID>', fieldId: '<UUID>', funcName: '<String>', funcOrder: '<Int>', refFieldId: '<UUID>', refIds: '<UUID>', refTableId: '<UUID>', setIds: '<UUID>', tableId: '<UUID>', updateDefaults: '<Boolean>', useUpdates: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.denormalizedTableField.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.denormalizedTableField.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.devicesModule`

CRUD operations for DevicesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `deviceSettingsTableId` | UUID | Yes |
| `deviceSettingsTableName` | String | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `userDevicesTableId` | UUID | Yes |
| `userDevicesTableName` | String | Yes |

**Operations:**

```typescript
// List all devicesModule records
const items = await db.devicesModule.findMany({ select: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } }).execute();

// Get one by id
const item = await db.devicesModule.findOne({ id: '<UUID>', select: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } }).execute();

// Create
const created = await db.devicesModule.create({ data: { databaseId: '<UUID>', deviceSettingsTableId: '<UUID>', deviceSettingsTableName: '<String>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', userDevicesTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.devicesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.devicesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.emailsModule`

CRUD operations for EmailsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all emailsModule records
const items = await db.emailsModule.findMany({ select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.emailsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.emailsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.emailsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.emailsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.entityTypeProvision`

CRUD operations for EntityTypeProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `agents` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `functions` | JSON | Yes |
| `graphs` | JSON | Yes |
| `hasInviteAchievements` | Boolean | Yes |
| `hasInvites` | Boolean | Yes |
| `hasLevels` | Boolean | Yes |
| `hasLimits` | Boolean | Yes |
| `hasProfiles` | Boolean | Yes |
| `id` | UUID | No |
| `isVisible` | Boolean | Yes |
| `name` | String | Yes |
| `namespaces` | JSON | Yes |
| `outAgentModuleId` | UUID | Yes |
| `outBucketsTableId` | UUID | Yes |
| `outDefinitionsTableId` | UUID | Yes |
| `outEntityTableId` | UUID | Yes |
| `outEntityTableName` | String | Yes |
| `outExecutionLogsTableId` | UUID | Yes |
| `outFilesTableId` | UUID | Yes |
| `outFunctionModuleId` | UUID | Yes |
| `outGraphModuleId` | UUID | Yes |
| `outGraphsTableId` | UUID | Yes |
| `outInstalledModules` | String | Yes |
| `outInvitesModuleId` | UUID | Yes |
| `outInvocationsTableId` | UUID | Yes |
| `outMembershipType` | Int | Yes |
| `outNamespaceEventsTableId` | UUID | Yes |
| `outNamespaceModuleId` | UUID | Yes |
| `outNamespacesTableId` | UUID | Yes |
| `outPathSharesTableId` | UUID | Yes |
| `outStorageModuleId` | UUID | Yes |
| `parentEntity` | String | Yes |
| `prefix` | String | Yes |
| `skipEntityPolicies` | Boolean | Yes |
| `storage` | JSON | Yes |
| `tableName` | String | Yes |
| `tableProvision` | JSON | Yes |

**Operations:**

```typescript
// List all entityTypeProvision records
const items = await db.entityTypeProvision.findMany({ select: { agents: true, databaseId: true, description: true, functions: true, graphs: true, hasInviteAchievements: true, hasInvites: true, hasLevels: true, hasLimits: true, hasProfiles: true, id: true, isVisible: true, name: true, namespaces: true, outAgentModuleId: true, outBucketsTableId: true, outDefinitionsTableId: true, outEntityTableId: true, outEntityTableName: true, outExecutionLogsTableId: true, outFilesTableId: true, outFunctionModuleId: true, outGraphModuleId: true, outGraphsTableId: true, outInstalledModules: true, outInvitesModuleId: true, outInvocationsTableId: true, outMembershipType: true, outNamespaceEventsTableId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outPathSharesTableId: true, outStorageModuleId: true, parentEntity: true, prefix: true, skipEntityPolicies: true, storage: true, tableName: true, tableProvision: true } }).execute();

// Get one by id
const item = await db.entityTypeProvision.findOne({ id: '<UUID>', select: { agents: true, databaseId: true, description: true, functions: true, graphs: true, hasInviteAchievements: true, hasInvites: true, hasLevels: true, hasLimits: true, hasProfiles: true, id: true, isVisible: true, name: true, namespaces: true, outAgentModuleId: true, outBucketsTableId: true, outDefinitionsTableId: true, outEntityTableId: true, outEntityTableName: true, outExecutionLogsTableId: true, outFilesTableId: true, outFunctionModuleId: true, outGraphModuleId: true, outGraphsTableId: true, outInstalledModules: true, outInvitesModuleId: true, outInvocationsTableId: true, outMembershipType: true, outNamespaceEventsTableId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outPathSharesTableId: true, outStorageModuleId: true, parentEntity: true, prefix: true, skipEntityPolicies: true, storage: true, tableName: true, tableProvision: true } }).execute();

// Create
const created = await db.entityTypeProvision.create({ data: { agents: '<JSON>', databaseId: '<UUID>', description: '<String>', functions: '<JSON>', graphs: '<JSON>', hasInviteAchievements: '<Boolean>', hasInvites: '<Boolean>', hasLevels: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', isVisible: '<Boolean>', name: '<String>', namespaces: '<JSON>', outAgentModuleId: '<UUID>', outBucketsTableId: '<UUID>', outDefinitionsTableId: '<UUID>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outExecutionLogsTableId: '<UUID>', outFilesTableId: '<UUID>', outFunctionModuleId: '<UUID>', outGraphModuleId: '<UUID>', outGraphsTableId: '<UUID>', outInstalledModules: '<String>', outInvitesModuleId: '<UUID>', outInvocationsTableId: '<UUID>', outMembershipType: '<Int>', outNamespaceEventsTableId: '<UUID>', outNamespaceModuleId: '<UUID>', outNamespacesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outStorageModuleId: '<UUID>', parentEntity: '<String>', prefix: '<String>', skipEntityPolicies: '<Boolean>', storage: '<JSON>', tableName: '<String>', tableProvision: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.entityTypeProvision.update({ where: { id: '<UUID>' }, data: { agents: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.entityTypeProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.eventsModule`

CRUD operations for EventsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `achievementRewardsTableId` | UUID | Yes |
| `achievementRewardsTableName` | String | Yes |
| `actorTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `eventAggregatesTableId` | UUID | Yes |
| `eventAggregatesTableName` | String | Yes |
| `eventTypesTableId` | UUID | Yes |
| `eventTypesTableName` | String | Yes |
| `eventsTableId` | UUID | Yes |
| `eventsTableName` | String | Yes |
| `grantAchievement` | String | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `levelAchieved` | String | Yes |
| `levelGrantsTableId` | UUID | Yes |
| `levelGrantsTableName` | String | Yes |
| `levelRequirementsTableId` | UUID | Yes |
| `levelRequirementsTableName` | String | Yes |
| `levelsTableId` | UUID | Yes |
| `levelsTableName` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `recordEvent` | String | Yes |
| `removeEvent` | String | Yes |
| `retention` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `stepsRequired` | String | Yes |
| `tgAchievementReward` | String | Yes |
| `tgCheckAchievements` | String | Yes |
| `tgEvent` | String | Yes |
| `tgEventBool` | String | Yes |
| `tgEventToggle` | String | Yes |
| `tgEventToggleBool` | String | Yes |
| `tgUpdateAggregates` | String | Yes |
| `upsertAggregate` | String | Yes |

**Operations:**

```typescript
// List all eventsModule records
const items = await db.eventsModule.findMany({ select: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } }).execute();

// Get one by id
const item = await db.eventsModule.findOne({ id: '<UUID>', select: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } }).execute();

// Create
const created = await db.eventsModule.create({ data: { achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgUpdateAggregates: '<String>', upsertAggregate: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.eventsModule.update({ where: { id: '<UUID>' }, data: { achievementRewardsTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.eventsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeploymentModule`

CRUD operations for FunctionDeploymentModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `deploymentEventsTableId` | UUID | Yes |
| `deploymentEventsTableName` | String | Yes |
| `deploymentsTableId` | UUID | Yes |
| `deploymentsTableName` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `functionModuleId` | UUID | Yes |
| `id` | UUID | No |
| `namespaceModuleId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all functionDeploymentModule records
const items = await db.functionDeploymentModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.functionDeploymentModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.functionDeploymentModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', deploymentEventsTableId: '<UUID>', deploymentEventsTableName: '<String>', deploymentsTableId: '<UUID>', deploymentsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeploymentModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeploymentModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionInvocationModule`

CRUD operations for FunctionInvocationModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `executionLogsTableId` | UUID | Yes |
| `executionLogsTableName` | String | Yes |
| `id` | UUID | No |
| `invocationsTableId` | UUID | Yes |
| `invocationsTableName` | String | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all functionInvocationModule records
const items = await db.functionInvocationModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.functionInvocationModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.functionInvocationModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionLogsTableId: '<UUID>', executionLogsTableName: '<String>', invocationsTableId: '<UUID>', invocationsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocationModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocationModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionModule`

CRUD operations for FunctionModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `bindingsTableId` | UUID | Yes |
| `bindingsTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `definitionsTableId` | UUID | Yes |
| `definitionsTableName` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `hasCron` | Boolean | Yes |
| `id` | UUID | No |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schedulesTableId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all functionModule records
const items = await db.functionModule.findMany({ select: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, hasCron: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schedulesTableId: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.functionModule.findOne({ id: '<UUID>', select: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, hasCron: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schedulesTableId: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.functionModule.create({ data: { apiName: '<String>', bindingsTableId: '<UUID>', bindingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasCron: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schedulesTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.graphExecutionModule`

CRUD operations for GraphExecutionModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `executionsTableId` | UUID | Yes |
| `executionsTableName` | String | Yes |
| `graphModuleId` | UUID | Yes |
| `id` | UUID | No |
| `nodeStatesTableId` | UUID | Yes |
| `nodeStatesTableName` | String | Yes |
| `outputsTableId` | UUID | Yes |
| `outputsTableName` | String | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all graphExecutionModule records
const items = await db.graphExecutionModule.findMany({ select: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.graphExecutionModule.findOne({ id: '<UUID>', select: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.graphExecutionModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionsTableId: '<UUID>', executionsTableName: '<String>', graphModuleId: '<UUID>', nodeStatesTableId: '<UUID>', nodeStatesTableName: '<String>', outputsTableId: '<UUID>', outputsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.graphExecutionModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.graphExecutionModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.graphModule`

CRUD operations for GraphModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `graphsTableId` | UUID | Yes |
| `id` | UUID | No |
| `merkleStoreModuleId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaId` | UUID | Yes |
| `publicSchemaName` | String | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all graphModule records
const items = await db.graphModule.findMany({ select: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } }).execute();

// Get one by id
const item = await db.graphModule.findOne({ id: '<UUID>', select: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } }).execute();

// Create
const created = await db.graphModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', graphsTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.graphModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.graphModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.hierarchyModule`

CRUD operations for HierarchyModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `chartEdgeGrantsTableId` | UUID | Yes |
| `chartEdgeGrantsTableName` | String | Yes |
| `chartEdgesTableId` | UUID | Yes |
| `chartEdgesTableName` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `getManagersFunction` | String | Yes |
| `getSubordinatesFunction` | String | Yes |
| `hierarchySprtTableId` | UUID | Yes |
| `hierarchySprtTableName` | String | Yes |
| `id` | UUID | No |
| `isManagerOfFunction` | String | Yes |
| `prefix` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `rebuildHierarchyFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `sprtTableName` | String | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all hierarchyModule records
const items = await db.hierarchyModule.findMany({ select: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.hierarchyModule.findOne({ id: '<UUID>', select: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } }).execute();

// Create
const created = await db.hierarchyModule.create({ data: { chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', getManagersFunction: '<String>', getSubordinatesFunction: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', isManagerOfFunction: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', rebuildHierarchyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableName: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.hierarchyModule.update({ where: { id: '<UUID>' }, data: { chartEdgeGrantsTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.hierarchyModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.httpRouteModule`

CRUD operations for HttpRouteModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `functionModuleId` | UUID | Yes |
| `httpRoutesTableId` | UUID | Yes |
| `httpRoutesTableName` | String | Yes |
| `id` | UUID | No |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `resolverFunctionName` | String | Yes |
| `resourceModuleId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `storageModuleId` | UUID | Yes |

**Operations:**

```typescript
// List all httpRouteModule records
const items = await db.httpRouteModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } }).execute();

// Get one by id
const item = await db.httpRouteModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } }).execute();

// Create
const created = await db.httpRouteModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', httpRoutesTableId: '<UUID>', httpRoutesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', resourceModuleId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storageModuleId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.httpRouteModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.httpRouteModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.i18NModule`

CRUD operations for I18NModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `settingsTableId` | UUID | Yes |

**Operations:**

```typescript
// List all i18NModule records
const items = await db.i18NModule.findMany({ select: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } }).execute();

// Get one by id
const item = await db.i18NModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } }).execute();

// Create
const created = await db.i18NModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', settingsTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.i18NModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.i18NModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.identityProvidersModule`

CRUD operations for IdentityProvidersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all identityProvidersModule records
const items = await db.identityProvidersModule.findMany({ select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.identityProvidersModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.identityProvidersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.identityProvidersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.identityProvidersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.inferenceLogModule`

CRUD operations for InferenceLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorFkTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityFkTableId` | UUID | Yes |
| `id` | UUID | No |
| `inferenceLogTableId` | UUID | Yes |
| `inferenceLogTableName` | String | Yes |
| `interval` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `retention` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `usageSummaryTableId` | UUID | Yes |
| `usageSummaryTableName` | String | Yes |

**Operations:**

```typescript
// List all inferenceLogModule records
const items = await db.inferenceLogModule.findMany({ select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Get one by id
const item = await db.inferenceLogModule.findOne({ id: '<UUID>', select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Create
const created = await db.inferenceLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.inferenceLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.inferenceLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraConfigModule`

CRUD operations for InfraConfigModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `configTableId` | UUID | Yes |
| `configTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all infraConfigModule records
const items = await db.infraConfigModule.findMany({ select: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.infraConfigModule.findOne({ id: '<UUID>', select: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.infraConfigModule.create({ data: { apiName: '<String>', configTableId: '<UUID>', configTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraConfigModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraConfigModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraSecretsModule`

CRUD operations for InfraSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `secretsTableId` | UUID | Yes |
| `secretsTableName` | String | Yes |

**Operations:**

```typescript
// List all infraSecretsModule records
const items = await db.infraSecretsModule.findMany({ select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } }).execute();

// Get one by id
const item = await db.infraSecretsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } }).execute();

// Create
const created = await db.infraSecretsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraSecretsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.integrationProvidersModule`

CRUD operations for IntegrationProvidersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all integrationProvidersModule records
const items = await db.integrationProvidersModule.findMany({ select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.integrationProvidersModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.integrationProvidersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.integrationProvidersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.integrationProvidersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.internalSecretsModule`

CRUD operations for InternalSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `internalSecretsTableId` | UUID | Yes |
| `internalSecretsTableName` | String | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all internalSecretsModule records
const items = await db.internalSecretsModule.findMany({ select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.internalSecretsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.internalSecretsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.internalSecretsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.internalSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.invitesModule`

CRUD operations for InvitesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `claimedInvitesTableId` | UUID | Yes |
| `claimedInvitesTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `emailsTableId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `invitesTableId` | UUID | Yes |
| `invitesTableName` | String | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `submitInviteCodeFunction` | String | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all invitesModule records
const items = await db.invitesModule.findMany({ select: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.invitesModule.findOne({ id: '<UUID>', select: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } }).execute();

// Create
const created = await db.invitesModule.create({ data: { apiName: '<String>', claimedInvitesTableId: '<UUID>', claimedInvitesTableName: '<String>', databaseId: '<UUID>', emailsTableId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', invitesTableId: '<UUID>', invitesTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', submitInviteCodeFunction: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.invitesModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invitesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.limitsModule`

CRUD operations for LimitsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorTableId` | UUID | Yes |
| `aggregateTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `capCheckTrigger` | String | Yes |
| `creditCodeItemsTableId` | UUID | Yes |
| `creditCodesTableId` | UUID | Yes |
| `creditRedemptionsTableId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `defaultTableId` | UUID | Yes |
| `defaultTableName` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `eventsTableId` | UUID | Yes |
| `id` | UUID | No |
| `limitAggregateCheckSoftFunction` | String | Yes |
| `limitCapsDefaultsTableId` | UUID | Yes |
| `limitCapsTableId` | UUID | Yes |
| `limitCheckFunction` | String | Yes |
| `limitCheckSoftFunction` | String | Yes |
| `limitCreditsTableId` | UUID | Yes |
| `limitDecrementFunction` | String | Yes |
| `limitDecrementTrigger` | String | Yes |
| `limitIncrementFunction` | String | Yes |
| `limitIncrementTrigger` | String | Yes |
| `limitUpdateTrigger` | String | Yes |
| `limitWarningStateTableId` | UUID | Yes |
| `limitWarningsTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `resolveCapFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all limitsModule records
const items = await db.limitsModule.findMany({ select: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.limitsModule.findOne({ id: '<UUID>', select: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.limitsModule.create({ data: { actorTableId: '<UUID>', aggregateTableId: '<UUID>', apiName: '<String>', capCheckTrigger: '<String>', creditCodeItemsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventsTableId: '<UUID>', limitAggregateCheckSoftFunction: '<String>', limitCapsDefaultsTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCheckFunction: '<String>', limitCheckSoftFunction: '<String>', limitCreditsTableId: '<UUID>', limitDecrementFunction: '<String>', limitDecrementTrigger: '<String>', limitIncrementFunction: '<String>', limitIncrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitWarningStateTableId: '<UUID>', limitWarningsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', resolveCapFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.limitsModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.limitsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipTypesModule`

CRUD operations for MembershipTypesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all membershipTypesModule records
const items = await db.membershipTypesModule.findMany({ select: { databaseId: true, id: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.membershipTypesModule.findOne({ id: '<UUID>', select: { databaseId: true, id: true, schemaId: true, tableId: true, tableName: true } }).execute();

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
| `actorMaskCheck` | String | Yes |
| `actorPermCheck` | String | Yes |
| `actorTableId` | UUID | Yes |
| `adminGrantsTableId` | UUID | Yes |
| `adminGrantsTableName` | String | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultLimitsTableId` | UUID | Yes |
| `defaultPermissionsTableId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityIdsByMask` | String | Yes |
| `entityIdsByPerm` | String | Yes |
| `entityIdsFunction` | String | Yes |
| `entityTableId` | UUID | Yes |
| `entityTableOwnerId` | UUID | Yes |
| `getOrgFn` | String | Yes |
| `grantsTableId` | UUID | Yes |
| `grantsTableName` | String | Yes |
| `id` | UUID | No |
| `limitsTableId` | UUID | Yes |
| `memberProfilesTableId` | UUID | Yes |
| `membersTableId` | UUID | Yes |
| `membersTableName` | String | Yes |
| `membershipDefaultsTableId` | UUID | Yes |
| `membershipDefaultsTableName` | String | Yes |
| `membershipSettingsTableId` | UUID | Yes |
| `membershipSettingsTableName` | String | Yes |
| `membershipsTableId` | UUID | Yes |
| `membershipsTableName` | String | Yes |
| `ownerGrantsTableId` | UUID | Yes |
| `ownerGrantsTableName` | String | Yes |
| `permissionDefaultGrantsTableId` | UUID | Yes |
| `permissionDefaultPermissionsTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `sprtTableId` | UUID | Yes |

**Operations:**

```typescript
// List all membershipsModule records
const items = await db.membershipsModule.findMany({ select: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, databaseId: true, defaultLimitsTableId: true, defaultPermissionsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, permissionDefaultGrantsTableId: true, permissionDefaultPermissionsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } }).execute();

// Get one by id
const item = await db.membershipsModule.findOne({ id: '<UUID>', select: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, databaseId: true, defaultLimitsTableId: true, defaultPermissionsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, permissionDefaultGrantsTableId: true, permissionDefaultPermissionsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } }).execute();

// Create
const created = await db.membershipsModule.create({ data: { actorMaskCheck: '<String>', actorPermCheck: '<String>', actorTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultLimitsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', entityField: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', limitsTableId: '<UUID>', memberProfilesTableId: '<UUID>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', permissionDefaultGrantsTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipsModule.update({ where: { id: '<UUID>' }, data: { actorMaskCheck: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.merkleStoreModule`

CRUD operations for MerkleStoreModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `commitTableId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `functionPrefix` | String | Yes |
| `id` | UUID | No |
| `objectTableId` | UUID | Yes |
| `permissionKey` | String | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `refTableId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `storeTableId` | UUID | Yes |

**Operations:**

```typescript
// List all merkleStoreModule records
const items = await db.merkleStoreModule.findMany({ select: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } }).execute();

// Get one by id
const item = await db.merkleStoreModule.findOne({ id: '<UUID>', select: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } }).execute();

// Create
const created = await db.merkleStoreModule.create({ data: { apiName: '<String>', commitTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', functionPrefix: '<String>', objectTableId: '<UUID>', permissionKey: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', refTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storeTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.merkleStoreModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.merkleStoreModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceModule`

CRUD operations for NamespaceModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `namespaceEventsTableId` | UUID | Yes |
| `namespaceEventsTableName` | String | Yes |
| `namespacesTableId` | UUID | Yes |
| `namespacesTableName` | String | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all namespaceModule records
const items = await db.namespaceModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.namespaceModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.namespaceModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespaceEventsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.notificationsModule`

CRUD operations for NotificationsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `channelsTableId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `deliveryLogTableId` | UUID | Yes |
| `entityField` | String | Yes |
| `hasChannels` | Boolean | Yes |
| `hasDigestMetadata` | Boolean | Yes |
| `hasPreferences` | Boolean | Yes |
| `hasSettingsExtension` | Boolean | Yes |
| `hasSubscriptions` | Boolean | Yes |
| `id` | UUID | No |
| `notificationsTableId` | UUID | Yes |
| `organizationSettingsTableId` | UUID | Yes |
| `ownerTableId` | UUID | Yes |
| `preferencesTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `readStateTableId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `suppressionsTableId` | UUID | Yes |
| `userSettingsTableId` | UUID | Yes |

**Operations:**

```typescript
// List all notificationsModule records
const items = await db.notificationsModule.findMany({ select: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } }).execute();

// Get one by id
const item = await db.notificationsModule.findOne({ id: '<UUID>', select: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } }).execute();

// Create
const created = await db.notificationsModule.create({ data: { apiName: '<String>', channelsTableId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', deliveryLogTableId: '<UUID>', entityField: '<String>', hasChannels: '<Boolean>', hasDigestMetadata: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasSubscriptions: '<Boolean>', notificationsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', ownerTableId: '<UUID>', preferencesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', readStateTableId: '<UUID>', schemaId: '<UUID>', suppressionsTableId: '<UUID>', userSettingsTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.notificationsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.notificationsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.permissionsModule`

CRUD operations for PermissionsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `bitlen` | Int | Yes |
| `databaseId` | UUID | Yes |
| `defaultTableId` | UUID | Yes |
| `defaultTableName` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `getByMask` | String | Yes |
| `getMask` | String | Yes |
| `getMaskByName` | String | Yes |
| `getPaddedMask` | String | Yes |
| `id` | UUID | No |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all permissionsModule records
const items = await db.permissionsModule.findMany({ select: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.permissionsModule.findOne({ id: '<UUID>', select: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.permissionsModule.create({ data: { actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.permissionsModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.permissionsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.phoneNumbersModule`

CRUD operations for PhoneNumbersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all phoneNumbersModule records
const items = await db.phoneNumbersModule.findMany({ select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.phoneNumbersModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.phoneNumbersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumbersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumbersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.plansModule`

CRUD operations for PlansModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `applyBillingPlanFunction` | String | Yes |
| `applyPlanAggregateFunction` | String | Yes |
| `applyPlanCapsFunction` | String | Yes |
| `applyPlanFunction` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `planCapsTableId` | UUID | Yes |
| `planLimitsTableId` | UUID | Yes |
| `planLimitsTableName` | String | Yes |
| `planMeterLimitsTableId` | UUID | Yes |
| `planOverridesTableId` | UUID | Yes |
| `planPricingTableId` | UUID | Yes |
| `plansTableId` | UUID | Yes |
| `plansTableName` | String | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all plansModule records
const items = await db.plansModule.findMany({ select: { apiName: true, applyBillingPlanFunction: true, applyPlanAggregateFunction: true, applyPlanCapsFunction: true, applyPlanFunction: true, databaseId: true, id: true, planCapsTableId: true, planLimitsTableId: true, planLimitsTableName: true, planMeterLimitsTableId: true, planOverridesTableId: true, planPricingTableId: true, plansTableId: true, plansTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true } }).execute();

// Get one by id
const item = await db.plansModule.findOne({ id: '<UUID>', select: { apiName: true, applyBillingPlanFunction: true, applyPlanAggregateFunction: true, applyPlanCapsFunction: true, applyPlanFunction: true, databaseId: true, id: true, planCapsTableId: true, planLimitsTableId: true, planLimitsTableName: true, planMeterLimitsTableId: true, planOverridesTableId: true, planPricingTableId: true, plansTableId: true, plansTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true } }).execute();

// Create
const created = await db.plansModule.create({ data: { apiName: '<String>', applyBillingPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyPlanCapsFunction: '<String>', applyPlanFunction: '<String>', databaseId: '<UUID>', planCapsTableId: '<UUID>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planMeterLimitsTableId: '<UUID>', planOverridesTableId: '<UUID>', planPricingTableId: '<UUID>', plansTableId: '<UUID>', plansTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.plansModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.plansModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.principalAuthModule`

CRUD operations for PrincipalAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `auditsTableId` | UUID | Yes |
| `createOrgApiKeyFunction` | String | Yes |
| `createOrgPrincipalFunction` | String | Yes |
| `createPrincipalFunction` | String | Yes |
| `databaseId` | UUID | Yes |
| `deleteOrgPrincipalFunction` | String | Yes |
| `deletePrincipalFunction` | String | Yes |
| `id` | UUID | No |
| `principalEntitiesTableId` | UUID | Yes |
| `principalScopeOverridesTableId` | UUID | Yes |
| `principalsTableId` | UUID | Yes |
| `principalsTableName` | String | Yes |
| `revokeOrgApiKeyFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all principalAuthModule records
const items = await db.principalAuthModule.findMany({ select: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.principalAuthModule.findOne({ id: '<UUID>', select: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Create
const created = await db.principalAuthModule.create({ data: { apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.principalAuthModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.principalAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.profilesModule`

CRUD operations for ProfilesModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `membershipsTableId` | UUID | Yes |
| `permissionsTableId` | UUID | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `profileDefinitionGrantsTableId` | UUID | Yes |
| `profileDefinitionGrantsTableName` | String | Yes |
| `profileGrantsTableId` | UUID | Yes |
| `profileGrantsTableName` | String | Yes |
| `profilePermissionsTableId` | UUID | Yes |
| `profilePermissionsTableName` | String | Yes |
| `profileTemplatesTableId` | UUID | Yes |
| `profileTemplatesTableName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all profilesModule records
const items = await db.profilesModule.findMany({ select: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.profilesModule.findOne({ id: '<UUID>', select: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.profilesModule.create({ data: { actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.profilesModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.profilesModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.rateLimitMetersModule`

CRUD operations for RateLimitMetersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `checkRateLimitFunction` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `id` | UUID | No |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `rateLimitOverridesTableId` | UUID | Yes |
| `rateLimitOverridesTableName` | String | Yes |
| `rateLimitStateTableId` | UUID | Yes |
| `rateLimitStateTableName` | String | Yes |
| `rateWindowLimitsTableId` | UUID | Yes |
| `rateWindowLimitsTableName` | String | Yes |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all rateLimitMetersModule records
const items = await db.rateLimitMetersModule.findMany({ select: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } }).execute();

// Get one by id
const item = await db.rateLimitMetersModule.findOne({ id: '<UUID>', select: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } }).execute();

// Create
const created = await db.rateLimitMetersModule.create({ data: { apiName: '<String>', checkRateLimitFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.rateLimitMetersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rateLimitMetersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.rateLimitsModule`

CRUD operations for RateLimitsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ipRateLimitsTableId` | UUID | Yes |
| `ipRateLimitsTableName` | String | Yes |
| `rateLimitSettingsTableId` | UUID | Yes |
| `rateLimitSettingsTableName` | String | Yes |
| `rateLimitsTableId` | UUID | Yes |
| `rateLimitsTableName` | String | Yes |
| `schemaId` | UUID | Yes |

**Operations:**

```typescript
// List all rateLimitsModule records
const items = await db.rateLimitsModule.findMany({ select: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } }).execute();

// Get one by id
const item = await db.rateLimitsModule.findOne({ id: '<UUID>', select: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } }).execute();

// Create
const created = await db.rateLimitsModule.create({ data: { databaseId: '<UUID>', ipRateLimitsTableId: '<UUID>', ipRateLimitsTableName: '<String>', rateLimitSettingsTableId: '<UUID>', rateLimitSettingsTableName: '<String>', rateLimitsTableId: '<UUID>', rateLimitsTableName: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.rateLimitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rateLimitsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.realtimeModule`

CRUD operations for RealtimeModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `changeLogTableId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `listenerNodeTableId` | UUID | Yes |
| `notifyChannel` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `retentionHours` | Int | Yes |
| `schemaId` | UUID | Yes |
| `sourceRegistryTableId` | UUID | Yes |
| `subscriptionsSchemaId` | UUID | Yes |

**Operations:**

```typescript
// List all realtimeModule records
const items = await db.realtimeModule.findMany({ select: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } }).execute();

// Get one by id
const item = await db.realtimeModule.findOne({ id: '<UUID>', select: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } }).execute();

// Create
const created = await db.realtimeModule.create({ data: { apiName: '<String>', changeLogTableId: '<UUID>', databaseId: '<UUID>', interval: '<String>', listenerNodeTableId: '<UUID>', notifyChannel: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', retentionHours: '<Int>', schemaId: '<UUID>', sourceRegistryTableId: '<UUID>', subscriptionsSchemaId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.realtimeModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.realtimeModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.relationProvision`

CRUD operations for RelationProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiRequired` | Boolean | Yes |
| `createIndex` | Boolean | Yes |
| `databaseId` | UUID | Yes |
| `deleteAction` | String | Yes |
| `exposeInApi` | Boolean | Yes |
| `fieldName` | String | Yes |
| `grants` | JSON | Yes |
| `id` | UUID | No |
| `isRequired` | Boolean | Yes |
| `junctionSchemaId` | UUID | Yes |
| `junctionTableId` | UUID | Yes |
| `junctionTableName` | String | Yes |
| `nodes` | JSON | Yes |
| `outFieldId` | UUID | Yes |
| `outJunctionTableId` | UUID | Yes |
| `outSourceFieldId` | UUID | Yes |
| `outTargetFieldId` | UUID | Yes |
| `policies` | JSON | Yes |
| `relationType` | String | Yes |
| `sourceFieldName` | String | Yes |
| `sourceTableId` | UUID | Yes |
| `targetFieldName` | String | Yes |
| `targetTableId` | UUID | Yes |
| `useCompositeKey` | Boolean | Yes |

**Operations:**

```typescript
// List all relationProvision records
const items = await db.relationProvision.findMany({ select: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } }).execute();

// Get one by id
const item = await db.relationProvision.findOne({ id: '<UUID>', select: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } }).execute();

// Create
const created = await db.relationProvision.create({ data: { apiRequired: '<Boolean>', createIndex: '<Boolean>', databaseId: '<UUID>', deleteAction: '<String>', exposeInApi: '<Boolean>', fieldName: '<String>', grants: '<JSON>', isRequired: '<Boolean>', junctionSchemaId: '<UUID>', junctionTableId: '<UUID>', junctionTableName: '<String>', nodes: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>', policies: '<JSON>', relationType: '<String>', sourceFieldName: '<String>', sourceTableId: '<UUID>', targetFieldName: '<String>', targetTableId: '<UUID>', useCompositeKey: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.relationProvision.update({ where: { id: '<UUID>' }, data: { apiRequired: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.relationProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceModule`

CRUD operations for ResourceModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `id` | UUID | No |
| `installationStoreName` | String | Yes |
| `merkleStoreModuleId` | UUID | Yes |
| `namespaceModuleId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `requirementsStateViewName` | String | Yes |
| `resolvedRequirementsViewName` | String | Yes |
| `resourceBillingRollupFunction` | String | Yes |
| `resourceDefinitionsTableId` | UUID | Yes |
| `resourceDefinitionsTableName` | String | Yes |
| `resourceEventsTableId` | UUID | Yes |
| `resourceEventsTableName` | String | Yes |
| `resourceInstallationsTableId` | UUID | Yes |
| `resourceInstallationsTableName` | String | Yes |
| `resourceStatusChecksTableId` | UUID | Yes |
| `resourceStatusChecksTableName` | String | Yes |
| `resourceUsageLogTableId` | UUID | Yes |
| `resourceUsageLogTableName` | String | Yes |
| `resourceUsageSummaryTableId` | UUID | Yes |
| `resourceUsageSummaryTableName` | String | Yes |
| `resourcesTableId` | UUID | Yes |
| `resourcesTableName` | String | Yes |
| `rollupResourceUsageSummaryFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all resourceModule records
const items = await db.resourceModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } }).execute();

// Get one by id
const item = await db.resourceModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } }).execute();

// Create
const created = await db.resourceModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', installationStoreName: '<String>', merkleStoreModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', requirementsStateViewName: '<String>', resolvedRequirementsViewName: '<String>', resourceBillingRollupFunction: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceEventsTableId: '<UUID>', resourceEventsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourceStatusChecksTableId: '<UUID>', resourceStatusChecksTableName: '<String>', resourceUsageLogTableId: '<UUID>', resourceUsageLogTableName: '<String>', resourceUsageSummaryTableId: '<UUID>', resourceUsageSummaryTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', rollupResourceUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.rlsModule`

CRUD operations for RlsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `authenticate` | String | Yes |
| `authenticateStrict` | String | Yes |
| `currentRole` | String | Yes |
| `currentRoleId` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all rlsModule records
const items = await db.rlsModule.findMany({ select: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.rlsModule.findOne({ id: '<UUID>', select: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Create
const created = await db.rlsModule.create({ data: { apiName: '<String>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.rlsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.rlsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secureTableProvision`

CRUD operations for SecureTableProvision records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `fields` | JSON | Yes |
| `grants` | JSON | Yes |
| `id` | UUID | No |
| `nodes` | JSON | Yes |
| `outFields` | UUID | Yes |
| `policies` | JSON | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `useRls` | Boolean | Yes |

**Operations:**

```typescript
// List all secureTableProvision records
const items = await db.secureTableProvision.findMany({ select: { databaseId: true, fields: true, grants: true, id: true, nodes: true, outFields: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } }).execute();

// Get one by id
const item = await db.secureTableProvision.findOne({ id: '<UUID>', select: { databaseId: true, fields: true, grants: true, id: true, nodes: true, outFields: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } }).execute();

// Create
const created = await db.secureTableProvision.create({ data: { databaseId: '<UUID>', fields: '<JSON>', grants: '<JSON>', nodes: '<JSON>', outFields: '<UUID>', policies: '<JSON>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', useRls: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.secureTableProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secureTableProvision.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sessionSecretsModule`

CRUD operations for SessionSecretsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all sessionSecretsModule records
const items = await db.sessionSecretsModule.findMany({ select: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.sessionSecretsModule.findOne({ id: '<UUID>', select: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.sessionSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.sessionSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sessionSecretsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.sessionsModule`

CRUD operations for SessionsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authSettingsTableId` | UUID | Yes |
| `authSettingsTableName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionCredentialsTableName` | String | Yes |
| `sessionsDefaultExpiration` | Interval | Yes |
| `sessionsTableId` | UUID | Yes |
| `sessionsTableName` | String | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all sessionsModule records
const items = await db.sessionsModule.findMany({ select: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.sessionsModule.findOne({ id: '<UUID>', select: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } }).execute();

// Create
const created = await db.sessionsModule.create({ data: { authSettingsTableId: '<UUID>', authSettingsTableName: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionCredentialsTableName: '<String>', sessionsDefaultExpiration: '<Interval>', sessionsTableId: '<UUID>', sessionsTableName: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.sessionsModule.update({ where: { id: '<UUID>' }, data: { authSettingsTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.sessionsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.storageLogModule`

CRUD operations for StorageLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorFkTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityFkTableId` | UUID | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `retention` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `storageLogTableId` | UUID | Yes |
| `storageLogTableName` | String | Yes |
| `usageSummaryTableId` | UUID | Yes |
| `usageSummaryTableName` | String | Yes |

**Operations:**

```typescript
// List all storageLogModule records
const items = await db.storageLogModule.findMany({ select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Get one by id
const item = await db.storageLogModule.findOne({ id: '<UUID>', select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Create
const created = await db.storageLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.storageLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.storageLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.storageModule`

CRUD operations for StorageModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `allowedOrigins` | String | Yes |
| `apiName` | String | Yes |
| `bucketsTableId` | UUID | Yes |
| `bucketsTableName` | String | Yes |
| `cacheTtlSeconds` | Int | Yes |
| `confirmUploadDelay` | Interval | Yes |
| `databaseId` | UUID | Yes |
| `defaultMaxFileSize` | BigInt | Yes |
| `defaultPermissions` | String | Yes |
| `downloadUrlExpirySeconds` | Int | Yes |
| `endpoint` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `fileEventsTableId` | UUID | Yes |
| `filesTableId` | UUID | Yes |
| `filesTableName` | String | Yes |
| `hasAuditLog` | Boolean | Yes |
| `hasConfirmUpload` | Boolean | Yes |
| `hasContentHash` | Boolean | Yes |
| `hasCustomKeys` | Boolean | Yes |
| `hasPathShares` | Boolean | Yes |
| `hasVersioning` | Boolean | Yes |
| `id` | UUID | No |
| `maxBulkFiles` | Int | Yes |
| `maxBulkTotalSize` | BigInt | Yes |
| `maxFilenameLength` | Int | Yes |
| `pathSharesTableId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provider` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `publicUrlPrefix` | String | Yes |
| `restrictReads` | Boolean | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `uploadUrlExpirySeconds` | Int | Yes |

**Operations:**

```typescript
// List all storageModule records
const items = await db.storageModule.findMany({ select: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } }).execute();

// Get one by id
const item = await db.storageModule.findOne({ id: '<UUID>', select: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } }).execute();

// Create
const created = await db.storageModule.create({ data: { allowedOrigins: '<String>', apiName: '<String>', bucketsTableId: '<UUID>', bucketsTableName: '<String>', cacheTtlSeconds: '<Int>', confirmUploadDelay: '<Interval>', databaseId: '<UUID>', defaultMaxFileSize: '<BigInt>', defaultPermissions: '<String>', downloadUrlExpirySeconds: '<Int>', endpoint: '<String>', entityField: '<String>', entityTableId: '<UUID>', fileEventsTableId: '<UUID>', filesTableId: '<UUID>', filesTableName: '<String>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasPathShares: '<Boolean>', hasVersioning: '<Boolean>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', maxFilenameLength: '<Int>', pathSharesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provider: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', publicUrlPrefix: '<String>', restrictReads: '<Boolean>', schemaId: '<UUID>', scope: '<String>', uploadUrlExpirySeconds: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.storageModule.update({ where: { id: '<UUID>' }, data: { allowedOrigins: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.storageModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.transferLogModule`

CRUD operations for TransferLogModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorFkTableId` | UUID | Yes |
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `entityFkTableId` | UUID | Yes |
| `id` | UUID | No |
| `interval` | String | Yes |
| `prefix` | String | Yes |
| `premake` | Int | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `publicSchemaName` | String | Yes |
| `retention` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `transferLogTableId` | UUID | Yes |
| `transferLogTableName` | String | Yes |
| `usageSummaryTableId` | UUID | Yes |
| `usageSummaryTableName` | String | Yes |

**Operations:**

```typescript
// List all transferLogModule records
const items = await db.transferLogModule.findMany({ select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Get one by id
const item = await db.transferLogModule.findOne({ id: '<UUID>', select: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } }).execute();

// Create
const created = await db.transferLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.transferLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.transferLogModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userAuthModule`

CRUD operations for UserAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `auditsTableId` | UUID | Yes |
| `auditsTableName` | String | Yes |
| `checkPasswordFunction` | String | Yes |
| `databaseId` | UUID | Yes |
| `deleteAccountFunction` | String | Yes |
| `emailsTableId` | UUID | Yes |
| `encryptedTableId` | UUID | Yes |
| `extendTokenExpires` | String | Yes |
| `forgotPasswordFunction` | String | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `requestCrossOriginTokenFunction` | String | Yes |
| `resetPasswordFunction` | String | Yes |
| `schemaId` | UUID | Yes |
| `secretsTableId` | UUID | Yes |
| `sendAccountDeletionEmailFunction` | String | Yes |
| `sendVerificationEmailFunction` | String | Yes |
| `sessionCredentialsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `setPasswordFunction` | String | Yes |
| `signInCrossOriginFunction` | String | Yes |
| `signInFunction` | String | Yes |
| `signOutFunction` | String | Yes |
| `signUpFunction` | String | Yes |
| `usersTableId` | UUID | Yes |
| `verifyEmailFunction` | String | Yes |
| `verifyPasswordFunction` | String | Yes |

**Operations:**

```typescript
// List all userAuthModule records
const items = await db.userAuthModule.findMany({ select: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } }).execute();

// Get one by id
const item = await db.userAuthModule.findOne({ id: '<UUID>', select: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } }).execute();

// Create
const created = await db.userAuthModule.create({ data: { apiName: '<String>', auditsTableId: '<UUID>', auditsTableName: '<String>', checkPasswordFunction: '<String>', databaseId: '<UUID>', deleteAccountFunction: '<String>', emailsTableId: '<UUID>', encryptedTableId: '<UUID>', extendTokenExpires: '<String>', forgotPasswordFunction: '<String>', privateApiName: '<String>', requestCrossOriginTokenFunction: '<String>', resetPasswordFunction: '<String>', schemaId: '<UUID>', secretsTableId: '<UUID>', sendAccountDeletionEmailFunction: '<String>', sendVerificationEmailFunction: '<String>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', setPasswordFunction: '<String>', signInCrossOriginFunction: '<String>', signInFunction: '<String>', signOutFunction: '<String>', signUpFunction: '<String>', usersTableId: '<UUID>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userAuthModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userCredentialsModule`

CRUD operations for UserCredentialsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all userCredentialsModule records
const items = await db.userCredentialsModule.findMany({ select: { databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.userCredentialsModule.findOne({ id: '<UUID>', select: { databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.userCredentialsModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

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
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all userSettingsModule records
const items = await db.userSettingsModule.findMany({ select: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.userSettingsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.userSettingsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userSettingsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userSettingsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.userStateModule`

CRUD operations for UserStateModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `entityField` | String | Yes |
| `id` | UUID | No |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all userStateModule records
const items = await db.userStateModule.findMany({ select: { databaseId: true, entityField: true, id: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.userStateModule.findOne({ id: '<UUID>', select: { databaseId: true, entityField: true, id: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.userStateModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.userStateModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.userStateModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.usersModule`

CRUD operations for UsersModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `privateApiName` | String | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |
| `typeTableId` | UUID | Yes |
| `typeTableName` | String | Yes |

**Operations:**

```typescript
// List all usersModule records
const items = await db.usersModule.findMany({ select: { apiName: true, databaseId: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } }).execute();

// Get one by id
const item = await db.usersModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } }).execute();

// Create
const created = await db.usersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.usersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.usersModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnAuthModule`

CRUD operations for WebauthnAuthModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `attestationType` | String | Yes |
| `authSettingsTableId` | UUID | Yes |
| `challengeExpiry` | Interval | Yes |
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
| `sessionSecretsTableId` | UUID | Yes |
| `sessionsTableId` | UUID | Yes |
| `usersTableId` | UUID | Yes |

**Operations:**

```typescript
// List all webauthnAuthModule records
const items = await db.webauthnAuthModule.findMany({ select: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Get one by id
const item = await db.webauthnAuthModule.findOne({ id: '<UUID>', select: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } }).execute();

// Create
const created = await db.webauthnAuthModule.create({ data: { attestationType: '<String>', authSettingsTableId: '<UUID>', challengeExpiry: '<Interval>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnAuthModule.update({ where: { id: '<UUID>' }, data: { attestationType: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnAuthModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webauthnCredentialsModule`

CRUD operations for WebauthnCredentialsModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `ownerTableId` | UUID | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `schemaId` | UUID | Yes |
| `tableId` | UUID | Yes |
| `tableName` | String | Yes |

**Operations:**

```typescript
// List all webauthnCredentialsModule records
const items = await db.webauthnCredentialsModule.findMany({ select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Get one by id
const item = await db.webauthnCredentialsModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } }).execute();

// Create
const created = await db.webauthnCredentialsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.webauthnCredentialsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webauthnCredentialsModule.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webhookModule`

CRUD operations for WebhookModule records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `apiName` | String | Yes |
| `databaseId` | UUID | Yes |
| `defaultPermissions` | String | Yes |
| `entityField` | String | Yes |
| `entityTableId` | UUID | Yes |
| `functionInvocationModuleId` | UUID | Yes |
| `functionModuleId` | UUID | Yes |
| `id` | UUID | No |
| `infraSecretsModuleId` | UUID | Yes |
| `namespaceModuleId` | UUID | Yes |
| `policies` | JSON | Yes |
| `prefix` | String | Yes |
| `privateApiName` | String | Yes |
| `privateSchemaId` | UUID | Yes |
| `privateSchemaName` | String | Yes |
| `provisions` | JSON | Yes |
| `publicSchemaName` | String | Yes |
| `schemaId` | UUID | Yes |
| `scope` | String | Yes |
| `webhookEndpointsTableId` | UUID | Yes |
| `webhookEndpointsTableName` | String | Yes |
| `webhookEventsTableId` | UUID | Yes |
| `webhookEventsTableName` | String | Yes |

**Operations:**

```typescript
// List all webhookModule records
const items = await db.webhookModule.findMany({ select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } }).execute();

// Get one by id
const item = await db.webhookModule.findOne({ id: '<UUID>', select: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } }).execute();

// Create
const created = await db.webhookModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionInvocationModuleId: '<UUID>', functionModuleId: '<UUID>', infraSecretsModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', webhookEndpointsTableId: '<UUID>', webhookEndpointsTableName: '<String>', webhookEventsTableId: '<UUID>', webhookEventsTableName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.webhookModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webhookModule.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.resolveBlueprintField`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `fieldName` | String |
  | `tableId` | UUID |

```typescript
const result = await db.query.resolveBlueprintField({ databaseId: '<UUID>', fieldName: '<String>', tableId: '<UUID>' }).execute();
```

### `db.query.resolveBlueprintTable`

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `defaultSchemaId` | UUID |
  | `schemaName` | String |
  | `tableMap` | JSON |
  | `tableName` | String |

```typescript
const result = await db.query.resolveBlueprintTable({ databaseId: '<UUID>', defaultSchemaId: '<UUID>', schemaName: '<String>', tableMap: '<JSON>', tableName: '<String>' }).execute();
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

### `db.mutation.copyTemplateToBlueprint`

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyTemplateToBlueprintInput (required) |

```typescript
const result = await db.mutation.copyTemplateToBlueprint({ input: { databaseId: '<UUID>', displayNameOverride: '<String>', nameOverride: '<String>', ownerId: '<UUID>', templateId: '<UUID>' } }).execute();
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

### `db.mutation.provisionCheckConstraint`

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionCheckConstraintInput (required) |

```typescript
const result = await db.mutation.provisionCheckConstraint({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute();
```

### `db.mutation.provisionFullTextSearch`

Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionFullTextSearchInput (required) |

```typescript
const result = await db.mutation.provisionFullTextSearch({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute();
```

### `db.mutation.provisionIndex`

Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionIndexInput (required) |

```typescript
const result = await db.mutation.provisionIndex({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute();
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

### `db.mutation.provisionUniqueConstraint`

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionUniqueConstraintInput (required) |

```typescript
const result = await db.mutation.provisionUniqueConstraint({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
