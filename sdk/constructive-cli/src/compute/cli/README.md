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
| `db-preset` | dbPreset CRUD operations |
| `function-api-binding` | functionApiBinding CRUD operations |
| `function-definition` | functionDefinition CRUD operations |
| `function-deployment` | functionDeployment CRUD operations |
| `function-deployment-event` | functionDeploymentEvent CRUD operations |
| `function-execution-log` | functionExecutionLog CRUD operations |
| `function-graph-commit` | functionGraphCommit CRUD operations |
| `function-graph` | functionGraph CRUD operations |
| `function-graph-execution` | functionGraphExecution CRUD operations |
| `function-graph-execution-node-state` | functionGraphExecutionNodeState CRUD operations |
| `function-graph-execution-output` | functionGraphExecutionOutput CRUD operations |
| `function-graph-object` | functionGraphObject CRUD operations |
| `function-graph-ref` | functionGraphRef CRUD operations |
| `function-graph-store` | functionGraphStore CRUD operations |
| `function-invocation` | functionInvocation CRUD operations |
| `get-all-record` | getAllRecord CRUD operations |
| `infra-commit` | infraCommit CRUD operations |
| `infra-get-all-record` | infraGetAllRecord CRUD operations |
| `infra-object` | infraObject CRUD operations |
| `infra-ref` | infraRef CRUD operations |
| `infra-store` | infraStore CRUD operations |
| `integration-provider` | integrationProvider CRUD operations |
| `namespace` | namespace CRUD operations |
| `namespace-event` | namespaceEvent CRUD operations |
| `platform-function-api-binding` | platformFunctionApiBinding CRUD operations |
| `platform-function-definition` | platformFunctionDefinition CRUD operations |
| `platform-function-deployment` | platformFunctionDeployment CRUD operations |
| `platform-function-deployment-event` | platformFunctionDeploymentEvent CRUD operations |
| `platform-function-execution-log` | platformFunctionExecutionLog CRUD operations |
| `platform-function-invocation` | platformFunctionInvocation CRUD operations |
| `platform-namespace` | platformNamespace CRUD operations |
| `platform-namespace-event` | platformNamespaceEvent CRUD operations |
| `platform-resource` | platformResource CRUD operations |
| `platform-resource-definition` | platformResourceDefinition CRUD operations |
| `platform-resource-event` | platformResourceEvent CRUD operations |
| `platform-resource-status-check` | platformResourceStatusCheck CRUD operations |
| `platform-resources-requirements-state` | platformResourcesRequirementsState CRUD operations |
| `platform-resources-resolved-requirement` | platformResourcesResolvedRequirement CRUD operations |
| `resource` | resource CRUD operations |
| `resource-definition` | resourceDefinition CRUD operations |
| `resource-event` | resourceEvent CRUD operations |
| `resource-status-check` | resourceStatusCheck CRUD operations |
| `resources-requirements-state` | resourcesRequirementsState CRUD operations |
| `resources-resolved-requirement` | resourcesResolvedRequirement CRUD operations |
| `read-function-graph` | readFunctionGraph |
| `add-edge` | addEdge |
| `add-edge-and-save` | addEdgeAndSave |
| `add-node` | addNode |
| `add-node-and-save` | addNodeAndSave |
| `copy-graph` | copyGraph |
| `import-definitions` | importDefinitions |
| `import-graph-json` | importGraphJson |
| `infra-init-empty-repo` | infraInitEmptyRepo |
| `infra-insert-node-at-path` | infraInsertNodeAtPath |
| `infra-set-data-at-path` | infraSetDataAtPath |
| `init-empty-repo` | initEmptyRepo |
| `insert-node-at-path` | insertNodeAtPath |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `save-graph` | saveGraph |
| `set-data-at-path` | setDataAtPath |
| `start-execution` | startExecution |
| `validate-function-graph` | validateFunctionGraph |

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

### `db-preset`

CRUD operations for DbPreset records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all dbPreset records |
| `find-first` | Find first matching dbPreset record |
| `get` | Get a dbPreset by id |
| `create` | Create a new dbPreset |
| `update` | Update an existing dbPreset |
| `delete` | Delete a dbPreset |

**Fields:**

