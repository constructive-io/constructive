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
| `api` | api CRUD operations |
| `api-module` | apiModule CRUD operations |
| `api-schema` | apiSchema CRUD operations |
| `api-setting` | apiSetting CRUD operations |
| `app` | app CRUD operations |
| `ast-migration` | astMigration CRUD operations |
| `check-constraint` | checkConstraint CRUD operations |
| `composite-type` | compositeType CRUD operations |
| `cors-setting` | corsSetting CRUD operations |
| `database` | database CRUD operations |
| `database-setting` | databaseSetting CRUD operations |
| `database-transfer` | databaseTransfer CRUD operations |
| `default-privilege` | defaultPrivilege CRUD operations |
| `domain` | domain CRUD operations |
| `domain-event` | domainEvent CRUD operations |
| `domain-verification` | domainVerification CRUD operations |
| `embedding-chunk` | embeddingChunk CRUD operations |
| `enum` | enum CRUD operations |
| `exclusion-constraint` | exclusionConstraint CRUD operations |
| `field` | field CRUD operations |
| `foreign-key-constraint` | foreignKeyConstraint CRUD operations |
| `full-text-search` | fullTextSearch CRUD operations |
| `function` | function CRUD operations |
| `http-route` | httpRoute CRUD operations |
| `index` | index CRUD operations |
| `managed-domain` | managedDomain CRUD operations |
| `node-type-registry` | nodeTypeRegistry CRUD operations |
| `partition` | partition CRUD operations |
| `policy` | policy CRUD operations |
| `primary-key-constraint` | primaryKeyConstraint CRUD operations |
| `pubkey-setting` | pubkeySetting CRUD operations |
| `rls-setting` | rlsSetting CRUD operations |
| `schema` | schema CRUD operations |
| `schema-grant` | schemaGrant CRUD operations |
| `site` | site CRUD operations |
| `site-metadatum` | siteMetadatum CRUD operations |
| `site-module` | siteModule CRUD operations |
| `site-theme` | siteTheme CRUD operations |
| `spatial-relation` | spatialRelation CRUD operations |
| `sql-action` | sqlAction CRUD operations |
| `table` | table CRUD operations |
| `table-grant` | tableGrant CRUD operations |
| `trigger` | trigger CRUD operations |
| `trigger-function` | triggerFunction CRUD operations |
| `unique-constraint` | uniqueConstraint CRUD operations |
| `view` | view CRUD operations |
| `view-grant` | viewGrant CRUD operations |
| `view-rule` | viewRule CRUD operations |
| `view-table` | viewTable CRUD operations |
| `webauthn-setting` | webauthnSetting CRUD operations |
| `apply-registry-defaults` | applyRegistryDefaults |
| `resolve-http-route` | resolveHttpRoute |
| `accept-database-transfer` | acceptDatabaseTransfer |
| `apply-rls` | applyRls |
| `cancel-database-transfer` | cancelDatabaseTransfer |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `reject-database-transfer` | rejectDatabaseTransfer |
| `request-database` | Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb); |
| `set-field-order` | setFieldOrder |

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
| `annotations` | JSON |
| `anonRole` | String |
| `databaseId` | UUID |
| `dbname` | String |
| `id` | UUID |
| `isPublic` | Boolean |
| `labels` | JSON |
| `name` | String |
| `roleName` | String |

**Required create fields:** `databaseId`, `name`
**Optional create fields (backend defaults):** `annotations`, `anonRole`, `dbname`, `isPublic`, `labels`, `roleName`

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
| `apiId` | UUID |
| `data` | JSON |
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |

**Required create fields:** `apiId`, `data`, `databaseId`, `name`

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
| `apiId` | UUID |
| `databaseId` | UUID |
| `id` | UUID |
| `schemaId` | UUID |

**Required create fields:** `apiId`, `databaseId`, `schemaId`

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
| `apiId` | UUID |
| `databaseId` | UUID |
| `enableAggregates` | Boolean |
| `enableBulk` | Boolean |
| `enableConnectionFilter` | Boolean |
| `enableDirectUploads` | Boolean |
| `enableI18N` | Boolean |
| `enableLlm` | Boolean |
| `enableLtree` | Boolean |
| `enableManyToMany` | Boolean |
| `enablePostgis` | Boolean |
| `enablePresignedUploads` | Boolean |
| `enableRealtime` | Boolean |
| `enableSearch` | Boolean |
| `id` | UUID |
| `options` | JSON |

