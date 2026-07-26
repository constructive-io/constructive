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
| `function-invocation-attempt` | functionInvocationAttempt CRUD operations |
| `function-invocation` | functionInvocation CRUD operations |
| `get-all-tree-nodes-record` | getAllTreeNodesRecord CRUD operations |
| `infra-commit` | infraCommit CRUD operations |
| `infra-get-all-tree-nodes-record` | infraGetAllTreeNodesRecord CRUD operations |
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
| `platform-function-invocation-attempt` | platformFunctionInvocationAttempt CRUD operations |
| `platform-function-invocation` | platformFunctionInvocation CRUD operations |
| `platform-infra-commit` | platformInfraCommit CRUD operations |
| `platform-infra-get-all-tree-nodes-record` | platformInfraGetAllTreeNodesRecord CRUD operations |
| `platform-infra-object` | platformInfraObject CRUD operations |
| `platform-infra-ref` | platformInfraRef CRUD operations |
| `platform-infra-store` | platformInfraStore CRUD operations |
| `platform-namespace` | platformNamespace CRUD operations |
| `platform-namespace-event` | platformNamespaceEvent CRUD operations |
| `platform-resource` | platformResource CRUD operations |
| `platform-resource-declared-capacity` | platformResourceDeclaredCapacity CRUD operations |
| `platform-resource-definition` | platformResourceDefinition CRUD operations |
| `platform-resource-event` | platformResourceEvent CRUD operations |
| `platform-resource-installation` | platformResourceInstallation CRUD operations |
| `platform-resource-status-check` | platformResourceStatusCheck CRUD operations |
| `platform-resource-usage-log` | platformResourceUsageLog CRUD operations |
| `platform-resource-usage-summary` | platformResourceUsageSummary CRUD operations |
| `platform-resource-utilization` | platformResourceUtilization CRUD operations |
| `platform-resources-health` | platformResourcesHealth CRUD operations |
| `platform-resources-requirements-state` | platformResourcesRequirementsState CRUD operations |
| `platform-resources-resolved-requirement` | platformResourcesResolvedRequirement CRUD operations |
| `platform-webhook-endpoint` | platformWebhookEndpoint CRUD operations |
| `platform-webhook-event` | platformWebhookEvent CRUD operations |
| `resource` | resource CRUD operations |
| `resource-declared-capacity` | resourceDeclaredCapacity CRUD operations |
| `resource-definition` | resourceDefinition CRUD operations |
| `resource-event` | resourceEvent CRUD operations |
| `resource-installation` | resourceInstallation CRUD operations |
| `resource-status-check` | resourceStatusCheck CRUD operations |
| `resource-usage-log` | resourceUsageLog CRUD operations |
| `resource-usage-summary` | resourceUsageSummary CRUD operations |
| `resource-utilization` | resourceUtilization CRUD operations |
| `resources-health` | resourcesHealth CRUD operations |
| `resources-requirements-state` | resourcesRequirementsState CRUD operations |
| `resources-resolved-requirement` | resourcesResolvedRequirement CRUD operations |
| `webhook-endpoint` | webhookEndpoint CRUD operations |
| `webhook-event` | webhookEvent CRUD operations |
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
| `platform-infra-init-empty-repo` | platformInfraInitEmptyRepo |
| `platform-infra-insert-node-at-path` | platformInfraInsertNodeAtPath |
| `platform-infra-set-data-at-path` | platformInfraSetDataAtPath |
| `platform-resource-installations-install` | platformResourceInstallationsInstall |
| `platform-resource-installations-rollback` | platformResourceInstallationsRollback |
| `platform-resource-installations-uninstall` | platformResourceInstallationsUninstall |
| `platform-resource-installations-upgrade` | platformResourceInstallationsUpgrade |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `resource-installations-install` | resourceInstallationsInstall |
| `resource-installations-rollback` | resourceInstallationsRollback |
| `resource-installations-uninstall` | resourceInstallationsUninstall |
| `resource-installations-upgrade` | resourceInstallationsUpgrade |
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
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `fnCategory` | String |
| `functionColumns` | JSON |
| `graphId` | UUID |
| `icon` | String |
| `id` | UUID |
| `image` | String |
| `inputs` | JSON |
| `integrations` | String |
| `isPublished` | Boolean |
| `maxAttempts` | Int |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `moduleTable` | String |
| `name` | String |
| `outputs` | JSON |
| `payloadArgs` | JSON |
| `priority` | Int |
| `props` | JSON |
| `protected` | Boolean |
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