| Field | Type |
|-------|------|
| `active` | Boolean |
| `commitId` | UUID |
| `createdAt` | Datetime |
| `definition` | JSON |
| `description` | String |
| `id` | UUID |
| `label` | String |
| `modulesHash` | UUID |
| `slug` | String |
| `storeId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `definition`, `slug`
**Optional create fields (backend defaults):** `active`, `commitId`, `description`, `label`, `modulesHash`, `storeId`

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
| `alias` | String |
| `apiId` | UUID |
| `config` | JSON |
| `functionDefinitionId` | UUID |
| `id` | UUID |

**Required create fields:** `apiId`, `functionDefinitionId`
**Optional create fields (backend defaults):** `alias`, `config`

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
| `accessChannels` | String |
| `category` | String |
| `concurrency` | Int |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `fnCategory` | String |
| `functionColumns` | JSON |
| `icon` | String |
| `id` | UUID |
| `image` | String |
| `inputs` | JSON |
| `integrations` | String |
| `isPublished` | Boolean |
| `maxAttempts` | Int |
| `moduleTable` | String |
| `name` | String |
| `outputs` | JSON |
| `payloadArgs` | JSON |
| `priority` | Int |
| `props` | JSON |
| `publishedAt` | Datetime |
| `queueName` | String |
| `requiredBuckets` | String |
| `requiredConfigs` | ResourceRequirement |
| `requiredModels` | String |
| `requiredSecrets` | ResourceRequirement |
| `resources` | JSON |
| `runtime` | String |
| `scaleMax` | Int |
| `scaleMin` | Int |
| `targetFunction` | String |
| `targetSchema` | String |
| `taskIdentifier` | String |
| `timeoutSeconds` | Int |
| `updatedAt` | Datetime |
| `volatile` | Boolean |

**Required create fields:** `category`, `databaseId`, `name`, `taskIdentifier`
**Optional create fields (backend defaults):** `accessChannels`, `concurrency`, `description`, `fnCategory`, `functionColumns`, `icon`, `image`, `inputs`, `integrations`, `isPublished`, `maxAttempts`, `moduleTable`, `outputs`, `payloadArgs`, `priority`, `props`, `publishedAt`, `queueName`, `requiredBuckets`, `requiredConfigs`, `requiredModels`, `requiredSecrets`, `resources`, `runtime`, `scaleMax`, `scaleMin`, `targetFunction`, `targetSchema`, `timeoutSeconds`, `volatile`

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
| `annotations` | JSON |
| `concurrency` | Int |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `errorCount` | Int |
| `handlerName` | String |
| `id` | UUID |
| `image` | String |
| `imageVersion` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastErrorAt` | Datetime |
| `namespaceId` | UUID |
| `resources` | JSON |
| `revision` | Int |
| `scaleMax` | Int |
| `scaleMin` | Int |
| `serviceName` | String |
| `serviceUrl` | String |
| `status` | String |
| `timeoutSeconds` | Int |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `image`, `namespaceId`
**Optional create fields (backend defaults):** `annotations`, `concurrency`, `errorCount`, `handlerName`, `imageVersion`, `labels`, `lastError`, `lastErrorAt`, `resources`, `revision`, `scaleMax`, `scaleMin`, `serviceName`, `serviceUrl`, `status`, `timeoutSeconds`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `deploymentId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |

**Required create fields:** `databaseId`, `deploymentId`, `eventType`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `invocationId` | UUID |
| `logLevel` | String |
| `message` | String |
| `metadata` | JSON |
| `taskIdentifier` | String |

**Required create fields:** `databaseId`, `message`
**Optional create fields (backend defaults):** `actorId`, `invocationId`, `logLevel`, `metadata`, `taskIdentifier`

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
| `authorId` | UUID |
| `committerId` | UUID |
| `date` | Datetime |
| `id` | UUID |
| `message` | String |
| `parentIds` | UUID |
| `scopeId` | UUID |
| `storeId` | UUID |
| `treeId` | UUID |

**Required create fields:** `scopeId`, `storeId`
**Optional create fields (backend defaults):** `authorId`, `committerId`, `date`, `message`, `parentIds`, `treeId`

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
| `context` | String |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `definitionsCommitId` | UUID |
| `description` | String |
| `id` | UUID |
| `isValid` | Boolean |
| `name` | String |
| `scopeId` | UUID |
| `storeId` | UUID |
| `updatedAt` | Datetime |
| `validationErrors` | JSON |

**Required create fields:** `context`, `createdBy`, `definitionsCommitId`, `description`, `isValid`, `name`, `scopeId`, `storeId`, `validationErrors`

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
| `completedAt` | Datetime |
| `currentWave` | Int |
| `definitionsCommitId` | UUID |
| `errorCode` | String |
| `errorMessage` | String |
| `executionPlan` | JSON |
| `graphId` | UUID |
| `id` | UUID |
| `inputPayload` | JSON |
| `invocationId` | UUID |
| `lastProgressAt` | Datetime |
| `maxPendingJobs` | Int |
| `maxTicks` | Int |
| `nodeOutputs` | JSON |
| `outputNode` | String |
| `outputPayload` | JSON |
| `outputPort` | String |
| `parentExecutionId` | UUID |
| `parentNodeName` | String |
| `scopeId` | UUID |
| `startedAt` | Datetime |
| `status` | String |
| `tickCount` | Int |
| `timeoutAt` | Datetime |

**Required create fields:** `graphId`, `scopeId`
**Optional create fields (backend defaults):** `completedAt`, `currentWave`, `definitionsCommitId`, `errorCode`, `errorMessage`, `executionPlan`, `inputPayload`, `invocationId`, `lastProgressAt`, `maxPendingJobs`, `maxTicks`, `nodeOutputs`, `outputNode`, `outputPayload`, `outputPort`, `parentExecutionId`, `parentNodeName`, `startedAt`, `status`, `tickCount`, `timeoutAt`

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
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `errorCode` | String |
| `errorMessage` | String |
| `executionId` | UUID |
| `id` | UUID |
| `nodeName` | String |
| `nodePath` | String |
| `outputId` | UUID |
| `scopeId` | UUID |
| `startedAt` | Datetime |
| `status` | String |

**Required create fields:** `executionId`, `nodeName`, `scopeId`
**Optional create fields (backend defaults):** `completedAt`, `errorCode`, `errorMessage`, `nodePath`, `outputId`, `startedAt`, `status`

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
| `data` | JSON |
| `hash` | Base64EncodedBinary |
| `id` | UUID |
| `scopeId` | UUID |

**Required create fields:** `data`, `hash`, `scopeId`

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
| `createdAt` | Datetime |
| `data` | JSON |
| `id` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `scopeId` | UUID |

**Required create fields:** `scopeId`
**Optional create fields (backend defaults):** `data`, `kids`, `ktree`

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
| `commitId` | UUID |
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |
| `storeId` | UUID |

**Required create fields:** `name`, `scopeId`, `storeId`
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
| `createdAt` | Datetime |
| `hash` | UUID |
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |

**Required create fields:** `name`, `scopeId`
**Optional create fields (backend defaults):** `hash`

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
| `actorId` | UUID |
| `apiBindingId` | UUID |
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `durationMs` | Int |
| `error` | String |
| `functionDefinitionId` | UUID |
| `graphExecutionId` | UUID |
| `id` | UUID |
| `jobId` | BigInt |
| `parentInvocationId` | UUID |
| `payload` | JSON |
| `result` | JSON |
| `startedAt` | Datetime |
| `status` | String |
| `taskIdentifier` | String |

**Required create fields:** `databaseId`, `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `apiBindingId`, `completedAt`, `durationMs`, `error`, `functionDefinitionId`, `graphExecutionId`, `jobId`, `parentInvocationId`, `payload`, `result`, `startedAt`, `status`

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
| `data` | JSON |
| `path` | String |

