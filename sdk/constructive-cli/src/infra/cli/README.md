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
| `infra-ref` | infraRef CRUD operations |
| `infra-store` | infraStore CRUD operations |
| `infra-object` | infraObject CRUD operations |
| `infra-commit` | infraCommit CRUD operations |
| `db-preset` | dbPreset CRUD operations |
| `platform-namespace` | platformNamespace CRUD operations |
| `namespace` | namespace CRUD operations |
| `platform-namespace-event` | platformNamespaceEvent CRUD operations |
| `namespace-event` | namespaceEvent CRUD operations |
| `infra-init-empty-repo` | infraInitEmptyRepo |
| `infra-set-data-at-path` | infraSetDataAtPath |
| `infra-insert-node-at-path` | infraInsertNodeAtPath |
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

## Custom Operations

### `infra-init-empty-repo`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sId` | UUID |
  | `--input.storeId` | UUID |

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
