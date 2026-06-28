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
| `functionApiBinding` | findMany, findOne, create, update, delete |
| `functionDeployment` | findMany, findOne, create, update, delete |
| `functionGraphRef` | findMany, findOne, create, update, delete |
| `functionGraphStore` | findMany, findOne, create, update, delete |
| `functionGraphObject` | findMany, findOne, create, update, delete |
| `functionDeploymentEvent` | findMany, findOne, create, update, delete |
| `orgFunctionExecutionLog` | findMany, findOne, create, update, delete |
| `functionGraphExecutionOutput` | findMany, findOne, create, update, delete |
| `functionGraphCommit` | findMany, findOne, create, update, delete |
| `secretDefinition` | findMany, findOne, create, update, delete |
| `functionExecutionLog` | findMany, findOne, create, update, delete |
| `functionGraph` | findMany, findOne, create, update, delete |
| `functionGraphExecutionNodeState` | findMany, findOne, create, update, delete |
| `orgFunctionInvocation` | findMany, findOne, create, update, delete |
| `functionInvocation` | findMany, findOne, create, update, delete |
| `functionGraphExecution` | findMany, findOne, create, update, delete |
| `functionDefinition` | findMany, findOne, create, update, delete |

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
const item = await db.getAllRecord.findOne({ id: '<UUID>', select: { path: true, data: true } }).execute();

// Create
const created = await db.getAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.getAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.getAllRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionApiBinding`

CRUD operations for FunctionApiBinding records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `functionDefinitionId` | UUID | Yes |
| `apiId` | UUID | Yes |
| `alias` | String | Yes |
| `config` | JSON | Yes |

**Operations:**

```typescript
// List all functionApiBinding records
const items = await db.functionApiBinding.findMany({ select: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } }).execute();

// Get one by id
const item = await db.functionApiBinding.findOne({ id: '<UUID>', select: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } }).execute();