**Required create fields:** `data`, `path`

### `infra-commit`

CRUD operations for InfraCommit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraCommit records |
| `find-first` | Find first matching infraCommit record |
| `get` | Get a infraCommit by id |
| `create` | Create a new infraCommit |
| `update` | Update an existing infraCommit |
| `delete` | Delete a infraCommit |

**Fields:**

| Field | Type |
|-------|------|
| `authorId` | UUID |
| `committerId` | UUID |
| `date` | Datetime |
| `id` | UUID |
| `message` | String |
| `parentIds` | UUID |
| `scopeId` | UUID |
| `storeId` | UUID |
| `treeId` | UUID |

**Required create fields:** `scopeId`, `storeId`
**Optional create fields (backend defaults):** `authorId`, `committerId`, `date`, `message`, `parentIds`, `treeId`

### `infra-get-all-record`

CRUD operations for InfraGetAllRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraGetAllRecord records |
| `find-first` | Find first matching infraGetAllRecord record |
| `get` | Get a infraGetAllRecord by id |
| `create` | Create a new infraGetAllRecord |
| `update` | Update an existing infraGetAllRecord |
| `delete` | Delete a infraGetAllRecord |

**Fields:**

| Field | Type |
|-------|------|
| `data` | JSON |
| `path` | String |

**Required create fields:** `data`, `path`

### `infra-object`

CRUD operations for InfraObject records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraObject records |
| `find-first` | Find first matching infraObject record |
| `get` | Get a infraObject by id |
| `create` | Create a new infraObject |
| `update` | Update an existing infraObject |
| `delete` | Delete a infraObject |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `data` | JSON |
| `id` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `scopeId` | UUID |