**Required create fields:** `apiId`, `databaseId`
**Optional create fields (backend defaults):** `enableAggregates`, `enableBulk`, `enableConnectionFilter`, `enableDirectUploads`, `enableI18N`, `enableLlm`, `enableLtree`, `enableManyToMany`, `enablePostgis`, `enablePresignedUploads`, `enableRealtime`, `enableSearch`, `options`

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
| `appIdPrefix` | String |
| `appImage` | Image |
| `appStoreId` | String |
| `appStoreLink` | Url |
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `playStoreLink` | Url |
| `siteId` | UUID |

**Required create fields:** `databaseId`, `siteId`
**Optional create fields (backend defaults):** `appIdPrefix`, `appImage`, `appStoreId`, `appStoreLink`, `name`, `playStoreLink`

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
| `actionId` | UUID |
| `actionName` | String |
| `actorId` | UUID |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `deploy` | JSON |
| `deploys` | String |
| `id` | Int |
| `name` | String |
| `payload` | JSON |
| `requires` | String |
| `revert` | JSON |
| `verify` | JSON |

**Required create fields:** `actionId`, `actionName`, `actorId`, `databaseId`, `deploy`, `deploys`, `name`, `payload`, `requires`, `revert`, `verify`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `expr` | JSON |
| `fieldIds` | UUID |
| `id` | UUID |
| `initiallyDeferred` | Boolean |
| `isDeferrable` | Boolean |
| `name` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | String |
| `updatedAt` | Datetime |

**Required create fields:** `fieldIds`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `expr`, `initiallyDeferred`, `isDeferrable`, `name`, `smartTags`, `tags`, `type`

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
| `attributes` | JSON |
| `category` | ObjectCategory |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `label` | String |
| `name` | String |
| `schemaId` | UUID |
| `smartTags` | JSON |
| `tags` | String |