**Required create fields:** `category`, `databaseId`, `name`
**Optional create fields (backend defaults):** `accessChannels`, `concurrency`, `description`, `fnCategory`, `functionColumns`, `graphId`, `icon`, `image`, `inputs`, `integrations`, `isPublished`, `maxAttempts`, `moduleTable`, `outputs`, `payloadArgs`, `priority`, `props`, `protected`, `publishedAt`, `queueName`, `requiredBuckets`, `requiredConfigs`, `requiredModels`, `requiredSecrets`, `resources`, `runtime`, `scaleMax`, `scaleMin`, `targetFunction`, `targetSchema`, `timeoutSeconds`, `volatile`

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
| `actorId` | UUID |
| `completedAt` | Datetime |
| `currentWave` | Int |
| `definitionsCommitId` | UUID |
| `entityId` | UUID |
| `entityType` | String |
| `errorCode` | String |
| `errorMessage` | String |
| `executionPlan` | JSON |
| `graphId` | UUID |
| `id` | UUID |
| `inputPayload` | JSON |
| `invocationCreatedAt` | Datetime |
| `invocationId` | UUID |
| `lastProgressAt` | Datetime |
| `maxPendingJobs` | Int |
| `maxTicks` | Int |
| `nodeOutputs` | JSON |
| `organizationId` | UUID |
| `outputNames` | String |
| `outputNode` | String |
| `outputPayload` | JSON |
| `outputPort` | String |
| `parentExecutionId` | UUID |
| `parentInvocationId` | UUID |
| `parentNodeName` | String |
| `principalId` | UUID |
| `scopeId` | UUID |
| `startedAt` | Datetime |
| `status` | String |
| `tickCount` | Int |
| `timeoutAt` | Datetime |

**Required create fields:** `graphId`, `scopeId`
**Optional create fields (backend defaults):** `actorId`, `completedAt`, `currentWave`, `definitionsCommitId`, `entityId`, `entityType`, `errorCode`, `errorMessage`, `executionPlan`, `inputPayload`, `invocationCreatedAt`, `invocationId`, `lastProgressAt`, `maxPendingJobs`, `maxTicks`, `nodeOutputs`, `organizationId`, `outputNames`, `outputNode`, `outputPayload`, `outputPort`, `parentExecutionId`, `parentInvocationId`, `parentNodeName`, `principalId`, `startedAt`, `status`, `tickCount`, `timeoutAt`

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
| `callbackInputs` | JSON |
| `callbackMeta` | JSON |
| `callbackTokenHash` | String |
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
**Optional create fields (backend defaults):** `callbackInputs`, `callbackMeta`, `callbackTokenHash`, `completedAt`, `errorCode`, `errorMessage`, `nodePath`, `outputId`, `startedAt`, `status`

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

### `function-invocation-attempt`

CRUD operations for FunctionInvocationAttempt records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionInvocationAttempt records |
| `find-first` | Find first matching functionInvocationAttempt record |
| `get` | Get a functionInvocationAttempt by id |
| `create` | Create a new functionInvocationAttempt |
| `update` | Update an existing functionInvocationAttempt |
| `delete` | Delete a functionInvocationAttempt |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `attempt` | Int |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `durationMs` | Int |
| `error` | String |
| `errorDetail` | JSON |
| `id` | UUID |
| `invocationCreatedAt` | Datetime |
| `invocationId` | UUID |
| `startedAt` | Datetime |
| `success` | Boolean |
| `taskIdentifier` | String |

**Required create fields:** `attempt`, `databaseId`, `invocationCreatedAt`, `invocationId`, `success`, `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `durationMs`, `error`, `errorDetail`, `startedAt`

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
| `channel` | String |
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `definitionScope` | String |
| `durationMs` | Int |
| `error` | String |
| `functionDefinitionId` | UUID |
| `graphExecutionId` | UUID |
| `id` | UUID |
| `jobId` | BigInt |
| `parentInvocationId` | UUID |
| `payload` | JSON |
| `provenance` | JSON |
| `result` | JSON |
| `startedAt` | Datetime |
| `status` | String |
| `taskIdentifier` | String |

**Required create fields:** `databaseId`, `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `apiBindingId`, `channel`, `completedAt`, `definitionScope`, `durationMs`, `error`, `functionDefinitionId`, `graphExecutionId`, `jobId`, `parentInvocationId`, `payload`, `provenance`, `result`, `startedAt`, `status`

### `get-all-tree-nodes-record`

