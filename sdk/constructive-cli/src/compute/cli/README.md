# csdk CLI

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```bash
# Create a context pointing at your GraphQL endpoint
csdk context create production --endpoint https://api.example.com/graphql

# Set the active context
csdk context use production

# Authenticate
csdk auth set-token <your-token>
```

## Commands

| Command | Description |
|---------|-------------|
| `context` | Manage API contexts (endpoints) |
| `auth` | Manage authentication tokens |
| `config` | Manage config key-value store (per-context) |
| `get-all-record` | getAllRecord CRUD operations |
| `function-api-binding` | functionApiBinding CRUD operations |
| `function-deployment` | functionDeployment CRUD operations |
| `function-graph-ref` | functionGraphRef CRUD operations |
| `function-graph-store` | functionGraphStore CRUD operations |
| `function-graph-object` | functionGraphObject CRUD operations |
| `function-deployment-event` | functionDeploymentEvent CRUD operations |
| `org-function-execution-log` | orgFunctionExecutionLog CRUD operations |
| `function-graph-execution-output` | functionGraphExecutionOutput CRUD operations |
| `function-graph-commit` | functionGraphCommit CRUD operations |
| `secret-definition` | secretDefinition CRUD operations |
| `function-execution-log` | functionExecutionLog CRUD operations |
| `function-graph-execution-node-state` | functionGraphExecutionNodeState CRUD operations |
| `function-graph` | functionGraph CRUD operations |
| `org-function-invocation` | orgFunctionInvocation CRUD operations |
| `function-invocation` | functionInvocation CRUD operations |
| `function-graph-execution` | functionGraphExecution CRUD operations |
| `function-definition` | functionDefinition CRUD operations |
| `read-function-graph` | readFunctionGraph |
| `validate-function-graph` | validateFunctionGraph |
| `init-empty-repo` | initEmptyRepo |
| `set-data-at-path` | setDataAtPath |
| `import-definitions` | importDefinitions |
| `copy-graph` | copyGraph |
| `save-graph` | saveGraph |
| `add-edge-and-save` | addEdgeAndSave |
| `add-node-and-save` | addNodeAndSave |
| `add-edge` | addEdge |
| `add-node` | addNode |
| `import-graph-json` | importGraphJson |
| `insert-node-at-path` | insertNodeAtPath |
| `start-execution` | startExecution |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Infrastructure Commands

### `context`

Manage named API contexts (kubectl-style).

| Subcommand | Description |
|------------|-------------|
| `create <name> --endpoint <url>` | Create a new context |
| `list` | List all contexts |
| `use <name>` | Set the active context |
| `current` | Show current context |
| `delete <name>` | Delete a context |

Configuration is stored at `~/.csdk/config/`.

### `auth`

Manage authentication tokens per context.

| Subcommand | Description |
|------------|-------------|
| `set-token <token>` | Store bearer token for current context |
| `status` | Show auth status across all contexts |
| `logout` | Remove credentials for current context |

### `config`

Manage per-context key-value configuration variables.

| Subcommand | Description |
|------------|-------------|
| `get <key>` | Get a config value |
| `set <key> <value>` | Set a config value |
| `list` | List all config values |
| `delete <key>` | Delete a config value |

Variables are scoped to the active context and stored at `~/.csdk/config/`.

## Table Commands

### `get-all-record`

CRUD operations for GetAllRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all getAllRecord records |
| `find-first` | Find first matching getAllRecord record |
| `get` | Get a getAllRecord by id |
| `create` | Create a new getAllRecord |
| `update` | Update an existing getAllRecord |
| `delete` | Delete a getAllRecord |

**Fields:**

| Field | Type |
|-------|------|
| `path` | String |
| `data` | JSON |

**Required create fields:** `path`, `data`

### `function-api-binding`

CRUD operations for FunctionApiBinding records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionApiBinding records |
| `find-first` | Find first matching functionApiBinding record |
| `get` | Get a functionApiBinding by id |
| `create` | Create a new functionApiBinding |
| `update` | Update an existing functionApiBinding |
| `delete` | Delete a functionApiBinding |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `functionDefinitionId` | UUID |
| `apiId` | UUID |
| `alias` | String |
| `config` | JSON |

