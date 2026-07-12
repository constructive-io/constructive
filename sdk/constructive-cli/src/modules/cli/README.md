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
| `default-ids-module` | defaultIdsModule CRUD operations |
| `membership-types-module` | membershipTypesModule CRUD operations |
| `session-secrets-module` | sessionSecretsModule CRUD operations |
| `devices-module` | devicesModule CRUD operations |
| `i-18-n-module` | i18NModule CRUD operations |
| `user-settings-module` | userSettingsModule CRUD operations |
| `user-state-module` | userStateModule CRUD operations |
| `user-credentials-module` | userCredentialsModule CRUD operations |
| `connected-accounts-module` | connectedAccountsModule CRUD operations |
| `emails-module` | emailsModule CRUD operations |
| `phone-numbers-module` | phoneNumbersModule CRUD operations |
| `rate-limits-module` | rateLimitsModule CRUD operations |
| `users-module` | usersModule CRUD operations |
| `webauthn-credentials-module` | webauthnCredentialsModule CRUD operations |
| `config-secrets-user-module` | configSecretsUserModule CRUD operations |
| `crypto-addresses-module` | cryptoAddressesModule CRUD operations |
| `denormalized-table-field` | denormalizedTableField CRUD operations |
| `rls-module` | rlsModule CRUD operations |
| `blueprint` | blueprint CRUD operations |
| `blueprint-template` | blueprintTemplate CRUD operations |
| `blueprint-construction` | blueprintConstruction CRUD operations |
| `crypto-auth-module` | cryptoAuthModule CRUD operations |
| `sessions-module` | sessionsModule CRUD operations |
| `secure-table-provision` | secureTableProvision CRUD operations |
| `identity-providers-module` | identityProvidersModule CRUD operations |
| `integration-providers-module` | integrationProvidersModule CRUD operations |
| `db-pool-config` | dbPoolConfig CRUD operations |
| `realtime-module` | realtimeModule CRUD operations |
| `infra-secrets-module` | infraSecretsModule CRUD operations |
| `internal-secrets-module` | internalSecretsModule CRUD operations |
| `db-preset-module` | dbPresetModule CRUD operations |
| `graph-module` | graphModule CRUD operations |
| `rate-limit-meters-module` | rateLimitMetersModule CRUD operations |
| `infra-config-module` | infraConfigModule CRUD operations |
| `webauthn-auth-module` | webauthnAuthModule CRUD operations |
| `principal-auth-module` | principalAuthModule CRUD operations |
| `db-pool` | dbPool CRUD operations |
| `function-module` | functionModule CRUD operations |
| `merkle-store-module` | merkleStoreModule CRUD operations |
| `database-provision-module` | databaseProvisionModule CRUD operations |
| `function-invocation-module` | functionInvocationModule CRUD operations |
| `invites-module` | invitesModule CRUD operations |
| `namespace-module` | namespaceModule CRUD operations |
| `plans-module` | plansModule CRUD operations |
| `compute-log-module` | computeLogModule CRUD operations |
| `inference-log-module` | inferenceLogModule CRUD operations |
| `storage-log-module` | storageLogModule CRUD operations |
| `transfer-log-module` | transferLogModule CRUD operations |
| `billing-provider-module` | billingProviderModule CRUD operations |
| `function-deployment-module` | functionDeploymentModule CRUD operations |
| `permissions-module` | permissionsModule CRUD operations |
| `graph-execution-module` | graphExecutionModule CRUD operations |
| `hierarchy-module` | hierarchyModule CRUD operations |
| `notifications-module` | notificationsModule CRUD operations |
| `relation-provision` | relationProvision CRUD operations |
| `profiles-module` | profilesModule CRUD operations |
| `billing-module` | billingModule CRUD operations |
| `resource-module` | resourceModule CRUD operations |
| `user-auth-module` | userAuthModule CRUD operations |
| `db-usage-module` | dbUsageModule CRUD operations |
| `agent-module` | agentModule CRUD operations |
| `limits-module` | limitsModule CRUD operations |
| `entity-type-provision` | entityTypeProvision CRUD operations |
| `storage-module` | storageModule CRUD operations |
| `memberships-module` | membershipsModule CRUD operations |
| `events-module` | eventsModule CRUD operations |
| `resolve-blueprint-field` | Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this. |
| `resolve-blueprint-table` | Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error. |
| `construct-blueprint` | Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure. |
| `provision-full-text-search` | Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id. |
| `provision-index` | Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id. |
| `provision-check-constraint` | Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists. |
| `provision-unique-constraint` | Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists. |
| `copy-template-to-blueprint` | Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID. |
| `provision-spatial-relation` | Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert. |
| `provision-table` | Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields). |
| `provision-relation` | Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id). |
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

### `default-ids-module`

CRUD operations for DefaultIdsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all defaultIdsModule records |
| `find-first` | Find first matching defaultIdsModule record |
| `get` | Get a defaultIdsModule by id |
| `create` | Create a new defaultIdsModule |
| `update` | Update an existing defaultIdsModule |
| `delete` | Delete a defaultIdsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |

**Required create fields:** `databaseId`

### `membership-types-module`

CRUD operations for MembershipTypesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipTypesModule records |
| `find-first` | Find first matching membershipTypesModule record |
| `get` | Get a membershipTypesModule by id |
| `create` | Create a new membershipTypesModule |
| `update` | Update an existing membershipTypesModule |
| `delete` | Delete a membershipTypesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`

### `session-secrets-module`

CRUD operations for SessionSecretsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all sessionSecretsModule records |
| `find-first` | Find first matching sessionSecretsModule record |
| `get` | Get a sessionSecretsModule by id |
| `create` | Create a new sessionSecretsModule |
| `update` | Update an existing sessionSecretsModule |
| `delete` | Delete a sessionSecretsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `sessionsTableId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`, `sessionsTableId`

### `devices-module`

CRUD operations for DevicesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all devicesModule records |
| `find-first` | Find first matching devicesModule record |
| `get` | Get a devicesModule by id |
| `create` | Create a new devicesModule |
| `update` | Update an existing devicesModule |
| `delete` | Delete a devicesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `userDevicesTableId` | UUID |
| `deviceSettingsTableId` | UUID |
| `userDevicesTable` | String |
| `deviceSettingsTable` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `userDevicesTableId`, `deviceSettingsTableId`, `userDevicesTable`, `deviceSettingsTable`

### `i-18-n-module`

CRUD operations for I18NModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all i18NModule records |
| `find-first` | Find first matching i18NModule record |
| `get` | Get a i18NModule by id |
| `create` | Create a new i18NModule |
| `update` | Update an existing i18NModule |
| `delete` | Delete a i18NModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `settingsTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `settingsTableId`, `apiName`, `privateApiName`

### `user-settings-module`

CRUD operations for UserSettingsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userSettingsModule records |
| `find-first` | Find first matching userSettingsModule record |
| `get` | Get a userSettingsModule by id |
| `create` | Create a new userSettingsModule |
| `update` | Update an existing userSettingsModule |
| `delete` | Delete a userSettingsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `apiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `ownerTableId`, `tableName`, `apiName`

### `user-state-module`

CRUD operations for UserStateModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userStateModule records |
| `find-first` | Find first matching userStateModule record |
| `get` | Get a userStateModule by id |
| `create` | Create a new userStateModule |
| `update` | Update an existing userStateModule |
| `delete` | Delete a userStateModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `tableId`, `tableName`

### `user-credentials-module`

CRUD operations for UserCredentialsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userCredentialsModule records |
| `find-first` | Find first matching userCredentialsModule record |
| `get` | Get a userCredentialsModule by id |
| `create` | Create a new userCredentialsModule |
| `update` | Update an existing userCredentialsModule |
| `delete` | Delete a userCredentialsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `tableId`, `tableName`, `privateApiName`

### `connected-accounts-module`

CRUD operations for ConnectedAccountsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all connectedAccountsModule records |
| `find-first` | Find first matching connectedAccountsModule record |
| `get` | Get a connectedAccountsModule by id |
| `create` | Create a new connectedAccountsModule |
| `update` | Update an existing connectedAccountsModule |
| `delete` | Delete a connectedAccountsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`, `tableName`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `apiName`, `privateApiName`

### `emails-module`