CRUD operations for GetAllTreeNodesRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all getAllTreeNodesRecord records |
| `find-first` | Find first matching getAllTreeNodesRecord record |
| `get` | Get a getAllTreeNodesRecord by id |
| `create` | Create a new getAllTreeNodesRecord |
| `update` | Update an existing getAllTreeNodesRecord |
| `delete` | Delete a getAllTreeNodesRecord |

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
| `databaseId` | UUID |
| `date` | Datetime |
| `id` | UUID |
| `message` | String |
| `parentIds` | UUID |
| `storeId` | UUID |
| `treeId` | UUID |

**Required create fields:** `databaseId`, `storeId`
**Optional create fields (backend defaults):** `authorId`, `committerId`, `date`, `message`, `parentIds`, `treeId`

### `infra-get-all-tree-nodes-record`

CRUD operations for InfraGetAllTreeNodesRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraGetAllTreeNodesRecord records |
| `find-first` | Find first matching infraGetAllTreeNodesRecord record |
| `get` | Get a infraGetAllTreeNodesRecord by id |
| `create` | Create a new infraGetAllTreeNodesRecord |
| `update` | Update an existing infraGetAllTreeNodesRecord |
| `delete` | Delete a infraGetAllTreeNodesRecord |

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
| `databaseId` | UUID |
| `id` | UUID |
| `kids` | UUID |
| `ktree` | String |

**Required create fields:** `databaseId`
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
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `storeId` | UUID |

**Required create fields:** `databaseId`, `name`, `storeId`
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
| `databaseId` | UUID |
| `hash` | UUID |
| `id` | UUID |
| `name` | String |

**Required create fields:** `databaseId`, `name`
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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |
| `namespaceId` | UUID |

**Required create fields:** `databaseId`, `eventType`, `namespaceId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

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
| `billable` | Boolean |
| `category` | String |
| `concurrency` | Int |
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `description` | String |
| `fnCategory` | String |
| `functionColumns` | JSON |
| `graphId` | UUID |
| `icon` | String |
| `id` | UUID |
| `image` | String |
| `inputs` | JSON |
| `integrations` | String |
| `isPublished` | Boolean |
| `maxAttempts` | Int |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `moduleTable` | String |
| `name` | String |
| `outputs` | JSON |
| `payloadArgs` | JSON |
| `priority` | Int |
| `props` | JSON |
| `protected` | Boolean |
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
| `system` | Boolean |
| `targetFunction` | String |
| `targetSchema` | String |
| `taskIdentifier` | String |
| `timeoutSeconds` | Int |
| `updatedAt` | Datetime |
| `volatile` | Boolean |

**Required create fields:** `category`, `name`
**Optional create fields (backend defaults):** `accessChannels`, `billable`, `concurrency`, `description`, `fnCategory`, `functionColumns`, `graphId`, `icon`, `image`, `inputs`, `integrations`, `isPublished`, `maxAttempts`, `moduleTable`, `outputs`, `payloadArgs`, `priority`, `props`, `protected`, `publishedAt`, `queueName`, `requiredBuckets`, `requiredConfigs`, `requiredModels`, `requiredSecrets`, `resources`, `runtime`, `scaleMax`, `scaleMin`, `system`, `targetFunction`, `targetSchema`, `timeoutSeconds`, `volatile`

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

### `platform-function-invocation-attempt`

CRUD operations for PlatformFunctionInvocationAttempt records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformFunctionInvocationAttempt records |
| `find-first` | Find first matching platformFunctionInvocationAttempt record |
| `get` | Get a platformFunctionInvocationAttempt by id |
| `create` | Create a new platformFunctionInvocationAttempt |
| `update` | Update an existing platformFunctionInvocationAttempt |
| `delete` | Delete a platformFunctionInvocationAttempt |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `attempt` | Int |
| `createdAt` | Datetime |
| `durationMs` | Int |
| `error` | String |
| `errorDetail` | JSON |
| `id` | UUID |
| `invocationCreatedAt` | Datetime |
| `invocationId` | UUID |
| `startedAt` | Datetime |
| `success` | Boolean |
| `taskIdentifier` | String |

**Required create fields:** `attempt`, `invocationCreatedAt`, `invocationId`, `success`, `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `durationMs`, `error`, `errorDetail`, `startedAt`

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
| `channel` | String |
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `definitionScope` | String |
| `durationMs` | Int |
| `error` | String |
| `functionDefinitionId` | UUID |
| `graphExecutionId` | UUID |
| `id` | UUID |
| `jobId` | BigInt |
| `parentInvocationId` | UUID |
| `payload` | JSON |
| `provenance` | JSON |
| `result` | JSON |
| `startedAt` | Datetime |
| `status` | String |
| `taskIdentifier` | String |

