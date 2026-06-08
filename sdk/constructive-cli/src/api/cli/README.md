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
| `function` | function CRUD operations |
| `schema` | schema CRUD operations |
| `table` | table CRUD operations |
| `check-constraint` | checkConstraint CRUD operations |
| `field` | field CRUD operations |
| `spatial-relation` | spatialRelation CRUD operations |
| `foreign-key-constraint` | foreignKeyConstraint CRUD operations |
| `full-text-search` | fullTextSearch CRUD operations |
| `index` | index CRUD operations |
| `policy` | policy CRUD operations |
| `primary-key-constraint` | primaryKeyConstraint CRUD operations |
| `table-grant` | tableGrant CRUD operations |
| `trigger` | trigger CRUD operations |
| `unique-constraint` | uniqueConstraint CRUD operations |
| `view` | view CRUD operations |
| `view-table` | viewTable CRUD operations |
| `view-grant` | viewGrant CRUD operations |
| `view-rule` | viewRule CRUD operations |
| `embedding-chunk` | embeddingChunk CRUD operations |
| `schema-grant` | schemaGrant CRUD operations |
| `default-privilege` | defaultPrivilege CRUD operations |
| `enum` | enum CRUD operations |
| `composite-type` | compositeType CRUD operations |
| `api-schema` | apiSchema CRUD operations |
| `api-module` | apiModule CRUD operations |
| `domain` | domain CRUD operations |
| `site-metadatum` | siteMetadatum CRUD operations |
| `site-module` | siteModule CRUD operations |
| `site-theme` | siteTheme CRUD operations |
| `cors-setting` | corsSetting CRUD operations |
| `trigger-function` | triggerFunction CRUD operations |
| `partition` | partition CRUD operations |
| `database-transfer` | databaseTransfer CRUD operations |
| `api` | api CRUD operations |
| `site` | site CRUD operations |
| `app` | app CRUD operations |
| `api-setting` | apiSetting CRUD operations |
| `migrate-file` | migrateFile CRUD operations |
| `node-type-registry` | nodeTypeRegistry CRUD operations |
| `pubkey-setting` | pubkeySetting CRUD operations |
| `database` | database CRUD operations |
| `rls-setting` | rlsSetting CRUD operations |
| `sql-action` | sqlAction CRUD operations |
| `database-setting` | databaseSetting CRUD operations |
| `webauthn-setting` | webauthnSetting CRUD operations |
| `ast-migration` | astMigration CRUD operations |
| `apply-registry-defaults` | applyRegistryDefaults |
| `accept-database-transfer` | acceptDatabaseTransfer |
| `cancel-database-transfer` | cancelDatabaseTransfer |
| `reject-database-transfer` | rejectDatabaseTransfer |
| `provision-database-with-user` | provisionDatabaseWithUser |
| `bootstrap-user` | bootstrapUser |
| `set-field-order` | setFieldOrder |
| `apply-rls` | applyRls |
| `create-user-database` | Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include events/analytics (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups
 |
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

### `function`

CRUD operations for Function records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all function records |
| `find-first` | Find first matching function record |
| `get` | Get a function by id |
| `create` | Create a new function |
| `update` | Update an existing function |
| `delete` | Delete a function |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `name` | String |

**Required create fields:** `databaseId`, `schemaId`, `name`

### `schema`

CRUD operations for Schema records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all schema records |
| `find-first` | Find first matching schema record |
| `get` | Get a schema by id |
| `create` | Create a new schema |
| `update` | Update an existing schema |
| `delete` | Delete a schema |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `name` | String |
| `schemaName` | String |
| `label` | String |
| `description` | String |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `isPublic` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`, `schemaName`
**Optional create fields (backend defaults):** `label`, `description`, `smartTags`, `category`, `module`, `scope`, `tags`, `isPublic`

### `table`

CRUD operations for Table records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all table records |
| `find-first` | Find first matching table record |
| `get` | Get a table by id |
| `create` | Create a new table |
| `update` | Update an existing table |
| `delete` | Delete a table |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `name` | String |
| `label` | String |
| `description` | String |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `useRls` | Boolean |
| `timestamps` | Boolean |
| `peoplestamps` | Boolean |
| `pluralName` | String |
| `singularName` | String |
| `tags` | String |
| `partitioned` | Boolean |
| `partitionStrategy` | String |
| `partitionKeyNames` | String |
| `partitionKeyTypes` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `inheritsId` | UUID |

**Required create fields:** `schemaId`, `name`
**Optional create fields (backend defaults):** `databaseId`, `label`, `description`, `smartTags`, `category`, `module`, `scope`, `useRls`, `timestamps`, `peoplestamps`, `pluralName`, `singularName`, `tags`, `partitioned`, `partitionStrategy`, `partitionKeyNames`, `partitionKeyTypes`, `inheritsId`

### `check-constraint`

CRUD operations for CheckConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all checkConstraint records |
| `find-first` | Find first matching checkConstraint record |
| `get` | Get a checkConstraint by id |
| `create` | Create a new checkConstraint |
| `update` | Update an existing checkConstraint |
| `delete` | Delete a checkConstraint |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `type` | String |
| `fieldIds` | UUID |
| `expr` | JSON |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldIds`
**Optional create fields (backend defaults):** `databaseId`, `name`, `type`, `expr`, `smartTags`, `category`, `module`, `scope`, `tags`

### `field`

CRUD operations for Field records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all field records |
| `find-first` | Find first matching field record |
| `get` | Get a field by id |
| `create` | Create a new field |
| `update` | Update an existing field |
| `delete` | Delete a field |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `label` | String |
| `description` | String |
| `smartTags` | JSON |
| `isRequired` | Boolean |
| `apiRequired` | Boolean |
| `defaultValue` | JSON |
| `type` | JSON |
| `fieldOrder` | Int |
| `regexp` | String |
| `chk` | JSON |
| `chkExpr` | JSON |
| `min` | Float |
| `max` | Float |
| `tags` | String |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `name`, `type`
**Optional create fields (backend defaults):** `databaseId`, `label`, `description`, `smartTags`, `isRequired`, `apiRequired`, `defaultValue`, `fieldOrder`, `regexp`, `chk`, `chkExpr`, `min`, `max`, `tags`, `category`, `module`, `scope`

### `spatial-relation`

CRUD operations for SpatialRelation records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all spatialRelation records |
| `find-first` | Find first matching spatialRelation record |
| `get` | Get a spatialRelation by id |
| `create` | Create a new spatialRelation |
| `update` | Update an existing spatialRelation |
| `delete` | Delete a spatialRelation |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `fieldId` | UUID |
| `refTableId` | UUID |
| `refFieldId` | UUID |
| `name` | String |
| `operator` | String |
| `paramName` | String |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldId`, `refTableId`, `refFieldId`, `name`, `operator`
**Optional create fields (backend defaults):** `databaseId`, `paramName`, `category`, `module`, `scope`, `tags`

### `foreign-key-constraint`

CRUD operations for ForeignKeyConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all foreignKeyConstraint records |
| `find-first` | Find first matching foreignKeyConstraint record |
| `get` | Get a foreignKeyConstraint by id |
| `create` | Create a new foreignKeyConstraint |
| `update` | Update an existing foreignKeyConstraint |
| `delete` | Delete a foreignKeyConstraint |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `description` | String |
| `smartTags` | JSON |
| `type` | String |
| `fieldIds` | UUID |
| `refTableId` | UUID |
| `refFieldIds` | UUID |
| `deleteAction` | String |
| `updateAction` | String |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldIds`, `refTableId`, `refFieldIds`
**Optional create fields (backend defaults):** `databaseId`, `name`, `description`, `smartTags`, `type`, `deleteAction`, `updateAction`, `category`, `module`, `scope`, `tags`

### `full-text-search`

CRUD operations for FullTextSearch records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all fullTextSearch records |
| `find-first` | Find first matching fullTextSearch record |
| `get` | Get a fullTextSearch by id |
| `create` | Create a new fullTextSearch |
| `update` | Update an existing fullTextSearch |
| `delete` | Delete a fullTextSearch |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `fieldId` | UUID |
| `fieldIds` | UUID |
| `weights` | String |
| `langs` | String |
| `langColumn` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldId`, `fieldIds`, `weights`, `langs`
**Optional create fields (backend defaults):** `databaseId`, `langColumn`

### `index`

CRUD operations for Index records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all index records |
| `find-first` | Find first matching index record |
| `get` | Get a index by id |
| `create` | Create a new index |
| `update` | Update an existing index |
| `delete` | Delete a index |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `fieldIds` | UUID |
| `includeFieldIds` | UUID |
| `accessMethod` | String |
| `indexParams` | JSON |
| `whereClause` | JSON |
| `isUnique` | Boolean |
| `options` | JSON |
| `opClasses` | String |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `tableId`
**Optional create fields (backend defaults):** `name`, `fieldIds`, `includeFieldIds`, `accessMethod`, `indexParams`, `whereClause`, `isUnique`, `options`, `opClasses`, `smartTags`, `category`, `module`, `scope`, `tags`

### `policy`

CRUD operations for Policy records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all policy records |
| `find-first` | Find first matching policy record |
| `get` | Get a policy by id |
| `create` | Create a new policy |
| `update` | Update an existing policy |
| `delete` | Delete a policy |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `granteeName` | String |
| `privilege` | String |
| `permissive` | Boolean |
| `disabled` | Boolean |
| `policyType` | String |
| `data` | JSON |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`
**Optional create fields (backend defaults):** `databaseId`, `name`, `granteeName`, `privilege`, `permissive`, `disabled`, `policyType`, `data`, `smartTags`, `category`, `module`, `scope`, `tags`

### `primary-key-constraint`

CRUD operations for PrimaryKeyConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all primaryKeyConstraint records |
| `find-first` | Find first matching primaryKeyConstraint record |
| `get` | Get a primaryKeyConstraint by id |
| `create` | Create a new primaryKeyConstraint |
| `update` | Update an existing primaryKeyConstraint |
| `delete` | Delete a primaryKeyConstraint |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `type` | String |
| `fieldIds` | UUID |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldIds`
**Optional create fields (backend defaults):** `databaseId`, `name`, `type`, `smartTags`, `category`, `module`, `scope`, `tags`

### `table-grant`

CRUD operations for TableGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all tableGrant records |
| `find-first` | Find first matching tableGrant record |
| `get` | Get a tableGrant by id |
| `create` | Create a new tableGrant |
| `update` | Update an existing tableGrant |
| `delete` | Delete a tableGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `privilege` | String |
| `granteeName` | String |
| `fieldIds` | UUID |
| `isGrant` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `privilege`, `granteeName`
**Optional create fields (backend defaults):** `databaseId`, `fieldIds`, `isGrant`

### `trigger`

CRUD operations for Trigger records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all trigger records |
| `find-first` | Find first matching trigger record |
| `get` | Get a trigger by id |
| `create` | Create a new trigger |
| `update` | Update an existing trigger |
| `delete` | Delete a trigger |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `event` | String |
| `functionName` | String |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `name`
**Optional create fields (backend defaults):** `databaseId`, `event`, `functionName`, `smartTags`, `category`, `module`, `scope`, `tags`

### `unique-constraint`

CRUD operations for UniqueConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all uniqueConstraint records |
| `find-first` | Find first matching uniqueConstraint record |
| `get` | Get a uniqueConstraint by id |
| `create` | Create a new uniqueConstraint |
| `update` | Update an existing uniqueConstraint |
| `delete` | Delete a uniqueConstraint |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `name` | String |
| `description` | String |
| `smartTags` | JSON |
| `type` | String |
| `fieldIds` | UUID |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldIds`
**Optional create fields (backend defaults):** `databaseId`, `name`, `description`, `smartTags`, `type`, `category`, `module`, `scope`, `tags`

### `view`

CRUD operations for View records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all view records |
| `find-first` | Find first matching view record |
| `get` | Get a view by id |
| `create` | Create a new view |
| `update` | Update an existing view |
| `delete` | Delete a view |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `name` | String |
| `tableId` | UUID |
| `viewType` | String |
| `data` | JSON |
| `filterType` | String |
| `filterData` | JSON |
| `securityInvoker` | Boolean |
| `isReadOnly` | Boolean |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |

**Required create fields:** `schemaId`, `name`, `viewType`
**Optional create fields (backend defaults):** `databaseId`, `tableId`, `data`, `filterType`, `filterData`, `securityInvoker`, `isReadOnly`, `smartTags`, `category`, `module`, `scope`, `tags`

### `view-table`

CRUD operations for ViewTable records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all viewTable records |
| `find-first` | Find first matching viewTable record |
| `get` | Get a viewTable by id |
| `create` | Create a new viewTable |
| `update` | Update an existing viewTable |
| `delete` | Delete a viewTable |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `viewId` | UUID |
| `tableId` | UUID |
| `joinOrder` | Int |

**Required create fields:** `viewId`, `tableId`
**Optional create fields (backend defaults):** `joinOrder`

### `view-grant`

CRUD operations for ViewGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all viewGrant records |
| `find-first` | Find first matching viewGrant record |
| `get` | Get a viewGrant by id |
| `create` | Create a new viewGrant |
| `update` | Update an existing viewGrant |
| `delete` | Delete a viewGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `viewId` | UUID |
| `granteeName` | String |
| `privilege` | String |
| `withGrantOption` | Boolean |
| `isGrant` | Boolean |

**Required create fields:** `viewId`, `granteeName`, `privilege`
**Optional create fields (backend defaults):** `databaseId`, `withGrantOption`, `isGrant`

### `view-rule`

CRUD operations for ViewRule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all viewRule records |
| `find-first` | Find first matching viewRule record |
| `get` | Get a viewRule by id |
| `create` | Create a new viewRule |
| `update` | Update an existing viewRule |
| `delete` | Delete a viewRule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `viewId` | UUID |
| `name` | String |
| `event` | String |
| `action` | String |

**Required create fields:** `viewId`, `name`, `event`
**Optional create fields (backend defaults):** `databaseId`, `action`

### `embedding-chunk`

CRUD operations for EmbeddingChunk records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all embeddingChunk records |
| `find-first` | Find first matching embeddingChunk record |
| `get` | Get a embeddingChunk by id |
| `create` | Create a new embeddingChunk |
| `update` | Update an existing embeddingChunk |
| `delete` | Delete a embeddingChunk |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `embeddingFieldId` | UUID |
| `chunksTableId` | UUID |
| `chunksTableName` | String |
| `contentFieldName` | String |
| `dimensions` | Int |
| `metric` | String |
| `chunkSize` | Int |
| `chunkOverlap` | Int |
| `chunkStrategy` | String |
| `metadataFields` | JSON |
| `searchIndexes` | JSON |
| `enqueueChunkingJob` | Boolean |
| `chunkingTaskName` | String |
| `embeddingModel` | String |
| `embeddingProvider` | String |
| `parentFkFieldId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`
**Optional create fields (backend defaults):** `databaseId`, `embeddingFieldId`, `chunksTableId`, `chunksTableName`, `contentFieldName`, `dimensions`, `metric`, `chunkSize`, `chunkOverlap`, `chunkStrategy`, `metadataFields`, `searchIndexes`, `enqueueChunkingJob`, `chunkingTaskName`, `embeddingModel`, `embeddingProvider`, `parentFkFieldId`

### `schema-grant`

CRUD operations for SchemaGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all schemaGrant records |
| `find-first` | Find first matching schemaGrant record |
| `get` | Get a schemaGrant by id |
| `create` | Create a new schemaGrant |
| `update` | Update an existing schemaGrant |
| `delete` | Delete a schemaGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `granteeName` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `schemaId`, `granteeName`
**Optional create fields (backend defaults):** `databaseId`

### `default-privilege`

CRUD operations for DefaultPrivilege records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all defaultPrivilege records |
| `find-first` | Find first matching defaultPrivilege record |
| `get` | Get a defaultPrivilege by id |
| `create` | Create a new defaultPrivilege |
| `update` | Update an existing defaultPrivilege |
| `delete` | Delete a defaultPrivilege |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `objectType` | String |
| `privilege` | String |
| `granteeName` | String |
| `isGrant` | Boolean |

**Required create fields:** `schemaId`, `objectType`, `privilege`, `granteeName`
**Optional create fields (backend defaults):** `databaseId`, `isGrant`

### `enum`

CRUD operations for Enum records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all enum records |
| `find-first` | Find first matching enum record |
| `get` | Get a enum by id |
| `create` | Create a new enum |
| `update` | Update an existing enum |
| `delete` | Delete a enum |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `name` | String |
| `label` | String |
| `description` | String |
| `values` | String |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |

**Required create fields:** `databaseId`, `schemaId`, `name`
**Optional create fields (backend defaults):** `label`, `description`, `values`, `smartTags`, `category`, `module`, `scope`, `tags`

### `composite-type`

CRUD operations for CompositeType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all compositeType records |
| `find-first` | Find first matching compositeType record |
| `get` | Get a compositeType by id |
| `create` | Create a new compositeType |
| `update` | Update an existing compositeType |
| `delete` | Delete a compositeType |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `name` | String |
| `label` | String |
| `description` | String |
| `attributes` | JSON |
| `smartTags` | JSON |
| `category` | ObjectCategory |
| `module` | String |
| `scope` | Int |
| `tags` | String |

**Required create fields:** `databaseId`, `schemaId`, `name`
**Optional create fields (backend defaults):** `label`, `description`, `attributes`, `smartTags`, `category`, `module`, `scope`, `tags`

### `api-schema`

CRUD operations for ApiSchema records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all apiSchema records |
| `find-first` | Find first matching apiSchema record |
| `get` | Get a apiSchema by id |
| `create` | Create a new apiSchema |
| `update` | Update an existing apiSchema |
| `delete` | Delete a apiSchema |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `apiId` | UUID |

**Required create fields:** `databaseId`, `schemaId`, `apiId`

### `api-module`

CRUD operations for ApiModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all apiModule records |
| `find-first` | Find first matching apiModule record |
| `get` | Get a apiModule by id |
| `create` | Create a new apiModule |
| `update` | Update an existing apiModule |
| `delete` | Delete a apiModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `apiId` | UUID |
| `name` | String |
| `data` | JSON |

**Required create fields:** `databaseId`, `apiId`, `name`, `data`

### `domain`

CRUD operations for Domain records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all domain records |
| `find-first` | Find first matching domain record |
| `get` | Get a domain by id |
| `create` | Create a new domain |
| `update` | Update an existing domain |
| `delete` | Delete a domain |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `apiId` | UUID |
| `siteId` | UUID |
| `subdomain` | Hostname |
| `domain` | Hostname |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `apiId`, `siteId`, `subdomain`, `domain`

### `site-metadatum`

CRUD operations for SiteMetadatum records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all siteMetadatum records |
| `find-first` | Find first matching siteMetadatum record |
| `get` | Get a siteMetadatum by id |
| `create` | Create a new siteMetadatum |
| `update` | Update an existing siteMetadatum |
| `delete` | Delete a siteMetadatum |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `siteId` | UUID |
| `title` | String |
| `description` | String |
| `ogImage` | Image |

**Required create fields:** `databaseId`, `siteId`
**Optional create fields (backend defaults):** `title`, `description`, `ogImage`

### `site-module`

CRUD operations for SiteModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all siteModule records |
| `find-first` | Find first matching siteModule record |
| `get` | Get a siteModule by id |
| `create` | Create a new siteModule |
| `update` | Update an existing siteModule |
| `delete` | Delete a siteModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `siteId` | UUID |
| `name` | String |
| `data` | JSON |

**Required create fields:** `databaseId`, `siteId`, `name`, `data`

### `site-theme`

CRUD operations for SiteTheme records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all siteTheme records |
| `find-first` | Find first matching siteTheme record |
| `get` | Get a siteTheme by id |
| `create` | Create a new siteTheme |
| `update` | Update an existing siteTheme |
| `delete` | Delete a siteTheme |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `siteId` | UUID |
| `theme` | JSON |

**Required create fields:** `databaseId`, `siteId`, `theme`

### `cors-setting`

CRUD operations for CorsSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all corsSetting records |
| `find-first` | Find first matching corsSetting record |
| `get` | Get a corsSetting by id |
| `create` | Create a new corsSetting |
| `update` | Update an existing corsSetting |
| `delete` | Delete a corsSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `apiId` | UUID |
| `allowedOrigins` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `apiId`, `allowedOrigins`

### `trigger-function`

CRUD operations for TriggerFunction records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all triggerFunction records |
| `find-first` | Find first matching triggerFunction record |
| `get` | Get a triggerFunction by id |
| `create` | Create a new triggerFunction |
| `update` | Update an existing triggerFunction |
| `delete` | Delete a triggerFunction |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `name` | String |
| `code` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`
**Optional create fields (backend defaults):** `code`

### `partition`

CRUD operations for Partition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all partition records |
| `find-first` | Find first matching partition record |
| `get` | Get a partition by id |
| `create` | Create a new partition |
| `update` | Update an existing partition |
| `delete` | Delete a partition |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `strategy` | String |
| `partitionKeyId` | UUID |
| `interval` | String |
| `retention` | String |
| `retentionKeepTable` | Boolean |
| `premake` | Int |
| `namingPattern` | String |
| `isParented` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `tableId`, `strategy`, `partitionKeyId`
**Optional create fields (backend defaults):** `interval`, `retention`, `retentionKeepTable`, `premake`, `namingPattern`, `isParented`

### `database-transfer`

CRUD operations for DatabaseTransfer records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all databaseTransfer records |
| `find-first` | Find first matching databaseTransfer record |
| `get` | Get a databaseTransfer by id |
| `create` | Create a new databaseTransfer |
| `update` | Update an existing databaseTransfer |
| `delete` | Delete a databaseTransfer |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `targetOwnerId` | UUID |
| `sourceApproved` | Boolean |
| `targetApproved` | Boolean |
| `sourceApprovedAt` | Datetime |
| `targetApprovedAt` | Datetime |
| `status` | String |
| `initiatedBy` | UUID |
| `notes` | String |
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `completedAt` | Datetime |

**Required create fields:** `databaseId`, `targetOwnerId`, `initiatedBy`
**Optional create fields (backend defaults):** `sourceApproved`, `targetApproved`, `sourceApprovedAt`, `targetApprovedAt`, `status`, `notes`, `expiresAt`, `completedAt`

### `api`

CRUD operations for Api records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all api records |
| `find-first` | Find first matching api record |
| `get` | Get a api by id |
| `create` | Create a new api |
| `update` | Update an existing api |
| `delete` | Delete a api |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `name` | String |
| `dbname` | String |
| `roleName` | String |
| `anonRole` | String |
| `isPublic` | Boolean |

**Required create fields:** `databaseId`, `name`
**Optional create fields (backend defaults):** `dbname`, `roleName`, `anonRole`, `isPublic`

### `site`

CRUD operations for Site records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all site records |
| `find-first` | Find first matching site record |
| `get` | Get a site by id |
| `create` | Create a new site |
| `update` | Update an existing site |
| `delete` | Delete a site |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `title` | String |
| `description` | String |
| `ogImage` | Image |
| `favicon` | Attachment |
| `appleTouchIcon` | Image |
| `logo` | Image |
| `dbname` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `title`, `description`, `ogImage`, `favicon`, `appleTouchIcon`, `logo`, `dbname`

### `app`

CRUD operations for App records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all app records |
| `find-first` | Find first matching app record |
| `get` | Get a app by id |
| `create` | Create a new app |
| `update` | Update an existing app |
| `delete` | Delete a app |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `siteId` | UUID |
| `name` | String |
| `appImage` | Image |
| `appStoreLink` | Url |
| `appStoreId` | String |
| `appIdPrefix` | String |
| `playStoreLink` | Url |

**Required create fields:** `databaseId`, `siteId`
**Optional create fields (backend defaults):** `name`, `appImage`, `appStoreLink`, `appStoreId`, `appIdPrefix`, `playStoreLink`

### `api-setting`

CRUD operations for ApiSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all apiSetting records |
| `find-first` | Find first matching apiSetting record |
| `get` | Get a apiSetting by id |
| `create` | Create a new apiSetting |
| `update` | Update an existing apiSetting |
| `delete` | Delete a apiSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `apiId` | UUID |
| `enableAggregates` | Boolean |
| `enablePostgis` | Boolean |
| `enableSearch` | Boolean |
| `enableDirectUploads` | Boolean |
| `enablePresignedUploads` | Boolean |
| `enableManyToMany` | Boolean |
| `enableConnectionFilter` | Boolean |
| `enableLtree` | Boolean |
| `enableLlm` | Boolean |
| `enableRealtime` | Boolean |
| `enableBulk` | Boolean |
| `enableI18N` | Boolean |
| `options` | JSON |

**Required create fields:** `databaseId`, `apiId`
**Optional create fields (backend defaults):** `enableAggregates`, `enablePostgis`, `enableSearch`, `enableDirectUploads`, `enablePresignedUploads`, `enableManyToMany`, `enableConnectionFilter`, `enableLtree`, `enableLlm`, `enableRealtime`, `enableBulk`, `enableI18N`, `options`

### `migrate-file`

CRUD operations for MigrateFile records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all migrateFile records |
| `find-first` | Find first matching migrateFile record |
| `get` | Get a migrateFile by id |
| `create` | Create a new migrateFile |
| `update` | Update an existing migrateFile |
| `delete` | Delete a migrateFile |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `upload` | Upload |

**Optional create fields (backend defaults):** `databaseId`, `upload`

### `node-type-registry`

CRUD operations for NodeTypeRegistry records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all nodeTypeRegistry records |
| `find-first` | Find first matching nodeTypeRegistry record |
| `get` | Get a nodeTypeRegistry by name |
| `create` | Create a new nodeTypeRegistry |
| `update` | Update an existing nodeTypeRegistry |
| `delete` | Delete a nodeTypeRegistry |

**Fields:**

| Field | Type |
|-------|------|
| `name` | String |
| `slug` | String |
| `category` | String |
| `displayName` | String |
| `description` | String |
| `parameterSchema` | JSON |
| `tags` | String |

**Required create fields:** `slug`, `category`
**Optional create fields (backend defaults):** `displayName`, `description`, `parameterSchema`, `tags`

### `pubkey-setting`

CRUD operations for PubkeySetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all pubkeySetting records |
| `find-first` | Find first matching pubkeySetting record |
| `get` | Get a pubkeySetting by id |
| `create` | Create a new pubkeySetting |
| `update` | Update an existing pubkeySetting |
| `delete` | Delete a pubkeySetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `cryptoNetwork` | String |
| `userField` | String |
| `signUpWithKeyFunctionId` | UUID |
| `signInRequestChallengeFunctionId` | UUID |
| `signInRecordFailureFunctionId` | UUID |
| `signInWithChallengeFunctionId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `cryptoNetwork`, `userField`, `signUpWithKeyFunctionId`, `signInRequestChallengeFunctionId`, `signInRecordFailureFunctionId`, `signInWithChallengeFunctionId`

### `database`

CRUD operations for Database records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all database records |
| `find-first` | Find first matching database record |
| `get` | Get a database by id |
| `create` | Create a new database |
| `update` | Update an existing database |
| `delete` | Delete a database |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `schemaHash` | String |
| `name` | String |
| `label` | String |
| `hash` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `ownerId`, `schemaHash`, `name`, `label`, `hash`

### `rls-setting`

CRUD operations for RlsSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all rlsSetting records |
| `find-first` | Find first matching rlsSetting record |
| `get` | Get a rlsSetting by id |
| `create` | Create a new rlsSetting |
| `update` | Update an existing rlsSetting |
| `delete` | Delete a rlsSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `authenticateSchemaId` | UUID |
| `roleSchemaId` | UUID |
| `authenticateFunctionId` | UUID |
| `authenticateStrictFunctionId` | UUID |
| `currentRoleFunctionId` | UUID |
| `currentRoleIdFunctionId` | UUID |
| `currentUserAgentFunctionId` | UUID |
| `currentIpAddressFunctionId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `authenticateSchemaId`, `roleSchemaId`, `authenticateFunctionId`, `authenticateStrictFunctionId`, `currentRoleFunctionId`, `currentRoleIdFunctionId`, `currentUserAgentFunctionId`, `currentIpAddressFunctionId`

### `sql-action`

CRUD operations for SqlAction records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all sqlAction records |
| `find-first` | Find first matching sqlAction record |
| `get` | Get a sqlAction by id |
| `create` | Create a new sqlAction |
| `update` | Update an existing sqlAction |
| `delete` | Delete a sqlAction |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `name` | String |
| `databaseId` | UUID |
| `deploy` | String |
| `deps` | String |
| `payload` | JSON |
| `content` | String |
| `revert` | String |
| `verify` | String |
| `createdAt` | Datetime |
| `action` | String |
| `actionId` | UUID |
| `actorId` | UUID |

**Optional create fields (backend defaults):** `name`, `databaseId`, `deploy`, `deps`, `payload`, `content`, `revert`, `verify`, `action`, `actionId`, `actorId`

### `database-setting`

CRUD operations for DatabaseSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all databaseSetting records |
| `find-first` | Find first matching databaseSetting record |
| `get` | Get a databaseSetting by id |
| `create` | Create a new databaseSetting |
| `update` | Update an existing databaseSetting |
| `delete` | Delete a databaseSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `enableAggregates` | Boolean |
| `enablePostgis` | Boolean |
| `enableSearch` | Boolean |
| `enableDirectUploads` | Boolean |
| `enablePresignedUploads` | Boolean |
| `enableManyToMany` | Boolean |
| `enableConnectionFilter` | Boolean |
| `enableLtree` | Boolean |
| `enableLlm` | Boolean |
| `enableRealtime` | Boolean |
| `enableBulk` | Boolean |
| `enableI18N` | Boolean |
| `options` | JSON |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `enableAggregates`, `enablePostgis`, `enableSearch`, `enableDirectUploads`, `enablePresignedUploads`, `enableManyToMany`, `enableConnectionFilter`, `enableLtree`, `enableLlm`, `enableRealtime`, `enableBulk`, `enableI18N`, `options`

### `webauthn-setting`

CRUD operations for WebauthnSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webauthnSetting records |
| `find-first` | Find first matching webauthnSetting record |
| `get` | Get a webauthnSetting by id |
| `create` | Create a new webauthnSetting |
| `update` | Update an existing webauthnSetting |
| `delete` | Delete a webauthnSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `credentialsSchemaId` | UUID |
| `sessionsSchemaId` | UUID |
| `sessionSecretsSchemaId` | UUID |
| `credentialsTableId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `sessionSecretsTableId` | UUID |
| `userFieldId` | UUID |
| `rpId` | String |
| `rpName` | String |
| `originAllowlist` | String |
| `attestationType` | String |
| `requireUserVerification` | Boolean |
| `residentKey` | String |
| `challengeExpirySeconds` | BigInt |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `credentialsSchemaId`, `sessionsSchemaId`, `sessionSecretsSchemaId`, `credentialsTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `sessionSecretsTableId`, `userFieldId`, `rpId`, `rpName`, `originAllowlist`, `attestationType`, `requireUserVerification`, `residentKey`, `challengeExpirySeconds`

### `ast-migration`

CRUD operations for AstMigration records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all astMigration records |
| `find-first` | Find first matching astMigration record |
| `get` | Get a astMigration by id |
| `create` | Create a new astMigration |
| `update` | Update an existing astMigration |
| `delete` | Delete a astMigration |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `databaseId` | UUID |
| `name` | String |
| `requires` | String |
| `payload` | JSON |
| `deploys` | String |
| `deploy` | JSON |
| `revert` | JSON |
| `verify` | JSON |
| `createdAt` | Datetime |
| `action` | String |
| `actionId` | UUID |
| `actorId` | UUID |

**Optional create fields (backend defaults):** `databaseId`, `name`, `requires`, `payload`, `deploys`, `deploy`, `revert`, `verify`, `action`, `actionId`, `actorId`

## Custom Operations

### `apply-registry-defaults`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--nodeType` | String |
  | `--data` | JSON |

### `accept-database-transfer`

acceptDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

### `cancel-database-transfer`

cancelDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

### `reject-database-transfer`

rejectDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

### `provision-database-with-user`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.pDatabaseName` | String |
  | `--input.pDomain` | String |
  | `--input.pSubdomain` | String |
  | `--input.pModules` | JSON |
  | `--input.pOptions` | JSON |

### `bootstrap-user`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.targetDatabaseId` | UUID |
  | `--input.password` | String |
  | `--input.isAdmin` | Boolean |
  | `--input.isOwner` | Boolean |
  | `--input.username` | String |
  | `--input.displayName` | String |
  | `--input.returnApiKey` | Boolean |

### `set-field-order`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.fieldIds` | UUID |

### `apply-rls`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.tableId` | UUID |
  | `--input.grants` | JSON |
  | `--input.policyType` | String |
  | `--input.vars` | JSON |
  | `--input.fieldIds` | UUID |
  | `--input.permissive` | Boolean |
  | `--input.name` | String |

### `create-user-database`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include events/analytics (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups


- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseName` | String |
  | `--input.ownerId` | UUID |
  | `--input.includeInvites` | Boolean |
  | `--input.includeGroups` | Boolean |
  | `--input.includeLevels` | Boolean |
  | `--input.bitlen` | Int |
  | `--input.tokensExpiration` | IntervalInput |

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