CRUD operations for EmailsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all emailsModule records |
| `find-first` | Find first matching emailsModule record |
| `get` | Get a emailsModule by id |
| `create` | Create a new emailsModule |
| `update` | Update an existing emailsModule |
| `delete` | Delete a emailsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`, `tableName`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `apiName`, `privateApiName`

### `phone-numbers-module`

CRUD operations for PhoneNumbersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all phoneNumbersModule records |
| `find-first` | Find first matching phoneNumbersModule record |
| `get` | Get a phoneNumbersModule by id |
| `create` | Create a new phoneNumbersModule |
| `update` | Update an existing phoneNumbersModule |
| `delete` | Delete a phoneNumbersModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`, `tableName`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `apiName`, `privateApiName`

### `rate-limits-module`

CRUD operations for RateLimitsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all rateLimitsModule records |
| `find-first` | Find first matching rateLimitsModule record |
| `get` | Get a rateLimitsModule by id |
| `create` | Create a new rateLimitsModule |
| `update` | Update an existing rateLimitsModule |
| `delete` | Delete a rateLimitsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `rateLimitSettingsTableId` | UUID |
| `ipRateLimitsTableId` | UUID |
| `rateLimitsTableId` | UUID |
| `rateLimitSettingsTable` | String |
| `ipRateLimitsTable` | String |
| `rateLimitsTable` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `rateLimitSettingsTableId`, `ipRateLimitsTableId`, `rateLimitsTableId`, `rateLimitSettingsTable`, `ipRateLimitsTable`, `rateLimitsTable`

### `users-module`

CRUD operations for UsersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all usersModule records |
| `find-first` | Find first matching usersModule record |
| `get` | Get a usersModule by id |
| `create` | Create a new usersModule |
| `update` | Update an existing usersModule |
| `delete` | Delete a usersModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `typeTableId` | UUID |
| `typeTableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`, `typeTableId`, `typeTableName`, `apiName`, `privateApiName`

### `webauthn-credentials-module`

CRUD operations for WebauthnCredentialsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webauthnCredentialsModule records |
| `find-first` | Find first matching webauthnCredentialsModule record |
| `get` | Get a webauthnCredentialsModule by id |
| `create` | Create a new webauthnCredentialsModule |
| `update` | Update an existing webauthnCredentialsModule |
| `delete` | Delete a webauthnCredentialsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `tableName`, `apiName`, `privateApiName`

### `config-secrets-user-module`

CRUD operations for ConfigSecretsUserModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all configSecretsUserModule records |
| `find-first` | Find first matching configSecretsUserModule record |
| `get` | Get a configSecretsUserModule by id |
| `create` | Create a new configSecretsUserModule |
| `update` | Update an existing configSecretsUserModule |
| `delete` | Delete a configSecretsUserModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `tableId`, `tableName`, `apiName`, `privateApiName`

### `crypto-addresses-module`

CRUD operations for CryptoAddressesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAddressesModule records |
| `find-first` | Find first matching cryptoAddressesModule record |
| `get` | Get a cryptoAddressesModule by id |
| `create` | Create a new cryptoAddressesModule |
| `update` | Update an existing cryptoAddressesModule |
| `delete` | Delete a cryptoAddressesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `ownerTableId` | UUID |
| `tableName` | String |
| `cryptoNetwork` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`, `tableName`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `cryptoNetwork`, `apiName`, `privateApiName`

### `denormalized-table-field`

CRUD operations for DenormalizedTableField records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all denormalizedTableField records |
| `find-first` | Find first matching denormalizedTableField record |
| `get` | Get a denormalizedTableField by id |
| `create` | Create a new denormalizedTableField |
| `update` | Update an existing denormalizedTableField |
| `delete` | Delete a denormalizedTableField |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `tableId` | UUID |
| `fieldId` | UUID |
| `setIds` | UUID |
| `refTableId` | UUID |
| `refFieldId` | UUID |
| `refIds` | UUID |
| `useUpdates` | Boolean |
| `updateDefaults` | Boolean |
| `funcName` | String |
| `funcOrder` | Int |

**Required create fields:** `databaseId`, `tableId`, `fieldId`, `refTableId`, `refFieldId`
**Optional create fields (backend defaults):** `setIds`, `refIds`, `useUpdates`, `updateDefaults`, `funcName`, `funcOrder`

### `rls-module`

CRUD operations for RlsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all rlsModule records |
| `find-first` | Find first matching rlsModule record |
| `get` | Get a rlsModule by id |
| `create` | Create a new rlsModule |
| `update` | Update an existing rlsModule |
| `delete` | Delete a rlsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `sessionsTableId` | UUID |
| `usersTableId` | UUID |
| `authenticate` | String |
| `authenticateStrict` | String |
| `currentRole` | String |
| `currentRoleId` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `sessionCredentialsTableId`, `sessionsTableId`, `usersTableId`, `authenticate`, `authenticateStrict`, `currentRole`, `currentRoleId`, `apiName`, `privateApiName`

### `blueprint`

CRUD operations for Blueprint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all blueprint records |
| `find-first` | Find first matching blueprint record |
| `get` | Get a blueprint by id |
| `create` | Create a new blueprint |
| `update` | Update an existing blueprint |
| `delete` | Delete a blueprint |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `databaseId` | UUID |
| `name` | String |
| `displayName` | String |
| `description` | String |
| `definition` | JSON |
| `templateId` | UUID |
| `definitionHash` | UUID |
| `tableHashes` | JSON |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `ownerId`, `databaseId`, `name`, `displayName`, `definition`
**Optional create fields (backend defaults):** `description`, `templateId`, `definitionHash`, `tableHashes`

### `blueprint-template`

CRUD operations for BlueprintTemplate records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all blueprintTemplate records |
| `find-first` | Find first matching blueprintTemplate record |
| `get` | Get a blueprintTemplate by id |
| `create` | Create a new blueprintTemplate |
| `update` | Update an existing blueprintTemplate |
| `delete` | Delete a blueprintTemplate |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `version` | String |
| `displayName` | String |
| `description` | String |
| `ownerId` | UUID |
| `visibility` | String |
| `categories` | String |
| `tags` | String |
| `definition` | JSON |
| `definitionSchemaVersion` | String |
| `source` | String |
| `complexity` | String |
| `copyCount` | Int |
| `forkCount` | Int |
| `forkedFromId` | UUID |
| `definitionHash` | UUID |
| `tableHashes` | JSON |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `name`, `displayName`, `ownerId`, `definition`
**Optional create fields (backend defaults):** `version`, `description`, `visibility`, `categories`, `tags`, `definitionSchemaVersion`, `source`, `complexity`, `copyCount`, `forkCount`, `forkedFromId`, `definitionHash`, `tableHashes`

### `blueprint-construction`

CRUD operations for BlueprintConstruction records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all blueprintConstruction records |
| `find-first` | Find first matching blueprintConstruction record |
| `get` | Get a blueprintConstruction by id |
| `create` | Create a new blueprintConstruction |
| `update` | Update an existing blueprintConstruction |
| `delete` | Delete a blueprintConstruction |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `blueprintId` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `status` | String |
| `errorDetails` | String |
| `tableMap` | JSON |
| `constructedDefinition` | JSON |
| `constructedAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `blueprintId`, `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `status`, `errorDetails`, `tableMap`, `constructedDefinition`, `constructedAt`

### `crypto-auth-module`

CRUD operations for CryptoAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAuthModule records |
| `find-first` | Find first matching cryptoAuthModule record |
| `get` | Get a cryptoAuthModule by id |
| `create` | Create a new cryptoAuthModule |
| `update` | Update an existing cryptoAuthModule |
| `delete` | Delete a cryptoAuthModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `usersTableId` | UUID |
| `secretsTableId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `addressesTableId` | UUID |
| `userField` | String |
| `cryptoNetwork` | String |
| `signInRequestChallenge` | String |
| `signInRecordFailure` | String |
| `signUpWithKey` | String |
| `signInWithChallenge` | String |