// Create
const created = await db.functionApiBinding.create({ data: { functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionApiBinding.update({ where: { id: '<UUID>' }, data: { functionDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionApiBinding.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeployment`

CRUD operations for FunctionDeployment records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `functionDefinitionId` | UUID | Yes |
| `namespaceId` | UUID | Yes |
| `status` | String | Yes |
| `serviceUrl` | String | Yes |
| `serviceName` | String | Yes |
| `revision` | Int | Yes |
| `image` | String | Yes |
| `concurrency` | Int | Yes |
| `scaleMin` | Int | Yes |
| `scaleMax` | Int | Yes |
| `timeoutSeconds` | Int | Yes |
| `resources` | JSON | Yes |
| `lastError` | String | Yes |
| `lastErrorAt` | Datetime | Yes |
| `errorCount` | Int | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all functionDeployment records
const items = await db.functionDeployment.findMany({ select: { id: true, createdAt: true, updatedAt: true, functionDefinitionId: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } }).execute();

// Get one by id
const item = await db.functionDeployment.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, functionDefinitionId: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } }).execute();

// Create
const created = await db.functionDeployment.create({ data: { functionDefinitionId: '<UUID>', namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeployment.update({ where: { id: '<UUID>' }, data: { functionDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeployment.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphRef`

CRUD operations for FunctionGraphRef records.

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
// List all functionGraphRef records
const items = await db.functionGraphRef.findMany({ select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

// Get one by id
const item = await db.functionGraphRef.findOne({ id: '<UUID>', select: { id: true, name: true, databaseId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.functionGraphRef.create({ data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphRef.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphStore`

CRUD operations for FunctionGraphStore records.

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
// List all functionGraphStore records
const items = await db.functionGraphStore.findMany({ select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Get one by id
const item = await db.functionGraphStore.findOne({ id: '<UUID>', select: { id: true, name: true, databaseId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.functionGraphStore.create({ data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphStore.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphObject`

CRUD operations for FunctionGraphObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `data` | JSON | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all functionGraphObject records
const items = await db.functionGraphObject.findMany({ select: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Get one by id
const item = await db.functionGraphObject.findOne({ id: '<UUID>', select: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Create
const created = await db.functionGraphObject.create({ data: { databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphObject.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeploymentEvent`

CRUD operations for FunctionDeploymentEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `deploymentId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all functionDeploymentEvent records
const items = await db.functionDeploymentEvent.findMany({ select: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } }).execute();

// Get one by id
const item = await db.functionDeploymentEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } }).execute();

// Create
const created = await db.functionDeploymentEvent.create({ data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { deploymentId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgFunctionExecutionLog`

CRUD operations for OrgFunctionExecutionLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `invocationId` | UUID | Yes |
| `taskIdentifier` | String | Yes |
| `logLevel` | String | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `actorId` | UUID | Yes |

**Operations:**

```typescript
// List all orgFunctionExecutionLog records
const items = await db.orgFunctionExecutionLog.findMany({ select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } }).execute();

// Get one by id
const item = await db.orgFunctionExecutionLog.findOne({ id: '<UUID>', select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } }).execute();

// Create
const created = await db.orgFunctionExecutionLog.create({ data: { invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgFunctionExecutionLog.update({ where: { id: '<UUID>' }, data: { invocationId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgFunctionExecutionLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionOutput`

CRUD operations for FunctionGraphExecutionOutput records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `hash` | Base64EncodedBinary | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all functionGraphExecutionOutput records
const items = await db.functionGraphExecutionOutput.findMany({ select: { createdAt: true, id: true, databaseId: true, hash: true, data: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionOutput.findOne({ id: '<UUID>', select: { createdAt: true, id: true, databaseId: true, hash: true, data: true } }).execute();

// Create
const created = await db.functionGraphExecutionOutput.create({ data: { databaseId: '<UUID>', hash: '<Base64EncodedBinary>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionOutput.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionOutput.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphCommit`

CRUD operations for FunctionGraphCommit records.

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
// List all functionGraphCommit records
const items = await db.functionGraphCommit.findMany({ select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Get one by id
const item = await db.functionGraphCommit.findOne({ id: '<UUID>', select: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.functionGraphCommit.create({ data: { message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.secretDefinition`

CRUD operations for SecretDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `isBuiltIn` | Boolean | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all secretDefinition records
const items = await db.secretDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } }).execute();

// Get one by id
const item = await db.secretDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } }).execute();

// Create
const created = await db.secretDefinition.create({ data: { name: '<String>', description: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.secretDefinition.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.secretDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionExecutionLog`

CRUD operations for FunctionExecutionLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `invocationId` | UUID | Yes |
| `taskIdentifier` | String | Yes |
| `logLevel` | String | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `actorId` | UUID | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all functionExecutionLog records
const items = await db.functionExecutionLog.findMany({ select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } }).execute();

// Get one by id
const item = await db.functionExecutionLog.findOne({ id: '<UUID>', select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } }).execute();

// Create
const created = await db.functionExecutionLog.create({ data: { invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionExecutionLog.update({ where: { id: '<UUID>' }, data: { invocationId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionExecutionLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraph`

CRUD operations for FunctionGraph records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `databaseId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `context` | String | Yes |
| `name` | String | Yes |
| `description` | String | Yes |
| `definitionsCommitId` | UUID | Yes |
| `isValid` | Boolean | Yes |
| `validationErrors` | JSON | Yes |
| `createdBy` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all functionGraph records
const items = await db.functionGraph.findMany({ select: { id: true, databaseId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.functionGraph.findOne({ id: '<UUID>', select: { id: true, databaseId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.functionGraph.create({ data: { databaseId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraph.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraph.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionNodeState`

CRUD operations for FunctionGraphExecutionNodeState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `executionId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `nodeName` | String | Yes |
| `nodePath` | String | Yes |
| `status` | String | Yes |
| `startedAt` | Datetime | Yes |
| `completedAt` | Datetime | Yes |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |
| `outputId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphExecutionNodeState records
const items = await db.functionGraphExecutionNodeState.findMany({ select: { createdAt: true, id: true, executionId: true, databaseId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { createdAt: true, id: true, executionId: true, databaseId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } }).execute();

// Create
const created = await db.functionGraphExecutionNodeState.create({ data: { executionId: '<UUID>', databaseId: '<UUID>', nodeName: '<String>', nodePath: '<String>', status: '<String>', startedAt: '<Datetime>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', outputId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { executionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionNodeState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgFunctionInvocation`

CRUD operations for OrgFunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `taskIdentifier` | String | Yes |
| `payload` | JSON | Yes |
| `status` | String | Yes |
| `result` | JSON | Yes |
| `error` | String | Yes |
| `durationMs` | Int | Yes |
| `jobId` | BigInt | Yes |
| `startedAt` | Datetime | Yes |
| `completedAt` | Datetime | Yes |
| `parentInvocationId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |

**Operations:**

```typescript
// List all orgFunctionInvocation records
const items = await db.orgFunctionInvocation.findMany({ select: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Get one by id
const item = await db.orgFunctionInvocation.findOne({ id: '<UUID>', select: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Create
const created = await db.orgFunctionInvocation.create({ data: { actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgFunctionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgFunctionInvocation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionInvocation`

CRUD operations for FunctionInvocation records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `taskIdentifier` | String | Yes |
| `payload` | JSON | Yes |
| `status` | String | Yes |
| `result` | JSON | Yes |
| `error` | String | Yes |
| `durationMs` | Int | Yes |
| `jobId` | BigInt | Yes |
| `startedAt` | Datetime | Yes |
| `completedAt` | Datetime | Yes |
| `parentInvocationId` | UUID | Yes |
| `graphExecutionId` | UUID | Yes |

**Operations:**

```typescript
// List all functionInvocation records
const items = await db.functionInvocation.findMany({ select: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Get one by id
const item = await db.functionInvocation.findOne({ id: '<UUID>', select: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Create
const created = await db.functionInvocation.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionInvocation.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecution`

CRUD operations for FunctionGraphExecution records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `startedAt` | Datetime | Yes |
| `id` | UUID | No |
| `graphId` | UUID | Yes |
| `invocationId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `outputNode` | String | Yes |
| `outputPort` | String | Yes |
| `status` | String | Yes |
| `inputPayload` | JSON | Yes |
| `outputPayload` | JSON | Yes |
| `nodeOutputs` | JSON | Yes |
| `executionPlan` | JSON | Yes |
| `currentWave` | Int | Yes |
| `parentExecutionId` | UUID | Yes |
| `parentNodeName` | String | Yes |
| `definitionsCommitId` | UUID | Yes |
| `tickCount` | Int | Yes |
| `completedAt` | Datetime | Yes |
| `maxTicks` | Int | Yes |
| `maxPendingJobs` | Int | Yes |
| `timeoutAt` | Datetime | Yes |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |

**Operations:**

```typescript
// List all functionGraphExecution records
const items = await db.functionGraphExecution.findMany({ select: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } }).execute();

// Get one by id
const item = await db.functionGraphExecution.findOne({ id: '<UUID>', select: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } }).execute();

// Create
const created = await db.functionGraphExecution.create({ data: { startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', databaseId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { startedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDefinition`

CRUD operations for FunctionDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `scope` | String | Yes |
| `name` | String | Yes |
| `taskIdentifier` | String | Yes |
| `description` | String | Yes |
| `isInvocable` | Boolean | Yes |
| `maxAttempts` | Int | Yes |
| `priority` | Int | Yes |
| `queueName` | String | Yes |
| `runtime` | String | Yes |
| `image` | String | Yes |
| `concurrency` | Int | Yes |
| `scaleMin` | Int | Yes |
| `scaleMax` | Int | Yes |
| `timeoutSeconds` | Int | Yes |
| `resources` | JSON | Yes |
| `isBuiltIn` | Boolean | Yes |
| `requiredSecrets` | FunctionRequirement | Yes |
| `requiredConfigs` | FunctionRequirement | Yes |
| `requiredBuckets` | String | Yes |
| `requiredModels` | String | Yes |
| `inputs` | JSON | Yes |
| `outputs` | JSON | Yes |
| `props` | JSON | Yes |
| `volatile` | Boolean | Yes |
| `icon` | String | Yes |
| `category` | String | Yes |

**Operations:**

```typescript
// List all functionDefinition records
const items = await db.functionDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } }).execute();

// Get one by id
const item = await db.functionDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } }).execute();

// Create
const created = await db.functionDefinition.create({ data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isInvocable: '<Boolean>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<FunctionRequirement>', requiredConfigs: '<FunctionRequirement>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDefinition.update({ where: { id: '<UUID>' }, data: { scope: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDefinition.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.mutation.setDataAtPath`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

```typescript
const result = await db.mutation.setDataAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
```

### `db.mutation.importDefinitions`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportDefinitionsInput (required) |

```typescript
const result = await db.mutation.importDefinitions({ input: { graphId: '<UUID>', sourceScopeId: '<UUID>', sourceCommitId: '<UUID>', contexts: '<String>' } }).execute();
```

### `db.mutation.copyGraph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyGraphInput (required) |

```typescript
const result = await db.mutation.copyGraph({ input: { databaseId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute();
```

### `db.mutation.saveGraph`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SaveGraphInput (required) |

```typescript
const result = await db.mutation.saveGraph({ input: { graphId: '<UUID>', rootHash: '<UUID>', message: '<String>' } }).execute();
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