**Required create fields:** `scopeId`
**Optional create fields (backend defaults):** `data`, `kids`, `ktree`

### `infra-ref`

CRUD operations for InfraRef records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraRef records |
| `find-first` | Find first matching infraRef record |
| `get` | Get a infraRef by id |
| `create` | Create a new infraRef |
| `update` | Update an existing infraRef |
| `delete` | Delete a infraRef |

**Fields:**

| Field | Type |
|-------|------|
| `commitId` | UUID |
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |
| `storeId` | UUID |

**Required create fields:** `name`, `scopeId`, `storeId`
**Optional create fields (backend defaults):** `commitId`

### `infra-store`

CRUD operations for InfraStore records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraStore records |
| `find-first` | Find first matching infraStore record |
| `get` | Get a infraStore by id |
| `create` | Create a new infraStore |
| `update` | Update an existing infraStore |
| `delete` | Delete a infraStore |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `hash` | UUID |
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |

**Required create fields:** `name`, `scopeId`
**Optional create fields (backend defaults):** `hash`

### `integration-provider`

CRUD operations for IntegrationProvider records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all integrationProvider records |
| `find-first` | Find first matching integrationProvider record |
| `get` | Get a integrationProvider by id |
| `create` | Create a new integrationProvider |
| `update` | Update an existing integrationProvider |
| `delete` | Delete a integrationProvider |

**Fields:**

| Field | Type |
|-------|------|
| `brand` | JSON |
| `category` | String |
| `createdAt` | Datetime |
| `description` | String |
| `icon` | String |
| `id` | UUID |
| `logo` | Image |
| `name` | String |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `slug` | String |
| `updatedAt` | Datetime |

**Required create fields:** `name`, `slug`
**Optional create fields (backend defaults):** `brand`, `category`, `description`, `icon`, `logo`, `requiredConfigs`, `requiredSecrets`

### `namespace`

CRUD operations for Namespace records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all namespace records |
| `find-first` | Find first matching namespace record |
| `get` | Get a namespace by id |
| `create` | Create a new namespace |
| `update` | Update an existing namespace |
| `delete` | Delete a namespace |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `isActive` | Boolean |
| `isManaged` | Boolean |
| `labels` | JSON |
| `lastError` | String |
| `name` | String |
| `namespaceName` | String |
| `status` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`, `namespaceName`
**Optional create fields (backend defaults):** `annotations`, `description`, `isActive`, `isManaged`, `labels`, `lastError`, `status`

### `namespace-event`

CRUD operations for NamespaceEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all namespaceEvent records |
| `find-first` | Find first matching namespaceEvent record |
| `get` | Get a namespaceEvent by id |
| `create` | Create a new namespaceEvent |
| `update` | Update an existing namespaceEvent |
| `delete` | Delete a namespaceEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `cpuMillicores` | Int |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `memoryBytes` | BigInt |
| `message` | String |
| `metadata` | JSON |
| `metrics` | JSON |
| `namespaceId` | UUID |
| `networkEgressBytes` | BigInt |
| `networkIngressBytes` | BigInt |
| `podCount` | Int |
| `storageBytes` | BigInt |

**Required create fields:** `databaseId`, `eventType`, `namespaceId`
**Optional create fields (backend defaults):** `actorId`, `cpuMillicores`, `memoryBytes`, `message`, `metadata`, `metrics`, `networkEgressBytes`, `networkIngressBytes`, `podCount`, `storageBytes`

### `platform-function-api-binding`

CRUD operations for PlatformFunctionApiBinding records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionApiBinding records |
| `find-first` | Find first matching platformFunctionApiBinding record |
| `get` | Get a platformFunctionApiBinding by id |
| `create` | Create a new platformFunctionApiBinding |
| `update` | Update an existing platformFunctionApiBinding |
| `delete` | Delete a platformFunctionApiBinding |

**Fields:**

| Field | Type |
|-------|------|
| `alias` | String |
| `apiId` | UUID |
| `config` | JSON |
| `functionDefinitionId` | UUID |
| `id` | UUID |

**Required create fields:** `apiId`, `functionDefinitionId`
**Optional create fields (backend defaults):** `alias`, `config`

### `platform-function-definition`

CRUD operations for PlatformFunctionDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionDefinition records |
| `find-first` | Find first matching platformFunctionDefinition record |
| `get` | Get a platformFunctionDefinition by id |
| `create` | Create a new platformFunctionDefinition |
| `update` | Update an existing platformFunctionDefinition |
| `delete` | Delete a platformFunctionDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `accessChannels` | String |
| `category` | String |
| `concurrency` | Int |
| `createdAt` | Datetime |
| `description` | String |
| `fnCategory` | String |
| `functionColumns` | JSON |
| `icon` | String |
| `id` | UUID |
| `image` | String |
| `inputs` | JSON |
| `integrations` | String |
| `isPublished` | Boolean |
| `maxAttempts` | Int |
| `moduleTable` | String |
| `name` | String |
| `outputs` | JSON |
| `payloadArgs` | JSON |
| `priority` | Int |
| `props` | JSON |
| `publishedAt` | Datetime |
| `queueName` | String |
| `requiredBuckets` | String |
| `requiredConfigs` | ResourceRequirement |
| `requiredModels` | String |
| `requiredSecrets` | ResourceRequirement |
| `resources` | JSON |
| `runtime` | String |
| `scaleMax` | Int |
| `scaleMin` | Int |
| `targetFunction` | String |
| `targetSchema` | String |
| `taskIdentifier` | String |
| `timeoutSeconds` | Int |
| `updatedAt` | Datetime |
| `volatile` | Boolean |

**Required create fields:** `category`, `name`, `taskIdentifier`
**Optional create fields (backend defaults):** `accessChannels`, `concurrency`, `description`, `fnCategory`, `functionColumns`, `icon`, `image`, `inputs`, `integrations`, `isPublished`, `maxAttempts`, `moduleTable`, `outputs`, `payloadArgs`, `priority`, `props`, `publishedAt`, `queueName`, `requiredBuckets`, `requiredConfigs`, `requiredModels`, `requiredSecrets`, `resources`, `runtime`, `scaleMax`, `scaleMin`, `targetFunction`, `targetSchema`, `timeoutSeconds`, `volatile`

### `platform-function-deployment`

CRUD operations for PlatformFunctionDeployment records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionDeployment records |
| `find-first` | Find first matching platformFunctionDeployment record |
| `get` | Get a platformFunctionDeployment by id |
| `create` | Create a new platformFunctionDeployment |
| `update` | Update an existing platformFunctionDeployment |
| `delete` | Delete a platformFunctionDeployment |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `concurrency` | Int |
| `createdAt` | Datetime |
| `errorCount` | Int |
| `handlerName` | String |
| `id` | UUID |
| `image` | String |
| `imageVersion` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastErrorAt` | Datetime |
| `namespaceId` | UUID |
| `resources` | JSON |
| `revision` | Int |
| `scaleMax` | Int |
| `scaleMin` | Int |
| `serviceName` | String |
| `serviceUrl` | String |
| `status` | String |
| `timeoutSeconds` | Int |
| `updatedAt` | Datetime |