**Required create fields:** `databaseId`, `userField`
**Optional create fields (backend defaults):** `schemaId`, `usersTableId`, `secretsTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `addressesTableId`, `cryptoNetwork`, `signInRequestChallenge`, `signInRecordFailure`, `signUpWithKey`, `signInWithChallenge`

### `sessions-module`

CRUD operations for SessionsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all sessionsModule records |
| `find-first` | Find first matching sessionsModule record |
| `get` | Get a sessionsModule by id |
| `create` | Create a new sessionsModule |
| `update` | Update an existing sessionsModule |
| `delete` | Delete a sessionsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `authSettingsTableId` | UUID |
| `usersTableId` | UUID |
| `sessionsDefaultExpiration` | Interval |
| `sessionsTable` | String |
| `sessionCredentialsTable` | String |
| `authSettingsTable` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `sessionsTableId`, `sessionCredentialsTableId`, `authSettingsTableId`, `usersTableId`, `sessionsDefaultExpiration`, `sessionsTable`, `sessionCredentialsTable`, `authSettingsTable`

### `secure-table-provision`

CRUD operations for SecureTableProvision records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all secureTableProvision records |
| `find-first` | Find first matching secureTableProvision record |
| `get` | Get a secureTableProvision by id |
| `create` | Create a new secureTableProvision |
| `update` | Update an existing secureTableProvision |
| `delete` | Delete a secureTableProvision |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `nodes` | JSON |
| `useRls` | Boolean |
| `fields` | JSON |
| `grants` | JSON |
| `policies` | JSON |
| `outFields` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`, `nodes`, `useRls`, `fields`, `grants`, `policies`, `outFields`

### `identity-providers-module`

CRUD operations for IdentityProvidersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all identityProvidersModule records |
| `find-first` | Find first matching identityProvidersModule record |
| `get` | Get a identityProvidersModule by id |
| `create` | Create a new identityProvidersModule |
| `update` | Update an existing identityProvidersModule |
| `delete` | Delete a identityProvidersModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableId`, `tableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`

### `integration-providers-module`

CRUD operations for IntegrationProvidersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all integrationProvidersModule records |
| `find-first` | Find first matching integrationProvidersModule record |
| `get` | Get a integrationProvidersModule by id |
| `create` | Create a new integrationProvidersModule |
| `update` | Update an existing integrationProvidersModule |
| `delete` | Delete a integrationProvidersModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableId` | UUID |
| `tableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableId`, `tableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`

### `db-pool-config`

CRUD operations for DbPoolConfig records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all dbPoolConfig records |
| `find-first` | Find first matching dbPoolConfig record |
| `get` | Get a dbPoolConfig by id |
| `create` | Create a new dbPoolConfig |
| `update` | Update an existing dbPoolConfig |
| `delete` | Delete a dbPoolConfig |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `presetSlug` | String |
| `domain` | String |
| `poolOwnerId` | UUID |
| `min` | Int |
| `max` | Int |
| `warmTtl` | Interval |
| `enabled` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `presetSlug`, `domain`, `poolOwnerId`
**Optional create fields (backend defaults):** `min`, `max`, `warmTtl`, `enabled`

### `realtime-module`

CRUD operations for RealtimeModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all realtimeModule records |
| `find-first` | Find first matching realtimeModule record |
| `get` | Get a realtimeModule by id |
| `create` | Create a new realtimeModule |
| `update` | Update an existing realtimeModule |
| `delete` | Delete a realtimeModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `subscriptionsSchemaId` | UUID |
| `changeLogTableId` | UUID |
| `listenerNodeTableId` | UUID |
| `sourceRegistryTableId` | UUID |
| `retentionHours` | Int |
| `premake` | Int |
| `interval` | String |
| `notifyChannel` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `subscriptionsSchemaId`, `changeLogTableId`, `listenerNodeTableId`, `sourceRegistryTableId`, `retentionHours`, `premake`, `interval`, `notifyChannel`, `apiName`, `privateApiName`

### `infra-secrets-module`

CRUD operations for InfraSecretsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraSecretsModule records |
| `find-first` | Find first matching infraSecretsModule record |
| `get` | Get a infraSecretsModule by id |
| `create` | Create a new infraSecretsModule |
| `update` | Update an existing infraSecretsModule |
| `delete` | Delete a infraSecretsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `secretsTableId` | UUID |
| `secretsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `entityField` | String |
| `policies` | JSON |
| `provisions` | JSON |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `secretsTableId`, `secretsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `entityField`, `policies`, `provisions`

### `internal-secrets-module`

CRUD operations for InternalSecretsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all internalSecretsModule records |
| `find-first` | Find first matching internalSecretsModule record |
| `get` | Get a internalSecretsModule by id |
| `create` | Create a new internalSecretsModule |
| `update` | Update an existing internalSecretsModule |
| `delete` | Delete a internalSecretsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `internalSecretsTableId` | UUID |
| `internalSecretsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `entityField` | String |
| `policies` | JSON |
| `provisions` | JSON |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `internalSecretsTableId`, `internalSecretsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `entityField`, `policies`, `provisions`

### `db-preset-module`

CRUD operations for DbPresetModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all dbPresetModule records |
| `find-first` | Find first matching dbPresetModule record |
| `get` | Get a dbPresetModule by id |
| `create` | Create a new dbPresetModule |
| `update` | Update an existing dbPresetModule |
| `delete` | Delete a dbPresetModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `publicSchemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `scope` | String |
| `prefix` | String |
| `merkleStoreModuleId` | UUID |
| `dbPresetsTableId` | UUID |
| `storeName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`, `scope`, `prefix`, `merkleStoreModuleId`, `storeName`
**Optional create fields (backend defaults):** `publicSchemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `dbPresetsTableId`, `apiName`, `privateApiName`, `entityTableId`, `policies`, `provisions`

### `graph-module`

CRUD operations for GraphModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all graphModule records |
| `find-first` | Find first matching graphModule record |
| `get` | Get a graphModule by id |
| `create` | Create a new graphModule |
| `update` | Update an existing graphModule |
| `delete` | Delete a graphModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `publicSchemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `scope` | String |
| `prefix` | String |
| `merkleStoreModuleId` | UUID |
| `graphsTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`, `merkleStoreModuleId`
**Optional create fields (backend defaults):** `entityField`, `publicSchemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `scope`, `prefix`, `graphsTableId`, `apiName`, `privateApiName`, `entityTableId`, `policies`, `provisions`, `defaultPermissions`

### `rate-limit-meters-module`

CRUD operations for RateLimitMetersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all rateLimitMetersModule records |
| `find-first` | Find first matching rateLimitMetersModule record |
| `get` | Get a rateLimitMetersModule by id |
| `create` | Create a new rateLimitMetersModule |
| `update` | Update an existing rateLimitMetersModule |
| `delete` | Delete a rateLimitMetersModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `rateLimitStateTableId` | UUID |
| `rateLimitStateTableName` | String |
| `rateLimitOverridesTableId` | UUID |
| `rateLimitOverridesTableName` | String |
| `rateWindowLimitsTableId` | UUID |
| `rateWindowLimitsTableName` | String |
| `checkRateLimitFunction` | String |
| `prefix` | String |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `rateLimitStateTableId`, `rateLimitStateTableName`, `rateLimitOverridesTableId`, `rateLimitOverridesTableName`, `rateWindowLimitsTableId`, `rateWindowLimitsTableName`, `checkRateLimitFunction`, `prefix`, `defaultPermissions`, `apiName`, `privateApiName`

### `infra-config-module`

CRUD operations for InfraConfigModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all infraConfigModule records |
| `find-first` | Find first matching infraConfigModule record |
| `get` | Get a infraConfigModule by id |
| `create` | Create a new infraConfigModule |
| `update` | Update an existing infraConfigModule |
| `delete` | Delete a infraConfigModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `configTableId` | UUID |
| `configTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `configTableId`, `configTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `policies`, `provisions`

### `webauthn-auth-module`

CRUD operations for WebauthnAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webauthnAuthModule records |
| `find-first` | Find first matching webauthnAuthModule record |
| `get` | Get a webauthnAuthModule by id |
| `create` | Create a new webauthnAuthModule |
| `update` | Update an existing webauthnAuthModule |
| `delete` | Delete a webauthnAuthModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `usersTableId` | UUID |
| `credentialsTableId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `sessionSecretsTableId` | UUID |
| `authSettingsTableId` | UUID |
| `rpId` | String |
| `rpName` | String |
| `originAllowlist` | String |
| `attestationType` | String |
| `requireUserVerification` | Boolean |
| `residentKey` | String |
| `challengeExpiry` | Interval |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `usersTableId`, `credentialsTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `sessionSecretsTableId`, `authSettingsTableId`, `rpId`, `rpName`, `originAllowlist`, `attestationType`, `requireUserVerification`, `residentKey`, `challengeExpiry`

### `principal-auth-module`

