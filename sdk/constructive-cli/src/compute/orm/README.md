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
| `dbPreset` | findMany, findOne, create, update, delete |
| `functionApiBinding` | findMany, findOne, create, update, delete |
| `functionDefinition` | findMany, findOne, create, update, delete |
| `functionDeployment` | findMany, findOne, create, update, delete |
| `functionDeploymentEvent` | findMany, findOne, create, update, delete |
| `functionExecutionLog` | findMany, findOne, create, update, delete |
| `functionGraphCommit` | findMany, findOne, create, update, delete |
| `functionGraph` | findMany, findOne, create, update, delete |
| `functionGraphExecution` | findMany, findOne, create, update, delete |
| `functionGraphExecutionNodeState` | findMany, findOne, create, update, delete |
| `functionGraphExecutionOutput` | findMany, findOne, create, update, delete |
| `functionGraphObject` | findMany, findOne, create, update, delete |
| `functionGraphRef` | findMany, findOne, create, update, delete |
| `functionGraphStore` | findMany, findOne, create, update, delete |
| `functionInvocationAttempt` | findMany, findOne, create, update, delete |
| `functionInvocation` | findMany, findOne, create, update, delete |
| `getAllTreeNodesRecord` | findMany, findOne, create, update, delete |
| `infraCommit` | findMany, findOne, create, update, delete |
| `infraGetAllTreeNodesRecord` | findMany, findOne, create, update, delete |
| `infraObject` | findMany, findOne, create, update, delete |
| `infraRef` | findMany, findOne, create, update, delete |
| `infraStore` | findMany, findOne, create, update, delete |
| `integrationProvider` | findMany, findOne, create, update, delete |
| `namespace` | findMany, findOne, create, update, delete |
| `namespaceEvent` | findMany, findOne, create, update, delete |
| `platformFunctionApiBinding` | findMany, findOne, create, update, delete |
| `platformFunctionDefinition` | findMany, findOne, create, update, delete |
| `platformFunctionDeployment` | findMany, findOne, create, update, delete |
| `platformFunctionDeploymentEvent` | findMany, findOne, create, update, delete |
| `platformFunctionExecutionLog` | findMany, findOne, create, update, delete |
| `platformFunctionInvocationAttempt` | findMany, findOne, create, update, delete |
| `platformFunctionInvocation` | findMany, findOne, create, update, delete |
| `platformInfraCommit` | findMany, findOne, create, update, delete |
| `platformInfraGetAllTreeNodesRecord` | findMany, findOne, create, update, delete |
| `platformInfraObject` | findMany, findOne, create, update, delete |
| `platformInfraRef` | findMany, findOne, create, update, delete |
| `platformInfraStore` | findMany, findOne, create, update, delete |
| `platformNamespace` | findMany, findOne, create, update, delete |
| `platformNamespaceEvent` | findMany, findOne, create, update, delete |
| `platformResource` | findMany, findOne, create, update, delete |
| `platformResourceDeclaredCapacity` | findMany, findOne, create, update, delete |
| `platformResourceDefinition` | findMany, findOne, create, update, delete |
| `platformResourceEvent` | findMany, findOne, create, update, delete |
| `platformResourceInstallation` | findMany, findOne, create, update, delete |
| `platformResourceStatusCheck` | findMany, findOne, create, update, delete |
| `platformResourceUsageLog` | findMany, findOne, create, update, delete |
| `platformResourceUsageSummary` | findMany, findOne, create, update, delete |
| `platformResourceUtilization` | findMany, findOne, create, update, delete |
| `platformResourcesHealth` | findMany, findOne, create, update, delete |
| `platformResourcesRequirementsState` | findMany, findOne, create, update, delete |
| `platformResourcesResolvedRequirement` | findMany, findOne, create, update, delete |
| `platformWebhookEndpoint` | findMany, findOne, create, update, delete |
| `platformWebhookEvent` | findMany, findOne, create, update, delete |
| `resource` | findMany, findOne, create, update, delete |
| `resourceDeclaredCapacity` | findMany, findOne, create, update, delete |
| `resourceDefinition` | findMany, findOne, create, update, delete |
| `resourceEvent` | findMany, findOne, create, update, delete |
| `resourceInstallation` | findMany, findOne, create, update, delete |
| `resourceStatusCheck` | findMany, findOne, create, update, delete |
| `resourceUsageLog` | findMany, findOne, create, update, delete |
| `resourceUsageSummary` | findMany, findOne, create, update, delete |
| `resourceUtilization` | findMany, findOne, create, update, delete |
| `resourcesHealth` | findMany, findOne, create, update, delete |
| `resourcesRequirementsState` | findMany, findOne, create, update, delete |
| `resourcesResolvedRequirement` | findMany, findOne, create, update, delete |
| `webhookEndpoint` | findMany, findOne, create, update, delete |
| `webhookEvent` | findMany, findOne, create, update, delete |

## Table Operations

### `db.dbPreset`

CRUD operations for DbPreset records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `active` | Boolean | Yes |
| `commitId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `definition` | JSON | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `label` | String | Yes |
| `modulesHash` | UUID | Yes |
| `slug` | String | Yes |
| `storeId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all dbPreset records
const items = await db.dbPreset.findMany({ select: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.dbPreset.findOne({ id: '<UUID>', select: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } }).execute();

// Create
const created = await db.dbPreset.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPreset.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPreset.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionApiBinding`

CRUD operations for FunctionApiBinding records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `alias` | String | Yes |
| `apiId` | UUID | Yes |
| `config` | JSON | Yes |
| `functionDefinitionId` | UUID | Yes |
| `id` | UUID | No |

**Operations:**

```typescript
// List all functionApiBinding records
const items = await db.functionApiBinding.findMany({ select: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } }).execute();

// Get one by id
const item = await db.functionApiBinding.findOne({ id: '<UUID>', select: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } }).execute();