**Required create fields:** `image`, `namespaceId`
**Optional create fields (backend defaults):** `annotations`, `concurrency`, `errorCount`, `handlerName`, `imageVersion`, `labels`, `lastError`, `lastErrorAt`, `resources`, `revision`, `scaleMax`, `scaleMin`, `serviceName`, `serviceUrl`, `status`, `timeoutSeconds`

### `platform-function-deployment-event`

CRUD operations for PlatformFunctionDeploymentEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionDeploymentEvent records |
| `find-first` | Find first matching platformFunctionDeploymentEvent record |
| `get` | Get a platformFunctionDeploymentEvent by id |
| `create` | Create a new platformFunctionDeploymentEvent |
| `update` | Update an existing platformFunctionDeploymentEvent |
| `delete` | Delete a platformFunctionDeploymentEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `deploymentId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |

**Required create fields:** `deploymentId`, `eventType`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

### `platform-function-execution-log`

CRUD operations for PlatformFunctionExecutionLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionExecutionLog records |
| `find-first` | Find first matching platformFunctionExecutionLog record |
| `get` | Get a platformFunctionExecutionLog by id |
| `create` | Create a new platformFunctionExecutionLog |
| `update` | Update an existing platformFunctionExecutionLog |
| `delete` | Delete a platformFunctionExecutionLog |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `id` | UUID |
| `invocationId` | UUID |
| `logLevel` | String |
| `message` | String |
| `metadata` | JSON |
| `taskIdentifier` | String |

**Required create fields:** `message`
**Optional create fields (backend defaults):** `actorId`, `invocationId`, `logLevel`, `metadata`, `taskIdentifier`

### `platform-function-invocation`

CRUD operations for PlatformFunctionInvocation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionInvocation records |
| `find-first` | Find first matching platformFunctionInvocation record |
| `get` | Get a platformFunctionInvocation by id |
| `create` | Create a new platformFunctionInvocation |
| `update` | Update an existing platformFunctionInvocation |
| `delete` | Delete a platformFunctionInvocation |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `apiBindingId` | UUID |
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `durationMs` | Int |
| `error` | String |
| `functionDefinitionId` | UUID |
| `graphExecutionId` | UUID |
| `id` | UUID |
| `jobId` | BigInt |
| `parentInvocationId` | UUID |
| `payload` | JSON |
| `result` | JSON |
| `startedAt` | Datetime |
| `status` | String |
| `taskIdentifier` | String |

**Required create fields:** `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `apiBindingId`, `completedAt`, `durationMs`, `error`, `functionDefinitionId`, `graphExecutionId`, `jobId`, `parentInvocationId`, `payload`, `result`, `startedAt`, `status`