CRUD operations for PrincipalAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all principalAuthModule records |
| `find-first` | Find first matching principalAuthModule record |
| `get` | Get a principalAuthModule by id |
| `create` | Create a new principalAuthModule |
| `update` | Update an existing principalAuthModule |
| `delete` | Delete a principalAuthModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `principalsTableId` | UUID |
| `principalEntitiesTableId` | UUID |
| `principalScopeOverridesTableId` | UUID |
| `usersTableId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `auditsTableId` | UUID |
| `principalsTableName` | String |
| `createPrincipalFunction` | String |
| `deletePrincipalFunction` | String |
| `createOrgPrincipalFunction` | String |
| `deleteOrgPrincipalFunction` | String |
| `createOrgApiKeyFunction` | String |
| `revokeOrgApiKeyFunction` | String |
| `apiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `principalsTableId`, `principalEntitiesTableId`, `principalScopeOverridesTableId`, `usersTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `auditsTableId`, `principalsTableName`, `createPrincipalFunction`, `deletePrincipalFunction`, `createOrgPrincipalFunction`, `deleteOrgPrincipalFunction`, `createOrgApiKeyFunction`, `revokeOrgApiKeyFunction`, `apiName`

### `db-pool`

CRUD operations for DbPool records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all dbPool records |
| `find-first` | Find first matching dbPool record |
| `get` | Get a dbPool by id |
| `create` | Create a new dbPool |
| `update` | Update an existing dbPool |
| `delete` | Delete a dbPool |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `presetSlug` | String |
| `presetCommitId` | UUID |
| `databaseId` | UUID |
| `status` | String |
| `errorMessage` | String |
| `expiresAt` | Datetime |
| `claimedBy` | UUID |
| `claimedAt` | Datetime |
| `bootstrapStatus` | String |
| `bootstrapError` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `presetSlug`
**Optional create fields (backend defaults):** `presetCommitId`, `databaseId`, `status`, `errorMessage`, `expiresAt`, `claimedBy`, `claimedAt`, `bootstrapStatus`, `bootstrapError`

### `function-module`

CRUD operations for FunctionModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionModule records |
| `find-first` | Find first matching functionModule record |
| `get` | Get a functionModule by id |
| `create` | Create a new functionModule |
| `update` | Update an existing functionModule |
| `delete` | Delete a functionModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `definitionsTableId` | UUID |
| `definitionsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `definitionsTableId`, `definitionsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `policies`, `provisions`, `defaultPermissions`

### `merkle-store-module`

CRUD operations for MerkleStoreModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all merkleStoreModule records |
| `find-first` | Find first matching merkleStoreModule record |
| `get` | Get a merkleStoreModule by id |
| `create` | Create a new merkleStoreModule |
| `update` | Update an existing merkleStoreModule |
| `delete` | Delete a merkleStoreModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `objectTableId` | UUID |
| `storeTableId` | UUID |
| `commitTableId` | UUID |
| `refTableId` | UUID |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `functionPrefix` | String |
| `permissionKey` | String |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `objectTableId`, `storeTableId`, `commitTableId`, `refTableId`, `prefix`, `apiName`, `privateApiName`, `scope`, `functionPrefix`, `permissionKey`

### `database-provision-module`

CRUD operations for DatabaseProvisionModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all databaseProvisionModule records |
| `find-first` | Find first matching databaseProvisionModule record |
| `get` | Get a databaseProvisionModule by id |
| `create` | Create a new databaseProvisionModule |
| `update` | Update an existing databaseProvisionModule |
| `delete` | Delete a databaseProvisionModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseName` | String |
| `ownerId` | UUID |
| `subdomain` | String |
| `domain` | String |
| `modules` | JSON |
| `options` | JSON |
| `bootstrapUser` | Boolean |
| `status` | String |
| `errorMessage` | String |
| `sourceDatabaseId` | UUID |
| `bootstrapStatus` | String |
| `bootstrapError` | String |
| `databaseId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `completedAt` | Datetime |
| `fulfilledAt` | Datetime |

**Required create fields:** `databaseName`, `ownerId`, `domain`
**Optional create fields (backend defaults):** `subdomain`, `modules`, `options`, `bootstrapUser`, `status`, `errorMessage`, `sourceDatabaseId`, `bootstrapStatus`, `bootstrapError`, `databaseId`, `completedAt`, `fulfilledAt`

### `function-invocation-module`

CRUD operations for FunctionInvocationModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionInvocationModule records |
| `find-first` | Find first matching functionInvocationModule record |
| `get` | Get a functionInvocationModule by id |
| `create` | Create a new functionInvocationModule |
| `update` | Update an existing functionInvocationModule |
| `delete` | Delete a functionInvocationModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `invocationsTableId` | UUID |
| `executionLogsTableId` | UUID |
| `invocationsTableName` | String |
| `executionLogsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `invocationsTableId`, `executionLogsTableId`, `invocationsTableName`, `executionLogsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `policies`, `provisions`, `defaultPermissions`

### `invites-module`

CRUD operations for InvitesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all invitesModule records |
| `find-first` | Find first matching invitesModule record |
| `get` | Get a invitesModule by id |
| `create` | Create a new invitesModule |
| `update` | Update an existing invitesModule |
| `delete` | Delete a invitesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `emailsTableId` | UUID |
| `usersTableId` | UUID |
| `invitesTableId` | UUID |
| `claimedInvitesTableId` | UUID |
| `invitesTableName` | String |
| `claimedInvitesTableName` | String |
| `submitInviteCodeFunction` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `emailsTableId`, `usersTableId`, `invitesTableId`, `claimedInvitesTableId`, `invitesTableName`, `claimedInvitesTableName`, `submitInviteCodeFunction`, `scope`, `prefix`, `entityTableId`, `apiName`, `privateApiName`

### `namespace-module`

CRUD operations for NamespaceModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all namespaceModule records |
| `find-first` | Find first matching namespaceModule record |
| `get` | Get a namespaceModule by id |
| `create` | Create a new namespaceModule |
| `update` | Update an existing namespaceModule |
| `delete` | Delete a namespaceModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `namespacesTableId` | UUID |
| `namespaceEventsTableId` | UUID |
| `namespacesTableName` | String |
| `namespaceEventsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `namespacesTableId`, `namespaceEventsTableId`, `namespacesTableName`, `namespaceEventsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `policies`, `provisions`, `defaultPermissions`

### `plans-module`

CRUD operations for PlansModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all plansModule records |
| `find-first` | Find first matching plansModule record |
| `get` | Get a plansModule by id |
| `create` | Create a new plansModule |
| `update` | Update an existing plansModule |
| `delete` | Delete a plansModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `plansTableId` | UUID |
| `plansTableName` | String |
| `planLimitsTableId` | UUID |
| `planLimitsTableName` | String |
| `planPricingTableId` | UUID |
| `planOverridesTableId` | UUID |
| `planMeterLimitsTableId` | UUID |
| `planCapsTableId` | UUID |
| `applyPlanFunction` | String |
| `applyPlanAggregateFunction` | String |
| `applyBillingPlanFunction` | String |
| `applyPlanCapsFunction` | String |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `plansTableId`, `plansTableName`, `planLimitsTableId`, `planLimitsTableName`, `planPricingTableId`, `planOverridesTableId`, `planMeterLimitsTableId`, `planCapsTableId`, `applyPlanFunction`, `applyPlanAggregateFunction`, `applyBillingPlanFunction`, `applyPlanCapsFunction`, `prefix`, `apiName`, `privateApiName`

### `compute-log-module`

CRUD operations for ComputeLogModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all computeLogModule records |
| `find-first` | Find first matching computeLogModule record |
| `get` | Get a computeLogModule by id |
| `create` | Create a new computeLogModule |
| `update` | Update an existing computeLogModule |
| `delete` | Delete a computeLogModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `computeLogTableId` | UUID |
| `computeLogTableName` | String |
| `usageDailyTableId` | UUID |
| `usageDailyTableName` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `actorFkTableId` | UUID |
| `entityFkTableId` | UUID |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `computeLogTableId`, `computeLogTableName`, `usageDailyTableId`, `usageDailyTableName`, `interval`, `retention`, `premake`, `scope`, `actorFkTableId`, `entityFkTableId`, `prefix`, `apiName`, `privateApiName`

### `inference-log-module`

CRUD operations for InferenceLogModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all inferenceLogModule records |
| `find-first` | Find first matching inferenceLogModule record |
| `get` | Get a inferenceLogModule by id |
| `create` | Create a new inferenceLogModule |
| `update` | Update an existing inferenceLogModule |
| `delete` | Delete a inferenceLogModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `inferenceLogTableId` | UUID |
| `inferenceLogTableName` | String |
| `usageDailyTableId` | UUID |
| `usageDailyTableName` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `actorFkTableId` | UUID |
| `entityFkTableId` | UUID |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `inferenceLogTableId`, `inferenceLogTableName`, `usageDailyTableId`, `usageDailyTableName`, `interval`, `retention`, `premake`, `scope`, `actorFkTableId`, `entityFkTableId`, `prefix`, `apiName`, `privateApiName`

### `storage-log-module`

CRUD operations for StorageLogModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all storageLogModule records |
| `find-first` | Find first matching storageLogModule record |
| `get` | Get a storageLogModule by id |
| `create` | Create a new storageLogModule |
| `update` | Update an existing storageLogModule |
| `delete` | Delete a storageLogModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `storageLogTableId` | UUID |
| `storageLogTableName` | String |
| `usageDailyTableId` | UUID |
| `usageDailyTableName` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `actorFkTableId` | UUID |
| `entityFkTableId` | UUID |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `storageLogTableId`, `storageLogTableName`, `usageDailyTableId`, `usageDailyTableName`, `interval`, `retention`, `premake`, `scope`, `actorFkTableId`, `entityFkTableId`, `prefix`, `apiName`, `privateApiName`

### `transfer-log-module`

CRUD operations for TransferLogModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all transferLogModule records |
| `find-first` | Find first matching transferLogModule record |
| `get` | Get a transferLogModule by id |
| `create` | Create a new transferLogModule |
| `update` | Update an existing transferLogModule |
| `delete` | Delete a transferLogModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `transferLogTableId` | UUID |
| `transferLogTableName` | String |
| `usageDailyTableId` | UUID |
| `usageDailyTableName` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `actorFkTableId` | UUID |
| `entityFkTableId` | UUID |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `transferLogTableId`, `transferLogTableName`, `usageDailyTableId`, `usageDailyTableName`, `interval`, `retention`, `premake`, `scope`, `actorFkTableId`, `entityFkTableId`, `prefix`, `apiName`, `privateApiName`

### `billing-provider-module`

CRUD operations for BillingProviderModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all billingProviderModule records |
| `find-first` | Find first matching billingProviderModule record |
| `get` | Get a billingProviderModule by id |
| `create` | Create a new billingProviderModule |
| `update` | Update an existing billingProviderModule |
| `delete` | Delete a billingProviderModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `provider` | String |
| `productsTableId` | UUID |
| `pricesTableId` | UUID |
| `subscriptionsTableId` | UUID |
| `billingCustomersTableId` | UUID |
| `billingCustomersTableName` | String |
| `billingProductsTableId` | UUID |
| `billingProductsTableName` | String |
| `billingPricesTableId` | UUID |
| `billingPricesTableName` | String |
| `billingSubscriptionsTableId` | UUID |
| `billingSubscriptionsTableName` | String |
| `billingWebhookEventsTableId` | UUID |
| `billingWebhookEventsTableName` | String |
| `processBillingEventFunction` | String |
| `prefix` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `provider`, `productsTableId`, `pricesTableId`, `subscriptionsTableId`, `billingCustomersTableId`, `billingCustomersTableName`, `billingProductsTableId`, `billingProductsTableName`, `billingPricesTableId`, `billingPricesTableName`, `billingSubscriptionsTableId`, `billingSubscriptionsTableName`, `billingWebhookEventsTableId`, `billingWebhookEventsTableName`, `processBillingEventFunction`, `prefix`, `apiName`, `privateApiName`

### `function-deployment-module`

CRUD operations for FunctionDeploymentModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all functionDeploymentModule records |
| `find-first` | Find first matching functionDeploymentModule record |
| `get` | Get a functionDeploymentModule by id |
| `create` | Create a new functionDeploymentModule |
| `update` | Update an existing functionDeploymentModule |
| `delete` | Delete a functionDeploymentModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `deploymentsTableId` | UUID |
| `deploymentEventsTableId` | UUID |
| `deploymentsTableName` | String |
| `deploymentEventsTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `functionModuleId` | UUID |
| `namespaceModuleId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `deploymentsTableId`, `deploymentEventsTableId`, `deploymentsTableName`, `deploymentEventsTableName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `functionModuleId`, `namespaceModuleId`, `policies`, `provisions`, `defaultPermissions`

