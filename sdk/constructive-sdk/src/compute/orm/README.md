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
| `infraGetAllRecord` | findMany, findOne, create, update, delete |
| `getAllRecord` | findMany, findOne, create, update, delete |
| `infraRef` | findMany, findOne, create, update, delete |
| `infraStore` | findMany, findOne, create, update, delete |
| `functionApiBinding` | findMany, findOne, create, update, delete |
| `functionGraphRef` | findMany, findOne, create, update, delete |
| `functionGraphStore` | findMany, findOne, create, update, delete |
| `platformFunctionApiBinding` | findMany, findOne, create, update, delete |
| `platformResourcesRequirementsState` | findMany, findOne, create, update, delete |
| `resourcesRequirementsState` | findMany, findOne, create, update, delete |
| `platformResourceStatusCheck` | findMany, findOne, create, update, delete |
| `platformFunctionDeployment` | findMany, findOne, create, update, delete |
| `platformResource` | findMany, findOne, create, update, delete |
| `platformResourceDefinition` | findMany, findOne, create, update, delete |
| `infraObject` | findMany, findOne, create, update, delete |
| `functionGraphObject` | findMany, findOne, create, update, delete |
| `platformFunctionDeploymentEvent` | findMany, findOne, create, update, delete |
| `platformResourceEvent` | findMany, findOne, create, update, delete |
| `resourceStatusCheck` | findMany, findOne, create, update, delete |
| `functionDeployment` | findMany, findOne, create, update, delete |
| `resource` | findMany, findOne, create, update, delete |
| `resourceDefinition` | findMany, findOne, create, update, delete |
| `functionDeploymentEvent` | findMany, findOne, create, update, delete |
| `platformFunctionExecutionLog` | findMany, findOne, create, update, delete |
| `resourceEvent` | findMany, findOne, create, update, delete |
| `functionGraphExecutionOutput` | findMany, findOne, create, update, delete |
| `infraCommit` | findMany, findOne, create, update, delete |
| `functionGraphCommit` | findMany, findOne, create, update, delete |
| `functionExecutionLog` | findMany, findOne, create, update, delete |
| `platformResourcesResolvedRequirement` | findMany, findOne, create, update, delete |
| `resourcesResolvedRequirement` | findMany, findOne, create, update, delete |
| `dbPreset` | findMany, findOne, create, update, delete |
| `platformNamespace` | findMany, findOne, create, update, delete |
| `functionGraph` | findMany, findOne, create, update, delete |
| `functionGraphExecutionNodeState` | findMany, findOne, create, update, delete |
| `namespace` | findMany, findOne, create, update, delete |
| `platformFunctionInvocation` | findMany, findOne, create, update, delete |
| `functionInvocation` | findMany, findOne, create, update, delete |
| `platformNamespaceEvent` | findMany, findOne, create, update, delete |
| `integrationProvider` | findMany, findOne, create, update, delete |
| `namespaceEvent` | findMany, findOne, create, update, delete |
| `functionGraphExecution` | findMany, findOne, create, update, delete |
| `platformFunctionDefinition` | findMany, findOne, create, update, delete |
| `functionDefinition` | findMany, findOne, create, update, delete |

## Table Operations

### `db.infraGetAllRecord`

CRUD operations for InfraGetAllRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `path` | String | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all infraGetAllRecord records
const items = await db.infraGetAllRecord.findMany({ select: { path: true, data: true } }).execute();

// Get one by id
const item = await db.infraGetAllRecord.findOne({ id: '<UUID>', select: { path: true, data: true } }).execute();

