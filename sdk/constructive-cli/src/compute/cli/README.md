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
| `infra-get-all-record` | infraGetAllRecord CRUD operations |
| `get-all-record` | getAllRecord CRUD operations |
| `infra-ref` | infraRef CRUD operations |
| `infra-store` | infraStore CRUD operations |
| `function-api-binding` | functionApiBinding CRUD operations |
| `function-graph-ref` | functionGraphRef CRUD operations |
| `function-graph-store` | functionGraphStore CRUD operations |
| `platform-function-api-binding` | platformFunctionApiBinding CRUD operations |
| `platform-resources-requirements-state` | platformResourcesRequirementsState CRUD operations |
| `resources-requirements-state` | resourcesRequirementsState CRUD operations |
| `platform-resource-status-check` | platformResourceStatusCheck CRUD operations |
| `platform-function-deployment` | platformFunctionDeployment CRUD operations |
| `platform-resource` | platformResource CRUD operations |
| `platform-resource-definition` | platformResourceDefinition CRUD operations |
| `infra-object` | infraObject CRUD operations |
| `function-graph-object` | functionGraphObject CRUD operations |
| `platform-function-deployment-event` | platformFunctionDeploymentEvent CRUD operations |
| `platform-resource-event` | platformResourceEvent CRUD operations |
| `resource-status-check` | resourceStatusCheck CRUD operations |
| `function-deployment` | functionDeployment CRUD operations |
| `resource` | resource CRUD operations |
| `resource-definition` | resourceDefinition CRUD operations |
| `function-deployment-event` | functionDeploymentEvent CRUD operations |
| `platform-function-execution-log` | platformFunctionExecutionLog CRUD operations |
| `resource-event` | resourceEvent CRUD operations |
| `function-graph-execution-output` | functionGraphExecutionOutput CRUD operations |
| `infra-commit` | infraCommit CRUD operations |
| `function-graph-commit` | functionGraphCommit CRUD operations |
| `function-execution-log` | functionExecutionLog CRUD operations |
| `platform-resources-resolved-requirement` | platformResourcesResolvedRequirement CRUD operations |
| `resources-resolved-requirement` | resourcesResolvedRequirement CRUD operations |
| `db-preset` | dbPreset CRUD operations |
| `platform-namespace` | platformNamespace CRUD operations |
| `function-graph` | functionGraph CRUD operations |
| `function-graph-execution-node-state` | functionGraphExecutionNodeState CRUD operations |
| `namespace` | namespace CRUD operations |
| `platform-function-invocation` | platformFunctionInvocation CRUD operations |
| `function-invocation` | functionInvocation CRUD operations |
| `platform-namespace-event` | platformNamespaceEvent CRUD operations |
| `integration-provider` | integrationProvider CRUD operations |
| `namespace-event` | namespaceEvent CRUD operations |
| `function-graph-execution` | functionGraphExecution CRUD operations |
| `platform-function-definition` | platformFunctionDefinition CRUD operations |
| `function-definition` | functionDefinition CRUD operations |
| `read-function-graph` | readFunctionGraph |
| `validate-function-graph` | validateFunctionGraph |
| `infra-init-empty-repo` | infraInitEmptyRepo |
| `init-empty-repo` | initEmptyRepo |
| `import-definitions` | importDefinitions |
| `infra-set-data-at-path` | infraSetDataAtPath |
| `set-data-at-path` | setDataAtPath |
| `copy-graph` | copyGraph |
| `save-graph` | saveGraph |
| `add-edge-and-save` | addEdgeAndSave |
| `add-node-and-save` | addNodeAndSave |
| `import-graph-json` | importGraphJson |
| `add-edge` | addEdge |
| `add-node` | addNode |
| `infra-insert-node-at-path` | infraInsertNodeAtPath |
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
| `path` | String |
| `data` | JSON |

**Required create fields:** `path`, `data`

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
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |
| `storeId` | UUID |
| `commitId` | UUID |

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
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |
| `hash` | UUID |
| `createdAt` | Datetime |