**Required create fields:** `functionDefinitionId`, `apiId`
**Optional create fields (backend defaults):** `alias`, `config`

### `function-deployment`

CRUD operations for FunctionDeployment records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionDeployment records |
| `find-first` | Find first matching functionDeployment record |
| `get` | Get a functionDeployment by id |
| `create` | Create a new functionDeployment |
| `update` | Update an existing functionDeployment |
| `delete` | Delete a functionDeployment |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `functionDefinitionId` | UUID |
| `namespaceId` | UUID |
| `status` | String |
| `serviceUrl` | String |
| `serviceName` | String |
| `revision` | Int |
| `image` | String |
| `concurrency` | Int |
| `scaleMin` | Int |
| `scaleMax` | Int |
| `timeoutSeconds` | Int |
| `resources` | JSON |
| `lastError` | String |
| `lastErrorAt` | Datetime |
| `errorCount` | Int |
| `labels` | JSON |
| `annotations` | JSON |
| `databaseId` | UUID |

**Required create fields:** `functionDefinitionId`, `namespaceId`, `databaseId`
**Optional create fields (backend defaults):** `status`, `serviceUrl`, `serviceName`, `revision`, `image`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `lastError`, `lastErrorAt`, `errorCount`, `labels`, `annotations`

### `function-graph-ref`

CRUD operations for FunctionGraphRef records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphRef records |
| `find-first` | Find first matching functionGraphRef record |
| `get` | Get a functionGraphRef by id |
| `create` | Create a new functionGraphRef |
| `update` | Update an existing functionGraphRef |
| `delete` | Delete a functionGraphRef |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `storeId` | UUID |
| `commitId` | UUID |

**Required create fields:** `name`, `databaseId`, `storeId`
**Optional create fields (backend defaults):** `commitId`

### `function-graph-store`

CRUD operations for FunctionGraphStore records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphStore records |
| `find-first` | Find first matching functionGraphStore record |
| `get` | Get a functionGraphStore by id |
| `create` | Create a new functionGraphStore |
| `update` | Update an existing functionGraphStore |
| `delete` | Delete a functionGraphStore |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `hash` | UUID |
| `createdAt` | Datetime |

**Required create fields:** `name`, `databaseId`
**Optional create fields (backend defaults):** `hash`

### `function-graph-object`

CRUD operations for FunctionGraphObject records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphObject records |
| `find-first` | Find first matching functionGraphObject record |
| `get` | Get a functionGraphObject by id |
| `create` | Create a new functionGraphObject |
| `update` | Update an existing functionGraphObject |
| `delete` | Delete a functionGraphObject |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `data` | JSON |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `kids`, `ktree`, `data`

### `function-deployment-event`

CRUD operations for FunctionDeploymentEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionDeploymentEvent records |
| `find-first` | Find first matching functionDeploymentEvent record |
| `get` | Get a functionDeploymentEvent by id |
| `create` | Create a new functionDeploymentEvent |
| `update` | Update an existing functionDeploymentEvent |
| `delete` | Delete a functionDeploymentEvent |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `deploymentId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |
| `databaseId` | UUID |

**Required create fields:** `deploymentId`, `eventType`, `databaseId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

### `org-function-execution-log`

CRUD operations for OrgFunctionExecutionLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgFunctionExecutionLog records |
| `find-first` | Find first matching orgFunctionExecutionLog record |
| `get` | Get a orgFunctionExecutionLog by id |
| `create` | Create a new orgFunctionExecutionLog |
| `update` | Update an existing orgFunctionExecutionLog |
| `delete` | Delete a orgFunctionExecutionLog |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `invocationId` | UUID |
| `taskIdentifier` | String |
| `logLevel` | String |
| `message` | String |
| `metadata` | JSON |
| `actorId` | UUID |

**Required create fields:** `message`
**Optional create fields (backend defaults):** `invocationId`, `taskIdentifier`, `logLevel`, `metadata`, `actorId`