**Required create fields:** `taskIdentifier`
**Optional create fields (backend defaults):** `actorId`, `apiBindingId`, `channel`, `completedAt`, `definitionScope`, `durationMs`, `error`, `functionDefinitionId`, `graphExecutionId`, `jobId`, `parentInvocationId`, `payload`, `provenance`, `result`, `startedAt`, `status`

### `platform-infra-commit`

CRUD operations for PlatformInfraCommit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInfraCommit records |
| `find-first` | Find first matching platformInfraCommit record |
| `get` | Get a platformInfraCommit by id |
| `create` | Create a new platformInfraCommit |
| `update` | Update an existing platformInfraCommit |
| `delete` | Delete a platformInfraCommit |

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

### `platform-infra-get-all-tree-nodes-record`

CRUD operations for PlatformInfraGetAllTreeNodesRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInfraGetAllTreeNodesRecord records |
| `find-first` | Find first matching platformInfraGetAllTreeNodesRecord record |
| `get` | Get a platformInfraGetAllTreeNodesRecord by id |
| `create` | Create a new platformInfraGetAllTreeNodesRecord |
| `update` | Update an existing platformInfraGetAllTreeNodesRecord |
| `delete` | Delete a platformInfraGetAllTreeNodesRecord |

**Fields:**

| Field | Type |
|-------|------|
| `data` | JSON |
| `path` | String |

**Required create fields:** `data`, `path`

### `platform-infra-object`

CRUD operations for PlatformInfraObject records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInfraObject records |
| `find-first` | Find first matching platformInfraObject record |
| `get` | Get a platformInfraObject by id |
| `create` | Create a new platformInfraObject |
| `update` | Update an existing platformInfraObject |
| `delete` | Delete a platformInfraObject |

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

### `platform-infra-ref`

CRUD operations for PlatformInfraRef records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInfraRef records |
| `find-first` | Find first matching platformInfraRef record |
| `get` | Get a platformInfraRef by id |
| `create` | Create a new platformInfraRef |
| `update` | Update an existing platformInfraRef |
| `delete` | Delete a platformInfraRef |

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

### `platform-infra-store`

CRUD operations for PlatformInfraStore records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInfraStore records |
| `find-first` | Find first matching platformInfraStore record |
| `get` | Get a platformInfraStore by id |
| `create` | Create a new platformInfraStore |
| `update` | Update an existing platformInfraStore |
| `delete` | Delete a platformInfraStore |

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
| `createdAt` | Datetime |
| `eventType` | String |
| `id` | UUID |
| `message` | String |
| `metadata` | JSON |
| `namespaceId` | UUID |

**Required create fields:** `eventType`, `namespaceId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

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
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `installationId` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastHeartbeatAt` | Datetime |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `name` | String |
| `namespaceId` | UUID |
| `replicas` | Int |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `storageClass` | String |
| `storageSizeBytes` | BigInt |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `errorCount`, `installationId`, `integrations`, `labels`, `lastError`, `lastHeartbeatAt`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `spec`, `status`, `statusObserved`, `updatedBy`

### `platform-resource-declared-capacity`

CRUD operations for PlatformResourceDeclaredCapacity records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceDeclaredCapacity records |
| `find-first` | Find first matching platformResourceDeclaredCapacity record |
| `get` | Get a platformResourceDeclaredCapacity by id |
| `create` | Create a new platformResourceDeclaredCapacity |
| `update` | Update an existing platformResourceDeclaredCapacity |
| `delete` | Delete a platformResourceDeclaredCapacity |

**Fields:**

| Field | Type |
|-------|------|
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `installationId` | UUID |
| `isTransient` | Boolean |
| `kind` | String |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `namespaceId` | UUID |
| `podCountMax` | Int |
| `podCountMin` | Int |
| `source` | String |
| `sourceId` | UUID |
| `storageSizeBytes` | BigInt |

**Required create fields:** `cpuLimitMillicores`, `cpuRequestMillicores`, `installationId`, `isTransient`, `kind`, `memoryLimitBytes`, `memoryRequestBytes`, `namespaceId`, `podCountMax`, `podCountMin`, `source`, `sourceId`, `storageSizeBytes`

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

### `platform-resource-installation`