### `permissions-module`

CRUD operations for PermissionsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all permissionsModule records |
| `find-first` | Find first matching permissionsModule record |
| `get` | Get a permissionsModule by id |
| `create` | Create a new permissionsModule |
| `update` | Update an existing permissionsModule |
| `delete` | Delete a permissionsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableId` | UUID |
| `tableName` | String |
| `defaultTableId` | UUID |
| `defaultTableName` | String |
| `bitlen` | Int |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `getPaddedMask` | String |
| `getMask` | String |
| `getByMask` | String |
| `getMaskByName` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableId`, `tableName`, `defaultTableId`, `defaultTableName`, `bitlen`, `scope`, `prefix`, `entityTableId`, `actorTableId`, `getPaddedMask`, `getMask`, `getByMask`, `getMaskByName`, `apiName`, `privateApiName`

### `graph-execution-module`

CRUD operations for GraphExecutionModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all graphExecutionModule records |
| `find-first` | Find first matching graphExecutionModule record |
| `get` | Get a graphExecutionModule by id |
| `create` | Create a new graphExecutionModule |
| `update` | Update an existing graphExecutionModule |
| `delete` | Delete a graphExecutionModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `graphModuleId` | UUID |
| `scope` | String |
| `prefix` | String |
| `executionsTableId` | UUID |
| `outputsTableId` | UUID |
| `nodeStatesTableId` | UUID |
| `executionsTableName` | String |
| `outputsTableName` | String |
| `nodeStatesTableName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`, `graphModuleId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `scope`, `prefix`, `executionsTableId`, `outputsTableId`, `nodeStatesTableId`, `executionsTableName`, `outputsTableName`, `nodeStatesTableName`, `apiName`, `privateApiName`, `entityTableId`, `policies`, `provisions`, `defaultPermissions`

### `hierarchy-module`

CRUD operations for HierarchyModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all hierarchyModule records |
| `find-first` | Find first matching hierarchyModule record |
| `get` | Get a hierarchyModule by id |
| `create` | Create a new hierarchyModule |
| `update` | Update an existing hierarchyModule |
| `delete` | Delete a hierarchyModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `chartEdgesTableId` | UUID |
| `chartEdgesTableName` | String |
| `hierarchySprtTableId` | UUID |
| `hierarchySprtTableName` | String |
| `chartEdgeGrantsTableId` | UUID |
| `chartEdgeGrantsTableName` | String |
| `entityTableId` | UUID |
| `usersTableId` | UUID |
| `scope` | String |
| `prefix` | String |
| `privateSchemaName` | String |
| `sprtTableName` | String |
| `rebuildHierarchyFunction` | String |
| `getSubordinatesFunction` | String |
| `getManagersFunction` | String |
| `isManagerOfFunction` | String |
| `defaultPermissions` | String |
| `createdAt` | Datetime |

**Required create fields:** `databaseId`, `entityTableId`, `usersTableId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `chartEdgesTableId`, `chartEdgesTableName`, `hierarchySprtTableId`, `hierarchySprtTableName`, `chartEdgeGrantsTableId`, `chartEdgeGrantsTableName`, `scope`, `prefix`, `privateSchemaName`, `sprtTableName`, `rebuildHierarchyFunction`, `getSubordinatesFunction`, `getManagersFunction`, `isManagerOfFunction`, `defaultPermissions`

### `notifications-module`

CRUD operations for NotificationsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all notificationsModule records |
| `find-first` | Find first matching notificationsModule record |
| `get` | Get a notificationsModule by id |
| `create` | Create a new notificationsModule |
| `update` | Update an existing notificationsModule |
| `delete` | Delete a notificationsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `notificationsTableId` | UUID |
| `readStateTableId` | UUID |
| `preferencesTableId` | UUID |
| `channelsTableId` | UUID |
| `deliveryLogTableId` | UUID |
| `suppressionsTableId` | UUID |
| `ownerTableId` | UUID |
| `userSettingsTableId` | UUID |
| `organizationSettingsTableId` | UUID |
| `hasChannels` | Boolean |
| `hasPreferences` | Boolean |
| `hasSettingsExtension` | Boolean |
| `hasDigestMetadata` | Boolean |
| `hasSubscriptions` | Boolean |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `notificationsTableId`, `readStateTableId`, `preferencesTableId`, `channelsTableId`, `deliveryLogTableId`, `suppressionsTableId`, `ownerTableId`, `userSettingsTableId`, `organizationSettingsTableId`, `hasChannels`, `hasPreferences`, `hasSettingsExtension`, `hasDigestMetadata`, `hasSubscriptions`, `defaultPermissions`, `apiName`, `privateApiName`