**Required create fields:** `name`, `scopeId`
**Optional create fields (backend defaults):** `hash`

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
| `scopeId` | UUID |
| `storeId` | UUID |
| `commitId` | UUID |

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
| `id` | UUID |
| `name` | String |
| `scopeId` | UUID |
| `hash` | UUID |
| `createdAt` | Datetime |

**Required create fields:** `name`, `scopeId`
**Optional create fields (backend defaults):** `hash`

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
| `id` | UUID |
| `functionDefinitionId` | UUID |
| `apiId` | UUID |
| `alias` | String |
| `config` | JSON |

**Required create fields:** `functionDefinitionId`, `apiId`
**Optional create fields (backend defaults):** `alias`, `config`

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
| `resourceId` | UUID |
| `slug` | String |
| `secretsHash` | String |
| `configHash` | String |
| `requirementsHash` | String |
| `secretsObjectName` | String |
| `configObjectName` | String |

**Required create fields:** `resourceId`, `slug`, `secretsHash`, `configHash`, `requirementsHash`, `secretsObjectName`, `configObjectName`

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
| `resourceId` | UUID |
| `slug` | String |
| `secretsHash` | String |
| `configHash` | String |
| `requirementsHash` | String |
| `secretsObjectName` | String |
| `configObjectName` | String |

**Required create fields:** `resourceId`, `slug`, `secretsHash`, `configHash`, `requirementsHash`, `secretsObjectName`, `configObjectName`

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
| `id` | UUID |
| `resourceId` | UUID |
| `requestedBy` | UUID |
| `requestedAt` | Datetime |
| `completedAt` | Datetime |
| `status` | String |
| `result` | JSON |

**Required create fields:** `resourceId`
**Optional create fields (backend defaults):** `requestedBy`, `requestedAt`, `completedAt`, `status`, `result`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `namespaceId` | UUID |
| `status` | String |
| `serviceUrl` | String |
| `serviceName` | String |
| `revision` | Int |
| `image` | String |
| `imageVersion` | String |
| `handlerName` | String |
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

**Required create fields:** `namespaceId`, `image`
**Optional create fields (backend defaults):** `status`, `serviceUrl`, `serviceName`, `revision`, `imageVersion`, `handlerName`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `lastError`, `lastErrorAt`, `errorCount`, `labels`, `annotations`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `namespaceId` | UUID |
| `kind` | String |
| `name` | String |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `lastError` | String |
| `errorCount` | Int |
| `labels` | JSON |
| `annotations` | JSON |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `resourceDefinitionId` | UUID |

**Required create fields:** `namespaceId`, `kind`, `name`, `slug`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `spec`, `status`, `statusObserved`, `lastError`, `errorCount`, `labels`, `annotations`, `requiredSecrets`, `requiredConfigs`, `integrations`, `resourceDefinitionId`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `namespaceId` | UUID |
| `kind` | String |
| `name` | String |
| `slug` | String |
| `description` | String |
| `defaultSpec` | JSON |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `labels` | JSON |
| `annotations` | JSON |
| `stepUpMinAge` | Interval |

**Required create fields:** `namespaceId`, `kind`, `name`, `slug`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `description`, `defaultSpec`, `requiredSecrets`, `requiredConfigs`, `integrations`, `labels`, `annotations`, `stepUpMinAge`

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
| `id` | UUID |
| `scopeId` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `data` | JSON |
| `createdAt` | Datetime |

**Required create fields:** `scopeId`
**Optional create fields (backend defaults):** `kids`, `ktree`, `data`

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
| `scopeId` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `data` | JSON |
| `createdAt` | Datetime |

**Required create fields:** `scopeId`
**Optional create fields (backend defaults):** `kids`, `ktree`, `data`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `deploymentId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |

**Required create fields:** `deploymentId`, `eventType`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `resourceId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |

**Required create fields:** `resourceId`, `eventType`
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
| `id` | UUID |
| `resourceId` | UUID |
| `databaseId` | UUID |
| `requestedBy` | UUID |
| `requestedAt` | Datetime |
| `completedAt` | Datetime |
| `status` | String |
| `result` | JSON |