**Required create fields:** `databaseId`, `name`, `schemaId`
**Optional create fields (backend defaults):** `attributes`, `category`, `description`, `label`, `smartTags`, `tags`

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
| `allowedOrigins` | String |
| `apiId` | UUID |
| `databaseId` | UUID |
| `id` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `allowedOrigins`, `apiId`

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
| `createdAt` | Datetime |
| `hash` | UUID |
| `id` | UUID |
| `label` | String |
| `name` | String |
| `ownerId` | UUID |
| `platform` | Boolean |
| `schemaHash` | String |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `hash`, `label`, `name`, `ownerId`, `platform`, `schemaHash`

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
| `annotations` | JSON |
| `databaseId` | UUID |
| `enableAggregates` | Boolean |
| `enableBulk` | Boolean |
| `enableConnectionFilter` | Boolean |
| `enableDirectUploads` | Boolean |
| `enableI18N` | Boolean |
| `enableLlm` | Boolean |
| `enableLtree` | Boolean |
| `enableManyToMany` | Boolean |
| `enablePostgis` | Boolean |
| `enablePresignedUploads` | Boolean |
| `enableRealtime` | Boolean |
| `enableSearch` | Boolean |
| `id` | UUID |
| `labels` | JSON |
| `options` | JSON |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `annotations`, `enableAggregates`, `enableBulk`, `enableConnectionFilter`, `enableDirectUploads`, `enableI18N`, `enableLlm`, `enableLtree`, `enableManyToMany`, `enablePostgis`, `enablePresignedUploads`, `enableRealtime`, `enableSearch`, `labels`, `options`

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
| `completedAt` | Datetime |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `expiresAt` | Datetime |
| `id` | UUID |
| `initiatedBy` | UUID |
| `notes` | String |
| `sourceApproved` | Boolean |
| `sourceApprovedAt` | Datetime |
| `status` | String |
| `targetApproved` | Boolean |
| `targetApprovedAt` | Datetime |
| `targetOwnerId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `initiatedBy`, `targetOwnerId`
**Optional create fields (backend defaults):** `completedAt`, `expiresAt`, `notes`, `sourceApproved`, `sourceApprovedAt`, `status`, `targetApproved`, `targetApprovedAt`

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
| `databaseId` | UUID |
| `granteeName` | String |
| `id` | UUID |
| `isGrant` | Boolean |
| `objectType` | String |
| `privilege` | String |
| `schemaId` | UUID |

**Required create fields:** `granteeName`, `objectType`, `privilege`, `schemaId`
**Optional create fields (backend defaults):** `databaseId`, `isGrant`

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
| `annotations` | JSON |
| `apiId` | UUID |
| `databaseId` | UUID |
| `domain` | Hostname |
| `id` | UUID |
| `labels` | JSON |
| `serviceId` | UUID |
| `siteId` | UUID |
| `subdomain` | Hostname |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `annotations`, `apiId`, `domain`, `labels`, `serviceId`, `siteId`, `subdomain`

### `domain-event`

CRUD operations for DomainEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all domainEvent records |
| `find-first` | Find first matching domainEvent record |
| `get` | Get a domainEvent by id |
| `create` | Create a new domainEvent |
| `update` | Update an existing domainEvent |
| `delete` | Delete a domainEvent |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `domainVerificationId` | UUID |
| `eventType` | String |
| `id` | UUID |
| `managedDomainId` | UUID |
| `message` | String |
| `metadata` | JSON |
| `ownerId` | UUID |

**Required create fields:** `eventType`, `managedDomainId`, `ownerId`
**Optional create fields (backend defaults):** `actorId`, `domainVerificationId`, `message`, `metadata`

### `domain-verification`

CRUD operations for DomainVerification records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all domainVerification records |
| `find-first` | Find first matching domainVerification record |
| `get` | Get a domainVerification by id |
| `create` | Create a new domainVerification |
| `update` | Update an existing domainVerification |
| `delete` | Delete a domainVerification |

**Fields:**

| Field | Type |
|-------|------|
| `attempts` | Int |
| `createdAt` | Datetime |
| `error` | String |
| `expiresAt` | Datetime |
| `id` | UUID |
| `lastCheckedAt` | Datetime |
| `managedDomainId` | UUID |
| `method` | String |
| `ownerId` | UUID |
| `recordName` | String |
| `recordType` | String |
| `recordValue` | String |
| `status` | String |
| `updatedAt` | Datetime |
| `verifiedAt` | Datetime |

**Required create fields:** `managedDomainId`, `ownerId`
**Optional create fields (backend defaults):** `attempts`, `error`, `expiresAt`, `lastCheckedAt`, `method`, `recordName`, `recordType`, `recordValue`, `status`, `verifiedAt`

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
| `chunkOverlap` | Int |
| `chunkSize` | Int |
| `chunkStrategy` | String |
| `chunkingTaskName` | String |
| `chunksTableId` | UUID |
| `chunksTableName` | String |
| `contentFieldName` | String |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `dimensions` | Int |
| `embeddingFieldId` | UUID |
| `embeddingModel` | String |
| `embeddingProvider` | String |
| `enqueueChunkingJob` | Boolean |
| `id` | UUID |
| `metadataFields` | JSON |
| `metric` | String |
| `parentFkFieldId` | UUID |
| `searchIndexes` | JSON |
| `tableId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`
**Optional create fields (backend defaults):** `chunkOverlap`, `chunkSize`, `chunkStrategy`, `chunkingTaskName`, `chunksTableId`, `chunksTableName`, `contentFieldName`, `databaseId`, `dimensions`, `embeddingFieldId`, `embeddingModel`, `embeddingProvider`, `enqueueChunkingJob`, `metadataFields`, `metric`, `parentFkFieldId`, `searchIndexes`

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
| `category` | ObjectCategory |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `label` | String |
| `name` | String |
| `schemaId` | UUID |
| `smartTags` | JSON |
| `tags` | String |
| `values` | String |

**Required create fields:** `databaseId`, `name`, `schemaId`
**Optional create fields (backend defaults):** `category`, `description`, `label`, `smartTags`, `tags`, `values`

### `exclusion-constraint`

CRUD operations for ExclusionConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all exclusionConstraint records |
| `find-first` | Find first matching exclusionConstraint record |
| `get` | Get a exclusionConstraint by id |
| `create` | Create a new exclusionConstraint |
| `update` | Update an existing exclusionConstraint |
| `delete` | Delete a exclusionConstraint |

**Fields:**

| Field | Type |
|-------|------|
| `accessMethod` | String |
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `elementExpr` | JSON |
| `fieldIds` | UUID |
| `id` | UUID |
| `name` | String |
| `operators` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | String |
| `updatedAt` | Datetime |
| `whereClause` | JSON |

**Required create fields:** `tableId`
**Optional create fields (backend defaults):** `accessMethod`, `category`, `databaseId`, `elementExpr`, `fieldIds`, `name`, `operators`, `smartTags`, `tags`, `type`, `whereClause`

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
| `apiRequired` | Boolean |
| `category` | ObjectCategory |
| `chk` | JSON |
| `chkExpr` | JSON |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `defaultValue` | JSON |
| `description` | String |
| `fieldOrder` | Int |
| `generationExpression` | JSON |
| `generationType` | String |
| `id` | UUID |
| `identityGeneration` | String |
| `identityOptions` | JSON |
| `isRequired` | Boolean |
| `label` | String |
| `max` | Float |
| `min` | Float |
| `name` | String |
| `regexp` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | JSON |
| `updatedAt` | Datetime |

**Required create fields:** `name`, `tableId`, `type`
**Optional create fields (backend defaults):** `apiRequired`, `category`, `chk`, `chkExpr`, `databaseId`, `defaultValue`, `description`, `fieldOrder`, `generationExpression`, `generationType`, `identityGeneration`, `identityOptions`, `isRequired`, `label`, `max`, `min`, `regexp`, `smartTags`, `tags`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `deleteAction` | String |
| `deleteSetFieldIds` | UUID |
| `description` | String |
| `fieldIds` | UUID |
| `id` | UUID |
| `initiallyDeferred` | Boolean |
| `isDeferrable` | Boolean |
| `name` | String |
| `refFieldIds` | UUID |
| `refTableId` | UUID |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | String |
| `updateAction` | String |
| `updatedAt` | Datetime |
| `withPeriod` | Boolean |

**Required create fields:** `fieldIds`, `refFieldIds`, `refTableId`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `deleteAction`, `deleteSetFieldIds`, `description`, `initiallyDeferred`, `isDeferrable`, `name`, `smartTags`, `tags`, `type`, `updateAction`, `withPeriod`

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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `fieldId` | UUID |
| `fieldIds` | UUID |
| `id` | UUID |
| `langColumn` | String |
| `langs` | String |
| `tableId` | UUID |
| `updatedAt` | Datetime |
| `weights` | String |

**Required create fields:** `fieldId`, `fieldIds`, `langs`, `tableId`, `weights`
**Optional create fields (backend defaults):** `databaseId`, `langColumn`

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
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `schemaId` | UUID |

**Required create fields:** `databaseId`, `name`, `schemaId`

### `http-route`

CRUD operations for HttpRoute records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all httpRoute records |
| `find-first` | Find first matching httpRoute record |
| `get` | Get a httpRoute by id |
| `create` | Create a new httpRoute |
| `update` | Update an existing httpRoute |
| `delete` | Delete a httpRoute |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `domainId` | UUID |
| `id` | UUID |
| `isActive` | Boolean |
| `method` | String |
| `path` | String |
| `priority` | Int |
| `targetId` | UUID |
| `targetKind` | String |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `domainId`, `targetId`, `targetKind`
**Optional create fields (backend defaults):** `createdBy`, `isActive`, `method`, `path`, `priority`, `updatedBy`

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
| `accessMethod` | String |
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `fieldIds` | UUID |
| `id` | UUID |
| `includeFieldIds` | UUID |
| `indexParams` | JSON |
| `isUnique` | Boolean |
| `name` | String |
| `opClasses` | String |
| `options` | JSON |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `updatedAt` | Datetime |
| `whereClause` | JSON |

**Required create fields:** `databaseId`, `tableId`
**Optional create fields (backend defaults):** `accessMethod`, `category`, `fieldIds`, `includeFieldIds`, `indexParams`, `isUnique`, `name`, `opClasses`, `options`, `smartTags`, `tags`, `whereClause`

### `managed-domain`

CRUD operations for ManagedDomain records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all managedDomain records |
| `find-first` | Find first matching managedDomain record |
| `get` | Get a managedDomain by id |
| `create` | Create a new managedDomain |
| `update` | Update an existing managedDomain |
| `delete` | Delete a managedDomain |

**Fields:**

| Field | Type |
|-------|------|
| `allowPublicUsage` | Boolean |
| `annotations` | JSON |
| `certStatus` | String |
| `databaseId` | UUID |
| `domain` | Hostname |
| `id` | UUID |
| `isWildcard` | Boolean |
| `tlsReadyAt` | Datetime |
| `tlsStatus` | String |
| `verificationStatus` | String |
| `verifiedAt` | Datetime |

**Required create fields:** `databaseId`, `domain`
**Optional create fields (backend defaults):** `allowPublicUsage`, `annotations`, `certStatus`, `isWildcard`, `tlsReadyAt`, `tlsStatus`, `verificationStatus`, `verifiedAt`

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
| `category` | String |
| `description` | String |
| `displayName` | String |
| `name` | String |
| `parameterSchema` | JSON |
| `slug` | String |
| `tags` | String |

**Required create fields:** `category`, `slug`
**Optional create fields (backend defaults):** `description`, `displayName`, `parameterSchema`, `tags`

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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `interval` | String |
| `isParented` | Boolean |
| `namingPattern` | String |
| `partitionKeyId` | UUID |
| `premake` | Int |
| `retention` | String |
| `retentionKeepTable` | Boolean |
| `strategy` | String |
| `tableId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `partitionKeyId`, `strategy`, `tableId`
**Optional create fields (backend defaults):** `interval`, `isParented`, `namingPattern`, `premake`, `retention`, `retentionKeepTable`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `data` | JSON |
| `databaseId` | UUID |
| `disabled` | Boolean |
| `granteeName` | String |
| `id` | UUID |
| `name` | String |
| `permissive` | Boolean |
| `policyType` | String |
| `privilege` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `updatedAt` | Datetime |
| `withCheck` | JSON |