### `platform-namespace`

CRUD operations for PlatformNamespace records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformNamespace records |
| `find-first` | Find first matching platformNamespace record |
| `get` | Get a platformNamespace by id |
| `create` | Create a new platformNamespace |
| `update` | Update an existing platformNamespace |
| `delete` | Delete a platformNamespace |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `description` | String |
| `id` | UUID |
| `isActive` | Boolean |
| `isManaged` | Boolean |
| `labels` | JSON |
| `lastError` | String |
| `name` | String |
| `namespaceName` | String |
| `status` | String |
| `updatedAt` | Datetime |

**Required create fields:** `name`, `namespaceName`
**Optional create fields (backend defaults):** `annotations`, `description`, `isActive`, `isManaged`, `labels`, `lastError`, `status`

### `platform-namespace-event`

CRUD operations for PlatformNamespaceEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformNamespaceEvent records |
| `find-first` | Find first matching platformNamespaceEvent record |
| `get` | Get a platformNamespaceEvent by id |
| `create` | Create a new platformNamespaceEvent |
| `update` | Update an existing platformNamespaceEvent |
| `delete` | Delete a platformNamespaceEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `cpuMillicores` | Int |
| `createdAt` | Datetime |
| `eventType` | String |
| `id` | UUID |
| `memoryBytes` | BigInt |
| `message` | String |
| `metadata` | JSON |
| `metrics` | JSON |
| `namespaceId` | UUID |
| `networkEgressBytes` | BigInt |
| `networkIngressBytes` | BigInt |
| `podCount` | Int |
| `storageBytes` | BigInt |

**Required create fields:** `eventType`, `namespaceId`
**Optional create fields (backend defaults):** `actorId`, `cpuMillicores`, `memoryBytes`, `message`, `metadata`, `metrics`, `networkEgressBytes`, `networkIngressBytes`, `podCount`, `storageBytes`

### `platform-resource`

CRUD operations for PlatformResource records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResource records |
| `find-first` | Find first matching platformResource record |
| `get` | Get a platformResource by id |
| `create` | Create a new platformResource |
| `update` | Update an existing platformResource |
| `delete` | Delete a platformResource |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `name` | String |
| `namespaceId` | UUID |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `errorCount`, `integrations`, `labels`, `lastError`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `spec`, `status`, `statusObserved`, `updatedBy`

### `platform-resource-definition`

CRUD operations for PlatformResourceDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceDefinition records |
| `find-first` | Find first matching platformResourceDefinition record |
| `get` | Get a platformResourceDefinition by id |
| `create` | Create a new platformResourceDefinition |
| `update` | Update an existing platformResourceDefinition |
| `delete` | Delete a platformResourceDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `defaultSpec` | JSON |
| `description` | String |
| `id` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `slug` | String |
| `stepUpMinAge` | Interval |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `defaultSpec`, `description`, `integrations`, `labels`, `requiredConfigs`, `requiredSecrets`, `stepUpMinAge`, `updatedBy`

### `platform-resource-event`

CRUD operations for PlatformResourceEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceEvent records |
| `find-first` | Find first matching platformResourceEvent record |
| `get` | Get a platformResourceEvent by id |
| `create` | Create a new platformResourceEvent |
| `update` | Update an existing platformResourceEvent |
| `delete` | Delete a platformResourceEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |
| `resourceId` | UUID |