CRUD operations for PlatformResourceInstallation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceInstallation records |
| `find-first` | Find first matching platformResourceInstallation record |
| `get` | Get a platformResourceInstallation by id |
| `create` | Create a new platformResourceInstallation |
| `update` | Update an existing platformResourceInstallation |
| `delete` | Delete a platformResourceInstallation |

**Fields:**

| Field | Type |
|-------|------|
| `commitId` | UUID |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `id` | UUID |
| `name` | String |
| `namespaceId` | UUID |
| `params` | JSON |
| `revision` | Int |
| `slug` | String |
| `status` | String |
| `storeId` | UUID |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `commitId`, `createdBy`, `params`, `revision`, `status`, `storeId`, `updatedBy`

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

### `platform-resource-usage-log`

CRUD operations for PlatformResourceUsageLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceUsageLog records |
| `find-first` | Find first matching platformResourceUsageLog record |
| `get` | Get a platformResourceUsageLog by id |
| `create` | Create a new platformResourceUsageLog |
| `update` | Update an existing platformResourceUsageLog |
| `delete` | Delete a platformResourceUsageLog |

**Fields:**

| Field | Type |
|-------|------|
| `cpuMillicores` | BigInt |
| `id` | UUID |
| `intervalSeconds` | Int |
| `memoryBytes` | BigInt |
| `metrics` | JSON |
| `namespaceId` | UUID |
| `resourceId` | UUID |
| `sampledAt` | Datetime |
| `source` | String |

**Required create fields:** `intervalSeconds`, `namespaceId`, `source`
**Optional create fields (backend defaults):** `cpuMillicores`, `memoryBytes`, `metrics`, `resourceId`, `sampledAt`

### `platform-resource-usage-summary`

CRUD operations for PlatformResourceUsageSummary records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceUsageSummary records |
| `find-first` | Find first matching platformResourceUsageSummary record |
| `get` | Get a platformResourceUsageSummary by id |
| `create` | Create a new platformResourceUsageSummary |
| `update` | Update an existing platformResourceUsageSummary |
| `delete` | Delete a platformResourceUsageSummary |

**Fields:**

| Field | Type |
|-------|------|
| `date` | Date |
| `gbSeconds` | BigFloat |
| `id` | UUID |
| `maxCpuMillicores` | BigInt |
| `maxMemoryBytes` | BigInt |
| `namespaceId` | UUID |
| `resourceId` | UUID |
| `runtimeSeconds` | BigInt |
| `sampleCount` | Int |

**Required create fields:** `date`, `namespaceId`
**Optional create fields (backend defaults):** `gbSeconds`, `maxCpuMillicores`, `maxMemoryBytes`, `resourceId`, `runtimeSeconds`, `sampleCount`

### `platform-resource-utilization`

CRUD operations for PlatformResourceUtilization records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourceUtilization records |
| `find-first` | Find first matching platformResourceUtilization record |
| `get` | Get a platformResourceUtilization by id |
| `create` | Create a new platformResourceUtilization |
| `update` | Update an existing platformResourceUtilization |
| `delete` | Delete a platformResourceUtilization |

**Fields:**