### `relation-provision`

CRUD operations for RelationProvision records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all relationProvision records |
| `find-first` | Find first matching relationProvision record |
| `get` | Get a relationProvision by id |
| `create` | Create a new relationProvision |
| `update` | Update an existing relationProvision |
| `delete` | Delete a relationProvision |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `relationType` | String |
| `sourceTableId` | UUID |
| `targetTableId` | UUID |
| `fieldName` | String |
| `deleteAction` | String |
| `isRequired` | Boolean |
| `apiRequired` | Boolean |
| `junctionTableId` | UUID |
| `junctionTableName` | String |
| `junctionSchemaId` | UUID |
| `sourceFieldName` | String |
| `targetFieldName` | String |
| `useCompositeKey` | Boolean |
| `createIndex` | Boolean |
| `exposeInApi` | Boolean |
| `nodes` | JSON |
| `grants` | JSON |
| `policies` | JSON |
| `outFieldId` | UUID |
| `outJunctionTableId` | UUID |
| `outSourceFieldId` | UUID |
| `outTargetFieldId` | UUID |

**Required create fields:** `databaseId`, `relationType`, `sourceTableId`, `targetTableId`
**Optional create fields (backend defaults):** `fieldName`, `deleteAction`, `isRequired`, `apiRequired`, `junctionTableId`, `junctionTableName`, `junctionSchemaId`, `sourceFieldName`, `targetFieldName`, `useCompositeKey`, `createIndex`, `exposeInApi`, `nodes`, `grants`, `policies`, `outFieldId`, `outJunctionTableId`, `outSourceFieldId`, `outTargetFieldId`

### `profiles-module`

CRUD operations for ProfilesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all profilesModule records |
| `find-first` | Find first matching profilesModule record |
| `get` | Get a profilesModule by id |
| `create` | Create a new profilesModule |
| `update` | Update an existing profilesModule |
| `delete` | Delete a profilesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableId` | UUID |
| `tableName` | String |
| `profilePermissionsTableId` | UUID |
| `profilePermissionsTableName` | String |
| `profileGrantsTableId` | UUID |
| `profileGrantsTableName` | String |
| `profileDefinitionGrantsTableId` | UUID |
| `profileDefinitionGrantsTableName` | String |
| `profileTemplatesTableId` | UUID |
| `profileTemplatesTableName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `permissionsTableId` | UUID |
| `membershipsTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableId`, `tableName`, `profilePermissionsTableId`, `profilePermissionsTableName`, `profileGrantsTableId`, `profileGrantsTableName`, `profileDefinitionGrantsTableId`, `profileDefinitionGrantsTableName`, `profileTemplatesTableId`, `profileTemplatesTableName`, `scope`, `prefix`, `entityTableId`, `actorTableId`, `permissionsTableId`, `membershipsTableId`, `apiName`, `privateApiName`

### `billing-module`

CRUD operations for BillingModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all billingModule records |
| `find-first` | Find first matching billingModule record |
| `get` | Get a billingModule by id |
| `create` | Create a new billingModule |
| `update` | Update an existing billingModule |
| `delete` | Delete a billingModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `metersTableId` | UUID |
| `metersTableName` | String |
| `planSubscriptionsTableId` | UUID |
| `planSubscriptionsTableName` | String |
| `ledgerTableId` | UUID |
| `ledgerTableName` | String |
| `balancesTableId` | UUID |
| `balancesTableName` | String |
| `meterCreditsTableId` | UUID |
| `meterCreditsTableName` | String |
| `meterSourcesTableId` | UUID |
| `meterSourcesTableName` | String |
| `meterDefaultsTableId` | UUID |
| `meterDefaultsTableName` | String |
| `recordUsageFunction` | String |
| `sweepExpiredSubscriptionsFunction` | String |
| `rollupUsageSummaryFunction` | String |
| `prefix` | String |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `metersTableId`, `metersTableName`, `planSubscriptionsTableId`, `planSubscriptionsTableName`, `ledgerTableId`, `ledgerTableName`, `balancesTableId`, `balancesTableName`, `meterCreditsTableId`, `meterCreditsTableName`, `meterSourcesTableId`, `meterSourcesTableName`, `meterDefaultsTableId`, `meterDefaultsTableName`, `recordUsageFunction`, `sweepExpiredSubscriptionsFunction`, `rollupUsageSummaryFunction`, `prefix`, `defaultPermissions`, `apiName`, `privateApiName`

### `resource-module`

CRUD operations for ResourceModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all resourceModule records |
| `find-first` | Find first matching resourceModule record |
| `get` | Get a resourceModule by id |
| `create` | Create a new resourceModule |
| `update` | Update an existing resourceModule |
| `delete` | Delete a resourceModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `resourcesTableId` | UUID |
| `resourceEventsTableId` | UUID |
| `resourceStatusChecksTableId` | UUID |
| `resourceDefinitionsTableId` | UUID |
| `resourcesTableName` | String |
| `resourceEventsTableName` | String |
| `resourceStatusChecksTableName` | String |
| `resourceDefinitionsTableName` | String |
| `resolvedRequirementsViewName` | String |
| `requirementsStateViewName` | String |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `namespaceModuleId` | UUID |
| `policies` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `resourcesTableId`, `resourceEventsTableId`, `resourceStatusChecksTableId`, `resourceDefinitionsTableId`, `resourcesTableName`, `resourceEventsTableName`, `resourceStatusChecksTableName`, `resourceDefinitionsTableName`, `resolvedRequirementsViewName`, `requirementsStateViewName`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `namespaceModuleId`, `policies`, `provisions`, `defaultPermissions`

### `user-auth-module`

CRUD operations for UserAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userAuthModule records |
| `find-first` | Find first matching userAuthModule record |
| `get` | Get a userAuthModule by id |
| `create` | Create a new userAuthModule |
| `update` | Update an existing userAuthModule |
| `delete` | Delete a userAuthModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `emailsTableId` | UUID |
| `usersTableId` | UUID |
| `secretsTableId` | UUID |
| `encryptedTableId` | UUID |
| `sessionsTableId` | UUID |
| `sessionCredentialsTableId` | UUID |
| `auditsTableId` | UUID |
| `auditsTableName` | String |
| `signInFunction` | String |
| `signUpFunction` | String |
| `signOutFunction` | String |
| `setPasswordFunction` | String |
| `resetPasswordFunction` | String |
| `forgotPasswordFunction` | String |
| `sendVerificationEmailFunction` | String |
| `verifyEmailFunction` | String |
| `verifyPasswordFunction` | String |
| `checkPasswordFunction` | String |
| `sendAccountDeletionEmailFunction` | String |
| `deleteAccountFunction` | String |
| `signInCrossOriginFunction` | String |
| `requestCrossOriginTokenFunction` | String |
| `extendTokenExpires` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `emailsTableId`, `usersTableId`, `secretsTableId`, `encryptedTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `auditsTableId`, `auditsTableName`, `signInFunction`, `signUpFunction`, `signOutFunction`, `setPasswordFunction`, `resetPasswordFunction`, `forgotPasswordFunction`, `sendVerificationEmailFunction`, `verifyEmailFunction`, `verifyPasswordFunction`, `checkPasswordFunction`, `sendAccountDeletionEmailFunction`, `deleteAccountFunction`, `signInCrossOriginFunction`, `requestCrossOriginTokenFunction`, `extendTokenExpires`, `apiName`, `privateApiName`

### `db-usage-module`

CRUD operations for DbUsageModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all dbUsageModule records |
| `find-first` | Find first matching dbUsageModule record |
| `get` | Get a dbUsageModule by id |
| `create` | Create a new dbUsageModule |
| `update` | Update an existing dbUsageModule |
| `delete` | Delete a dbUsageModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableStatsLogTableId` | UUID |
| `tableStatsLogTableName` | String |
| `tableStatsDailyTableId` | UUID |
| `tableStatsDailyTableName` | String |
| `queryStatsLogTableId` | UUID |
| `queryStatsLogTableName` | String |
| `queryStatsDailyTableId` | UUID |
| `queryStatsDailyTableName` | String |
| `collectDbTableStatsFunction` | String |
| `collectDbQueryStatsFunction` | String |
| `rollupDbTableStatsDailyFunction` | String |
| `rollupDbQueryStatsDailyFunction` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `prefix` | String |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableStatsLogTableId`, `tableStatsLogTableName`, `tableStatsDailyTableId`, `tableStatsDailyTableName`, `queryStatsLogTableId`, `queryStatsLogTableName`, `queryStatsDailyTableId`, `queryStatsDailyTableName`, `collectDbTableStatsFunction`, `collectDbQueryStatsFunction`, `rollupDbTableStatsDailyFunction`, `rollupDbQueryStatsDailyFunction`, `interval`, `retention`, `premake`, `scope`, `prefix`, `defaultPermissions`, `apiName`, `privateApiName`

### `agent-module`

CRUD operations for AgentModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentModule records |
| `find-first` | Find first matching agentModule record |
| `get` | Get a agentModule by id |
| `create` | Create a new agentModule |
| `update` | Update an existing agentModule |
| `delete` | Delete a agentModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `threadTableId` | UUID |
| `messageTableId` | UUID |
| `taskTableId` | UUID |
| `promptsTableId` | UUID |
| `planTableId` | UUID |
| `agentTableId` | UUID |
| `personaTableId` | UUID |
| `resourceTableId` | UUID |
| `threadTableName` | String |
| `messageTableName` | String |
| `taskTableName` | String |
| `promptsTableName` | String |
| `planTableName` | String |
| `agentTableName` | String |
| `personaTableName` | String |
| `resourceTableName` | String |
| `hasPlans` | Boolean |
| `hasResources` | Boolean |
| `hasAgents` | Boolean |
| `shared` | Boolean |
| `apiName` | String |
| `privateApiName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `policies` | JSON |
| `resources` | JSON |
| `provisions` | JSON |
| `defaultPermissions` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `threadTableId`, `messageTableId`, `taskTableId`, `promptsTableId`, `planTableId`, `agentTableId`, `personaTableId`, `resourceTableId`, `threadTableName`, `messageTableName`, `taskTableName`, `promptsTableName`, `planTableName`, `agentTableName`, `personaTableName`, `resourceTableName`, `hasPlans`, `hasResources`, `hasAgents`, `shared`, `apiName`, `privateApiName`, `scope`, `prefix`, `entityTableId`, `policies`, `resources`, `provisions`, `defaultPermissions`