**Required create fields:** `tableId`
**Optional create fields (backend defaults):** `category`, `data`, `databaseId`, `disabled`, `granteeName`, `name`, `permissive`, `policyType`, `privilege`, `smartTags`, `tags`, `withCheck`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `fieldIds` | UUID |
| `id` | UUID |
| `initiallyDeferred` | Boolean |
| `isDeferrable` | Boolean |
| `name` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | String |
| `updatedAt` | Datetime |
| `withoutOverlaps` | Boolean |

**Required create fields:** `fieldIds`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `initiallyDeferred`, `isDeferrable`, `name`, `smartTags`, `tags`, `type`, `withoutOverlaps`

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
| `cryptoNetwork` | String |
| `databaseId` | UUID |
| `id` | UUID |
| `schemaId` | UUID |
| `signInRecordFailureFunctionId` | UUID |
| `signInRequestChallengeFunctionId` | UUID |
| `signInWithChallengeFunctionId` | UUID |
| `signUpWithKeyFunctionId` | UUID |
| `userField` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `cryptoNetwork`, `schemaId`, `signInRecordFailureFunctionId`, `signInRequestChallengeFunctionId`, `signInWithChallengeFunctionId`, `signUpWithKeyFunctionId`, `userField`

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
| `authenticateFunctionId` | UUID |
| `authenticateSchemaId` | UUID |
| `authenticateStrictFunctionId` | UUID |
| `currentIpAddressFunctionId` | UUID |
| `currentRoleFunctionId` | UUID |
| `currentRoleIdFunctionId` | UUID |
| `currentUserAgentFunctionId` | UUID |
| `databaseId` | UUID |
| `id` | UUID |
| `roleSchemaId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `authenticateFunctionId`, `authenticateSchemaId`, `authenticateStrictFunctionId`, `currentIpAddressFunctionId`, `currentRoleFunctionId`, `currentRoleIdFunctionId`, `currentUserAgentFunctionId`, `roleSchemaId`

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
| `apiExposure` | ApiExposureLevel |
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `isPublic` | Boolean |
| `label` | String |
| `name` | String |
| `schemaName` | String |
| `smartTags` | JSON |
| `tags` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`, `schemaName`
**Optional create fields (backend defaults):** `apiExposure`, `category`, `description`, `isPublic`, `label`, `smartTags`, `tags`

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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `granteeName` | String |
| `id` | UUID |
| `schemaId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `granteeName`, `schemaId`
**Optional create fields (backend defaults):** `databaseId`

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
| `annotations` | JSON |
| `appleTouchIcon` | Image |
| `databaseId` | UUID |
| `dbname` | String |
| `description` | String |
| `favicon` | Attachment |
| `id` | UUID |
| `labels` | JSON |
| `logo` | Image |
| `ogImage` | Image |
| `title` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `annotations`, `appleTouchIcon`, `dbname`, `description`, `favicon`, `labels`, `logo`, `ogImage`, `title`

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
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `ogImage` | Image |
| `siteId` | UUID |
| `title` | String |

**Required create fields:** `databaseId`, `siteId`
**Optional create fields (backend defaults):** `description`, `ogImage`, `title`

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
| `data` | JSON |
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `siteId` | UUID |

**Required create fields:** `data`, `databaseId`, `name`, `siteId`

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
| `databaseId` | UUID |
| `id` | UUID |
| `siteId` | UUID |
| `theme` | JSON |

**Required create fields:** `databaseId`, `siteId`, `theme`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `fieldId` | UUID |
| `id` | UUID |
| `name` | String |
| `operator` | String |
| `paramName` | String |
| `refFieldId` | UUID |
| `refTableId` | UUID |
| `tableId` | UUID |
| `tags` | String |
| `updatedAt` | Datetime |

**Required create fields:** `fieldId`, `name`, `operator`, `refFieldId`, `refTableId`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `paramName`, `tags`

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
| `actionId` | UUID |
| `actionName` | String |
| `actorId` | UUID |
| `content` | String |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `deploy` | String |
| `deps` | String |
| `id` | Int |
| `name` | String |
| `payload` | JSON |
| `revert` | String |
| `verify` | String |

**Required create fields:** `actionId`, `actionName`, `actorId`, `content`, `databaseId`, `deploy`, `deps`, `name`, `payload`, `revert`, `verify`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `inheritsId` | UUID |
| `label` | String |
| `name` | String |
| `partitionKeyNames` | String |
| `partitionKeyTypes` | String |
| `partitionStrategy` | String |
| `partitioned` | Boolean |
| `peoplestamps` | Boolean |
| `pluralName` | String |
| `schemaId` | UUID |
| `singularName` | String |
| `smartTags` | JSON |
| `stepUp` | JSON |
| `tags` | String |
| `timestamps` | Boolean |
| `updatedAt` | Datetime |
| `useRls` | Boolean |

**Required create fields:** `name`, `schemaId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `description`, `inheritsId`, `label`, `partitionKeyNames`, `partitionKeyTypes`, `partitionStrategy`, `partitioned`, `peoplestamps`, `pluralName`, `singularName`, `smartTags`, `stepUp`, `tags`, `timestamps`, `useRls`

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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `fieldIds` | UUID |
| `granteeName` | String |
| `id` | UUID |
| `isGrant` | Boolean |
| `privilege` | String |
| `tableId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `granteeName`, `privilege`, `tableId`
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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `event` | String |
| `events` | String |
| `forEach` | String |
| `functionName` | String |
| `id` | UUID |
| `name` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `timing` | String |
| `transitionNewName` | String |
| `transitionOldName` | String |
| `updatedAt` | Datetime |
| `whenClause` | JSON |

**Required create fields:** `name`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `event`, `events`, `forEach`, `functionName`, `smartTags`, `tags`, `timing`, `transitionNewName`, `transitionOldName`, `whenClause`

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
| `code` | String |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `name` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`
**Optional create fields (backend defaults):** `code`

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
| `category` | ObjectCategory |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `fieldIds` | UUID |
| `id` | UUID |
| `initiallyDeferred` | Boolean |
| `isDeferrable` | Boolean |
| `name` | String |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `type` | String |
| `updatedAt` | Datetime |
| `withoutOverlaps` | Boolean |