**Required create fields:** `eventType`, `resourceId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

### `platform-resource-status-check`

CRUD operations for PlatformResourceStatusCheck records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceStatusCheck records |
| `find-first` | Find first matching platformResourceStatusCheck record |
| `get` | Get a platformResourceStatusCheck by id |
| `create` | Create a new platformResourceStatusCheck |
| `update` | Update an existing platformResourceStatusCheck |
| `delete` | Delete a platformResourceStatusCheck |

**Fields:**

| Field | Type |
|-------|------|
| `completedAt` | Datetime |
| `id` | UUID |
| `requestedAt` | Datetime |
| `requestedBy` | UUID |
| `resourceId` | UUID |
| `result` | JSON |
| `status` | String |

**Required create fields:** `resourceId`
**Optional create fields (backend defaults):** `completedAt`, `requestedAt`, `requestedBy`, `result`, `status`

### `platform-resources-requirements-state`

CRUD operations for PlatformResourcesRequirementsState records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourcesRequirementsState records |
| `find-first` | Find first matching platformResourcesRequirementsState record |
| `get` | Get a platformResourcesRequirementsState by id |
| `create` | Create a new platformResourcesRequirementsState |
| `update` | Update an existing platformResourcesRequirementsState |
| `delete` | Delete a platformResourcesRequirementsState |

**Fields:**

| Field | Type |
|-------|------|
| `configHash` | String |
| `configObjectName` | String |
| `requirementsHash` | String |
| `resourceId` | UUID |
| `secretsHash` | String |
| `secretsObjectName` | String |
| `slug` | String |

**Required create fields:** `configHash`, `configObjectName`, `requirementsHash`, `resourceId`, `secretsHash`, `secretsObjectName`, `slug`

### `platform-resources-resolved-requirement`

CRUD operations for PlatformResourcesResolvedRequirement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourcesResolvedRequirement records |
| `find-first` | Find first matching platformResourcesResolvedRequirement record |
| `get` | Get a platformResourcesResolvedRequirement by id |
| `create` | Create a new platformResourcesResolvedRequirement |
| `update` | Update an existing platformResourcesResolvedRequirement |
| `delete` | Delete a platformResourcesResolvedRequirement |

**Fields:**

| Field | Type |
|-------|------|
| `atomId` | UUID |
| `configObjectName` | String |
| `name` | String |
| `namespaceId` | UUID |
| `present` | Boolean |
| `required` | Boolean |
| `requirementKind` | String |
| `resourceId` | UUID |
| `secretsObjectName` | String |
| `slug` | String |

**Required create fields:** `atomId`, `configObjectName`, `name`, `namespaceId`, `present`, `required`, `requirementKind`, `resourceId`, `secretsObjectName`, `slug`

### `resource`

CRUD operations for Resource records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resource records |
| `find-first` | Find first matching resource record |
| `get` | Get a resource by id |
| `create` | Create a new resource |
| `update` | Update an existing resource |
| `delete` | Delete a resource |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `name` | String |
| `namespaceId` | UUID |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `errorCount`, `integrations`, `labels`, `lastError`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `spec`, `status`, `statusObserved`, `updatedBy`

### `resource-definition`

CRUD operations for ResourceDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceDefinition records |
| `find-first` | Find first matching resourceDefinition record |
| `get` | Get a resourceDefinition by id |
| `create` | Create a new resourceDefinition |
| `update` | Update an existing resourceDefinition |
| `delete` | Delete a resourceDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `defaultSpec` | JSON |
| `description` | String |
| `id` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `slug` | String |
| `stepUpMinAge` | Interval |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `defaultSpec`, `description`, `integrations`, `labels`, `requiredConfigs`, `requiredSecrets`, `stepUpMinAge`, `updatedBy`

### `resource-event`

CRUD operations for ResourceEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceEvent records |
| `find-first` | Find first matching resourceEvent record |
| `get` | Get a resourceEvent by id |
| `create` | Create a new resourceEvent |
| `update` | Update an existing resourceEvent |
| `delete` | Delete a resourceEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |
| `resourceId` | UUID |

**Required create fields:** `databaseId`, `eventType`, `resourceId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

### `resource-status-check`

CRUD operations for ResourceStatusCheck records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceStatusCheck records |
| `find-first` | Find first matching resourceStatusCheck record |
| `get` | Get a resourceStatusCheck by id |
| `create` | Create a new resourceStatusCheck |
| `update` | Update an existing resourceStatusCheck |
| `delete` | Delete a resourceStatusCheck |

**Fields:**