| Field | Type |
|-------|------|
| `avgMemoryBytes` | BigInt |
| `cpuLimitMillicores` | BigInt |
| `cpuPeakUtilization` | BigFloat |
| `cpuRequestHeadroomMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `date` | Date |
| `gbSeconds` | BigFloat |
| `kind` | String |
| `maxCpuMillicores` | BigInt |
| `maxMemoryBytes` | BigInt |
| `memoryLimitBytes` | BigInt |
| `memoryPeakUtilization` | BigFloat |
| `memoryRequestBytes` | BigInt |
| `memoryRequestHeadroomBytes` | BigInt |
| `namespaceId` | UUID |
| `replicas` | Int |
| `resourceId` | UUID |
| `runtimeSeconds` | BigInt |
| `sampleCount` | Int |

**Required create fields:** `avgMemoryBytes`, `cpuLimitMillicores`, `cpuPeakUtilization`, `cpuRequestHeadroomMillicores`, `cpuRequestMillicores`, `date`, `gbSeconds`, `kind`, `maxCpuMillicores`, `maxMemoryBytes`, `memoryLimitBytes`, `memoryPeakUtilization`, `memoryRequestBytes`, `memoryRequestHeadroomBytes`, `namespaceId`, `replicas`, `resourceId`, `runtimeSeconds`, `sampleCount`

### `platform-resources-health`

CRUD operations for PlatformResourcesHealth records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformResourcesHealth records |
| `find-first` | Find first matching platformResourcesHealth record |
| `get` | Get a platformResourcesHealth by id |
| `create` | Create a new platformResourcesHealth |
| `update` | Update an existing platformResourcesHealth |
| `delete` | Delete a platformResourcesHealth |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `installationId` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastHeartbeatAt` | Datetime |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `name` | String |
| `namespaceId` | UUID |
| `replicas` | Int |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusDetail` | String |
| `statusObserved` | JSON |
| `storageClass` | String |
| `storageSizeBytes` | BigInt |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `annotations`, `cpuLimitMillicores`, `cpuRequestMillicores`, `createdBy`, `errorCount`, `installationId`, `integrations`, `kind`, `labels`, `lastError`, `lastHeartbeatAt`, `memoryLimitBytes`, `memoryRequestBytes`, `name`, `namespaceId`, `replicas`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `slug`, `spec`, `status`, `statusDetail`, `statusObserved`, `storageClass`, `storageSizeBytes`, `updatedBy`

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

### `platform-webhook-endpoint`

CRUD operations for PlatformWebhookEndpoint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformWebhookEndpoint records |
| `find-first` | Find first matching platformWebhookEndpoint record |
| `get` | Get a platformWebhookEndpoint by id |
| `create` | Create a new platformWebhookEndpoint |
| `update` | Update an existing platformWebhookEndpoint |
| `delete` | Delete a platformWebhookEndpoint |

**Fields:**

| Field | Type |
|-------|------|
| `active` | Boolean |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `functionDefinitionId` | UUID |
| `host` | String |
| `id` | UUID |
| `namespaceId` | UUID |
| `path` | String |
| `provider` | String |
| `replayWindowSeconds` | Int |
| `signingSecretName` | String |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `functionDefinitionId`, `host`, `namespaceId`, `path`, `signingSecretName`
**Optional create fields (backend defaults):** `active`, `createdBy`, `provider`, `replayWindowSeconds`, `updatedBy`

### `platform-webhook-event`

CRUD operations for PlatformWebhookEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformWebhookEvent records |
| `find-first` | Find first matching platformWebhookEvent record |
| `get` | Get a platformWebhookEvent by id |
| `create` | Create a new platformWebhookEvent |
| `update` | Update an existing platformWebhookEvent |
| `delete` | Delete a platformWebhookEvent |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `endpointId` | UUID |
| `error` | String |
| `externalEventId` | String |
| `id` | UUID |
| `invocationCreatedAt` | Datetime |
| `invocationId` | UUID |
| `payload` | JSON |
| `provider` | String |
| `providerTimestamp` | Datetime |
| `status` | String |
| `updatedAt` | Datetime |

**Required create fields:** `endpointId`, `externalEventId`, `provider`
**Optional create fields (backend defaults):** `error`, `invocationCreatedAt`, `invocationId`, `payload`, `providerTimestamp`, `status`

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
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `installationId` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastHeartbeatAt` | Datetime |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `name` | String |
| `namespaceId` | UUID |
| `replicas` | Int |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `storageClass` | String |
| `storageSizeBytes` | BigInt |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `kind`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `annotations`, `createdBy`, `errorCount`, `installationId`, `integrations`, `labels`, `lastError`, `lastHeartbeatAt`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `spec`, `status`, `statusObserved`, `updatedBy`

### `resource-declared-capacity`

CRUD operations for ResourceDeclaredCapacity records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceDeclaredCapacity records |
| `find-first` | Find first matching resourceDeclaredCapacity record |
| `get` | Get a resourceDeclaredCapacity by id |
| `create` | Create a new resourceDeclaredCapacity |
| `update` | Update an existing resourceDeclaredCapacity |
| `delete` | Delete a resourceDeclaredCapacity |

**Fields:**

| Field | Type |
|-------|------|
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `installationId` | UUID |
| `isTransient` | Boolean |
| `kind` | String |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `namespaceId` | UUID |
| `podCountMax` | Int |
| `podCountMin` | Int |
| `source` | String |
| `sourceId` | UUID |
| `storageSizeBytes` | BigInt |

**Required create fields:** `cpuLimitMillicores`, `cpuRequestMillicores`, `installationId`, `isTransient`, `kind`, `memoryLimitBytes`, `memoryRequestBytes`, `namespaceId`, `podCountMax`, `podCountMin`, `source`, `sourceId`, `storageSizeBytes`

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

### `resource-installation`

CRUD operations for ResourceInstallation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceInstallation records |
| `find-first` | Find first matching resourceInstallation record |
| `get` | Get a resourceInstallation by id |
| `create` | Create a new resourceInstallation |
| `update` | Update an existing resourceInstallation |
| `delete` | Delete a resourceInstallation |