**Required create fields:** `fieldIds`, `tableId`
**Optional create fields (backend defaults):** `category`, `databaseId`, `description`, `initiallyDeferred`, `isDeferrable`, `name`, `smartTags`, `tags`, `type`, `withoutOverlaps`

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
| `category` | ObjectCategory |
| `checkOption` | String |
| `data` | JSON |
| `databaseId` | UUID |
| `filterData` | JSON |
| `filterType` | String |
| `id` | UUID |
| `isReadOnly` | Boolean |
| `name` | String |
| `schemaId` | UUID |
| `securityBarrier` | Boolean |
| `securityInvoker` | Boolean |
| `smartTags` | JSON |
| `tableId` | UUID |
| `tags` | String |
| `viewType` | String |

**Required create fields:** `name`, `schemaId`, `viewType`
**Optional create fields (backend defaults):** `category`, `checkOption`, `data`, `databaseId`, `filterData`, `filterType`, `isReadOnly`, `securityBarrier`, `securityInvoker`, `smartTags`, `tableId`, `tags`

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
| `databaseId` | UUID |
| `granteeName` | String |
| `id` | UUID |
| `isGrant` | Boolean |
| `privilege` | String |
| `viewId` | UUID |
| `withGrantOption` | Boolean |

**Required create fields:** `granteeName`, `privilege`, `viewId`
**Optional create fields (backend defaults):** `databaseId`, `isGrant`, `withGrantOption`

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
| `action` | String |
| `databaseId` | UUID |
| `event` | String |
| `id` | UUID |
| `name` | String |
| `viewId` | UUID |