| Field | Type |
|-------|------|
| `completedAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `requestedAt` | Datetime |
| `requestedBy` | UUID |
| `resourceId` | UUID |
| `result` | JSON |
| `status` | String |

**Required create fields:** `databaseId`, `resourceId`
**Optional create fields (backend defaults):** `completedAt`, `requestedAt`, `requestedBy`, `result`, `status`

### `resources-requirements-state`

CRUD operations for ResourcesRequirementsState records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourcesRequirementsState records |
| `find-first` | Find first matching resourcesRequirementsState record |
| `get` | Get a resourcesRequirementsState by id |
| `create` | Create a new resourcesRequirementsState |
| `update` | Update an existing resourcesRequirementsState |
| `delete` | Delete a resourcesRequirementsState |

**Fields:**

| Field | Type |
|-------|------|
| `configHash` | String |
| `configObjectName` | String |
| `requirementsHash` | String |
| `resourceId` | UUID |
| `secretsHash` | String |
| `secretsObjectName` | String |
| `slug` | String |

**Required create fields:** `configHash`, `configObjectName`, `requirementsHash`, `resourceId`, `secretsHash`, `secretsObjectName`, `slug`

### `resources-resolved-requirement`

CRUD operations for ResourcesResolvedRequirement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourcesResolvedRequirement records |
| `find-first` | Find first matching resourcesResolvedRequirement record |
| `get` | Get a resourcesResolvedRequirement by id |
| `create` | Create a new resourcesResolvedRequirement |
| `update` | Update an existing resourcesResolvedRequirement |
| `delete` | Delete a resourcesResolvedRequirement |

**Fields:**

| Field | Type |
|-------|------|
| `atomId` | UUID |
| `configObjectName` | String |
| `name` | String |
| `namespaceId` | UUID |
| `present` | Boolean |
| `required` | Boolean |
| `requirementKind` | String |
| `resourceId` | UUID |
| `secretsObjectName` | String |
| `slug` | String |

**Required create fields:** `atomId`, `configObjectName`, `name`, `namespaceId`, `present`, `required`, `requirementKind`, `resourceId`, `secretsObjectName`, `slug`

## Custom Operations

### `read-function-graph`

readFunctionGraph

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--graphId` | UUID |

### `add-edge`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.context` | String |
  | `--input.dstNode` | String |
  | `--input.dstPort` | String |
  | `--input.graphName` | String |
  | `--input.rootHash` | UUID |
  | `--input.scopeId` | UUID |
  | `--input.srcNode` | String |
  | `--input.srcPort` | String |

### `add-edge-and-save`

addEdgeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dstNode` | String |
  | `--input.dstPort` | String |
  | `--input.graphId` | UUID |
  | `--input.message` | String |
  | `--input.srcNode` | String |
  | `--input.srcPort` | String |

### `add-node`

addNode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.context` | String |
  | `--input.graphName` | String |
  | `--input.meta` | JSON |
  | `--input.nodeName` | String |
  | `--input.nodeType` | String |
  | `--input.props` | JSON |
  | `--input.rootHash` | UUID |
  | `--input.scopeId` | UUID |

### `add-node-and-save`

addNodeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.message` | String |
  | `--input.meta` | JSON |
  | `--input.nodeName` | String |
  | `--input.nodeType` | String |
  | `--input.props` | JSON |

### `copy-graph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.name` | String |
  | `--input.scopeId` | UUID |

### `import-definitions`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.contexts` | String |
  | `--input.graphId` | UUID |
  | `--input.sourceCommitId` | UUID |
  | `--input.sourceScopeId` | UUID |

### `import-graph-json`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.context` | String |
  | `--input.createdBy` | UUID |
  | `--input.definitionsCommitId` | UUID |
  | `--input.description` | String |
  | `--input.graphJson` | JSON |
  | `--input.name` | String |
  | `--input.scopeId` | UUID |

### `infra-init-empty-repo`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

### `infra-insert-node-at-path`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |
  | `--input.path` | String |
  | `--input.root` | UUID |
  | `--input.sId` | UUID |

### `infra-set-data-at-path`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.data` | JSON |
  | `--input.path` | String |
  | `--input.root` | UUID |
  | `--input.sId` | UUID |

### `init-empty-repo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

### `insert-node-at-path`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |
  | `--input.path` | String |
  | `--input.root` | UUID |
  | `--input.sId` | UUID |

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

### `save-graph`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.message` | String |
  | `--input.rootHash` | UUID |

### `set-data-at-path`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.data` | JSON |
  | `--input.path` | String |
  | `--input.root` | UUID |
  | `--input.sId` | UUID |

### `start-execution`

startExecution

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |
  | `--input.inputPayload` | JSON |
  | `--input.maxPendingJobs` | Int |
  | `--input.maxTicks` | Int |
  | `--input.outputNode` | String |
  | `--input.outputPort` | String |
  | `--input.parentExecutionId` | UUID |
  | `--input.parentNodeName` | String |
  | `--input.timeoutInterval` | IntervalInput |

### `validate-function-graph`

validateFunctionGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.graphId` | UUID |

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