**Fields:**

| Field | Type |
|-------|------|
| `commitId` | UUID |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `namespaceId` | UUID |
| `params` | JSON |
| `revision` | Int |
| `slug` | String |
| `status` | String |
| `storeId` | UUID |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `name`, `namespaceId`, `slug`
**Optional create fields (backend defaults):** `commitId`, `createdBy`, `params`, `revision`, `status`, `storeId`, `updatedBy`

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

### `resource-usage-log`

CRUD operations for ResourceUsageLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceUsageLog records |
| `find-first` | Find first matching resourceUsageLog record |
| `get` | Get a resourceUsageLog by id |
| `create` | Create a new resourceUsageLog |
| `update` | Update an existing resourceUsageLog |
| `delete` | Delete a resourceUsageLog |

**Fields:**

| Field | Type |
|-------|------|
| `cpuMillicores` | BigInt |
| `databaseId` | UUID |
| `id` | UUID |
| `intervalSeconds` | Int |
| `memoryBytes` | BigInt |
| `metrics` | JSON |
| `namespaceId` | UUID |
| `resourceId` | UUID |
| `sampledAt` | Datetime |
| `source` | String |

**Required create fields:** `databaseId`, `intervalSeconds`, `namespaceId`, `source`
**Optional create fields (backend defaults):** `cpuMillicores`, `memoryBytes`, `metrics`, `resourceId`, `sampledAt`

### `resource-usage-summary`

CRUD operations for ResourceUsageSummary records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceUsageSummary records |
| `find-first` | Find first matching resourceUsageSummary record |
| `get` | Get a resourceUsageSummary by id |
| `create` | Create a new resourceUsageSummary |
| `update` | Update an existing resourceUsageSummary |
| `delete` | Delete a resourceUsageSummary |

**Fields:**

| Field | Type |
|-------|------|
| `databaseId` | UUID |
| `date` | Date |
| `gbSeconds` | BigFloat |
| `id` | UUID |
| `maxCpuMillicores` | BigInt |
| `maxMemoryBytes` | BigInt |
| `namespaceId` | UUID |
| `resourceId` | UUID |
| `runtimeSeconds` | BigInt |
| `sampleCount` | Int |

**Required create fields:** `databaseId`, `date`, `namespaceId`
**Optional create fields (backend defaults):** `gbSeconds`, `maxCpuMillicores`, `maxMemoryBytes`, `resourceId`, `runtimeSeconds`, `sampleCount`

### `resource-utilization`

CRUD operations for ResourceUtilization records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceUtilization records |
| `find-first` | Find first matching resourceUtilization record |
| `get` | Get a resourceUtilization by id |
| `create` | Create a new resourceUtilization |
| `update` | Update an existing resourceUtilization |
| `delete` | Delete a resourceUtilization |

**Fields:**

| Field | Type |
|-------|------|
| `avgMemoryBytes` | BigInt |
| `cpuLimitMillicores` | BigInt |
| `cpuPeakUtilization` | BigFloat |
| `cpuRequestHeadroomMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `date` | Date |
| `gbSeconds` | BigFloat |
| `kind` | String |
| `maxCpuMillicores` | BigInt |
| `maxMemoryBytes` | BigInt |
| `memoryLimitBytes` | BigInt |
| `memoryPeakUtilization` | BigFloat |
| `memoryRequestBytes` | BigInt |
| `memoryRequestHeadroomBytes` | BigInt |
| `namespaceId` | UUID |
| `replicas` | Int |
| `resourceId` | UUID |
| `runtimeSeconds` | BigInt |
| `sampleCount` | Int |

**Required create fields:** `avgMemoryBytes`, `cpuLimitMillicores`, `cpuPeakUtilization`, `cpuRequestHeadroomMillicores`, `cpuRequestMillicores`, `date`, `gbSeconds`, `kind`, `maxCpuMillicores`, `maxMemoryBytes`, `memoryLimitBytes`, `memoryPeakUtilization`, `memoryRequestBytes`, `memoryRequestHeadroomBytes`, `namespaceId`, `replicas`, `resourceId`, `runtimeSeconds`, `sampleCount`

### `resources-health`

CRUD operations for ResourcesHealth records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourcesHealth records |
| `find-first` | Find first matching resourcesHealth record |
| `get` | Get a resourcesHealth by id |
| `create` | Create a new resourcesHealth |
| `update` | Update an existing resourcesHealth |
| `delete` | Delete a resourcesHealth |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `cpuLimitMillicores` | BigInt |
| `cpuRequestMillicores` | BigInt |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `errorCount` | Int |
| `id` | UUID |
| `installationId` | UUID |
| `integrations` | String |
| `kind` | String |
| `labels` | JSON |
| `lastError` | String |
| `lastHeartbeatAt` | Datetime |
| `memoryLimitBytes` | BigInt |
| `memoryRequestBytes` | BigInt |
| `name` | String |
| `namespaceId` | UUID |
| `replicas` | Int |
| `requiredConfigs` | ResourceRequirement |
| `requiredSecrets` | ResourceRequirement |
| `resourceDefinitionId` | UUID |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusDetail` | String |
| `statusObserved` | JSON |
| `storageClass` | String |
| `storageSizeBytes` | BigInt |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `annotations`, `cpuLimitMillicores`, `cpuRequestMillicores`, `createdBy`, `databaseId`, `errorCount`, `installationId`, `integrations`, `kind`, `labels`, `lastError`, `lastHeartbeatAt`, `memoryLimitBytes`, `memoryRequestBytes`, `name`, `namespaceId`, `replicas`, `requiredConfigs`, `requiredSecrets`, `resourceDefinitionId`, `slug`, `spec`, `status`, `statusDetail`, `statusObserved`, `storageClass`, `storageSizeBytes`, `updatedBy`

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

