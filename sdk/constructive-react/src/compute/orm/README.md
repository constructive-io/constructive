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
| `functionInvocation` | findMany, findOne, create, update, delete |
| `getAllRecord` | findMany, findOne, create, update, delete |
| `infraCommit` | findMany, findOne, create, update, delete |
| `infraGetAllRecord` | findMany, findOne, create, update, delete |
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
| `platformFunctionInvocation` | findMany, findOne, create, update, delete |
| `platformNamespace` | findMany, findOne, create, update, delete |
| `platformNamespaceEvent` | findMany, findOne, create, update, delete |
| `platformResource` | findMany, findOne, create, update, delete |
| `platformResourceDefinition` | findMany, findOne, create, update, delete |
| `platformResourceEvent` | findMany, findOne, create, update, delete |
| `platformResourceStatusCheck` | findMany, findOne, create, update, delete |
| `platformResourcesRequirementsState` | findMany, findOne, create, update, delete |
| `platformResourcesResolvedRequirement` | findMany, findOne, create, update, delete |
| `resource` | findMany, findOne, create, update, delete |
| `resourceDefinition` | findMany, findOne, create, update, delete |
| `resourceEvent` | findMany, findOne, create, update, delete |
| `resourceStatusCheck` | findMany, findOne, create, update, delete |
| `resourcesRequirementsState` | findMany, findOne, create, update, delete |
| `resourcesResolvedRequirement` | findMany, findOne, create, update, delete |

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
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `fnCategory` | String | Yes |
| `functionColumns` | JSON | Yes |
| `icon` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `inputs` | JSON | Yes |
| `integrations` | String | Yes |
| `isPublished` | Boolean | Yes |
| `maxAttempts` | Int | Yes |
| `moduleTable` | String | Yes |
| `name` | String | Yes |
| `outputs` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `priority` | Int | Yes |
| `props` | JSON | Yes |
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
const items = await db.functionDefinition.findMany({ select: { accessChannels: true, category: true, concurrency: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Get one by id
const item = await db.functionDefinition.findOne({ id: '<UUID>', select: { accessChannels: true, category: true, concurrency: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Create
const created = await db.functionDefinition.create({ data: { accessChannels: '<String>', category: '<String>', concurrency: '<Int>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' }, select: { id: true } }).execute();

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
| `completedAt` | Datetime | Yes |
| `currentWave` | Int | Yes |
| `definitionsCommitId` | UUID | Yes |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |
| `executionPlan` | JSON | Yes |
| `graphId` | UUID | Yes |
| `id` | UUID | No |
| `inputPayload` | JSON | Yes |
| `invocationId` | UUID | Yes |
| `lastProgressAt` | Datetime | Yes |
| `maxPendingJobs` | Int | Yes |
| `maxTicks` | Int | Yes |
| `nodeOutputs` | JSON | Yes |
| `outputNode` | String | Yes |
| `outputPayload` | JSON | Yes |
| `outputPort` | String | Yes |
| `parentExecutionId` | UUID | Yes |
| `parentNodeName` | String | Yes |
| `scopeId` | UUID | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `tickCount` | Int | Yes |
| `timeoutAt` | Datetime | Yes |

**Operations:**

```typescript
// List all functionGraphExecution records
const items = await db.functionGraphExecution.findMany({ select: { completedAt: true, currentWave: true, definitionsCommitId: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentNodeName: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } }).execute();

// Get one by id
const item = await db.functionGraphExecution.findOne({ id: '<UUID>', select: { completedAt: true, currentWave: true, definitionsCommitId: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentNodeName: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } }).execute();

// Create
const created = await db.functionGraphExecution.create({ data: { completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentNodeName: '<String>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionNodeState`

CRUD operations for FunctionGraphExecutionNodeState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
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
const items = await db.functionGraphExecutionNodeState.findMany({ select: { completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } }).execute();

// Create
const created = await db.functionGraphExecutionNodeState.create({ data: { completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute();

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

### `db.functionInvocation`

CRUD operations for FunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `apiBindingId` | UUID | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `functionDefinitionId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |
| `id` | UUID | No |
| `jobId` | BigInt | Yes |
| `parentInvocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `result` | JSON | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all functionInvocation records
const items = await db.functionInvocation.findMany({ select: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, databaseId: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.functionInvocation.findOne({ id: '<UUID>', select: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, databaseId: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Create
const created = await db.functionInvocation.create({ data: { actorId: '<UUID>', apiBindingId: '<UUID>', completedAt: '<Datetime>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.getAllRecord`

CRUD operations for GetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all getAllRecord records
const items = await db.getAllRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.getAllRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.getAllRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraCommit`

CRUD operations for InfraCommit records.

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
// List all infraCommit records
const items = await db.infraCommit.findMany({ select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Get one by id
const item = await db.infraCommit.findOne({ id: '<UUID>', select: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } }).execute();

// Create
const created = await db.infraCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraGetAllRecord`

CRUD operations for InfraGetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `data` | JSON | Yes |
| `path` | String | Yes |

**Operations:**

```typescript
// List all infraGetAllRecord records
const items = await db.infraGetAllRecord.findMany({ select: { data: true, path: true } }).execute();

// Get one by id
const item = await db.infraGetAllRecord.findOne({ id: '<UUID>', select: { data: true, path: true } }).execute();

// Create
const created = await db.infraGetAllRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraGetAllRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraGetAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraObject`

CRUD operations for InfraObject records.

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
// List all infraObject records
const items = await db.infraObject.findMany({ select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Get one by id
const item = await db.infraObject.findOne({ id: '<UUID>', select: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } }).execute();

// Create
const created = await db.infraObject.create({ data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

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
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraRef records
const items = await db.infraRef.findMany({ select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Get one by id
const item = await db.infraRef.findOne({ id: '<UUID>', select: { commitId: true, id: true, name: true, scopeId: true, storeId: true } }).execute();

// Create
const created = await db.infraRef.create({ data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute();

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
| `hash` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |

**Operations:**

```typescript
// List all infraStore records
const items = await db.infraStore.findMany({ select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Get one by id
const item = await db.infraStore.findOne({ id: '<UUID>', select: { createdAt: true, hash: true, id: true, name: true, scopeId: true } }).execute();

// Create
const created = await db.infraStore.create({ data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraStore.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute();

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
| `cpuMillicores` | Int | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `memoryBytes` | BigInt | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `storageBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all namespaceEvent records
const items = await db.namespaceEvent.findMany({ select: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Get one by id
const item = await db.namespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Create
const created = await db.namespaceEvent.create({ data: { actorId: '<UUID>', cpuMillicores: '<Int>', databaseId: '<UUID>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' }, select: { id: true } }).execute();

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
| `category` | String | Yes |
| `concurrency` | Int | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `fnCategory` | String | Yes |
| `functionColumns` | JSON | Yes |
| `icon` | String | Yes |
| `id` | UUID | No |
| `image` | String | Yes |
| `inputs` | JSON | Yes |
| `integrations` | String | Yes |
| `isPublished` | Boolean | Yes |
| `maxAttempts` | Int | Yes |
| `moduleTable` | String | Yes |
| `name` | String | Yes |
| `outputs` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `priority` | Int | Yes |
| `props` | JSON | Yes |
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
// List all platformFunctionDefinition records
const items = await db.platformFunctionDefinition.findMany({ select: { accessChannels: true, category: true, concurrency: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Get one by id
const item = await db.platformFunctionDefinition.findOne({ id: '<UUID>', select: { accessChannels: true, category: true, concurrency: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } }).execute();

// Create
const created = await db.platformFunctionDefinition.create({ data: { accessChannels: '<String>', category: '<String>', concurrency: '<Int>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' }, select: { id: true } }).execute();

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

### `db.platformFunctionInvocation`

CRUD operations for PlatformFunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `apiBindingId` | UUID | Yes |
| `completedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `durationMs` | Int | Yes |
| `error` | String | Yes |
| `functionDefinitionId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |
| `id` | UUID | No |
| `jobId` | BigInt | Yes |
| `parentInvocationId` | UUID | Yes |
| `payload` | JSON | Yes |
| `result` | JSON | Yes |
| `startedAt` | Datetime | Yes |
| `status` | String | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all platformFunctionInvocation records
const items = await db.platformFunctionInvocation.findMany({ select: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.platformFunctionInvocation.findOne({ id: '<UUID>', select: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } }).execute();

// Create
const created = await db.platformFunctionInvocation.create({ data: { actorId: '<UUID>', apiBindingId: '<UUID>', completedAt: '<Datetime>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionInvocation.delete({ where: { id: '<UUID>' } }).execute();
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
| `cpuMillicores` | Int | Yes |
| `createdAt` | Datetime | No |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `memoryBytes` | BigInt | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `metrics` | JSON | Yes |
| `namespaceId` | UUID | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `storageBytes` | BigInt | Yes |

**Operations:**

```typescript
// List all platformNamespaceEvent records
const items = await db.platformNamespaceEvent.findMany({ select: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Get one by id
const item = await db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } }).execute();

// Create
const created = await db.platformNamespaceEvent.create({ data: { actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' }, select: { id: true } }).execute();

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
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all platformResource records
const items = await db.platformResource.findMany({ select: { annotations: true, createdAt: true, createdBy: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.platformResource.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, createdBy: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.platformResource.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResource.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.resource`

CRUD operations for Resource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `annotations` | JSON | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `errorCount` | Int | Yes |
| `id` | UUID | No |
| `integrations` | String | Yes |
| `kind` | String | Yes |
| `labels` | JSON | Yes |
| `lastError` | String | Yes |
| `name` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `resourceDefinitionId` | UUID | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all resource records
const items = await db.resource.findMany({ select: { annotations: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.resource.findOne({ id: '<UUID>', select: { annotations: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.resource.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resource.delete({ where: { id: '<UUID>' } }).execute();
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