### `limits-module`

CRUD operations for LimitsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all limitsModule records |
| `find-first` | Find first matching limitsModule record |
| `get` | Get a limitsModule by id |
| `create` | Create a new limitsModule |
| `update` | Update an existing limitsModule |
| `delete` | Delete a limitsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `tableId` | UUID |
| `tableName` | String |
| `defaultTableId` | UUID |
| `defaultTableName` | String |
| `limitIncrementFunction` | String |
| `limitDecrementFunction` | String |
| `limitIncrementTrigger` | String |
| `limitDecrementTrigger` | String |
| `limitUpdateTrigger` | String |
| `limitCheckFunction` | String |
| `limitCreditsTableId` | UUID |
| `eventsTableId` | UUID |
| `creditCodesTableId` | UUID |
| `creditCodeItemsTableId` | UUID |
| `creditRedemptionsTableId` | UUID |
| `aggregateTableId` | UUID |
| `limitCapsTableId` | UUID |
| `limitCapsDefaultsTableId` | UUID |
| `capCheckTrigger` | String |
| `resolveCapFunction` | String |
| `limitWarningsTableId` | UUID |
| `limitWarningStateTableId` | UUID |
| `limitCheckSoftFunction` | String |
| `limitAggregateCheckSoftFunction` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `tableId`, `tableName`, `defaultTableId`, `defaultTableName`, `limitIncrementFunction`, `limitDecrementFunction`, `limitIncrementTrigger`, `limitDecrementTrigger`, `limitUpdateTrigger`, `limitCheckFunction`, `limitCreditsTableId`, `eventsTableId`, `creditCodesTableId`, `creditCodeItemsTableId`, `creditRedemptionsTableId`, `aggregateTableId`, `limitCapsTableId`, `limitCapsDefaultsTableId`, `capCheckTrigger`, `resolveCapFunction`, `limitWarningsTableId`, `limitWarningStateTableId`, `limitCheckSoftFunction`, `limitAggregateCheckSoftFunction`, `scope`, `prefix`, `entityTableId`, `actorTableId`, `apiName`, `privateApiName`

### `entity-type-provision`

CRUD operations for EntityTypeProvision records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all entityTypeProvision records |
| `find-first` | Find first matching entityTypeProvision record |
| `get` | Get a entityTypeProvision by id |
| `create` | Create a new entityTypeProvision |
| `update` | Update an existing entityTypeProvision |
| `delete` | Delete a entityTypeProvision |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `name` | String |
| `prefix` | String |
| `description` | String |
| `parentEntity` | String |
| `tableName` | String |
| `isVisible` | Boolean |
| `hasLimits` | Boolean |
| `hasProfiles` | Boolean |
| `hasLevels` | Boolean |
| `hasInvites` | Boolean |
| `hasInviteAchievements` | Boolean |
| `storage` | JSON |
| `namespaces` | JSON |
| `functions` | JSON |
| `graphs` | JSON |
| `agents` | JSON |
| `skipEntityPolicies` | Boolean |
| `tableProvision` | JSON |
| `outMembershipType` | Int |
| `outEntityTableId` | UUID |
| `outEntityTableName` | String |
| `outInstalledModules` | String |
| `outStorageModuleId` | UUID |
| `outBucketsTableId` | UUID |
| `outFilesTableId` | UUID |
| `outPathSharesTableId` | UUID |
| `outInvitesModuleId` | UUID |
| `outNamespaceModuleId` | UUID |
| `outNamespacesTableId` | UUID |
| `outNamespaceEventsTableId` | UUID |
| `outFunctionModuleId` | UUID |
| `outDefinitionsTableId` | UUID |
| `outInvocationsTableId` | UUID |
| `outExecutionLogsTableId` | UUID |
| `outGraphModuleId` | UUID |
| `outGraphsTableId` | UUID |
| `outAgentModuleId` | UUID |

**Required create fields:** `databaseId`, `name`, `prefix`
**Optional create fields (backend defaults):** `description`, `parentEntity`, `tableName`, `isVisible`, `hasLimits`, `hasProfiles`, `hasLevels`, `hasInvites`, `hasInviteAchievements`, `storage`, `namespaces`, `functions`, `graphs`, `agents`, `skipEntityPolicies`, `tableProvision`, `outMembershipType`, `outEntityTableId`, `outEntityTableName`, `outInstalledModules`, `outStorageModuleId`, `outBucketsTableId`, `outFilesTableId`, `outPathSharesTableId`, `outInvitesModuleId`, `outNamespaceModuleId`, `outNamespacesTableId`, `outNamespaceEventsTableId`, `outFunctionModuleId`, `outDefinitionsTableId`, `outInvocationsTableId`, `outExecutionLogsTableId`, `outGraphModuleId`, `outGraphsTableId`, `outAgentModuleId`

### `storage-module`

CRUD operations for StorageModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all storageModule records |
| `find-first` | Find first matching storageModule record |
| `get` | Get a storageModule by id |
| `create` | Create a new storageModule |
| `update` | Update an existing storageModule |
| `delete` | Delete a storageModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `bucketsTableId` | UUID |
| `filesTableId` | UUID |
| `bucketsTableName` | String |
| `filesTableName` | String |
| `scope` | String |
| `prefix` | String |
| `policies` | JSON |
| `provisions` | JSON |
| `entityTableId` | UUID |
| `entityField` | String |
| `endpoint` | String |
| `publicUrlPrefix` | String |
| `provider` | String |
| `allowedOrigins` | String |
| `restrictReads` | Boolean |
| `hasPathShares` | Boolean |
| `pathSharesTableId` | UUID |
| `uploadUrlExpirySeconds` | Int |
| `downloadUrlExpirySeconds` | Int |
| `defaultMaxFileSize` | BigInt |
| `maxFilenameLength` | Int |
| `cacheTtlSeconds` | Int |
| `maxBulkFiles` | Int |
| `maxBulkTotalSize` | BigInt |
| `hasVersioning` | Boolean |
| `hasContentHash` | Boolean |
| `hasCustomKeys` | Boolean |
| `hasAuditLog` | Boolean |
| `hasConfirmUpload` | Boolean |
| `confirmUploadDelay` | Interval |
| `fileEventsTableId` | UUID |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `bucketsTableId`, `filesTableId`, `bucketsTableName`, `filesTableName`, `scope`, `prefix`, `policies`, `provisions`, `entityTableId`, `entityField`, `endpoint`, `publicUrlPrefix`, `provider`, `allowedOrigins`, `restrictReads`, `hasPathShares`, `pathSharesTableId`, `uploadUrlExpirySeconds`, `downloadUrlExpirySeconds`, `defaultMaxFileSize`, `maxFilenameLength`, `cacheTtlSeconds`, `maxBulkFiles`, `maxBulkTotalSize`, `hasVersioning`, `hasContentHash`, `hasCustomKeys`, `hasAuditLog`, `hasConfirmUpload`, `confirmUploadDelay`, `fileEventsTableId`, `defaultPermissions`, `apiName`, `privateApiName`