**Required create fields:** `resourceId`, `databaseId`
**Optional create fields (backend defaults):** `requestedBy`, `requestedAt`, `completedAt`, `status`, `result`

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
| `namespaceId` | UUID |
| `status` | String |
| `serviceUrl` | String |
| `serviceName` | String |
| `revision` | Int |
| `image` | String |
| `imageVersion` | String |
| `handlerName` | String |
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

**Required create fields:** `namespaceId`, `image`, `databaseId`
**Optional create fields (backend defaults):** `status`, `serviceUrl`, `serviceName`, `revision`, `imageVersion`, `handlerName`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `lastError`, `lastErrorAt`, `errorCount`, `labels`, `annotations`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `namespaceId` | UUID |
| `kind` | String |
| `name` | String |
| `slug` | String |
| `spec` | JSON |
| `status` | String |
| `statusObserved` | JSON |
| `lastError` | String |
| `errorCount` | Int |
| `labels` | JSON |
| `annotations` | JSON |
| `databaseId` | UUID |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `resourceDefinitionId` | UUID |

**Required create fields:** `namespaceId`, `kind`, `name`, `slug`, `databaseId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `spec`, `status`, `statusObserved`, `lastError`, `errorCount`, `labels`, `annotations`, `requiredSecrets`, `requiredConfigs`, `integrations`, `resourceDefinitionId`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `namespaceId` | UUID |
| `kind` | String |
| `name` | String |
| `slug` | String |
| `description` | String |
| `defaultSpec` | JSON |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `labels` | JSON |
| `annotations` | JSON |
| `stepUpMinAge` | Interval |
| `databaseId` | UUID |

**Required create fields:** `namespaceId`, `kind`, `name`, `slug`, `databaseId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `description`, `defaultSpec`, `requiredSecrets`, `requiredConfigs`, `integrations`, `labels`, `annotations`, `stepUpMinAge`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `resourceId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |
| `databaseId` | UUID |

**Required create fields:** `resourceId`, `eventType`, `databaseId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`

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
| `scopeId` | UUID |
| `hash` | Base64EncodedBinary |
| `data` | JSON |

**Required create fields:** `scopeId`, `hash`, `data`

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
| `id` | UUID |
| `message` | String |
| `scopeId` | UUID |
| `storeId` | UUID |
| `parentIds` | UUID |
| `authorId` | UUID |
| `committerId` | UUID |
| `treeId` | UUID |
| `date` | Datetime |

**Required create fields:** `scopeId`, `storeId`
**Optional create fields (backend defaults):** `message`, `parentIds`, `authorId`, `committerId`, `treeId`, `date`

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
| `scopeId` | UUID |
| `storeId` | UUID |
| `parentIds` | UUID |
| `authorId` | UUID |
| `committerId` | UUID |
| `treeId` | UUID |
| `date` | Datetime |

**Required create fields:** `scopeId`, `storeId`
**Optional create fields (backend defaults):** `message`, `parentIds`, `authorId`, `committerId`, `treeId`, `date`

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
| `resourceId` | UUID |
| `slug` | String |
| `namespaceId` | UUID |
| `requirementKind` | String |
| `name` | String |
| `required` | Boolean |
| `atomId` | UUID |
| `present` | Boolean |
| `secretsObjectName` | String |
| `configObjectName` | String |

**Required create fields:** `resourceId`, `slug`, `namespaceId`, `requirementKind`, `name`, `required`, `atomId`, `present`, `secretsObjectName`, `configObjectName`

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
| `resourceId` | UUID |
| `slug` | String |
| `namespaceId` | UUID |
| `requirementKind` | String |
| `name` | String |
| `required` | Boolean |
| `atomId` | UUID |
| `present` | Boolean |
| `secretsObjectName` | String |
| `configObjectName` | String |

**Required create fields:** `resourceId`, `slug`, `namespaceId`, `requirementKind`, `name`, `required`, `atomId`, `present`, `secretsObjectName`, `configObjectName`

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
| `id` | UUID |
| `storeId` | UUID |
| `slug` | String |
| `definition` | JSON |
| `commitId` | UUID |
| `modulesHash` | UUID |
| `label` | String |
| `description` | String |
| `active` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `slug`, `definition`
**Optional create fields (backend defaults):** `storeId`, `commitId`, `modulesHash`, `label`, `description`, `active`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `name` | String |
| `namespaceName` | String |
| `description` | String |
| `isActive` | Boolean |
| `status` | String |
| `lastError` | String |
| `labels` | JSON |
| `annotations` | JSON |
| `isManaged` | Boolean |

**Required create fields:** `name`, `namespaceName`
**Optional create fields (backend defaults):** `description`, `isActive`, `status`, `lastError`, `labels`, `annotations`, `isManaged`

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
| `scopeId` | UUID |
| `storeId` | UUID |
| `context` | String |
| `name` | String |
| `description` | String |
| `definitionsCommitId` | UUID |
| `isValid` | Boolean |
| `validationErrors` | JSON |
| `createdBy` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `scopeId`, `storeId`, `context`, `name`, `description`, `definitionsCommitId`, `isValid`, `validationErrors`, `createdBy`

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
| `scopeId` | UUID |
| `nodeName` | String |
| `nodePath` | String |
| `status` | String |
| `startedAt` | Datetime |
| `completedAt` | Datetime |
| `errorCode` | String |
| `errorMessage` | String |
| `outputId` | UUID |

**Required create fields:** `executionId`, `scopeId`, `nodeName`
**Optional create fields (backend defaults):** `nodePath`, `status`, `startedAt`, `completedAt`, `errorCode`, `errorMessage`, `outputId`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `name` | String |
| `namespaceName` | String |
| `description` | String |
| `isActive` | Boolean |
| `status` | String |
| `lastError` | String |
| `labels` | JSON |
| `annotations` | JSON |
| `databaseId` | UUID |
| `isManaged` | Boolean |

**Required create fields:** `name`, `namespaceName`, `databaseId`
**Optional create fields (backend defaults):** `description`, `isActive`, `status`, `lastError`, `labels`, `annotations`, `isManaged`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `namespaceId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |
| `cpuMillicores` | Int |
| `memoryBytes` | BigInt |
| `storageBytes` | BigInt |
| `networkIngressBytes` | BigInt |
| `networkEgressBytes` | BigInt |
| `podCount` | Int |
| `metrics` | JSON |