// Create
const created = await db.infraGetAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraGetAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraGetAllRecord.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.infraRef`

CRUD operations for InfraRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `commitId` | UUID | Yes |

**Operations:**

```typescript
// List all infraRef records
const items = await db.infraRef.findMany({ select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Get one by id
const item = await db.infraRef.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.infraRef.create({ data: { name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraRef.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraRef.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraStore`

CRUD operations for InfraStore records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `hash` | UUID | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all infraStore records
const items = await db.infraStore.findMany({ select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Get one by id
const item = await db.infraStore.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.infraStore.create({ data: { name: '<String>', scopeId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraStore.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraStore.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.functionGraphRef`

CRUD operations for FunctionGraphRef records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `commitId` | UUID | Yes |

**Operations:**

```typescript
// List all functionGraphRef records
const items = await db.functionGraphRef.findMany({ select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Get one by id
const item = await db.functionGraphRef.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, storeId: true, commitId: true } }).execute();

// Create
const created = await db.functionGraphRef.create({ data: { name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute();

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
| `scopeId` | UUID | Yes |
| `hash` | UUID | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all functionGraphStore records
const items = await db.functionGraphStore.findMany({ select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Get one by id
const item = await db.functionGraphStore.findOne({ id: '<UUID>', select: { id: true, name: true, scopeId: true, hash: true, createdAt: true } }).execute();

// Create
const created = await db.functionGraphStore.create({ data: { name: '<String>', scopeId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphStore.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphStore.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionApiBinding`

CRUD operations for PlatformFunctionApiBinding records.

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
// List all platformFunctionApiBinding records
const items = await db.platformFunctionApiBinding.findMany({ select: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } }).execute();

// Get one by id
const item = await db.platformFunctionApiBinding.findOne({ id: '<UUID>', select: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } }).execute();

// Create
const created = await db.platformFunctionApiBinding.create({ data: { functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionApiBinding.update({ where: { id: '<UUID>' }, data: { functionDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionApiBinding.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourcesRequirementsState`

CRUD operations for PlatformResourcesRequirementsState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `resourceId` | UUID | Yes |
| `slug` | String | Yes |
| `secretsHash` | String | Yes |
| `configHash` | String | Yes |
| `requirementsHash` | String | Yes |
| `secretsObjectName` | String | Yes |
| `configObjectName` | String | Yes |

**Operations:**

```typescript
// List all platformResourcesRequirementsState records
const items = await db.platformResourcesRequirementsState.findMany({ select: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } }).execute();

// Get one by id
const item = await db.platformResourcesRequirementsState.findOne({ id: '<UUID>', select: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } }).execute();

// Create
const created = await db.platformResourcesRequirementsState.create({ data: { resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourcesRequirementsState`

CRUD operations for ResourcesRequirementsState records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `resourceId` | UUID | Yes |
| `slug` | String | Yes |
| `secretsHash` | String | Yes |
| `configHash` | String | Yes |
| `requirementsHash` | String | Yes |
| `secretsObjectName` | String | Yes |
| `configObjectName` | String | Yes |

**Operations:**

```typescript
// List all resourcesRequirementsState records
const items = await db.resourcesRequirementsState.findMany({ select: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } }).execute();

// Get one by id
const item = await db.resourcesRequirementsState.findOne({ id: '<UUID>', select: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } }).execute();

// Create
const created = await db.resourcesRequirementsState.create({ data: { resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceStatusCheck`

CRUD operations for PlatformResourceStatusCheck records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `resourceId` | UUID | Yes |
| `requestedBy` | UUID | Yes |
| `requestedAt` | Datetime | Yes |
| `completedAt` | Datetime | Yes |
| `status` | String | Yes |
| `result` | JSON | Yes |

**Operations:**

```typescript
// List all platformResourceStatusCheck records
const items = await db.platformResourceStatusCheck.findMany({ select: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } }).execute();

// Get one by id
const item = await db.platformResourceStatusCheck.findOne({ id: '<UUID>', select: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } }).execute();

// Create
const created = await db.platformResourceStatusCheck.create({ data: { resourceId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceStatusCheck.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDeployment`

CRUD operations for PlatformFunctionDeployment records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `namespaceId` | UUID | Yes |
| `status` | String | Yes |
| `serviceUrl` | String | Yes |
| `serviceName` | String | Yes |
| `revision` | Int | Yes |
| `image` | String | Yes |
| `imageVersion` | String | Yes |
| `handlerName` | String | Yes |
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

**Operations:**

```typescript
// List all platformFunctionDeployment records
const items = await db.platformFunctionDeployment.findMany({ select: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } }).execute();

// Get one by id
const item = await db.platformFunctionDeployment.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } }).execute();

// Create
const created = await db.platformFunctionDeployment.create({ data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDeployment.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDeployment.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResource`

CRUD operations for PlatformResource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `namespaceId` | UUID | Yes |
| `kind` | String | Yes |
| `name` | String | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `lastError` | String | Yes |
| `errorCount` | Int | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
| `resourceDefinitionId` | UUID | Yes |

**Operations:**

```typescript
// List all platformResource records
const items = await db.platformResource.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } }).execute();

// Get one by id
const item = await db.platformResource.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } }).execute();

// Create
const created = await db.platformResource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResource.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceDefinition`

CRUD operations for PlatformResourceDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `namespaceId` | UUID | Yes |
| `kind` | String | Yes |
| `name` | String | Yes |
| `slug` | String | Yes |
| `description` | String | Yes |
| `defaultSpec` | JSON | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `stepUpMinAge` | Interval | Yes |

**Operations:**

```typescript
// List all platformResourceDefinition records
const items = await db.platformResourceDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } }).execute();

// Get one by id
const item = await db.platformResourceDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } }).execute();