### `memberships-module`

CRUD operations for MembershipsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipsModule records |
| `find-first` | Find first matching membershipsModule record |
| `get` | Get a membershipsModule by id |
| `create` | Create a new membershipsModule |
| `update` | Update an existing membershipsModule |
| `delete` | Delete a membershipsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `membershipsTableId` | UUID |
| `membershipsTableName` | String |
| `membersTableId` | UUID |
| `membersTableName` | String |
| `membershipDefaultsTableId` | UUID |
| `membershipDefaultsTableName` | String |
| `membershipSettingsTableId` | UUID |
| `membershipSettingsTableName` | String |
| `grantsTableId` | UUID |
| `grantsTableName` | String |
| `actorTableId` | UUID |
| `limitsTableId` | UUID |
| `defaultLimitsTableId` | UUID |
| `permissionsTableId` | UUID |
| `defaultPermissionsTableId` | UUID |
| `sprtTableId` | UUID |
| `adminGrantsTableId` | UUID |
| `adminGrantsTableName` | String |
| `ownerGrantsTableId` | UUID |
| `ownerGrantsTableName` | String |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `entityTableOwnerId` | UUID |
| `getOrgFn` | String |
| `actorMaskCheck` | String |
| `actorPermCheck` | String |
| `entityIdsByMask` | String |
| `entityIdsByPerm` | String |
| `entityIdsFunction` | String |
| `memberProfilesTableId` | UUID |
| `permissionDefaultPermissionsTableId` | UUID |
| `permissionDefaultGrantsTableId` | UUID |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `membershipsTableId`, `membershipsTableName`, `membersTableId`, `membersTableName`, `membershipDefaultsTableId`, `membershipDefaultsTableName`, `membershipSettingsTableId`, `membershipSettingsTableName`, `grantsTableId`, `grantsTableName`, `actorTableId`, `limitsTableId`, `defaultLimitsTableId`, `permissionsTableId`, `defaultPermissionsTableId`, `sprtTableId`, `adminGrantsTableId`, `adminGrantsTableName`, `ownerGrantsTableId`, `ownerGrantsTableName`, `scope`, `prefix`, `entityTableId`, `entityTableOwnerId`, `getOrgFn`, `actorMaskCheck`, `actorPermCheck`, `entityIdsByMask`, `entityIdsByPerm`, `entityIdsFunction`, `memberProfilesTableId`, `permissionDefaultPermissionsTableId`, `permissionDefaultGrantsTableId`, `apiName`, `privateApiName`

### `events-module`

CRUD operations for EventsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all eventsModule records |
| `find-first` | Find first matching eventsModule record |
| `get` | Get a eventsModule by id |
| `create` | Create a new eventsModule |
| `update` | Update an existing eventsModule |
| `delete` | Delete a eventsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `entityField` | String |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `publicSchemaName` | String |
| `privateSchemaName` | String |
| `eventsTableId` | UUID |
| `eventsTableName` | String |
| `eventAggregatesTableId` | UUID |
| `eventAggregatesTableName` | String |
| `eventTypesTableId` | UUID |
| `eventTypesTableName` | String |
| `levelsTableId` | UUID |
| `levelsTableName` | String |
| `levelRequirementsTableId` | UUID |
| `levelRequirementsTableName` | String |
| `levelGrantsTableId` | UUID |
| `levelGrantsTableName` | String |
| `achievementRewardsTableId` | UUID |
| `achievementRewardsTableName` | String |
| `recordEvent` | String |
| `removeEvent` | String |
| `tgEvent` | String |
| `tgEventToggle` | String |
| `tgEventToggleBool` | String |
| `tgEventBool` | String |
| `upsertAggregate` | String |
| `tgUpdateAggregates` | String |
| `stepsRequired` | String |
| `levelAchieved` | String |
| `tgCheckAchievements` | String |
| `grantAchievement` | String |
| `tgAchievementReward` | String |
| `interval` | String |
| `retention` | String |
| `premake` | Int |
| `scope` | String |
| `prefix` | String |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `defaultPermissions` | String |
| `apiName` | String |
| `privateApiName` | String |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `entityField`, `schemaId`, `privateSchemaId`, `publicSchemaName`, `privateSchemaName`, `eventsTableId`, `eventsTableName`, `eventAggregatesTableId`, `eventAggregatesTableName`, `eventTypesTableId`, `eventTypesTableName`, `levelsTableId`, `levelsTableName`, `levelRequirementsTableId`, `levelRequirementsTableName`, `levelGrantsTableId`, `levelGrantsTableName`, `achievementRewardsTableId`, `achievementRewardsTableName`, `recordEvent`, `removeEvent`, `tgEvent`, `tgEventToggle`, `tgEventToggleBool`, `tgEventBool`, `upsertAggregate`, `tgUpdateAggregates`, `stepsRequired`, `levelAchieved`, `tgCheckAchievements`, `grantAchievement`, `tgAchievementReward`, `interval`, `retention`, `premake`, `scope`, `prefix`, `entityTableId`, `actorTableId`, `defaultPermissions`, `apiName`, `privateApiName`

## Custom Operations

### `resolve-blueprint-field`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--tableId` | UUID |
  | `--fieldName` | String |

### `resolve-blueprint-table`

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--tableName` | String |
  | `--schemaName` | String |
  | `--tableMap` | JSON |
  | `--defaultSchemaId` | UUID |

### `construct-blueprint`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.blueprintId` | UUID |
  | `--input.schemaId` | UUID |

### `provision-full-text-search`

Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.tableId` | UUID |
  | `--input.definition` | JSON |

### `provision-index`

Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.tableId` | UUID |
  | `--input.definition` | JSON |

### `provision-check-constraint`

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.tableId` | UUID |
  | `--input.definition` | JSON |

### `provision-unique-constraint`

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.tableId` | UUID |
  | `--input.definition` | JSON |

### `copy-template-to-blueprint`

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.templateId` | UUID |
  | `--input.databaseId` | UUID |
  | `--input.ownerId` | UUID |
  | `--input.nameOverride` | String |
  | `--input.displayNameOverride` | String |

### `provision-spatial-relation`

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.pDatabaseId` | UUID |
  | `--input.pSourceTableId` | UUID |
  | `--input.pSourceFieldId` | UUID |
  | `--input.pTargetTableId` | UUID |
  | `--input.pTargetFieldId` | UUID |
  | `--input.pName` | String |
  | `--input.pOperator` | String |
  | `--input.pParamName` | String |

### `provision-table`

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.schemaId` | UUID |
  | `--input.tableName` | String |
  | `--input.tableId` | UUID |
  | `--input.nodes` | JSON |
  | `--input.fields` | JSON |
  | `--input.policies` | JSON |
  | `--input.grants` | JSON |
  | `--input.useRls` | Boolean |
  | `--input.indexes` | JSON |
  | `--input.fullTextSearches` | JSON |
  | `--input.uniqueConstraints` | JSON |
  | `--input.description` | String |

### `provision-relation`

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.relationType` | String |
  | `--input.sourceTableId` | UUID |
  | `--input.targetTableId` | UUID |
  | `--input.fieldName` | String |
  | `--input.deleteAction` | String |
  | `--input.isRequired` | Boolean |
  | `--input.apiRequired` | Boolean |
  | `--input.createIndex` | Boolean |
  | `--input.junctionTableId` | UUID |
  | `--input.junctionTableName` | String |
  | `--input.junctionSchemaId` | UUID |
  | `--input.sourceFieldName` | String |
  | `--input.targetFieldName` | String |
  | `--input.useCompositeKey` | Boolean |
  | `--input.exposeInApi` | Boolean |
  | `--input.nodes` | JSON |
  | `--input.grants` | JSON |
  | `--input.policies` | JSON |

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