**Required create fields:** `event`, `name`, `viewId`
**Optional create fields (backend defaults):** `action`, `databaseId`

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
| `databaseId` | UUID |
| `id` | UUID |
| `joinOrder` | Int |
| `tableId` | UUID |
| `viewId` | UUID |

**Required create fields:** `tableId`, `viewId`
**Optional create fields (backend defaults):** `databaseId`, `joinOrder`

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
| `attestationType` | String |
| `challengeExpirySeconds` | BigInt |
| `credentialsSchemaId` | UUID |
| `credentialsTableId` | UUID |
| `databaseId` | UUID |
| `id` | UUID |
| `originAllowlist` | String |
| `requireUserVerification` | Boolean |
| `residentKey` | String |
| `rpId` | String |
| `rpName` | String |
| `schemaId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `sessionSecretsSchemaId` | UUID |
| `sessionSecretsTableId` | UUID |
| `sessionsSchemaId` | UUID |
| `sessionsTableId` | UUID |
| `userFieldId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `attestationType`, `challengeExpirySeconds`, `credentialsSchemaId`, `credentialsTableId`, `originAllowlist`, `requireUserVerification`, `residentKey`, `rpId`, `rpName`, `schemaId`, `sessionCredentialsTableId`, `sessionSecretsSchemaId`, `sessionSecretsTableId`, `sessionsSchemaId`, `sessionsTableId`, `userFieldId`

## Custom Operations

### `apply-registry-defaults`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--data` | JSON |
  | `--nodeType` | String |

### `resolve-http-route`

resolveHttpRoute

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--requestHost` | String |
  | `--requestMethod` | String |
  | `--requestPath` | String |

### `accept-database-transfer`

acceptDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

### `apply-rls`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.fieldIds` | UUID |
  | `--input.grants` | JSON |
  | `--input.name` | String |
  | `--input.permissive` | Boolean |
  | `--input.policyType` | String |
  | `--input.tableId` | UUID |
  | `--input.vars` | JSON |

### `cancel-database-transfer`

cancelDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

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

### `reject-database-transfer`

rejectDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.transferId` | UUID |

### `request-database`

Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb);

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseName` | String |
  | `--input.domain` | String |
  | `--input.modules` | JSON |
  | `--input.options` | JSON |
  | `--input.presetSlug` | String |
  | `--input.subdomain` | String |

### `set-field-order`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.fieldIds` | UUID |

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