// Create
const created = await db.platformResourceDefinition.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceDefinition.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceDefinition.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraObject`

CRUD operations for InfraObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `scopeId` | UUID | Yes |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `data` | JSON | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all infraObject records
const items = await db.infraObject.findMany({ select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Get one by id
const item = await db.infraObject.findOne({ id: '<UUID>', select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Create
const created = await db.infraObject.create({ data: { scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraObject.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphObject`

CRUD operations for FunctionGraphObject records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `scopeId` | UUID | Yes |
| `kids` | UUID | Yes |
| `ktree` | String | Yes |
| `data` | JSON | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all functionGraphObject records
const items = await db.functionGraphObject.findMany({ select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Get one by id
const item = await db.functionGraphObject.findOne({ id: '<UUID>', select: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } }).execute();

// Create
const created = await db.functionGraphObject.create({ data: { scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphObject.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphObject.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDeploymentEvent`

CRUD operations for PlatformFunctionDeploymentEvent records.

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

**Operations:**

```typescript
// List all platformFunctionDeploymentEvent records
const items = await db.platformFunctionDeploymentEvent.findMany({ select: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } }).execute();

// Get one by id
const item = await db.platformFunctionDeploymentEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } }).execute();

// Create
const created = await db.platformFunctionDeploymentEvent.create({ data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { deploymentId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformResourceEvent`

CRUD operations for PlatformResourceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `resourceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |

**Operations:**

```typescript
// List all platformResourceEvent records
const items = await db.platformResourceEvent.findMany({ select: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } }).execute();

// Get one by id
const item = await db.platformResourceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } }).execute();

// Create
const created = await db.platformResourceEvent.create({ data: { resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourceEvent.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceStatusCheck`

CRUD operations for ResourceStatusCheck records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `resourceId` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `requestedBy` | UUID | Yes |
| `requestedAt` | Datetime | Yes |
| `completedAt` | Datetime | Yes |
| `status` | String | Yes |
| `result` | JSON | Yes |

**Operations:**

```typescript
// List all resourceStatusCheck records
const items = await db.resourceStatusCheck.findMany({ select: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } }).execute();

// Get one by id
const item = await db.resourceStatusCheck.findOne({ id: '<UUID>', select: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } }).execute();

// Create
const created = await db.resourceStatusCheck.create({ data: { resourceId: '<UUID>', databaseId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceStatusCheck.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionDeployment`

CRUD operations for FunctionDeployment records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `namespaceId` | UUID | Yes |
| `status` | String | Yes |
| `serviceUrl` | String | Yes |
| `serviceName` | String | Yes |
| `revision` | Int | Yes |
| `image` | String | Yes |
| `imageVersion` | String | Yes |
| `handlerName` | String | Yes |
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
const items = await db.functionDeployment.findMany({ select: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } }).execute();

// Get one by id
const item = await db.functionDeployment.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } }).execute();

// Create
const created = await db.functionDeployment.create({ data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionDeployment.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionDeployment.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resource`

CRUD operations for Resource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `namespaceId` | UUID | Yes |
| `kind` | String | Yes |
| `name` | String | Yes |
| `slug` | String | Yes |
| `spec` | JSON | Yes |
| `status` | String | Yes |
| `statusObserved` | JSON | Yes |
| `lastError` | String | Yes |
| `errorCount` | Int | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
| `resourceDefinitionId` | UUID | Yes |

**Operations:**

```typescript
// List all resource records
const items = await db.resource.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } }).execute();

// Get one by id
const item = await db.resource.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } }).execute();

// Create
const created = await db.resource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resource.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceDefinition`

CRUD operations for ResourceDefinition records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `namespaceId` | UUID | Yes |
| `kind` | String | Yes |
| `name` | String | Yes |
| `slug` | String | Yes |
| `description` | String | Yes |
| `defaultSpec` | JSON | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `stepUpMinAge` | Interval | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all resourceDefinition records
const items = await db.resourceDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } }).execute();

// Get one by id
const item = await db.resourceDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } }).execute();

// Create
const created = await db.resourceDefinition.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceDefinition.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceDefinition.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.platformFunctionExecutionLog`