**Required create fields:** `namespaceId`, `eventType`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`, `cpuMillicores`, `memoryBytes`, `storageBytes`, `networkIngressBytes`, `networkEgressBytes`, `podCount`, `metrics`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `slug` | String |
| `name` | String |
| `description` | String |
| `category` | String |
| `icon` | String |
| `logo` | Image |
| `brand` | JSON |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |

**Required create fields:** `slug`, `name`
**Optional create fields (backend defaults):** `description`, `category`, `icon`, `logo`, `brand`, `requiredSecrets`, `requiredConfigs`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `namespaceId` | UUID |
| `eventType` | String |
| `actorId` | UUID |
| `message` | String |
| `metadata` | JSON |
| `cpuMillicores` | Int |
| `memoryBytes` | BigInt |
| `storageBytes` | BigInt |
| `networkIngressBytes` | BigInt |
| `networkEgressBytes` | BigInt |
| `podCount` | Int |
| `metrics` | JSON |
| `databaseId` | UUID |

**Required create fields:** `namespaceId`, `eventType`, `databaseId`
**Optional create fields (backend defaults):** `actorId`, `message`, `metadata`, `cpuMillicores`, `memoryBytes`, `storageBytes`, `networkIngressBytes`, `networkEgressBytes`, `podCount`, `metrics`

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
| `scopeId` | UUID |
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
| `lastProgressAt` | Datetime |
| `errorCode` | String |
| `errorMessage` | String |

**Required create fields:** `graphId`, `scopeId`
**Optional create fields (backend defaults):** `startedAt`, `invocationId`, `outputNode`, `outputPort`, `status`, `inputPayload`, `outputPayload`, `nodeOutputs`, `executionPlan`, `currentWave`, `parentExecutionId`, `parentNodeName`, `definitionsCommitId`, `tickCount`, `completedAt`, `maxTicks`, `maxPendingJobs`, `timeoutAt`, `lastProgressAt`, `errorCode`, `errorMessage`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `scope` | String |
| `name` | String |
| `taskIdentifier` | String |
| `description` | String |
| `isPublished` | Boolean |
| `accessChannels` | String |
| `publishedAt` | Datetime |
| `maxAttempts` | Int |
| `priority` | Int |
| `queueName` | String |
| `runtime` | String |
| `targetSchema` | String |
| `targetFunction` | String |
| `moduleTable` | String |
| `functionColumns` | JSON |
| `payloadArgs` | JSON |
| `image` | String |
| `concurrency` | Int |
| `scaleMin` | Int |
| `scaleMax` | Int |
| `timeoutSeconds` | Int |
| `resources` | JSON |
| `isBuiltIn` | Boolean |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `requiredBuckets` | String |
| `requiredModels` | String |
| `inputs` | JSON |
| `outputs` | JSON |
| `props` | JSON |
| `volatile` | Boolean |
| `icon` | String |
| `category` | String |

**Required create fields:** `scope`, `name`, `taskIdentifier`
**Optional create fields (backend defaults):** `description`, `isPublished`, `accessChannels`, `publishedAt`, `maxAttempts`, `priority`, `queueName`, `runtime`, `targetSchema`, `targetFunction`, `moduleTable`, `functionColumns`, `payloadArgs`, `image`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `isBuiltIn`, `requiredSecrets`, `requiredConfigs`, `integrations`, `requiredBuckets`, `requiredModels`, `inputs`, `outputs`, `props`, `volatile`, `icon`, `category`

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
| `isPublished` | Boolean |
| `accessChannels` | String |
| `publishedAt` | Datetime |
| `maxAttempts` | Int |
| `priority` | Int |
| `queueName` | String |
| `runtime` | String |
| `targetSchema` | String |
| `targetFunction` | String |
| `moduleTable` | String |
| `functionColumns` | JSON |
| `payloadArgs` | JSON |
| `image` | String |
| `concurrency` | Int |
| `scaleMin` | Int |
| `scaleMax` | Int |
| `timeoutSeconds` | Int |
| `resources` | JSON |
| `isBuiltIn` | Boolean |
| `requiredSecrets` | ResourceRequirement |
| `requiredConfigs` | ResourceRequirement |
| `integrations` | String |
| `requiredBuckets` | String |
| `requiredModels` | String |
| `inputs` | JSON |
| `outputs` | JSON |
| `props` | JSON |
| `volatile` | Boolean |
| `icon` | String |
| `category` | String |
| `databaseId` | UUID |

**Required create fields:** `scope`, `name`, `taskIdentifier`, `databaseId`
**Optional create fields (backend defaults):** `description`, `isPublished`, `accessChannels`, `publishedAt`, `maxAttempts`, `priority`, `queueName`, `runtime`, `targetSchema`, `targetFunction`, `moduleTable`, `functionColumns`, `payloadArgs`, `image`, `concurrency`, `scaleMin`, `scaleMax`, `timeoutSeconds`, `resources`, `isBuiltIn`, `requiredSecrets`, `requiredConfigs`, `integrations`, `requiredBuckets`, `requiredModels`, `inputs`, `outputs`, `props`, `volatile`, `icon`, `category`

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

### `infra-init-empty-repo`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

### `init-empty-repo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

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

### `infra-set-data-at-path`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |

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

### `copy-graph`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.scopeId` | UUID |
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

### `import-graph-json`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.scopeId` | UUID |
  | `--input.name` | String |
  | `--input.graphJson` | JSON |
  | `--input.context` | String |
  | `--input.description` | String |
  | `--input.createdBy` | UUID |
  | `--input.definitionsCommitId` | UUID |

### `add-edge`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.scopeId` | UUID |
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
  | `--input.scopeId` | UUID |
  | `--input.rootHash` | UUID |
  | `--input.nodeName` | String |
  | `--input.nodeType` | String |
  | `--input.context` | String |
  | `--input.graphName` | String |
  | `--input.props` | JSON |
  | `--input.meta` | JSON |

### `infra-insert-node-at-path`

infraInsertNodeAtPath

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