### `function-graph-execution-output`

CRUD operations for FunctionGraphExecutionOutput records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphExecutionOutput records |
| `find-first` | Find first matching functionGraphExecutionOutput record |
| `get` | Get a functionGraphExecutionOutput by id |
| `create` | Create a new functionGraphExecutionOutput |
| `update` | Update an existing functionGraphExecutionOutput |
| `delete` | Delete a functionGraphExecutionOutput |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `databaseId` | UUID |
| `hash` | Base64EncodedBinary |
| `data` | JSON |

**Required create fields:** `databaseId`, `hash`, `data`

### `function-graph-commit`

CRUD operations for FunctionGraphCommit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphCommit records |
| `find-first` | Find first matching functionGraphCommit record |
| `get` | Get a functionGraphCommit by id |
| `create` | Create a new functionGraphCommit |
| `update` | Update an existing functionGraphCommit |
| `delete` | Delete a functionGraphCommit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `message` | String |
| `databaseId` | UUID |
| `storeId` | UUID |
| `parentIds` | UUID |
| `authorId` | UUID |
| `committerId` | UUID |
| `treeId` | UUID |
| `date` | Datetime |

**Required create fields:** `databaseId`, `storeId`
**Optional create fields (backend defaults):** `message`, `parentIds`, `authorId`, `committerId`, `treeId`, `date`

### `secret-definition`

CRUD operations for SecretDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all secretDefinition records |
| `find-first` | Find first matching secretDefinition record |
| `get` | Get a secretDefinition by id |
| `create` | Create a new secretDefinition |
| `update` | Update an existing secretDefinition |
| `delete` | Delete a secretDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `name` | String |
| `description` | String |
| `isBuiltIn` | Boolean |
| `labels` | JSON |
| `annotations` | JSON |
| `databaseId` | UUID |

**Required create fields:** `name`, `databaseId`
**Optional create fields (backend defaults):** `description`, `isBuiltIn`, `labels`, `annotations`

### `function-execution-log`

CRUD operations for FunctionExecutionLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionExecutionLog records |
| `find-first` | Find first matching functionExecutionLog record |
| `get` | Get a functionExecutionLog by id |
| `create` | Create a new functionExecutionLog |
| `update` | Update an existing functionExecutionLog |
| `delete` | Delete a functionExecutionLog |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `invocationId` | UUID |
| `taskIdentifier` | String |
| `logLevel` | String |
| `message` | String |
| `metadata` | JSON |
| `actorId` | UUID |
| `databaseId` | UUID |

**Required create fields:** `message`, `databaseId`
**Optional create fields (backend defaults):** `invocationId`, `taskIdentifier`, `logLevel`, `metadata`, `actorId`

### `function-graph-execution-node-state`

CRUD operations for FunctionGraphExecutionNodeState records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphExecutionNodeState records |
| `find-first` | Find first matching functionGraphExecutionNodeState record |
| `get` | Get a functionGraphExecutionNodeState by id |
| `create` | Create a new functionGraphExecutionNodeState |
| `update` | Update an existing functionGraphExecutionNodeState |
| `delete` | Delete a functionGraphExecutionNodeState |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `executionId` | UUID |
| `databaseId` | UUID |
| `nodeName` | String |
| `nodePath` | String |
| `status` | String |
| `startedAt` | Datetime |
| `completedAt` | Datetime |
| `errorCode` | String |
| `errorMessage` | String |
| `outputId` | UUID |

**Required create fields:** `executionId`, `databaseId`, `nodeName`
**Optional create fields (backend defaults):** `nodePath`, `status`, `startedAt`, `completedAt`, `errorCode`, `errorMessage`, `outputId`

### `function-graph`