// Create
const created = await db.functionApiBinding.create({ data: { alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionApiBinding.update({ where: { id: '<UUID>' }, data: { alias: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionApiBinding.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDefinition`

CRUD operations for FunctionDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `accessChannels` | String | Yes |
| `category` | String | Yes |
| `concurrency` | Int | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `fnCategory` | String | Yes |
| `functionColumns` | JSON | Yes |
| `graphId` | UUID | Yes |
| `icon` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `inputs` | JSON | Yes |
| `integrations` | String | Yes |
| `isPublished` | Boolean | Yes |
| `maxAttempts` | Int | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `moduleTable` | String | Yes |
| `name` | String | Yes |
| `outputs` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `priority` | Int | Yes |
| `props` | JSON | Yes |
| `protected` | Boolean | Yes |
| `publishedAt` | Datetime | Yes |
| `queueName` | String | Yes |
| `requiredBuckets` | String | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredModels` | String | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resources` | JSON | Yes |
| `runtime` | String | Yes |
| `scaleMax` | Int | Yes |
| `scaleMin` | Int | Yes |
| `targetFunction` | String | Yes |
| `targetSchema` | String | Yes |
| `taskIdentifier` | String | Yes |
| `timeoutSeconds` | Int | Yes |
| `updatedAt` | Datetime | No |
| `volatile` | Boolean | Yes |

**Operations:**

```typescript
// List all functionDefinition records
const items = await db.functionDefinition.findMany({ select: { accessChannels: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Get one by id
const item = await db.functionDefinition.findOne({ id: '<UUID>', select: { accessChannels: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Create
const created = await db.functionDefinition.create({ data: { accessChannels: '<String>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDefinition.update({ where: { id: '<UUID>' }, data: { accessChannels: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeployment`

CRUD operations for FunctionDeployment records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `concurrency` | Int | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `errorCount` | Int | Yes |
| `handlerName` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `imageVersion` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastErrorAt` | Datetime | Yes |
| `namespaceId` | UUID | Yes |
| `resources` | JSON | Yes |
| `revision` | Int | Yes |
| `scaleMax` | Int | Yes |
| `scaleMin` | Int | Yes |
| `serviceName` | String | Yes |
| `serviceUrl` | String | Yes |
| `status` | String | Yes |
| `timeoutSeconds` | Int | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all functionDeployment records
const items = await db.functionDeployment.findMany({ select: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.functionDeployment.findOne({ id: '<UUID>', select: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } }).execute();

// Create
const created = await db.functionDeployment.create({ data: { annotations: '<JSON>', concurrency: '<Int>', databaseId: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeployment.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeployment.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeploymentEvent`

CRUD operations for FunctionDeploymentEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `deploymentId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |

**Operations:**

```typescript
// List all functionDeploymentEvent records
const items = await db.functionDeploymentEvent.findMany({ select: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } }).execute();

// Get one by id
const item = await db.functionDeploymentEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } }).execute();

// Create
const created = await db.functionDeploymentEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionExecutionLog`

CRUD operations for FunctionExecutionLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `invocationId` | UUID | Yes |
| `logLevel` | String | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all functionExecutionLog records
const items = await db.functionExecutionLog.findMany({ select: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.functionExecutionLog.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } }).execute();

// Create
const created = await db.functionExecutionLog.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionExecutionLog.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionExecutionLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphCommit`

CRUD operations for FunctionGraphCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `date` | Datetime | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `parentIds` | UUID | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `treeId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphCommit records
const items = await db.functionGraphCommit.findMany({ select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.functionGraphCommit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.functionGraphCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraph`

CRUD operations for FunctionGraph records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `context` | String | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `definitionsCommitId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isValid` | Boolean | Yes |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `validationErrors` | JSON | Yes |

**Operations:**

```typescript
// List all functionGraph records
const items = await db.functionGraph.findMany({ select: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } }).execute();

// Get one by id
const item = await db.functionGraph.findOne({ id: '<UUID>', select: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } }).execute();

// Create
const created = await db.functionGraph.create({ data: { context: '<String>', createdBy: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', validationErrors: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraph.update({ where: { id: '<UUID>' }, data: { context: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraph.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecution`

CRUD operations for FunctionGraphExecution records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `completedAt` | Datetime | Yes |
| `currentWave` | Int | Yes |
| `definitionsCommitId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |
| `executionPlan` | JSON | Yes |
| `graphId` | UUID | Yes |
| `id` | UUID | No |
| `inputPayload` | JSON | Yes |
| `invocationCreatedAt` | Datetime | Yes |
| `invocationId` | UUID | Yes |
| `lastProgressAt` | Datetime | Yes |
| `maxPendingJobs` | Int | Yes |
| `maxTicks` | Int | Yes |
| `nodeOutputs` | JSON | Yes |
| `organizationId` | UUID | Yes |
| `outputNames` | String | Yes |
| `outputNode` | String | Yes |
| `outputPayload` | JSON | Yes |
| `outputPort` | String | Yes |
| `parentExecutionId` | UUID | Yes |
| `parentInvocationId` | UUID | Yes |
| `parentNodeName` | String | Yes |
| `principalId` | UUID | Yes |
| `scopeId` | UUID | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `tickCount` | Int | Yes |
| `timeoutAt` | Datetime | Yes |

**Operations:**

```typescript
// List all functionGraphExecution records
const items = await db.functionGraphExecution.findMany({ select: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } }).execute();

// Get one by id
const item = await db.functionGraphExecution.findOne({ id: '<UUID>', select: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } }).execute();

// Create
const created = await db.functionGraphExecution.create({ data: { actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionNodeState`

CRUD operations for FunctionGraphExecutionNodeState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `callbackInputs` | JSON | Yes |
| `callbackMeta` | JSON | Yes |
| `callbackTokenHash` | String | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |
| `executionId` | UUID | Yes |
| `id` | UUID | No |
| `nodeName` | String | Yes |
| `nodePath` | String | Yes |
| `outputId` | UUID | Yes |
| `scopeId` | UUID | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all functionGraphExecutionNodeState records
const items = await db.functionGraphExecutionNodeState.findMany({ select: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } }).execute();

// Create
const created = await db.functionGraphExecutionNodeState.create({ data: { callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { callbackInputs: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionNodeState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionOutput`

CRUD operations for FunctionGraphExecutionOutput records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `hash` | Base64EncodedBinary | Yes |
| `id` | UUID | No |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphExecutionOutput records
const items = await db.functionGraphExecutionOutput.findMany({ select: { createdAt: true, data: true, hash: true, id: true, scopeId: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionOutput.findOne({ id: '<UUID>', select: { createdAt: true, data: true, hash: true, id: true, scopeId: true } }).execute();

// Create
const created = await db.functionGraphExecutionOutput.create({ data: { data: '<JSON>', hash: '<Base64EncodedBinary>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionOutput.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionOutput.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphObject`

CRUD operations for FunctionGraphObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `id` | UUID | No |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphObject records
const items = await db.functionGraphObject.findMany({ select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Get one by id
const item = await db.functionGraphObject.findOne({ id: '<UUID>', select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Create
const created = await db.functionGraphObject.create({ data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphRef`

CRUD operations for FunctionGraphRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphRef records
const items = await db.functionGraphRef.findMany({ select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Get one by id
const item = await db.functionGraphRef.findOne({ id: '<UUID>', select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Create
const created = await db.functionGraphRef.create({ data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphStore`

CRUD operations for FunctionGraphStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphStore records
const items = await db.functionGraphStore.findMany({ select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Get one by id
const item = await db.functionGraphStore.findOne({ id: '<UUID>', select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Create
const created = await db.functionGraphStore.create({ data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphStore.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionInvocationAttempt`

CRUD operations for FunctionInvocationAttempt records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `attempt` | Int | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `errorDetail` | JSON | Yes |
| `id` | UUID | No |
| `invocationCreatedAt` | Datetime | Yes |
| `invocationId` | UUID | Yes |
| `startedAt` | Datetime | Yes |
| `success` | Boolean | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all functionInvocationAttempt records
const items = await db.functionInvocationAttempt.findMany({ select: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.functionInvocationAttempt.findOne({ id: '<UUID>', select: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } }).execute();

// Create
const created = await db.functionInvocationAttempt.create({ data: { actorId: '<UUID>', attempt: '<Int>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocationAttempt.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocationAttempt.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionInvocation`

CRUD operations for FunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `apiBindingId` | UUID | Yes |
| `channel` | String | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `definitionScope` | String | Yes |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `functionDefinitionId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |
| `id` | UUID | No |
| `jobId` | BigInt | Yes |
| `parentInvocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `provenance` | JSON | Yes |
| `result` | JSON | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all functionInvocation records
const items = await db.functionInvocation.findMany({ select: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.functionInvocation.findOne({ id: '<UUID>', select: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Create
const created = await db.functionInvocation.create({ data: { actorId: '<UUID>', apiBindingId: '<UUID>', channel: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', definitionScope: '<String>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.getAllTreeNodesRecord`

CRUD operations for GetAllTreeNodesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all getAllTreeNodesRecord records
const items = await db.getAllTreeNodesRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.getAllTreeNodesRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.getAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraCommit`

CRUD operations for InfraCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `date` | Datetime | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `parentIds` | UUID | Yes |
| `storeId` | UUID | Yes |
| `treeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraCommit records
const items = await db.infraCommit.findMany({ select: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.infraCommit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.infraCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraGetAllTreeNodesRecord`

CRUD operations for InfraGetAllTreeNodesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all infraGetAllTreeNodesRecord records
const items = await db.infraGetAllTreeNodesRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.infraGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.infraGetAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraGetAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraGetAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraObject`

CRUD operations for InfraObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |

**Operations:**

```typescript
// List all infraObject records
const items = await db.infraObject.findMany({ select: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } }).execute();

// Get one by id
const item = await db.infraObject.findOne({ id: '<UUID>', select: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } }).execute();

// Create
const created = await db.infraObject.create({ data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraRef`

CRUD operations for InfraRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraRef records
const items = await db.infraRef.findMany({ select: { commitId: true, databaseId: true, id: true, name: true, storeId: true } }).execute();

// Get one by id
const item = await db.infraRef.findOne({ id: '<UUID>', select: { commitId: true, databaseId: true, id: true, name: true, storeId: true } }).execute();

// Create
const created = await db.infraRef.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraStore`

CRUD operations for InfraStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all infraStore records
const items = await db.infraStore.findMany({ select: { createdAt: true, databaseId: true, hash: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.infraStore.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, hash: true, id: true, name: true } }).execute();

// Create
const created = await db.infraStore.create({ data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraStore.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.integrationProvider`

CRUD operations for IntegrationProvider records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `brand` | JSON | Yes |
| `category` | String | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `icon` | String | Yes |
| `id` | UUID | No |
| `logo` | ConstructiveInternalTypeImage | Yes |
| `name` | String | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `slug` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all integrationProvider records
const items = await db.integrationProvider.findMany({ select: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.integrationProvider.findOne({ id: '<UUID>', select: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } }).execute();

// Create
const created = await db.integrationProvider.create({ data: { brand: '<JSON>', category: '<String>', description: '<String>', icon: '<String>', logo: '<Image>', name: '<String>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.integrationProvider.update({ where: { id: '<UUID>' }, data: { brand: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.integrationProvider.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespace`

CRUD operations for Namespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isManaged` | Boolean | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all namespace records
const items = await db.namespace.findMany({ select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.namespace.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.namespace.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceEvent`

CRUD operations for NamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `namespaceId` | UUID | Yes |

**Operations:**

```typescript
// List all namespaceEvent records
const items = await db.namespaceEvent.findMany({ select: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } }).execute();

// Get one by id
const item = await db.namespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } }).execute();

// Create
const created = await db.namespaceEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionApiBinding`

CRUD operations for PlatformFunctionApiBinding records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `alias` | String | Yes |
| `apiId` | UUID | Yes |
| `config` | JSON | Yes |
| `functionDefinitionId` | UUID | Yes |
| `id` | UUID | No |

**Operations:**

```typescript
// List all platformFunctionApiBinding records
const items = await db.platformFunctionApiBinding.findMany({ select: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } }).execute();

// Get one by id
const item = await db.platformFunctionApiBinding.findOne({ id: '<UUID>', select: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } }).execute();

// Create
const created = await db.platformFunctionApiBinding.create({ data: { alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionApiBinding.update({ where: { id: '<UUID>' }, data: { alias: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionApiBinding.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDefinition`

CRUD operations for PlatformFunctionDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `accessChannels` | String | Yes |
| `billable` | Boolean | Yes |
| `category` | String | Yes |
| `concurrency` | Int | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `fnCategory` | String | Yes |
| `functionColumns` | JSON | Yes |
| `graphId` | UUID | Yes |
| `icon` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `inputs` | JSON | Yes |
| `integrations` | String | Yes |
| `isPublished` | Boolean | Yes |
| `maxAttempts` | Int | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `moduleTable` | String | Yes |
| `name` | String | Yes |
| `outputs` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `priority` | Int | Yes |
| `props` | JSON | Yes |
| `protected` | Boolean | Yes |
| `publishedAt` | Datetime | Yes |
| `queueName` | String | Yes |
| `requiredBuckets` | String | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredModels` | String | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resources` | JSON | Yes |
| `runtime` | String | Yes |
| `scaleMax` | Int | Yes |
| `scaleMin` | Int | Yes |
| `system` | Boolean | Yes |
| `targetFunction` | String | Yes |
| `targetSchema` | String | Yes |
| `taskIdentifier` | String | Yes |
| `timeoutSeconds` | Int | Yes |
| `updatedAt` | Datetime | No |
| `volatile` | Boolean | Yes |

**Operations:**

```typescript
// List all platformFunctionDefinition records
const items = await db.platformFunctionDefinition.findMany({ select: { accessChannels: true, billable: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, system: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Get one by id
const item = await db.platformFunctionDefinition.findOne({ id: '<UUID>', select: { accessChannels: true, billable: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, system: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Create
const created = await db.platformFunctionDefinition.create({ data: { accessChannels: '<String>', billable: '<Boolean>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', system: '<Boolean>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDefinition.update({ where: { id: '<UUID>' }, data: { accessChannels: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDeployment`

CRUD operations for PlatformFunctionDeployment records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `concurrency` | Int | Yes |
| `createdAt` | Datetime | No |
| `errorCount` | Int | Yes |
| `handlerName` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `imageVersion` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastErrorAt` | Datetime | Yes |
| `namespaceId` | UUID | Yes |
| `resources` | JSON | Yes |
| `revision` | Int | Yes |
| `scaleMax` | Int | Yes |
| `scaleMin` | Int | Yes |
| `serviceName` | String | Yes |
| `serviceUrl` | String | Yes |
| `status` | String | Yes |
| `timeoutSeconds` | Int | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformFunctionDeployment records
const items = await db.platformFunctionDeployment.findMany({ select: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformFunctionDeployment.findOne({ id: '<UUID>', select: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } }).execute();

// Create
const created = await db.platformFunctionDeployment.create({ data: { annotations: '<JSON>', concurrency: '<Int>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDeployment.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDeployment.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDeploymentEvent`

CRUD operations for PlatformFunctionDeploymentEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `deploymentId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |

**Operations:**

```typescript
// List all platformFunctionDeploymentEvent records
const items = await db.platformFunctionDeploymentEvent.findMany({ select: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } }).execute();

// Get one by id
const item = await db.platformFunctionDeploymentEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } }).execute();

// Create
const created = await db.platformFunctionDeploymentEvent.create({ data: { actorId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionExecutionLog`

CRUD operations for PlatformFunctionExecutionLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `invocationId` | UUID | Yes |
| `logLevel` | String | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all platformFunctionExecutionLog records
const items = await db.platformFunctionExecutionLog.findMany({ select: { actorId: true, createdAt: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.platformFunctionExecutionLog.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } }).execute();

// Create
const created = await db.platformFunctionExecutionLog.create({ data: { actorId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionExecutionLog.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionExecutionLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionInvocationAttempt`

CRUD operations for PlatformFunctionInvocationAttempt records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `attempt` | Int | Yes |
| `createdAt` | Datetime | No |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `errorDetail` | JSON | Yes |
| `id` | UUID | No |
| `invocationCreatedAt` | Datetime | Yes |
| `invocationId` | UUID | Yes |
| `startedAt` | Datetime | Yes |
| `success` | Boolean | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all platformFunctionInvocationAttempt records
const items = await db.platformFunctionInvocationAttempt.findMany({ select: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.platformFunctionInvocationAttempt.findOne({ id: '<UUID>', select: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } }).execute();

// Create
const created = await db.platformFunctionInvocationAttempt.create({ data: { actorId: '<UUID>', attempt: '<Int>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionInvocationAttempt.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionInvocationAttempt.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionInvocation`

CRUD operations for PlatformFunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `apiBindingId` | UUID | Yes |
| `channel` | String | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `definitionScope` | String | Yes |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `functionDefinitionId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |
| `id` | UUID | No |
| `jobId` | BigInt | Yes |
| `parentInvocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `provenance` | JSON | Yes |
| `result` | JSON | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all platformFunctionInvocation records
const items = await db.platformFunctionInvocation.findMany({ select: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.platformFunctionInvocation.findOne({ id: '<UUID>', select: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Create
const created = await db.platformFunctionInvocation.create({ data: { actorId: '<UUID>', apiBindingId: '<UUID>', channel: '<String>', completedAt: '<Datetime>', definitionScope: '<String>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionInvocation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInfraCommit`

CRUD operations for PlatformInfraCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `date` | Datetime | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `parentIds` | UUID | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `treeId` | UUID | Yes |

**Operations:**

```typescript
// List all platformInfraCommit records
const items = await db.platformInfraCommit.findMany({ select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.platformInfraCommit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.platformInfraCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInfraCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInfraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInfraGetAllTreeNodesRecord`

CRUD operations for PlatformInfraGetAllTreeNodesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all platformInfraGetAllTreeNodesRecord records
const items = await db.platformInfraGetAllTreeNodesRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.platformInfraGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.platformInfraGetAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInfraGetAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInfraGetAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInfraObject`

CRUD operations for PlatformInfraObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `id` | UUID | No |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all platformInfraObject records
const items = await db.platformInfraObject.findMany({ select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Get one by id
const item = await db.platformInfraObject.findOne({ id: '<UUID>', select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Create
const created = await db.platformInfraObject.create({ data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInfraObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInfraObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInfraRef`

CRUD operations for PlatformInfraRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all platformInfraRef records
const items = await db.platformInfraRef.findMany({ select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Get one by id
const item = await db.platformInfraRef.findOne({ id: '<UUID>', select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Create
const created = await db.platformInfraRef.create({ data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInfraRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInfraRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformInfraStore`

CRUD operations for PlatformInfraStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all platformInfraStore records
const items = await db.platformInfraStore.findMany({ select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Get one by id
const item = await db.platformInfraStore.findOne({ id: '<UUID>', select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Create
const created = await db.platformInfraStore.create({ data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformInfraStore.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformInfraStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespace`

CRUD operations for PlatformNamespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isManaged` | Boolean | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformNamespace records
const items = await db.platformNamespace.findMany({ select: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformNamespace.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.platformNamespace.create({ data: { annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespaceEvent`

CRUD operations for PlatformNamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `namespaceId` | UUID | Yes |

**Operations:**

```typescript
// List all platformNamespaceEvent records
const items = await db.platformNamespaceEvent.findMany({ select: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } }).execute();

// Get one by id
const item = await db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } }).execute();

// Create
const created = await db.platformNamespaceEvent.create({ data: { actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResource`

CRUD operations for PlatformResource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `installationId` | UUID | Yes |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastHeartbeatAt` | Datetime | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `storageClass` | String | Yes |
| `storageSizeBytes` | BigInt | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformResource records
const items = await db.platformResource.findMany({ select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformResource.findOne({ id: '<UUID>', select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformResource.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResource.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceDeclaredCapacity`

CRUD operations for PlatformResourceDeclaredCapacity records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `installationId` | UUID | Yes |
| `isTransient` | Boolean | Yes |
| `kind` | String | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `podCountMax` | Int | Yes |
| `podCountMin` | Int | Yes |
| `source` | String | Yes |
| `sourceId` | UUID | Yes |
| `storageSizeBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all platformResourceDeclaredCapacity records
const items = await db.platformResourceDeclaredCapacity.findMany({ select: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } }).execute();

// Get one by id
const item = await db.platformResourceDeclaredCapacity.findOne({ id: '<UUID>', select: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } }).execute();

// Create
const created = await db.platformResourceDeclaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceDefinition`

CRUD operations for PlatformResourceDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `defaultSpec` | JSON | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `slug` | String | Yes |
| `stepUpMinAge` | Interval | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformResourceDefinition records
const items = await db.platformResourceDefinition.findMany({ select: { annotations: true, createdAt: true, createdBy: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformResourceDefinition.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, createdBy: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformResourceDefinition.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceDefinition.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceEvent`

CRUD operations for PlatformResourceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `resourceId` | UUID | Yes |

**Operations:**

```typescript
// List all platformResourceEvent records
const items = await db.platformResourceEvent.findMany({ select: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } }).execute();

// Get one by id
const item = await db.platformResourceEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } }).execute();

// Create
const created = await db.platformResourceEvent.create({ data: { actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceInstallation`

CRUD operations for PlatformResourceInstallation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `params` | JSON | Yes |
| `revision` | Int | Yes |
| `slug` | String | Yes |
| `status` | String | Yes |
| `storeId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformResourceInstallation records
const items = await db.platformResourceInstallation.findMany({ select: { commitId: true, createdAt: true, createdBy: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformResourceInstallation.findOne({ id: '<UUID>', select: { commitId: true, createdAt: true, createdBy: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformResourceInstallation.create({ data: { commitId: '<UUID>', createdBy: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceInstallation.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceInstallation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceStatusCheck`

CRUD operations for PlatformResourceStatusCheck records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `completedAt` | Datetime | Yes |
| `id` | UUID | No |
| `requestedAt` | Datetime | Yes |
| `requestedBy` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `result` | JSON | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all platformResourceStatusCheck records
const items = await db.platformResourceStatusCheck.findMany({ select: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } }).execute();

// Get one by id
const item = await db.platformResourceStatusCheck.findOne({ id: '<UUID>', select: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } }).execute();

// Create
const created = await db.platformResourceStatusCheck.create({ data: { completedAt: '<Datetime>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceStatusCheck.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceUsageLog`

CRUD operations for PlatformResourceUsageLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `cpuMillicores` | BigInt | Yes |
| `id` | UUID | No |
| `intervalSeconds` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `sampledAt` | Datetime | Yes |
| `source` | String | Yes |

**Operations:**

```typescript
// List all platformResourceUsageLog records
const items = await db.platformResourceUsageLog.findMany({ select: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } }).execute();

// Get one by id
const item = await db.platformResourceUsageLog.findOne({ id: '<UUID>', select: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } }).execute();

// Create
const created = await db.platformResourceUsageLog.create({ data: { cpuMillicores: '<BigInt>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceUsageLog.update({ where: { id: '<UUID>' }, data: { cpuMillicores: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceUsageLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceUsageSummary`

CRUD operations for PlatformResourceUsageSummary records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `date` | Date | Yes |
| `gbSeconds` | BigFloat | Yes |
| `id` | UUID | No |
| `maxCpuMillicores` | BigInt | Yes |
| `maxMemoryBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `runtimeSeconds` | BigInt | Yes |
| `sampleCount` | Int | Yes |

**Operations:**

```typescript
// List all platformResourceUsageSummary records
const items = await db.platformResourceUsageSummary.findMany({ select: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Get one by id
const item = await db.platformResourceUsageSummary.findOne({ id: '<UUID>', select: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Create
const created = await db.platformResourceUsageSummary.create({ data: { date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceUsageSummary.update({ where: { id: '<UUID>' }, data: { date: '<Date>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceUsageSummary.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceUtilization`

CRUD operations for PlatformResourceUtilization records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `avgMemoryBytes` | BigInt | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuPeakUtilization` | BigFloat | Yes |
| `cpuRequestHeadroomMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `date` | Date | Yes |
| `gbSeconds` | BigFloat | Yes |
| `kind` | String | Yes |
| `maxCpuMillicores` | BigInt | Yes |
| `maxMemoryBytes` | BigInt | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryPeakUtilization` | BigFloat | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `memoryRequestHeadroomBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `resourceId` | UUID | Yes |
| `runtimeSeconds` | BigInt | Yes |
| `sampleCount` | Int | Yes |

**Operations:**

```typescript
// List all platformResourceUtilization records
const items = await db.platformResourceUtilization.findMany({ select: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Get one by id
const item = await db.platformResourceUtilization.findOne({ id: '<UUID>', select: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Create
const created = await db.platformResourceUtilization.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceUtilization.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourcesHealth`

CRUD operations for PlatformResourcesHealth records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `installationId` | UUID | Yes |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastHeartbeatAt` | Datetime | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusDetail` | String | Yes |
| `statusObserved` | JSON | Yes |
| `storageClass` | String | Yes |
| `storageSizeBytes` | BigInt | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformResourcesHealth records
const items = await db.platformResourcesHealth.findMany({ select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformResourcesHealth.findOne({ id: '<UUID>', select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformResourcesHealth.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourcesHealth.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourcesRequirementsState`

CRUD operations for PlatformResourcesRequirementsState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `configHash` | String | Yes |
| `configObjectName` | String | Yes |
| `requirementsHash` | String | Yes |
| `resourceId` | UUID | Yes |
| `secretsHash` | String | Yes |
| `secretsObjectName` | String | Yes |
| `slug` | String | Yes |

**Operations:**

```typescript
// List all platformResourcesRequirementsState records
const items = await db.platformResourcesRequirementsState.findMany({ select: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } }).execute();

// Get one by id
const item = await db.platformResourcesRequirementsState.findOne({ id: '<UUID>', select: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } }).execute();

// Create
const created = await db.platformResourcesRequirementsState.create({ data: { configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { configHash: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourcesResolvedRequirement`

CRUD operations for PlatformResourcesResolvedRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `atomId` | UUID | Yes |
| `configObjectName` | String | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `present` | Boolean | Yes |
| `required` | Boolean | Yes |
| `requirementKind` | String | Yes |
| `resourceId` | UUID | Yes |
| `secretsObjectName` | String | Yes |
| `slug` | String | Yes |

**Operations:**

```typescript
// List all platformResourcesResolvedRequirement records
const items = await db.platformResourcesResolvedRequirement.findMany({ select: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } }).execute();

// Get one by id
const item = await db.platformResourcesResolvedRequirement.findOne({ id: '<UUID>', select: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } }).execute();

// Create
const created = await db.platformResourcesResolvedRequirement.create({ data: { atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { atomId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformWebhookEndpoint`

CRUD operations for PlatformWebhookEndpoint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `active` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `functionDefinitionId` | UUID | Yes |
| `host` | String | Yes |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `path` | String | Yes |
| `provider` | String | Yes |
| `replayWindowSeconds` | Int | Yes |
| `signingSecretName` | String | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformWebhookEndpoint records
const items = await db.platformWebhookEndpoint.findMany({ select: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformWebhookEndpoint.findOne({ id: '<UUID>', select: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformWebhookEndpoint.create({ data: { active: '<Boolean>', createdBy: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformWebhookEndpoint.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformWebhookEndpoint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformWebhookEvent`

CRUD operations for PlatformWebhookEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `endpointId` | UUID | Yes |
| `error` | String | Yes |
| `externalEventId` | String | Yes |
| `id` | UUID | No |
| `invocationCreatedAt` | Datetime | Yes |
| `invocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `provider` | String | Yes |
| `providerTimestamp` | Datetime | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all platformWebhookEvent records
const items = await db.platformWebhookEvent.findMany({ select: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.platformWebhookEvent.findOne({ id: '<UUID>', select: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.platformWebhookEvent.create({ data: { endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformWebhookEvent.update({ where: { id: '<UUID>' }, data: { endpointId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformWebhookEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resource`

CRUD operations for Resource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `installationId` | UUID | Yes |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastHeartbeatAt` | Datetime | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `storageClass` | String | Yes |
| `storageSizeBytes` | BigInt | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all resource records
const items = await db.resource.findMany({ select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.resource.findOne({ id: '<UUID>', select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.resource.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resource.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceDeclaredCapacity`

CRUD operations for ResourceDeclaredCapacity records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `installationId` | UUID | Yes |
| `isTransient` | Boolean | Yes |
| `kind` | String | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `podCountMax` | Int | Yes |
| `podCountMin` | Int | Yes |
| `source` | String | Yes |
| `sourceId` | UUID | Yes |
| `storageSizeBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all resourceDeclaredCapacity records
const items = await db.resourceDeclaredCapacity.findMany({ select: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } }).execute();

// Get one by id
const item = await db.resourceDeclaredCapacity.findOne({ id: '<UUID>', select: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } }).execute();

// Create
const created = await db.resourceDeclaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceDefinition`

CRUD operations for ResourceDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `defaultSpec` | JSON | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `slug` | String | Yes |
| `stepUpMinAge` | Interval | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all resourceDefinition records
const items = await db.resourceDefinition.findMany({ select: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.resourceDefinition.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.resourceDefinition.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceDefinition.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceEvent`

CRUD operations for ResourceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `resourceId` | UUID | Yes |

**Operations:**

```typescript
// List all resourceEvent records
const items = await db.resourceEvent.findMany({ select: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } }).execute();

// Get one by id
const item = await db.resourceEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } }).execute();

// Create
const created = await db.resourceEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceInstallation`

CRUD operations for ResourceInstallation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `commitId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `params` | JSON | Yes |
| `revision` | Int | Yes |
| `slug` | String | Yes |
| `status` | String | Yes |
| `storeId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all resourceInstallation records
const items = await db.resourceInstallation.findMany({ select: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.resourceInstallation.findOne({ id: '<UUID>', select: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.resourceInstallation.create({ data: { commitId: '<UUID>', createdBy: '<UUID>', databaseId: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceInstallation.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceInstallation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceStatusCheck`

CRUD operations for ResourceStatusCheck records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `completedAt` | Datetime | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `requestedAt` | Datetime | Yes |
| `requestedBy` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `result` | JSON | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all resourceStatusCheck records
const items = await db.resourceStatusCheck.findMany({ select: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } }).execute();

// Get one by id
const item = await db.resourceStatusCheck.findOne({ id: '<UUID>', select: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } }).execute();

// Create
const created = await db.resourceStatusCheck.create({ data: { completedAt: '<Datetime>', databaseId: '<UUID>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceStatusCheck.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceUsageLog`

CRUD operations for ResourceUsageLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `cpuMillicores` | BigInt | Yes |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `intervalSeconds` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `sampledAt` | Datetime | Yes |
| `source` | String | Yes |

**Operations:**

```typescript
// List all resourceUsageLog records
const items = await db.resourceUsageLog.findMany({ select: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } }).execute();

// Get one by id
const item = await db.resourceUsageLog.findOne({ id: '<UUID>', select: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } }).execute();

// Create
const created = await db.resourceUsageLog.create({ data: { cpuMillicores: '<BigInt>', databaseId: '<UUID>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceUsageLog.update({ where: { id: '<UUID>' }, data: { cpuMillicores: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceUsageLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceUsageSummary`

CRUD operations for ResourceUsageSummary records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `databaseId` | UUID | Yes |
| `date` | Date | Yes |
| `gbSeconds` | BigFloat | Yes |
| `id` | UUID | No |
| `maxCpuMillicores` | BigInt | Yes |
| `maxMemoryBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `resourceId` | UUID | Yes |
| `runtimeSeconds` | BigInt | Yes |
| `sampleCount` | Int | Yes |

**Operations:**

```typescript
// List all resourceUsageSummary records
const items = await db.resourceUsageSummary.findMany({ select: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Get one by id
const item = await db.resourceUsageSummary.findOne({ id: '<UUID>', select: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Create
const created = await db.resourceUsageSummary.create({ data: { databaseId: '<UUID>', date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceUsageSummary.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceUsageSummary.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceUtilization`

CRUD operations for ResourceUtilization records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `avgMemoryBytes` | BigInt | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuPeakUtilization` | BigFloat | Yes |
| `cpuRequestHeadroomMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `date` | Date | Yes |
| `gbSeconds` | BigFloat | Yes |
| `kind` | String | Yes |
| `maxCpuMillicores` | BigInt | Yes |
| `maxMemoryBytes` | BigInt | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryPeakUtilization` | BigFloat | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `memoryRequestHeadroomBytes` | BigInt | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `resourceId` | UUID | Yes |
| `runtimeSeconds` | BigInt | Yes |
| `sampleCount` | Int | Yes |

**Operations:**

```typescript
// List all resourceUtilization records
const items = await db.resourceUtilization.findMany({ select: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Get one by id
const item = await db.resourceUtilization.findOne({ id: '<UUID>', select: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } }).execute();

// Create
const created = await db.resourceUtilization.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceUtilization.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourcesHealth`

CRUD operations for ResourcesHealth records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `cpuLimitMillicores` | BigInt | Yes |
| `cpuRequestMillicores` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `installationId` | UUID | Yes |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `lastHeartbeatAt` | Datetime | Yes |
| `memoryLimitBytes` | BigInt | Yes |
| `memoryRequestBytes` | BigInt | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `replicas` | Int | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusDetail` | String | Yes |
| `statusObserved` | JSON | Yes |
| `storageClass` | String | Yes |
| `storageSizeBytes` | BigInt | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all resourcesHealth records
const items = await db.resourcesHealth.findMany({ select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.resourcesHealth.findOne({ id: '<UUID>', select: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.resourcesHealth.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourcesHealth.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourcesRequirementsState`

CRUD operations for ResourcesRequirementsState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `configHash` | String | Yes |
| `configObjectName` | String | Yes |
| `requirementsHash` | String | Yes |
| `resourceId` | UUID | Yes |
| `secretsHash` | String | Yes |
| `secretsObjectName` | String | Yes |
| `slug` | String | Yes |

**Operations:**

```typescript
// List all resourcesRequirementsState records
const items = await db.resourcesRequirementsState.findMany({ select: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } }).execute();

// Get one by id
const item = await db.resourcesRequirementsState.findOne({ id: '<UUID>', select: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } }).execute();

// Create
const created = await db.resourcesRequirementsState.create({ data: { configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { configHash: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourcesResolvedRequirement`

CRUD operations for ResourcesResolvedRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `atomId` | UUID | Yes |
| `configObjectName` | String | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `present` | Boolean | Yes |
| `required` | Boolean | Yes |
| `requirementKind` | String | Yes |
| `resourceId` | UUID | Yes |
| `secretsObjectName` | String | Yes |
| `slug` | String | Yes |

**Operations:**

```typescript
// List all resourcesResolvedRequirement records
const items = await db.resourcesResolvedRequirement.findMany({ select: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } }).execute();

// Get one by id
const item = await db.resourcesResolvedRequirement.findOne({ id: '<UUID>', select: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } }).execute();

// Create
const created = await db.resourcesResolvedRequirement.create({ data: { atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { atomId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webhookEndpoint`

CRUD operations for WebhookEndpoint records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `active` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `functionDefinitionId` | UUID | Yes |
| `host` | String | Yes |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `path` | String | Yes |
| `provider` | String | Yes |
| `replayWindowSeconds` | Int | Yes |
| `signingSecretName` | String | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all webhookEndpoint records
const items = await db.webhookEndpoint.findMany({ select: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.webhookEndpoint.findOne({ id: '<UUID>', select: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.webhookEndpoint.create({ data: { active: '<Boolean>', createdBy: '<UUID>', databaseId: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.webhookEndpoint.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webhookEndpoint.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.webhookEvent`

CRUD operations for WebhookEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `endpointId` | UUID | Yes |
| `error` | String | Yes |
| `externalEventId` | String | Yes |
| `id` | UUID | No |
| `invocationCreatedAt` | Datetime | Yes |
| `invocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `provider` | String | Yes |
| `providerTimestamp` | Datetime | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all webhookEvent records
const items = await db.webhookEvent.findMany({ select: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.webhookEvent.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.webhookEvent.create({ data: { databaseId: '<UUID>', endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.webhookEvent.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.webhookEvent.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.readFunctionGraph`

readFunctionGraph

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `graphId` | UUID |

```typescript
const result = await db.query.readFunctionGraph({ graphId: '<UUID>' }).execute();
```

### `db.mutation.addEdge`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeInput (required) |

```typescript
const result = await db.mutation.addEdge({ input: '<AddEdgeInput>' }).execute();
```

### `db.mutation.addEdgeAndSave`

addEdgeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeAndSaveInput (required) |

```typescript
const result = await db.mutation.addEdgeAndSave({ input: '<AddEdgeAndSaveInput>' }).execute();
```

### `db.mutation.addNode`

addNode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeInput (required) |

```typescript
const result = await db.mutation.addNode({ input: '<AddNodeInput>' }).execute();
```

### `db.mutation.addNodeAndSave`

addNodeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeAndSaveInput (required) |

```typescript
const result = await db.mutation.addNodeAndSave({ input: '<AddNodeAndSaveInput>' }).execute();
```

### `db.mutation.copyGraph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyGraphInput (required) |

```typescript
const result = await db.mutation.copyGraph({ input: { graphId: '<UUID>', name: '<String>', scopeId: '<UUID>' } }).execute();
```

### `db.mutation.importDefinitions`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportDefinitionsInput (required) |

```typescript
const result = await db.mutation.importDefinitions({ input: { contexts: '<String>', graphId: '<UUID>', sourceCommitId: '<UUID>', sourceScopeId: '<UUID>' } }).execute();
```

### `db.mutation.importGraphJson`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportGraphJsonInput (required) |

```typescript
const result = await db.mutation.importGraphJson({ input: '<ImportGraphJsonInput>' }).execute();
```

### `db.mutation.infraInitEmptyRepo`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.infraInitEmptyRepo({ input: { sId: '<UUID>', storeId: '<UUID>' } }).execute();
```

### `db.mutation.infraInsertNodeAtPath`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

```typescript
const result = await db.mutation.infraInsertNodeAtPath({ input: '<InfraInsertNodeAtPathInput>' }).execute();
```

### `db.mutation.infraSetDataAtPath`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

```typescript
const result = await db.mutation.infraSetDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```

### `db.mutation.initEmptyRepo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.initEmptyRepo({ input: { sId: '<UUID>', storeId: '<UUID>' } }).execute();
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

### `db.mutation.platformInfraInitEmptyRepo`

platformInfraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraInitEmptyRepoInput (required) |

```typescript
const result = await db.mutation.platformInfraInitEmptyRepo({ input: { sId: '<UUID>', storeId: '<UUID>' } }).execute();
```

### `db.mutation.platformInfraInsertNodeAtPath`

platformInfraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraInsertNodeAtPathInput (required) |

```typescript
const result = await db.mutation.platformInfraInsertNodeAtPath({ input: '<PlatformInfraInsertNodeAtPathInput>' }).execute();
```

### `db.mutation.platformInfraSetDataAtPath`

platformInfraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraSetDataAtPathInput (required) |

```typescript
const result = await db.mutation.platformInfraSetDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```

### `db.mutation.platformResourceInstallationsInstall`

platformResourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsInstallInput (required) |

```typescript
const result = await db.mutation.platformResourceInstallationsInstall({ input: { name: '<String>', namespaceId: '<UUID>', newParams: '<JSON>', slug: '<String>' } }).execute();
```

### `db.mutation.platformResourceInstallationsRollback`

platformResourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsRollbackInput (required) |

```typescript
const result = await db.mutation.platformResourceInstallationsRollback({ input: { commitId: '<UUID>', targetInstallationId: '<UUID>' } }).execute();
```

### `db.mutation.platformResourceInstallationsUninstall`

platformResourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsUninstallInput (required) |

```typescript
const result = await db.mutation.platformResourceInstallationsUninstall({ input: { targetInstallationId: '<UUID>' } }).execute();
```

### `db.mutation.platformResourceInstallationsUpgrade`

platformResourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsUpgradeInput (required) |

```typescript
const result = await db.mutation.platformResourceInstallationsUpgrade({ input: { newParams: '<JSON>', targetInstallationId: '<UUID>' } }).execute();
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

### `db.mutation.resourceInstallationsInstall`

resourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsInstallInput (required) |

```typescript
const result = await db.mutation.resourceInstallationsInstall({ input: { name: '<String>', namespaceId: '<UUID>', newParams: '<JSON>', slug: '<String>' } }).execute();
```

### `db.mutation.resourceInstallationsRollback`

resourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsRollbackInput (required) |

```typescript
const result = await db.mutation.resourceInstallationsRollback({ input: { commitId: '<UUID>', targetInstallationId: '<UUID>' } }).execute();
```

### `db.mutation.resourceInstallationsUninstall`

resourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsUninstallInput (required) |

```typescript
const result = await db.mutation.resourceInstallationsUninstall({ input: { targetInstallationId: '<UUID>' } }).execute();
```

### `db.mutation.resourceInstallationsUpgrade`

resourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsUpgradeInput (required) |

```typescript
const result = await db.mutation.resourceInstallationsUpgrade({ input: { newParams: '<JSON>', targetInstallationId: '<UUID>' } }).execute();
```

### `db.mutation.saveGraph`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SaveGraphInput (required) |

```typescript
const result = await db.mutation.saveGraph({ input: { graphId: '<UUID>', message: '<String>', rootHash: '<UUID>' } }).execute();
```

### `db.mutation.setDataAtPath`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

```typescript
const result = await db.mutation.setDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```

### `db.mutation.startExecution`

startExecution

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | StartExecutionInput (required) |

```typescript
const result = await db.mutation.startExecution({ input: '<StartExecutionInput>' }).execute();
```

### `db.mutation.validateFunctionGraph`

validateFunctionGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ValidateFunctionGraphInput (required) |

```typescript
const result = await db.mutation.validateFunctionGraph({ input: { graphId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