### `webhook-endpoint`

CRUD operations for WebhookEndpoint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webhookEndpoint records |
| `find-first` | Find first matching webhookEndpoint record |
| `get` | Get a webhookEndpoint by id |
| `create` | Create a new webhookEndpoint |
| `update` | Update an existing webhookEndpoint |
| `delete` | Delete a webhookEndpoint |

**Fields:**

| Field | Type |
|-------|------|
| `active` | Boolean |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `functionDefinitionId` | UUID |
| `host` | String |
| `id` | UUID |
| `namespaceId` | UUID |
| `path` | String |
| `provider` | String |
| `replayWindowSeconds` | Int |
| `signingSecretName` | String |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `functionDefinitionId`, `host`, `namespaceId`, `path`, `signingSecretName`
**Optional create fields (backend defaults):** `active`, `createdBy`, `provider`, `replayWindowSeconds`, `updatedBy`

### `webhook-event`

CRUD operations for WebhookEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webhookEvent records |
| `find-first` | Find first matching webhookEvent record |
| `get` | Get a webhookEvent by id |
| `create` | Create a new webhookEvent |
| `update` | Update an existing webhookEvent |
| `delete` | Delete a webhookEvent |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `endpointId` | UUID |
| `error` | String |
| `externalEventId` | String |
| `id` | UUID |
| `invocationCreatedAt` | Datetime |
| `invocationId` | UUID |
| `payload` | JSON |
| `provider` | String |
| `providerTimestamp` | Datetime |
| `status` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `endpointId`, `externalEventId`, `provider`
**Optional create fields (backend defaults):** `error`, `invocationCreatedAt`, `invocationId`, `payload`, `providerTimestamp`, `status`

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

### `platform-infra-init-empty-repo`

platformInfraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

### `platform-infra-insert-node-at-path`

platformInfraInsertNodeAtPath

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

### `platform-infra-set-data-at-path`

platformInfraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.data` | JSON |
  | `--input.path` | String |
  | `--input.root` | UUID |
  | `--input.sId` | UUID |

### `platform-resource-installations-install`

platformResourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.name` | String |
  | `--input.namespaceId` | UUID |
  | `--input.newParams` | JSON |
  | `--input.slug` | String |

### `platform-resource-installations-rollback`

platformResourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.commitId` | UUID |
  | `--input.targetInstallationId` | UUID |

### `platform-resource-installations-uninstall`

platformResourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.targetInstallationId` | UUID |

### `platform-resource-installations-upgrade`

platformResourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.newParams` | JSON |
  | `--input.targetInstallationId` | UUID |

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

### `resource-installations-install`

resourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.name` | String |
  | `--input.namespaceId` | UUID |
  | `--input.newParams` | JSON |
  | `--input.slug` | String |

### `resource-installations-rollback`

resourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.commitId` | UUID |
  | `--input.targetInstallationId` | UUID |

### `resource-installations-uninstall`

resourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.targetInstallationId` | UUID |

### `resource-installations-upgrade`

resourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.newParams` | JSON |
  | `--input.targetInstallationId` | UUID |

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
  | `--input.outputNames` | String |
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