CRUD operations for FunctionGraph records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraph records |
| `find-first` | Find first matching functionGraph record |
| `get` | Get a functionGraph by id |
| `create` | Create a new functionGraph |
| `update` | Update an existing functionGraph |
| `delete` | Delete a functionGraph |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `storeId` | UUID |
| `entityId` | UUID |
| `context` | String |
| `name` | String |
| `description` | String |
| `definitionsCommitId` | UUID |
| `isValid` | Boolean |
| `validationErrors` | JSON |
| `createdBy` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `storeId`, `entityId`, `context`, `name`, `description`, `definitionsCommitId`, `isValid`, `validationErrors`, `createdBy`

### `org-function-invocation`

CRUD operations for OrgFunctionInvocation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgFunctionInvocation records |
| `find-first` | Find first matching orgFunctionInvocation record |
| `get` | Get a orgFunctionInvocation by id |
| `create` | Create a new orgFunctionInvocation |
| `update` | Update an existing orgFunctionInvocation |
| `delete` | Delete a orgFunctionInvocation |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `actorId` | UUID |
| `taskIdentifier` | String |
| `payload` | JSON |
| `status` | String |
| `result` | JSON |
| `error` | String |
| `durationMs` | Int |
| `jobId` | BigInt |
| `startedAt` | Datetime |
| `completedAt` | Datetime |
| `parentInvocationId` | UUID |
| `graphExecutionId` | UUID |

**Required create fields:** `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `payload`, `status`, `result`, `error`, `durationMs`, `jobId`, `startedAt`, `completedAt`, `parentInvocationId`, `graphExecutionId`

### `function-invocation`

CRUD operations for FunctionInvocation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionInvocation records |
| `find-first` | Find first matching functionInvocation record |
| `get` | Get a functionInvocation by id |
| `create` | Create a new functionInvocation |
| `update` | Update an existing functionInvocation |
| `delete` | Delete a functionInvocation |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `actorId` | UUID |
| `databaseId` | UUID |
| `taskIdentifier` | String |
| `payload` | JSON |
| `status` | String |
| `result` | JSON |
| `error` | String |
| `durationMs` | Int |
| `jobId` | BigInt |
| `startedAt` | Datetime |
| `completedAt` | Datetime |
| `parentInvocationId` | UUID |
| `graphExecutionId` | UUID |

**Required create fields:** `databaseId`, `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `payload`, `status`, `result`, `error`, `durationMs`, `jobId`, `startedAt`, `completedAt`, `parentInvocationId`, `graphExecutionId`

### `function-graph-execution`

CRUD operations for FunctionGraphExecution records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionGraphExecution records |
| `find-first` | Find first matching functionGraphExecution record |
| `get` | Get a functionGraphExecution by id |
| `create` | Create a new functionGraphExecution |
| `update` | Update an existing functionGraphExecution |
| `delete` | Delete a functionGraphExecution |

**Fields:**

| Field | Type |
|-------|------|
| `startedAt` | Datetime |
| `id` | UUID |
| `graphId` | UUID |
| `invocationId` | UUID |
| `databaseId` | UUID |
| `entityId` | UUID |
| `outputNode` | String |
| `outputPort` | String |
| `status` | String |
| `inputPayload` | JSON |
| `outputPayload` | JSON |
| `nodeOutputs` | JSON |
| `executionPlan` | JSON |
| `currentWave` | Int |
| `parentExecutionId` | UUID |
| `parentNodeName` | String |
| `definitionsCommitId` | UUID |
| `tickCount` | Int |
| `completedAt` | Datetime |
| `maxTicks` | Int |
| `maxPendingJobs` | Int |
| `timeoutAt` | Datetime |
| `errorCode` | String |
| `errorMessage` | String |

**Required create fields:** `graphId`, `databaseId`, `outputNode`
**Optional create fields (backend defaults):** `startedAt`, `invocationId`, `entityId`, `outputPort`, `status`, `inputPayload`, `outputPayload`, `nodeOutputs`, `executionPlan`, `currentWave`, `parentExecutionId`, `parentNodeName`, `definitionsCommitId`, `tickCount`, `completedAt`, `maxTicks`, `maxPendingJobs`, `timeoutAt`, `errorCode`, `errorMessage`

### `function-definition`