CRUD operations for PlatformFunctionExecutionLog records.

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
// List all platformFunctionExecutionLog records
const items = await db.platformFunctionExecutionLog.findMany({ select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } }).execute();

// Get one by id
const item = await db.platformFunctionExecutionLog.findOne({ id: '<UUID>', select: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } }).execute();

// Create
const created = await db.platformFunctionExecutionLog.create({ data: { invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionExecutionLog.update({ where: { id: '<UUID>' }, data: { invocationId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionExecutionLog.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourceEvent`

CRUD operations for ResourceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `resourceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all resourceEvent records
const items = await db.resourceEvent.findMany({ select: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } }).execute();

// Get one by id
const item = await db.resourceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } }).execute();

// Create
const created = await db.resourceEvent.create({ data: { resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourceEvent.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphExecutionOutput`

CRUD operations for FunctionGraphExecutionOutput records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `scopeId` | UUID | Yes |
| `hash` | Base64EncodedBinary | Yes |
| `data` | JSON | Yes |

**Operations:**

```typescript
// List all functionGraphExecutionOutput records
const items = await db.functionGraphExecutionOutput.findMany({ select: { createdAt: true, id: true, scopeId: true, hash: true, data: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionOutput.findOne({ id: '<UUID>', select: { createdAt: true, id: true, scopeId: true, hash: true, data: true } }).execute();

// Create
const created = await db.functionGraphExecutionOutput.create({ data: { scopeId: '<UUID>', hash: '<Base64EncodedBinary>', data: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionOutput.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionOutput.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.infraCommit`

CRUD operations for InfraCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `message` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `parentIds` | UUID | Yes |
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `treeId` | UUID | Yes |
| `date` | Datetime | Yes |

**Operations:**

```typescript
// List all infraCommit records
const items = await db.infraCommit.findMany({ select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Get one by id
const item = await db.infraCommit.findOne({ id: '<UUID>', select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.infraCommit.create({ data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.infraCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.infraCommit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraphCommit`

CRUD operations for FunctionGraphCommit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `message` | String | Yes |
| `scopeId` | UUID | Yes |
| `storeId` | UUID | Yes |
| `parentIds` | UUID | Yes |
| `authorId` | UUID | Yes |
| `committerId` | UUID | Yes |
| `treeId` | UUID | Yes |
| `date` | Datetime | Yes |

**Operations:**

```typescript
// List all functionGraphCommit records
const items = await db.functionGraphCommit.findMany({ select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Get one by id
const item = await db.functionGraphCommit.findOne({ id: '<UUID>', select: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } }).execute();

// Create
const created = await db.functionGraphCommit.create({ data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphCommit.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.platformResourcesResolvedRequirement`

CRUD operations for PlatformResourcesResolvedRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `resourceId` | UUID | Yes |
| `slug` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requirementKind` | String | Yes |
| `name` | String | Yes |
| `required` | Boolean | Yes |
| `atomId` | UUID | Yes |
| `present` | Boolean | Yes |
| `secretsObjectName` | String | Yes |
| `configObjectName` | String | Yes |

**Operations:**

```typescript
// List all platformResourcesResolvedRequirement records
const items = await db.platformResourcesResolvedRequirement.findMany({ select: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } }).execute();

// Get one by id
const item = await db.platformResourcesResolvedRequirement.findOne({ id: '<UUID>', select: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } }).execute();

// Create
const created = await db.platformResourcesResolvedRequirement.create({ data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformResourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformResourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.resourcesResolvedRequirement`

CRUD operations for ResourcesResolvedRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `resourceId` | UUID | Yes |
| `slug` | String | Yes |
| `namespaceId` | UUID | Yes |
| `requirementKind` | String | Yes |
| `name` | String | Yes |
| `required` | Boolean | Yes |
| `atomId` | UUID | Yes |
| `present` | Boolean | Yes |
| `secretsObjectName` | String | Yes |
| `configObjectName` | String | Yes |

**Operations:**

```typescript
// List all resourcesResolvedRequirement records
const items = await db.resourcesResolvedRequirement.findMany({ select: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } }).execute();

// Get one by id
const item = await db.resourcesResolvedRequirement.findOne({ id: '<UUID>', select: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } }).execute();

// Create
const created = await db.resourcesResolvedRequirement.create({ data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.resourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.resourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.dbPreset`

CRUD operations for DbPreset records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `storeId` | UUID | Yes |
| `slug` | String | Yes |
| `definition` | JSON | Yes |
| `commitId` | UUID | Yes |
| `modulesHash` | UUID | Yes |
| `label` | String | Yes |
| `description` | String | Yes |
| `active` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all dbPreset records
const items = await db.dbPreset.findMany({ select: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.dbPreset.findOne({ id: '<UUID>', select: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.dbPreset.create({ data: { storeId: '<UUID>', slug: '<String>', definition: '<JSON>', commitId: '<UUID>', modulesHash: '<UUID>', label: '<String>', description: '<String>', active: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.dbPreset.update({ where: { id: '<UUID>' }, data: { storeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.dbPreset.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformNamespace`

CRUD operations for PlatformNamespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `description` | String | Yes |
| `isActive` | Boolean | Yes |
| `status` | String | Yes |
| `lastError` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `isManaged` | Boolean | Yes |

**Operations:**

```typescript
// List all platformNamespace records
const items = await db.platformNamespace.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } }).execute();

// Get one by id
const item = await db.platformNamespace.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } }).execute();

// Create
const created = await db.platformNamespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', isManaged: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.functionGraph`

CRUD operations for FunctionGraph records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `scopeId` | UUID | Yes |
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
const items = await db.functionGraph.findMany({ select: { id: true, scopeId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.functionGraph.findOne({ id: '<UUID>', select: { id: true, scopeId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.functionGraph.create({ data: { scopeId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraph.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute();

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
| `scopeId` | UUID | Yes |
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
const items = await db.functionGraphExecutionNodeState.findMany({ select: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } }).execute();

// Get one by id
const item = await db.functionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } }).execute();

// Create
const created = await db.functionGraphExecutionNodeState.create({ data: { executionId: '<UUID>', scopeId: '<UUID>', nodeName: '<String>', nodePath: '<String>', status: '<String>', startedAt: '<Datetime>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', outputId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { executionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecutionNodeState.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespace`

CRUD operations for Namespace records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `name` | String | Yes |
| `namespaceName` | String | Yes |
| `description` | String | Yes |
| `isActive` | Boolean | Yes |
| `status` | String | Yes |
| `lastError` | String | Yes |
| `labels` | JSON | Yes |
| `annotations` | JSON | Yes |
| `databaseId` | UUID | Yes |
| `isManaged` | Boolean | Yes |

**Operations:**

```typescript
// List all namespace records
const items = await db.namespace.findMany({ select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } }).execute();

// Get one by id
const item = await db.namespace.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } }).execute();

// Create
const created = await db.namespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespace.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionInvocation`

CRUD operations for PlatformFunctionInvocation records.

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
// List all platformFunctionInvocation records
const items = await db.platformFunctionInvocation.findMany({ select: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Get one by id
const item = await db.platformFunctionInvocation.findOne({ id: '<UUID>', select: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } }).execute();

// Create
const created = await db.platformFunctionInvocation.create({ data: { actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionInvocation.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.platformNamespaceEvent`

CRUD operations for PlatformNamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `cpuMillicores` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `storageBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `metrics` | JSON | Yes |

**Operations:**

```typescript
// List all platformNamespaceEvent records
const items = await db.platformNamespaceEvent.findMany({ select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } }).execute();

// Get one by id
const item = await db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } }).execute();

// Create
const created = await db.platformNamespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.integrationProvider`

CRUD operations for IntegrationProvider records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `slug` | String | Yes |
| `name` | String | Yes |
| `description` | String | Yes |
| `category` | String | Yes |
| `icon` | String | Yes |
| `logo` | ConstructiveInternalTypeImage | Yes |
| `brand` | JSON | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |

**Operations:**

```typescript
// List all integrationProvider records
const items = await db.integrationProvider.findMany({ select: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } }).execute();

// Get one by id
const item = await db.integrationProvider.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } }).execute();

// Create
const created = await db.integrationProvider.create({ data: { slug: '<String>', name: '<String>', description: '<String>', category: '<String>', icon: '<String>', logo: '<Image>', brand: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>' }, select: { id: true } }).execute();

// Update
const updated = await db.integrationProvider.update({ where: { id: '<UUID>' }, data: { slug: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.integrationProvider.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.namespaceEvent`

CRUD operations for NamespaceEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `namespaceId` | UUID | Yes |
| `eventType` | String | Yes |
| `actorId` | UUID | Yes |
| `message` | String | Yes |
| `metadata` | JSON | Yes |
| `cpuMillicores` | Int | Yes |
| `memoryBytes` | BigInt | Yes |
| `storageBytes` | BigInt | Yes |
| `networkIngressBytes` | BigInt | Yes |
| `networkEgressBytes` | BigInt | Yes |
| `podCount` | Int | Yes |
| `metrics` | JSON | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all namespaceEvent records
const items = await db.namespaceEvent.findMany({ select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } }).execute();

// Get one by id
const item = await db.namespaceEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } }).execute();

// Create
const created = await db.namespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute();
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
| `scopeId` | UUID | Yes |
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
| `lastProgressAt` | Datetime | Yes |
| `errorCode` | String | Yes |
| `errorMessage` | String | Yes |

**Operations:**

```typescript
// List all functionGraphExecution records
const items = await db.functionGraphExecution.findMany({ select: { startedAt: true, id: true, graphId: true, invocationId: true, scopeId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, lastProgressAt: true, errorCode: true, errorMessage: true } }).execute();

// Get one by id
const item = await db.functionGraphExecution.findOne({ id: '<UUID>', select: { startedAt: true, id: true, graphId: true, invocationId: true, scopeId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, lastProgressAt: true, errorCode: true, errorMessage: true } }).execute();

// Create
const created = await db.functionGraphExecution.create({ data: { startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', scopeId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', lastProgressAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { startedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.platformFunctionDefinition`

CRUD operations for PlatformFunctionDefinition records.

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
| `isPublished` | Boolean | Yes |
| `accessChannels` | String | Yes |
| `publishedAt` | Datetime | Yes |
| `maxAttempts` | Int | Yes |
| `priority` | Int | Yes |
| `queueName` | String | Yes |
| `runtime` | String | Yes |
| `targetSchema` | String | Yes |
| `targetFunction` | String | Yes |
| `moduleTable` | String | Yes |
| `functionColumns` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `image` | String | Yes |
| `concurrency` | Int | Yes |
| `scaleMin` | Int | Yes |
| `scaleMax` | Int | Yes |
| `timeoutSeconds` | Int | Yes |
| `resources` | JSON | Yes |
| `isBuiltIn` | Boolean | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
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
// List all platformFunctionDefinition records
const items = await db.platformFunctionDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } }).execute();

// Get one by id
const item = await db.platformFunctionDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } }).execute();

// Create
const created = await db.platformFunctionDefinition.create({ data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.platformFunctionDefinition.update({ where: { id: '<UUID>' }, data: { scope: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.platformFunctionDefinition.delete({ where: { id: '<UUID>' } }).execute();
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
| `isPublished` | Boolean | Yes |
| `accessChannels` | String | Yes |
| `publishedAt` | Datetime | Yes |
| `maxAttempts` | Int | Yes |
| `priority` | Int | Yes |
| `queueName` | String | Yes |
| `runtime` | String | Yes |
| `targetSchema` | String | Yes |
| `targetFunction` | String | Yes |
| `moduleTable` | String | Yes |
| `functionColumns` | JSON | Yes |
| `payloadArgs` | JSON | Yes |
| `image` | String | Yes |
| `concurrency` | Int | Yes |
| `scaleMin` | Int | Yes |
| `scaleMax` | Int | Yes |
| `timeoutSeconds` | Int | Yes |
| `resources` | JSON | Yes |
| `isBuiltIn` | Boolean | Yes |
| `requiredSecrets` | ResourceRequirement | Yes |
| `requiredConfigs` | ResourceRequirement | Yes |
| `integrations` | String | Yes |
| `requiredBuckets` | String | Yes |
| `requiredModels` | String | Yes |
| `inputs` | JSON | Yes |
| `outputs` | JSON | Yes |
| `props` | JSON | Yes |
| `volatile` | Boolean | Yes |
| `icon` | String | Yes |
| `category` | String | Yes |
| `databaseId` | UUID | Yes |

**Operations:**

```typescript
// List all functionDefinition records
const items = await db.functionDefinition.findMany({ select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } }).execute();

// Get one by id
const item = await db.functionDefinition.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } }).execute();

// Create
const created = await db.functionDefinition.create({ data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>', databaseId: '<UUID>' }, select: { id: true } }).execute();

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

### `db.mutation.infraSetDataAtPath`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

```typescript
const result = await db.mutation.infraSetDataAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
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

### `db.mutation.copyGraph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyGraphInput (required) |

```typescript
const result = await db.mutation.copyGraph({ input: { scopeId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute();
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