CRUD operations for FunctionDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionDefinition records |
| `find-first` | Find first matching functionDefinition record |
| `get` | Get a functionDefinition by id |
| `create` | Create a new functionDefinition |
| `update` | Update an existing functionDefinition |
| `delete` | Delete a functionDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `scope` | String |
| `name` | String |
| `taskIdentifier` | String |
| `description` | String |
| `isInvocable` | Boolean |
| `maxAttempts` | Int |
| `priority` | Int |
| `queueName` | String |
| `runtime` | String |
| `image` | String |
| `concurrency` | Int |
| `scaleMin` | Int |
| `scaleMax` | Int |
| `timeoutSeconds` | Int |
| `resources` | JSON |
| `isBuiltIn` | Boolean |
| `requiredSecrets` | FunctionRequirement |
| `requiredConfigs` | FunctionRequirement |
| `requiredBuckets` | String |
| `requiredModels` | String |
| `inputs` | JSON |
| `outputs` | JSON |
| `props` | JSON |
| `volatile` | Boolean |
| `icon` | String |
| `category` | String |

**Required create fields:** `scope`, `name`, `taskIdentifier`
**Optional create fields (backend defaults):** `description`, `isInvocable`, `maxAttempts`, `priority`, `queueName`, `runtime`, `image`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `isBuiltIn`, `requiredSecrets`, `requiredConfigs`, `requiredBuckets`, `requiredModels`, `inputs`, `outputs`, `props`, `volatile`, `icon`, `category`

## Custom Operations

### `read-function-graph`

readFunctionGraph

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--graphId` | UUID |

### `validate-function-graph`

validateFunctionGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |

### `init-empty-repo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

### `set-data-at-path`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |

### `import-definitions`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.sourceScopeId` | UUID |
  | `--input.sourceCommitId` | UUID |
  | `--input.contexts` | String |

### `copy-graph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.graphId` | UUID |
  | `--input.name` | String |

### `save-graph`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.rootHash` | UUID |
  | `--input.message` | String |

### `add-edge-and-save`

addEdgeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.srcNode` | String |
  | `--input.srcPort` | String |
  | `--input.dstNode` | String |
  | `--input.dstPort` | String |
  | `--input.message` | String |

### `add-node-and-save`

addNodeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.nodeName` | String |
  | `--input.nodeType` | String |
  | `--input.props` | JSON |
  | `--input.meta` | JSON |
  | `--input.message` | String |

### `add-edge`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.rootHash` | UUID |
  | `--input.srcNode` | String |
  | `--input.srcPort` | String |
  | `--input.dstNode` | String |
  | `--input.dstPort` | String |
  | `--input.context` | String |
  | `--input.graphName` | String |

### `add-node`

addNode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.rootHash` | UUID |
  | `--input.nodeName` | String |
  | `--input.nodeType` | String |
  | `--input.context` | String |
  | `--input.graphName` | String |
  | `--input.props` | JSON |
  | `--input.meta` | JSON |

### `import-graph-json`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.name` | String |
  | `--input.graphJson` | JSON |
  | `--input.context` | String |
  | `--input.description` | String |
  | `--input.entityId` | UUID |
  | `--input.createdBy` | UUID |
  | `--input.definitionsCommitId` | UUID |

### `insert-node-at-path`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

### `start-execution`

startExecution

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.inputPayload` | JSON |
  | `--input.outputNode` | String |
  | `--input.outputPort` | String |
  | `--input.maxTicks` | Int |
  | `--input.maxPendingJobs` | Int |
  | `--input.timeoutInterval` | IntervalInput |
  | `--input.parentExecutionId` | UUID |
  | `--input.parentNodeName` | String |

### `provision-bucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.bucketKey` | String (required) |
  | `--input.ownerId` | UUID |

## Output

All commands output JSON to stdout. Pipe to `jq` for formatting:

```bash
csdk car list | jq '.[]'
csdk car get --id <uuid> | jq '.'
```

## Non-Interactive Mode

Use `--no-tty` to skip all interactive prompts (useful for scripts and CI):

```bash
csdk --no-tty car create --name "Sedan" --year 2024
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
