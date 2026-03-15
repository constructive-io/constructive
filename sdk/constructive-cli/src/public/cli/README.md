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
| `org-get-managers-record` | orgGetManagersRecord CRUD operations |
| `org-get-subordinates-record` | orgGetSubordinatesRecord CRUD operations |
| `get-all-record` | getAllRecord CRUD operations |
| `app-permission` | appPermission CRUD operations |
| `org-permission` | orgPermission CRUD operations |
| `object` | object CRUD operations |
| `app-level-requirement` | appLevelRequirement CRUD operations |
| `database` | database CRUD operations |
| `schema` | schema CRUD operations |
| `table` | table CRUD operations |
| `check-constraint` | checkConstraint CRUD operations |
| `field` | field CRUD operations |
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
| `table-template-module` | tableTemplateModule CRUD operations |
| `secure-table-provision` | secureTableProvision CRUD operations |
| `relation-provision` | relationProvision CRUD operations |
| `schema-grant` | schemaGrant CRUD operations |
| `default-privilege` | defaultPrivilege CRUD operations |
| `api-schema` | apiSchema CRUD operations |
| `api-module` | apiModule CRUD operations |
| `domain` | domain CRUD operations |
| `site-metadatum` | siteMetadatum CRUD operations |
| `site-module` | siteModule CRUD operations |
| `site-theme` | siteTheme CRUD operations |
| `trigger-function` | triggerFunction CRUD operations |
| `api` | api CRUD operations |
| `site` | site CRUD operations |
| `app` | app CRUD operations |
| `connected-accounts-module` | connectedAccountsModule CRUD operations |
| `crypto-addresses-module` | cryptoAddressesModule CRUD operations |
| `crypto-auth-module` | cryptoAuthModule CRUD operations |
| `default-ids-module` | defaultIdsModule CRUD operations |
| `denormalized-table-field` | denormalizedTableField CRUD operations |
| `emails-module` | emailsModule CRUD operations |
| `encrypted-secrets-module` | encryptedSecretsModule CRUD operations |
| `field-module` | fieldModule CRUD operations |
| `invites-module` | invitesModule CRUD operations |
| `levels-module` | levelsModule CRUD operations |
| `limits-module` | limitsModule CRUD operations |
| `membership-types-module` | membershipTypesModule CRUD operations |
| `memberships-module` | membershipsModule CRUD operations |
| `permissions-module` | permissionsModule CRUD operations |
| `phone-numbers-module` | phoneNumbersModule CRUD operations |
| `profiles-module` | profilesModule CRUD operations |
| `secrets-module` | secretsModule CRUD operations |
| `sessions-module` | sessionsModule CRUD operations |
| `user-auth-module` | userAuthModule CRUD operations |
| `users-module` | usersModule CRUD operations |
| `uuid-module` | uuidModule CRUD operations |
| `database-provision-module` | databaseProvisionModule CRUD operations |
| `app-admin-grant` | appAdminGrant CRUD operations |
| `app-owner-grant` | appOwnerGrant CRUD operations |
| `app-grant` | appGrant CRUD operations |
| `org-membership` | orgMembership CRUD operations |
| `org-member` | orgMember CRUD operations |
| `org-admin-grant` | orgAdminGrant CRUD operations |
| `org-owner-grant` | orgOwnerGrant CRUD operations |
| `org-grant` | orgGrant CRUD operations |
| `org-chart-edge` | orgChartEdge CRUD operations |
| `org-chart-edge-grant` | orgChartEdgeGrant CRUD operations |
| `app-limit` | appLimit CRUD operations |
| `org-limit` | orgLimit CRUD operations |
| `app-step` | appStep CRUD operations |
| `app-achievement` | appAchievement CRUD operations |
| `invite` | invite CRUD operations |
| `claimed-invite` | claimedInvite CRUD operations |
| `org-invite` | orgInvite CRUD operations |
| `org-claimed-invite` | orgClaimedInvite CRUD operations |
| `ref` | ref CRUD operations |
| `store` | store CRUD operations |
| `app-permission-default` | appPermissionDefault CRUD operations |
| `crypto-address` | cryptoAddress CRUD operations |
| `role-type` | roleType CRUD operations |
| `org-permission-default` | orgPermissionDefault CRUD operations |
| `phone-number` | phoneNumber CRUD operations |
| `app-limit-default` | appLimitDefault CRUD operations |
| `org-limit-default` | orgLimitDefault CRUD operations |
| `connected-account` | connectedAccount CRUD operations |
| `node-type-registry` | nodeTypeRegistry CRUD operations |
| `membership-type` | membershipType CRUD operations |
| `app-membership-default` | appMembershipDefault CRUD operations |
| `rls-module` | rlsModule CRUD operations |
| `commit` | commit CRUD operations |
| `org-membership-default` | orgMembershipDefault CRUD operations |
| `audit-log` | auditLog CRUD operations |
| `app-level` | appLevel CRUD operations |
| `sql-migration` | sqlMigration CRUD operations |
| `email` | email CRUD operations |
| `ast-migration` | astMigration CRUD operations |
| `app-membership` | appMembership CRUD operations |
| `user` | user CRUD operations |
| `hierarchy-module` | hierarchyModule CRUD operations |
| `current-user-id` | currentUserId |
| `current-ip-address` | currentIpAddress |
| `current-user-agent` | currentUserAgent |
| `app-permissions-get-padded-mask` | appPermissionsGetPaddedMask |
| `org-permissions-get-padded-mask` | orgPermissionsGetPaddedMask |
| `steps-achieved` | stepsAchieved |
| `rev-parse` | revParse |
| `org-is-manager-of` | orgIsManagerOf |
| `app-permissions-get-mask` | appPermissionsGetMask |
| `org-permissions-get-mask` | orgPermissionsGetMask |
| `app-permissions-get-mask-by-names` | appPermissionsGetMaskByNames |
| `org-permissions-get-mask-by-names` | orgPermissionsGetMaskByNames |
| `app-permissions-get-by-mask` | Reads and enables pagination through a set of `AppPermission`. |
| `org-permissions-get-by-mask` | Reads and enables pagination through a set of `OrgPermission`. |
| `get-all-objects-from-root` | Reads and enables pagination through a set of `Object`. |
| `get-path-objects-from-root` | Reads and enables pagination through a set of `Object`. |
| `get-object-at-path` | getObjectAtPath |
| `steps-required` | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `current-user` | currentUser |
| `sign-out` | signOut |
| `send-account-deletion-email` | sendAccountDeletionEmail |
| `check-password` | checkPassword |
| `submit-invite-code` | submitInviteCode |
| `submit-org-invite-code` | submitOrgInviteCode |
| `freeze-objects` | freezeObjects |
| `init-empty-repo` | initEmptyRepo |
| `confirm-delete-account` | confirmDeleteAccount |
| `set-password` | setPassword |
| `verify-email` | verifyEmail |
| `reset-password` | resetPassword |
| `bootstrap-user` | bootstrapUser |
| `remove-node-at-path` | removeNodeAtPath |
| `set-data-at-path` | setDataAtPath |
| `set-props-and-commit` | setPropsAndCommit |
| `provision-database-with-user` | provisionDatabaseWithUser |
| `sign-in-one-time-token` | signInOneTimeToken |
| `create-user-database` | Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include levels/achievements (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups
 |
| `extend-token-expires` | extendTokenExpires |
| `sign-in` | signIn |
| `sign-up` | signUp |
| `set-field-order` | setFieldOrder |
| `one-time-token` | oneTimeToken |
| `insert-node-at-path` | insertNodeAtPath |
| `update-node-at-path` | updateNodeAtPath |
| `set-and-commit` | setAndCommit |
| `apply-rls` | applyRls |
| `forgot-password` | forgotPassword |
| `send-verification-email` | sendVerificationEmail |
| `verify-password` | verifyPassword |
| `verify-totp` | verifyTotp |

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

### `org-get-managers-record`

CRUD operations for OrgGetManagersRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgGetManagersRecord records |
| `get` | Get a orgGetManagersRecord by id |
| `create` | Create a new orgGetManagersRecord |
| `update` | Update an existing orgGetManagersRecord |
| `delete` | Delete a orgGetManagersRecord |

**Fields:**

| Field | Type |
|-------|------|
| `userId` | UUID |
| `depth` | Int |

**Required create fields:** `userId`, `depth`

### `org-get-subordinates-record`

CRUD operations for OrgGetSubordinatesRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgGetSubordinatesRecord records |
| `get` | Get a orgGetSubordinatesRecord by id |
| `create` | Create a new orgGetSubordinatesRecord |
| `update` | Update an existing orgGetSubordinatesRecord |
| `delete` | Delete a orgGetSubordinatesRecord |

**Fields:**

| Field | Type |
|-------|------|
| `userId` | UUID |
| `depth` | Int |

**Required create fields:** `userId`, `depth`

### `get-all-record`

CRUD operations for GetAllRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all getAllRecord records |
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

### `app-permission`

CRUD operations for AppPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermission records |
| `get` | Get a appPermission by id |
| `create` | Create a new appPermission |
| `update` | Update an existing appPermission |
| `delete` | Delete a appPermission |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `bitnum` | Int |
| `bitstr` | BitString |
| `description` | String |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `name`, `bitnum`, `bitstr`, `description`

### `org-permission`

CRUD operations for OrgPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermission records |
| `get` | Get a orgPermission by id |
| `create` | Create a new orgPermission |
| `update` | Update an existing orgPermission |
| `delete` | Delete a orgPermission |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `bitnum` | Int |
| `bitstr` | BitString |
| `description` | String |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `name`, `bitnum`, `bitstr`, `description`

### `object`

CRUD operations for Object records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all object records |
| `get` | Get a object by id |
| `create` | Create a new object |
| `update` | Update an existing object |
| `delete` | Delete a object |

**Fields:**

| Field | Type |
|-------|------|
| `hashUuid` | UUID |
| `id` | UUID |
| `databaseId` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `data` | JSON |
| `frzn` | Boolean |
| `createdAt` | Datetime |

**Required create fields:** `hashUuid`, `databaseId`
**Optional create fields (backend defaults):** `kids`, `ktree`, `data`, `frzn`

### `app-level-requirement`

CRUD operations for AppLevelRequirement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLevelRequirement records |
| `get` | Get a appLevelRequirement by id |
| `create` | Create a new appLevelRequirement |
| `update` | Update an existing appLevelRequirement |
| `delete` | Delete a appLevelRequirement |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `level` | String |
| `description` | String |
| `requiredCount` | Int |
| `priority` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `name`, `level`, `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `description`, `requiredCount`, `priority`

### `database`

CRUD operations for Database records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all database records |
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
| `schemaHashTrgmSimilarity` | Float |
| `nameTrgmSimilarity` | Float |
| `labelTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `schemaHashTrgmSimilarity`, `nameTrgmSimilarity`, `labelTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `ownerId`, `schemaHash`, `name`, `label`, `hash`

### `schema`

CRUD operations for Schema records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all schema records |
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
| `nameTrgmSimilarity` | Float |
| `schemaNameTrgmSimilarity` | Float |
| `labelTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `name`, `schemaName`, `nameTrgmSimilarity`, `schemaNameTrgmSimilarity`, `labelTrgmSimilarity`, `descriptionTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `label`, `description`, `smartTags`, `category`, `module`, `scope`, `tags`, `isPublic`

### `table`

CRUD operations for Table records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all table records |
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
| `inheritsId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `nameTrgmSimilarity` | Float |
| `labelTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `pluralNameTrgmSimilarity` | Float |
| `singularNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `schemaId`, `name`, `nameTrgmSimilarity`, `labelTrgmSimilarity`, `descriptionTrgmSimilarity`, `moduleTrgmSimilarity`, `pluralNameTrgmSimilarity`, `singularNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `label`, `description`, `smartTags`, `category`, `module`, `scope`, `useRls`, `timestamps`, `peoplestamps`, `pluralName`, `singularName`, `tags`, `inheritsId`

### `check-constraint`

CRUD operations for CheckConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all checkConstraint records |
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
| `nameTrgmSimilarity` | Float |
| `typeTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `fieldIds`, `nameTrgmSimilarity`, `typeTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `type`, `expr`, `smartTags`, `category`, `module`, `scope`, `tags`

### `field`

CRUD operations for Field records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all field records |
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
| `defaultValue` | String |
| `defaultValueAst` | JSON |
| `isHidden` | Boolean |
| `type` | String |
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
| `nameTrgmSimilarity` | Float |
| `labelTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `defaultValueTrgmSimilarity` | Float |
| `regexpTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `name`, `type`, `nameTrgmSimilarity`, `labelTrgmSimilarity`, `descriptionTrgmSimilarity`, `defaultValueTrgmSimilarity`, `regexpTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `label`, `description`, `smartTags`, `isRequired`, `defaultValue`, `defaultValueAst`, `isHidden`, `fieldOrder`, `regexp`, `chk`, `chkExpr`, `min`, `max`, `tags`, `category`, `module`, `scope`

### `foreign-key-constraint`

CRUD operations for ForeignKeyConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all foreignKeyConstraint records |
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
| `nameTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `typeTrgmSimilarity` | Float |
| `deleteActionTrgmSimilarity` | Float |
| `updateActionTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `fieldIds`, `refTableId`, `refFieldIds`, `nameTrgmSimilarity`, `descriptionTrgmSimilarity`, `typeTrgmSimilarity`, `deleteActionTrgmSimilarity`, `updateActionTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `description`, `smartTags`, `type`, `deleteAction`, `updateAction`, `category`, `module`, `scope`, `tags`

### `full-text-search`

CRUD operations for FullTextSearch records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all fullTextSearch records |
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
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `tableId`, `fieldId`, `fieldIds`, `weights`, `langs`
**Optional create fields (backend defaults):** `databaseId`

### `index`

CRUD operations for Index records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all index records |
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
| `nameTrgmSimilarity` | Float |
| `accessMethodTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableId`, `nameTrgmSimilarity`, `accessMethodTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `name`, `fieldIds`, `includeFieldIds`, `accessMethod`, `indexParams`, `whereClause`, `isUnique`, `options`, `opClasses`, `smartTags`, `category`, `module`, `scope`, `tags`

### `policy`

CRUD operations for Policy records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all policy records |
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
| `nameTrgmSimilarity` | Float |
| `granteeNameTrgmSimilarity` | Float |
| `privilegeTrgmSimilarity` | Float |
| `policyTypeTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `nameTrgmSimilarity`, `granteeNameTrgmSimilarity`, `privilegeTrgmSimilarity`, `policyTypeTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `granteeName`, `privilege`, `permissive`, `disabled`, `policyType`, `data`, `smartTags`, `category`, `module`, `scope`, `tags`

### `primary-key-constraint`

CRUD operations for PrimaryKeyConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all primaryKeyConstraint records |
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
| `nameTrgmSimilarity` | Float |
| `typeTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `fieldIds`, `nameTrgmSimilarity`, `typeTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `type`, `smartTags`, `category`, `module`, `scope`, `tags`

### `table-grant`

CRUD operations for TableGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all tableGrant records |
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
| `privilegeTrgmSimilarity` | Float |
| `granteeNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `privilege`, `granteeName`, `privilegeTrgmSimilarity`, `granteeNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `fieldIds`, `isGrant`

### `trigger`

CRUD operations for Trigger records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all trigger records |
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
| `nameTrgmSimilarity` | Float |
| `eventTrgmSimilarity` | Float |
| `functionNameTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `name`, `nameTrgmSimilarity`, `eventTrgmSimilarity`, `functionNameTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `event`, `functionName`, `smartTags`, `category`, `module`, `scope`, `tags`

### `unique-constraint`

CRUD operations for UniqueConstraint records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all uniqueConstraint records |
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
| `nameTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `typeTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `tableId`, `fieldIds`, `nameTrgmSimilarity`, `descriptionTrgmSimilarity`, `typeTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `description`, `smartTags`, `type`, `category`, `module`, `scope`, `tags`

### `view`

CRUD operations for View records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all view records |
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
| `nameTrgmSimilarity` | Float |
| `viewTypeTrgmSimilarity` | Float |
| `filterTypeTrgmSimilarity` | Float |
| `moduleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `schemaId`, `name`, `viewType`, `nameTrgmSimilarity`, `viewTypeTrgmSimilarity`, `filterTypeTrgmSimilarity`, `moduleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `tableId`, `data`, `filterType`, `filterData`, `securityInvoker`, `isReadOnly`, `smartTags`, `category`, `module`, `scope`, `tags`

### `view-table`

CRUD operations for ViewTable records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all viewTable records |
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
| `granteeNameTrgmSimilarity` | Float |
| `privilegeTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `viewId`, `granteeName`, `privilege`, `granteeNameTrgmSimilarity`, `privilegeTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `withGrantOption`, `isGrant`

### `view-rule`

CRUD operations for ViewRule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all viewRule records |
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
| `nameTrgmSimilarity` | Float |
| `eventTrgmSimilarity` | Float |
| `actionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `viewId`, `name`, `event`, `nameTrgmSimilarity`, `eventTrgmSimilarity`, `actionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `action`

### `table-template-module`

CRUD operations for TableTemplateModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all tableTemplateModule records |
| `get` | Get a tableTemplateModule by id |
| `create` | Create a new tableTemplateModule |
| `update` | Update an existing tableTemplateModule |
| `delete` | Delete a tableTemplateModule |

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
| `nodeType` | String |
| `data` | JSON |
| `tableNameTrgmSimilarity` | Float |
| `nodeTypeTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableName`, `nodeType`, `tableNameTrgmSimilarity`, `nodeTypeTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `data`

### `secure-table-provision`

CRUD operations for SecureTableProvision records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all secureTableProvision records |
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
| `nodeType` | String |
| `useRls` | Boolean |
| `nodeData` | JSON |
| `fields` | JSON |
| `grantRoles` | String |
| `grantPrivileges` | JSON |
| `policyType` | String |
| `policyPrivileges` | String |
| `policyRole` | String |
| `policyPermissive` | Boolean |
| `policyName` | String |
| `policyData` | JSON |
| `outFields` | UUID |
| `tableNameTrgmSimilarity` | Float |
| `nodeTypeTrgmSimilarity` | Float |
| `policyTypeTrgmSimilarity` | Float |
| `policyRoleTrgmSimilarity` | Float |
| `policyNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableNameTrgmSimilarity`, `nodeTypeTrgmSimilarity`, `policyTypeTrgmSimilarity`, `policyRoleTrgmSimilarity`, `policyNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`, `nodeType`, `useRls`, `nodeData`, `fields`, `grantRoles`, `grantPrivileges`, `policyType`, `policyPrivileges`, `policyRole`, `policyPermissive`, `policyName`, `policyData`, `outFields`

### `relation-provision`

CRUD operations for RelationProvision records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all relationProvision records |
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
| `junctionTableId` | UUID |
| `junctionTableName` | String |
| `junctionSchemaId` | UUID |
| `sourceFieldName` | String |
| `targetFieldName` | String |
| `useCompositeKey` | Boolean |
| `nodeType` | String |
| `nodeData` | JSON |
| `grantRoles` | String |
| `grantPrivileges` | JSON |
| `policyType` | String |
| `policyPrivileges` | String |
| `policyRole` | String |
| `policyPermissive` | Boolean |
| `policyName` | String |
| `policyData` | JSON |
| `outFieldId` | UUID |
| `outJunctionTableId` | UUID |
| `outSourceFieldId` | UUID |
| `outTargetFieldId` | UUID |
| `relationTypeTrgmSimilarity` | Float |
| `fieldNameTrgmSimilarity` | Float |
| `deleteActionTrgmSimilarity` | Float |
| `junctionTableNameTrgmSimilarity` | Float |
| `sourceFieldNameTrgmSimilarity` | Float |
| `targetFieldNameTrgmSimilarity` | Float |
| `nodeTypeTrgmSimilarity` | Float |
| `policyTypeTrgmSimilarity` | Float |
| `policyRoleTrgmSimilarity` | Float |
| `policyNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `relationType`, `sourceTableId`, `targetTableId`, `relationTypeTrgmSimilarity`, `fieldNameTrgmSimilarity`, `deleteActionTrgmSimilarity`, `junctionTableNameTrgmSimilarity`, `sourceFieldNameTrgmSimilarity`, `targetFieldNameTrgmSimilarity`, `nodeTypeTrgmSimilarity`, `policyTypeTrgmSimilarity`, `policyRoleTrgmSimilarity`, `policyNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `fieldName`, `deleteAction`, `isRequired`, `junctionTableId`, `junctionTableName`, `junctionSchemaId`, `sourceFieldName`, `targetFieldName`, `useCompositeKey`, `nodeType`, `nodeData`, `grantRoles`, `grantPrivileges`, `policyType`, `policyPrivileges`, `policyRole`, `policyPermissive`, `policyName`, `policyData`, `outFieldId`, `outJunctionTableId`, `outSourceFieldId`, `outTargetFieldId`

### `schema-grant`

CRUD operations for SchemaGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all schemaGrant records |
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
| `granteeNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `schemaId`, `granteeName`, `granteeNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`

### `default-privilege`

CRUD operations for DefaultPrivilege records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all defaultPrivilege records |
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
| `objectTypeTrgmSimilarity` | Float |
| `privilegeTrgmSimilarity` | Float |
| `granteeNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `schemaId`, `objectType`, `privilege`, `granteeName`, `objectTypeTrgmSimilarity`, `privilegeTrgmSimilarity`, `granteeNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `isGrant`

### `api-schema`

CRUD operations for ApiSchema records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all apiSchema records |
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
| `nameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `apiId`, `name`, `data`, `nameTrgmSimilarity`, `searchScore`

### `domain`

CRUD operations for Domain records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all domain records |
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
| `titleTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `siteId`, `titleTrgmSimilarity`, `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `title`, `description`, `ogImage`

### `site-module`

CRUD operations for SiteModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all siteModule records |
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
| `nameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `siteId`, `name`, `data`, `nameTrgmSimilarity`, `searchScore`

### `site-theme`

CRUD operations for SiteTheme records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all siteTheme records |
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

### `trigger-function`

CRUD operations for TriggerFunction records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all triggerFunction records |
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
| `nameTrgmSimilarity` | Float |
| `codeTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `name`, `nameTrgmSimilarity`, `codeTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `code`

### `api`

CRUD operations for Api records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all api records |
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
| `nameTrgmSimilarity` | Float |
| `dbnameTrgmSimilarity` | Float |
| `roleNameTrgmSimilarity` | Float |
| `anonRoleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `name`, `nameTrgmSimilarity`, `dbnameTrgmSimilarity`, `roleNameTrgmSimilarity`, `anonRoleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `dbname`, `roleName`, `anonRole`, `isPublic`

### `site`

CRUD operations for Site records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all site records |
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
| `titleTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `dbnameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `titleTrgmSimilarity`, `descriptionTrgmSimilarity`, `dbnameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `title`, `description`, `ogImage`, `favicon`, `appleTouchIcon`, `logo`, `dbname`

### `app`

CRUD operations for App records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all app records |
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
| `nameTrgmSimilarity` | Float |
| `appStoreIdTrgmSimilarity` | Float |
| `appIdPrefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `siteId`, `nameTrgmSimilarity`, `appStoreIdTrgmSimilarity`, `appIdPrefixTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `name`, `appImage`, `appStoreLink`, `appStoreId`, `appIdPrefix`, `playStoreLink`

### `connected-accounts-module`

CRUD operations for ConnectedAccountsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all connectedAccountsModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableName`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`

### `crypto-addresses-module`

CRUD operations for CryptoAddressesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAddressesModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `cryptoNetworkTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableName`, `tableNameTrgmSimilarity`, `cryptoNetworkTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`, `cryptoNetwork`

### `crypto-auth-module`

CRUD operations for CryptoAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAuthModule records |
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
| `userFieldTrgmSimilarity` | Float |
| `cryptoNetworkTrgmSimilarity` | Float |
| `signInRequestChallengeTrgmSimilarity` | Float |
| `signInRecordFailureTrgmSimilarity` | Float |
| `signUpWithKeyTrgmSimilarity` | Float |
| `signInWithChallengeTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `userField`, `userFieldTrgmSimilarity`, `cryptoNetworkTrgmSimilarity`, `signInRequestChallengeTrgmSimilarity`, `signInRecordFailureTrgmSimilarity`, `signUpWithKeyTrgmSimilarity`, `signInWithChallengeTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `usersTableId`, `secretsTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `addressesTableId`, `cryptoNetwork`, `signInRequestChallenge`, `signInRecordFailure`, `signUpWithKey`, `signInWithChallenge`

### `default-ids-module`

CRUD operations for DefaultIdsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all defaultIdsModule records |
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

### `denormalized-table-field`

CRUD operations for DenormalizedTableField records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all denormalizedTableField records |
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
| `funcNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableId`, `fieldId`, `refTableId`, `refFieldId`, `funcNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `setIds`, `refIds`, `useUpdates`, `updateDefaults`, `funcName`, `funcOrder`

### `emails-module`

CRUD operations for EmailsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all emailsModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableName`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`

### `encrypted-secrets-module`

CRUD operations for EncryptedSecretsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all encryptedSecretsModule records |
| `get` | Get a encryptedSecretsModule by id |
| `create` | Create a new encryptedSecretsModule |
| `update` | Update an existing encryptedSecretsModule |
| `delete` | Delete a encryptedSecretsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`

### `field-module`

CRUD operations for FieldModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all fieldModule records |
| `get` | Get a fieldModule by id |
| `create` | Create a new fieldModule |
| `update` | Update an existing fieldModule |
| `delete` | Delete a fieldModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `fieldId` | UUID |
| `nodeType` | String |
| `data` | JSON |
| `triggers` | String |
| `functions` | String |
| `nodeTypeTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `nodeType`, `nodeTypeTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `privateSchemaId`, `tableId`, `fieldId`, `data`, `triggers`, `functions`

### `invites-module`

CRUD operations for InvitesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all invitesModule records |
| `get` | Get a invitesModule by id |
| `create` | Create a new invitesModule |
| `update` | Update an existing invitesModule |
| `delete` | Delete a invitesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `emailsTableId` | UUID |
| `usersTableId` | UUID |
| `invitesTableId` | UUID |
| `claimedInvitesTableId` | UUID |
| `invitesTableName` | String |
| `claimedInvitesTableName` | String |
| `submitInviteCodeFunction` | String |
| `prefix` | String |
| `membershipType` | Int |
| `entityTableId` | UUID |
| `invitesTableNameTrgmSimilarity` | Float |
| `claimedInvitesTableNameTrgmSimilarity` | Float |
| `submitInviteCodeFunctionTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `invitesTableNameTrgmSimilarity`, `claimedInvitesTableNameTrgmSimilarity`, `submitInviteCodeFunctionTrgmSimilarity`, `prefixTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `emailsTableId`, `usersTableId`, `invitesTableId`, `claimedInvitesTableId`, `invitesTableName`, `claimedInvitesTableName`, `submitInviteCodeFunction`, `prefix`, `entityTableId`

### `levels-module`

CRUD operations for LevelsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all levelsModule records |
| `get` | Get a levelsModule by id |
| `create` | Create a new levelsModule |
| `update` | Update an existing levelsModule |
| `delete` | Delete a levelsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `stepsTableId` | UUID |
| `stepsTableName` | String |
| `achievementsTableId` | UUID |
| `achievementsTableName` | String |
| `levelsTableId` | UUID |
| `levelsTableName` | String |
| `levelRequirementsTableId` | UUID |
| `levelRequirementsTableName` | String |
| `completedStep` | String |
| `incompletedStep` | String |
| `tgAchievement` | String |
| `tgAchievementToggle` | String |
| `tgAchievementToggleBoolean` | String |
| `tgAchievementBoolean` | String |
| `upsertAchievement` | String |
| `tgUpdateAchievements` | String |
| `stepsRequired` | String |
| `levelAchieved` | String |
| `prefix` | String |
| `membershipType` | Int |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `stepsTableNameTrgmSimilarity` | Float |
| `achievementsTableNameTrgmSimilarity` | Float |
| `levelsTableNameTrgmSimilarity` | Float |
| `levelRequirementsTableNameTrgmSimilarity` | Float |
| `completedStepTrgmSimilarity` | Float |
| `incompletedStepTrgmSimilarity` | Float |
| `tgAchievementTrgmSimilarity` | Float |
| `tgAchievementToggleTrgmSimilarity` | Float |
| `tgAchievementToggleBooleanTrgmSimilarity` | Float |
| `tgAchievementBooleanTrgmSimilarity` | Float |
| `upsertAchievementTrgmSimilarity` | Float |
| `tgUpdateAchievementsTrgmSimilarity` | Float |
| `stepsRequiredTrgmSimilarity` | Float |
| `levelAchievedTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `stepsTableNameTrgmSimilarity`, `achievementsTableNameTrgmSimilarity`, `levelsTableNameTrgmSimilarity`, `levelRequirementsTableNameTrgmSimilarity`, `completedStepTrgmSimilarity`, `incompletedStepTrgmSimilarity`, `tgAchievementTrgmSimilarity`, `tgAchievementToggleTrgmSimilarity`, `tgAchievementToggleBooleanTrgmSimilarity`, `tgAchievementBooleanTrgmSimilarity`, `upsertAchievementTrgmSimilarity`, `tgUpdateAchievementsTrgmSimilarity`, `stepsRequiredTrgmSimilarity`, `levelAchievedTrgmSimilarity`, `prefixTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `stepsTableId`, `stepsTableName`, `achievementsTableId`, `achievementsTableName`, `levelsTableId`, `levelsTableName`, `levelRequirementsTableId`, `levelRequirementsTableName`, `completedStep`, `incompletedStep`, `tgAchievement`, `tgAchievementToggle`, `tgAchievementToggleBoolean`, `tgAchievementBoolean`, `upsertAchievement`, `tgUpdateAchievements`, `stepsRequired`, `levelAchieved`, `prefix`, `entityTableId`, `actorTableId`

### `limits-module`

CRUD operations for LimitsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all limitsModule records |
| `get` | Get a limitsModule by id |
| `create` | Create a new limitsModule |
| `update` | Update an existing limitsModule |
| `delete` | Delete a limitsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
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
| `prefix` | String |
| `membershipType` | Int |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `tableNameTrgmSimilarity` | Float |
| `defaultTableNameTrgmSimilarity` | Float |
| `limitIncrementFunctionTrgmSimilarity` | Float |
| `limitDecrementFunctionTrgmSimilarity` | Float |
| `limitIncrementTriggerTrgmSimilarity` | Float |
| `limitDecrementTriggerTrgmSimilarity` | Float |
| `limitUpdateTriggerTrgmSimilarity` | Float |
| `limitCheckFunctionTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `tableNameTrgmSimilarity`, `defaultTableNameTrgmSimilarity`, `limitIncrementFunctionTrgmSimilarity`, `limitDecrementFunctionTrgmSimilarity`, `limitIncrementTriggerTrgmSimilarity`, `limitDecrementTriggerTrgmSimilarity`, `limitUpdateTriggerTrgmSimilarity`, `limitCheckFunctionTrgmSimilarity`, `prefixTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `tableName`, `defaultTableId`, `defaultTableName`, `limitIncrementFunction`, `limitDecrementFunction`, `limitIncrementTrigger`, `limitDecrementTrigger`, `limitUpdateTrigger`, `limitCheckFunction`, `prefix`, `entityTableId`, `actorTableId`

### `membership-types-module`

CRUD operations for MembershipTypesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipTypesModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`

### `memberships-module`

CRUD operations for MembershipsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipsModule records |
| `get` | Get a membershipsModule by id |
| `create` | Create a new membershipsModule |
| `update` | Update an existing membershipsModule |
| `delete` | Delete a membershipsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `membershipsTableId` | UUID |
| `membershipsTableName` | String |
| `membersTableId` | UUID |
| `membersTableName` | String |
| `membershipDefaultsTableId` | UUID |
| `membershipDefaultsTableName` | String |
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
| `membershipType` | Int |
| `entityTableId` | UUID |
| `entityTableOwnerId` | UUID |
| `prefix` | String |
| `actorMaskCheck` | String |
| `actorPermCheck` | String |
| `entityIdsByMask` | String |
| `entityIdsByPerm` | String |
| `entityIdsFunction` | String |
| `membershipsTableNameTrgmSimilarity` | Float |
| `membersTableNameTrgmSimilarity` | Float |
| `membershipDefaultsTableNameTrgmSimilarity` | Float |
| `grantsTableNameTrgmSimilarity` | Float |
| `adminGrantsTableNameTrgmSimilarity` | Float |
| `ownerGrantsTableNameTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `actorMaskCheckTrgmSimilarity` | Float |
| `actorPermCheckTrgmSimilarity` | Float |
| `entityIdsByMaskTrgmSimilarity` | Float |
| `entityIdsByPermTrgmSimilarity` | Float |
| `entityIdsFunctionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `membershipsTableNameTrgmSimilarity`, `membersTableNameTrgmSimilarity`, `membershipDefaultsTableNameTrgmSimilarity`, `grantsTableNameTrgmSimilarity`, `adminGrantsTableNameTrgmSimilarity`, `ownerGrantsTableNameTrgmSimilarity`, `prefixTrgmSimilarity`, `actorMaskCheckTrgmSimilarity`, `actorPermCheckTrgmSimilarity`, `entityIdsByMaskTrgmSimilarity`, `entityIdsByPermTrgmSimilarity`, `entityIdsFunctionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `membershipsTableId`, `membershipsTableName`, `membersTableId`, `membersTableName`, `membershipDefaultsTableId`, `membershipDefaultsTableName`, `grantsTableId`, `grantsTableName`, `actorTableId`, `limitsTableId`, `defaultLimitsTableId`, `permissionsTableId`, `defaultPermissionsTableId`, `sprtTableId`, `adminGrantsTableId`, `adminGrantsTableName`, `ownerGrantsTableId`, `ownerGrantsTableName`, `entityTableId`, `entityTableOwnerId`, `prefix`, `actorMaskCheck`, `actorPermCheck`, `entityIdsByMask`, `entityIdsByPerm`, `entityIdsFunction`

### `permissions-module`

CRUD operations for PermissionsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all permissionsModule records |
| `get` | Get a permissionsModule by id |
| `create` | Create a new permissionsModule |
| `update` | Update an existing permissionsModule |
| `delete` | Delete a permissionsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `defaultTableId` | UUID |
| `defaultTableName` | String |
| `bitlen` | Int |
| `membershipType` | Int |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `prefix` | String |
| `getPaddedMask` | String |
| `getMask` | String |
| `getByMask` | String |
| `getMaskByName` | String |
| `tableNameTrgmSimilarity` | Float |
| `defaultTableNameTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `getPaddedMaskTrgmSimilarity` | Float |
| `getMaskTrgmSimilarity` | Float |
| `getByMaskTrgmSimilarity` | Float |
| `getMaskByNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `tableNameTrgmSimilarity`, `defaultTableNameTrgmSimilarity`, `prefixTrgmSimilarity`, `getPaddedMaskTrgmSimilarity`, `getMaskTrgmSimilarity`, `getByMaskTrgmSimilarity`, `getMaskByNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `tableName`, `defaultTableId`, `defaultTableName`, `bitlen`, `entityTableId`, `actorTableId`, `prefix`, `getPaddedMask`, `getMask`, `getByMask`, `getMaskByName`

### `phone-numbers-module`

CRUD operations for PhoneNumbersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all phoneNumbersModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableName`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `ownerTableId`

### `profiles-module`

CRUD operations for ProfilesModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all profilesModule records |
| `get` | Get a profilesModule by id |
| `create` | Create a new profilesModule |
| `update` | Update an existing profilesModule |
| `delete` | Delete a profilesModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `privateSchemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `profilePermissionsTableId` | UUID |
| `profilePermissionsTableName` | String |
| `profileGrantsTableId` | UUID |
| `profileGrantsTableName` | String |
| `profileDefinitionGrantsTableId` | UUID |
| `profileDefinitionGrantsTableName` | String |
| `membershipType` | Int |
| `entityTableId` | UUID |
| `actorTableId` | UUID |
| `permissionsTableId` | UUID |
| `membershipsTableId` | UUID |
| `prefix` | String |
| `tableNameTrgmSimilarity` | Float |
| `profilePermissionsTableNameTrgmSimilarity` | Float |
| `profileGrantsTableNameTrgmSimilarity` | Float |
| `profileDefinitionGrantsTableNameTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `membershipType`, `tableNameTrgmSimilarity`, `profilePermissionsTableNameTrgmSimilarity`, `profileGrantsTableNameTrgmSimilarity`, `profileDefinitionGrantsTableNameTrgmSimilarity`, `prefixTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `tableId`, `tableName`, `profilePermissionsTableId`, `profilePermissionsTableName`, `profileGrantsTableId`, `profileGrantsTableName`, `profileDefinitionGrantsTableId`, `profileDefinitionGrantsTableName`, `entityTableId`, `actorTableId`, `permissionsTableId`, `membershipsTableId`, `prefix`

### `secrets-module`

CRUD operations for SecretsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all secretsModule records |
| `get` | Get a secretsModule by id |
| `create` | Create a new secretsModule |
| `update` | Update an existing secretsModule |
| `delete` | Delete a secretsModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `tableId` | UUID |
| `tableName` | String |
| `tableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`

### `sessions-module`

CRUD operations for SessionsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all sessionsModule records |
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
| `sessionsTableTrgmSimilarity` | Float |
| `sessionCredentialsTableTrgmSimilarity` | Float |
| `authSettingsTableTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `sessionsTableTrgmSimilarity`, `sessionCredentialsTableTrgmSimilarity`, `authSettingsTableTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `sessionsTableId`, `sessionCredentialsTableId`, `authSettingsTableId`, `usersTableId`, `sessionsDefaultExpiration`, `sessionsTable`, `sessionCredentialsTable`, `authSettingsTable`

### `user-auth-module`

CRUD operations for UserAuthModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userAuthModule records |
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
| `signInOneTimeTokenFunction` | String |
| `oneTimeTokenFunction` | String |
| `extendTokenExpires` | String |
| `auditsTableNameTrgmSimilarity` | Float |
| `signInFunctionTrgmSimilarity` | Float |
| `signUpFunctionTrgmSimilarity` | Float |
| `signOutFunctionTrgmSimilarity` | Float |
| `setPasswordFunctionTrgmSimilarity` | Float |
| `resetPasswordFunctionTrgmSimilarity` | Float |
| `forgotPasswordFunctionTrgmSimilarity` | Float |
| `sendVerificationEmailFunctionTrgmSimilarity` | Float |
| `verifyEmailFunctionTrgmSimilarity` | Float |
| `verifyPasswordFunctionTrgmSimilarity` | Float |
| `checkPasswordFunctionTrgmSimilarity` | Float |
| `sendAccountDeletionEmailFunctionTrgmSimilarity` | Float |
| `deleteAccountFunctionTrgmSimilarity` | Float |
| `signInOneTimeTokenFunctionTrgmSimilarity` | Float |
| `oneTimeTokenFunctionTrgmSimilarity` | Float |
| `extendTokenExpiresTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `auditsTableNameTrgmSimilarity`, `signInFunctionTrgmSimilarity`, `signUpFunctionTrgmSimilarity`, `signOutFunctionTrgmSimilarity`, `setPasswordFunctionTrgmSimilarity`, `resetPasswordFunctionTrgmSimilarity`, `forgotPasswordFunctionTrgmSimilarity`, `sendVerificationEmailFunctionTrgmSimilarity`, `verifyEmailFunctionTrgmSimilarity`, `verifyPasswordFunctionTrgmSimilarity`, `checkPasswordFunctionTrgmSimilarity`, `sendAccountDeletionEmailFunctionTrgmSimilarity`, `deleteAccountFunctionTrgmSimilarity`, `signInOneTimeTokenFunctionTrgmSimilarity`, `oneTimeTokenFunctionTrgmSimilarity`, `extendTokenExpiresTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `emailsTableId`, `usersTableId`, `secretsTableId`, `encryptedTableId`, `sessionsTableId`, `sessionCredentialsTableId`, `auditsTableId`, `auditsTableName`, `signInFunction`, `signUpFunction`, `signOutFunction`, `setPasswordFunction`, `resetPasswordFunction`, `forgotPasswordFunction`, `sendVerificationEmailFunction`, `verifyEmailFunction`, `verifyPasswordFunction`, `checkPasswordFunction`, `sendAccountDeletionEmailFunction`, `deleteAccountFunction`, `signInOneTimeTokenFunction`, `oneTimeTokenFunction`, `extendTokenExpires`

### `users-module`

CRUD operations for UsersModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all usersModule records |
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
| `tableNameTrgmSimilarity` | Float |
| `typeTableNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `tableNameTrgmSimilarity`, `typeTableNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `tableId`, `tableName`, `typeTableId`, `typeTableName`

### `uuid-module`

CRUD operations for UuidModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all uuidModule records |
| `get` | Get a uuidModule by id |
| `create` | Create a new uuidModule |
| `update` | Update an existing uuidModule |
| `delete` | Delete a uuidModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
| `schemaId` | UUID |
| `uuidFunction` | String |
| `uuidSeed` | String |
| `uuidFunctionTrgmSimilarity` | Float |
| `uuidSeedTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `uuidSeed`, `uuidFunctionTrgmSimilarity`, `uuidSeedTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `uuidFunction`

### `database-provision-module`

CRUD operations for DatabaseProvisionModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all databaseProvisionModule records |
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
| `modules` | String |
| `options` | JSON |
| `bootstrapUser` | Boolean |
| `status` | String |
| `errorMessage` | String |
| `databaseId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `completedAt` | Datetime |
| `databaseNameTrgmSimilarity` | Float |
| `subdomainTrgmSimilarity` | Float |
| `domainTrgmSimilarity` | Float |
| `statusTrgmSimilarity` | Float |
| `errorMessageTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseName`, `ownerId`, `domain`, `databaseNameTrgmSimilarity`, `subdomainTrgmSimilarity`, `domainTrgmSimilarity`, `statusTrgmSimilarity`, `errorMessageTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `subdomain`, `modules`, `options`, `bootstrapUser`, `status`, `errorMessage`, `databaseId`, `completedAt`

### `app-admin-grant`

CRUD operations for AppAdminGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appAdminGrant records |
| `get` | Get a appAdminGrant by id |
| `create` | Create a new appAdminGrant |
| `update` | Update an existing appAdminGrant |
| `delete` | Delete a appAdminGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `isGrant`, `grantorId`

### `app-owner-grant`

CRUD operations for AppOwnerGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appOwnerGrant records |
| `get` | Get a appOwnerGrant by id |
| `create` | Create a new appOwnerGrant |
| `update` | Update an existing appOwnerGrant |
| `delete` | Delete a appOwnerGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `isGrant`, `grantorId`

### `app-grant`

CRUD operations for AppGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appGrant records |
| `get` | Get a appGrant by id |
| `create` | Create a new appGrant |
| `update` | Update an existing appGrant |
| `delete` | Delete a appGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `permissions` | BitString |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `permissions`, `isGrant`, `grantorId`

### `org-membership`

CRUD operations for OrgMembership records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMembership records |
| `get` | Get a orgMembership by id |
| `create` | Create a new orgMembership |
| `update` | Update an existing orgMembership |
| `delete` | Delete a orgMembership |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `isApproved` | Boolean |
| `isBanned` | Boolean |
| `isDisabled` | Boolean |
| `isActive` | Boolean |
| `isOwner` | Boolean |
| `isAdmin` | Boolean |
| `permissions` | BitString |
| `granted` | BitString |
| `actorId` | UUID |
| `entityId` | UUID |
| `profileId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `isBanned`, `isDisabled`, `isActive`, `isOwner`, `isAdmin`, `permissions`, `granted`, `profileId`

### `org-member`

CRUD operations for OrgMember records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMember records |
| `get` | Get a orgMember by id |
| `create` | Create a new orgMember |
| `update` | Update an existing orgMember |
| `delete` | Delete a orgMember |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `isAdmin` | Boolean |
| `actorId` | UUID |
| `entityId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `isAdmin`

### `org-admin-grant`

CRUD operations for OrgAdminGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgAdminGrant records |
| `get` | Get a orgAdminGrant by id |
| `create` | Create a new orgAdminGrant |
| `update` | Update an existing orgAdminGrant |
| `delete` | Delete a orgAdminGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `entityId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `isGrant`, `grantorId`

### `org-owner-grant`

CRUD operations for OrgOwnerGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgOwnerGrant records |
| `get` | Get a orgOwnerGrant by id |
| `create` | Create a new orgOwnerGrant |
| `update` | Update an existing orgOwnerGrant |
| `delete` | Delete a orgOwnerGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `entityId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `isGrant`, `grantorId`

### `org-grant`

CRUD operations for OrgGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgGrant records |
| `get` | Get a orgGrant by id |
| `create` | Create a new orgGrant |
| `update` | Update an existing orgGrant |
| `delete` | Delete a orgGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `permissions` | BitString |
| `isGrant` | Boolean |
| `actorId` | UUID |
| `entityId` | UUID |
| `grantorId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `permissions`, `isGrant`, `grantorId`

### `org-chart-edge`

CRUD operations for OrgChartEdge records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgChartEdge records |
| `get` | Get a orgChartEdge by id |
| `create` | Create a new orgChartEdge |
| `update` | Update an existing orgChartEdge |
| `delete` | Delete a orgChartEdge |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `entityId` | UUID |
| `childId` | UUID |
| `parentId` | UUID |
| `positionTitle` | String |
| `positionLevel` | Int |
| `positionTitleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `entityId`, `childId`, `positionTitleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `parentId`, `positionTitle`, `positionLevel`

### `org-chart-edge-grant`

CRUD operations for OrgChartEdgeGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgChartEdgeGrant records |
| `get` | Get a orgChartEdgeGrant by id |
| `create` | Create a new orgChartEdgeGrant |
| `update` | Update an existing orgChartEdgeGrant |
| `delete` | Delete a orgChartEdgeGrant |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `entityId` | UUID |
| `childId` | UUID |
| `parentId` | UUID |
| `grantorId` | UUID |
| `isGrant` | Boolean |
| `positionTitle` | String |
| `positionLevel` | Int |
| `createdAt` | Datetime |
| `positionTitleTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `entityId`, `childId`, `grantorId`, `positionTitleTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `parentId`, `isGrant`, `positionTitle`, `positionLevel`

### `app-limit`

CRUD operations for AppLimit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimit records |
| `get` | Get a appLimit by id |
| `create` | Create a new appLimit |
| `update` | Update an existing appLimit |
| `delete` | Delete a appLimit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `actorId` | UUID |
| `num` | Int |
| `max` | Int |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `name`, `num`, `max`

### `org-limit`

CRUD operations for OrgLimit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimit records |
| `get` | Get a orgLimit by id |
| `create` | Create a new orgLimit |
| `update` | Update an existing orgLimit |
| `delete` | Delete a orgLimit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `actorId` | UUID |
| `num` | Int |
| `max` | Int |
| `entityId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `name`, `num`, `max`

### `app-step`

CRUD operations for AppStep records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appStep records |
| `get` | Get a appStep by id |
| `create` | Create a new appStep |
| `update` | Update an existing appStep |
| `delete` | Delete a appStep |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `actorId` | UUID |
| `name` | String |
| `count` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `actorId`, `count`

### `app-achievement`

CRUD operations for AppAchievement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appAchievement records |
| `get` | Get a appAchievement by id |
| `create` | Create a new appAchievement |
| `update` | Update an existing appAchievement |
| `delete` | Delete a appAchievement |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `actorId` | UUID |
| `name` | String |
| `count` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `actorId`, `count`

### `invite`

CRUD operations for Invite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all invite records |
| `get` | Get a invite by id |
| `create` | Create a new invite |
| `update` | Update an existing invite |
| `delete` | Delete a invite |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `email` | Email |
| `senderId` | UUID |
| `inviteToken` | String |
| `inviteValid` | Boolean |
| `inviteLimit` | Int |
| `inviteCount` | Int |
| `multiple` | Boolean |
| `data` | JSON |
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `inviteTokenTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `inviteTokenTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `email`, `senderId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `expiresAt`

### `claimed-invite`

CRUD operations for ClaimedInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all claimedInvite records |
| `get` | Get a claimedInvite by id |
| `create` | Create a new claimedInvite |
| `update` | Update an existing claimedInvite |
| `delete` | Delete a claimedInvite |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `data` | JSON |
| `senderId` | UUID |
| `receiverId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `data`, `senderId`, `receiverId`

### `org-invite`

CRUD operations for OrgInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgInvite records |
| `get` | Get a orgInvite by id |
| `create` | Create a new orgInvite |
| `update` | Update an existing orgInvite |
| `delete` | Delete a orgInvite |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `email` | Email |
| `senderId` | UUID |
| `receiverId` | UUID |
| `inviteToken` | String |
| `inviteValid` | Boolean |
| `inviteLimit` | Int |
| `inviteCount` | Int |
| `multiple` | Boolean |
| `data` | JSON |
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `entityId` | UUID |
| `inviteTokenTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `entityId`, `inviteTokenTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `email`, `senderId`, `receiverId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `expiresAt`

### `org-claimed-invite`

CRUD operations for OrgClaimedInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgClaimedInvite records |
| `get` | Get a orgClaimedInvite by id |
| `create` | Create a new orgClaimedInvite |
| `update` | Update an existing orgClaimedInvite |
| `delete` | Delete a orgClaimedInvite |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `data` | JSON |
| `senderId` | UUID |
| `receiverId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `entityId` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `data`, `senderId`, `receiverId`

### `ref`

CRUD operations for Ref records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all ref records |
| `get` | Get a ref by id |
| `create` | Create a new ref |
| `update` | Update an existing ref |
| `delete` | Delete a ref |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `storeId` | UUID |
| `commitId` | UUID |
| `nameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `name`, `databaseId`, `storeId`, `nameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `commitId`

### `store`

CRUD operations for Store records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all store records |
| `get` | Get a store by id |
| `create` | Create a new store |
| `update` | Update an existing store |
| `delete` | Delete a store |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `hash` | UUID |
| `createdAt` | Datetime |
| `nameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `name`, `databaseId`, `nameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `hash`

### `app-permission-default`

CRUD operations for AppPermissionDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermissionDefault records |
| `get` | Get a appPermissionDefault by id |
| `create` | Create a new appPermissionDefault |
| `update` | Update an existing appPermissionDefault |
| `delete` | Delete a appPermissionDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `permissions` | BitString |

**Optional create fields (backend defaults):** `permissions`

### `crypto-address`

CRUD operations for CryptoAddress records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAddress records |
| `get` | Get a cryptoAddress by id |
| `create` | Create a new cryptoAddress |
| `update` | Update an existing cryptoAddress |
| `delete` | Delete a cryptoAddress |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `address` | String |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `addressTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `address`, `addressTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `role-type`

CRUD operations for RoleType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all roleType records |
| `get` | Get a roleType by id |
| `create` | Create a new roleType |
| `update` | Update an existing roleType |
| `delete` | Delete a roleType |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `name` | String |

**Required create fields:** `name`

### `org-permission-default`

CRUD operations for OrgPermissionDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermissionDefault records |
| `get` | Get a orgPermissionDefault by id |
| `create` | Create a new orgPermissionDefault |
| `update` | Update an existing orgPermissionDefault |
| `delete` | Delete a orgPermissionDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `permissions` | BitString |
| `entityId` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `permissions`

### `phone-number`

CRUD operations for PhoneNumber records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all phoneNumber records |
| `get` | Get a phoneNumber by id |
| `create` | Create a new phoneNumber |
| `update` | Update an existing phoneNumber |
| `delete` | Delete a phoneNumber |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `cc` | String |
| `number` | String |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `ccTrgmSimilarity` | Float |
| `numberTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `cc`, `number`, `ccTrgmSimilarity`, `numberTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `app-limit-default`

CRUD operations for AppLimitDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitDefault records |
| `get` | Get a appLimitDefault by id |
| `create` | Create a new appLimitDefault |
| `update` | Update an existing appLimitDefault |
| `delete` | Delete a appLimitDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | Int |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

### `org-limit-default`

CRUD operations for OrgLimitDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitDefault records |
| `get` | Get a orgLimitDefault by id |
| `create` | Create a new orgLimitDefault |
| `update` | Update an existing orgLimitDefault |
| `delete` | Delete a orgLimitDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | Int |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

### `connected-account`

CRUD operations for ConnectedAccount records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all connectedAccount records |
| `get` | Get a connectedAccount by id |
| `create` | Create a new connectedAccount |
| `update` | Update an existing connectedAccount |
| `delete` | Delete a connectedAccount |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `service` | String |
| `identifier` | String |
| `details` | JSON |
| `isVerified` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `serviceTrgmSimilarity` | Float |
| `identifierTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `service`, `identifier`, `details`, `serviceTrgmSimilarity`, `identifierTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`

### `node-type-registry`

CRUD operations for NodeTypeRegistry records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all nodeTypeRegistry records |
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
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `nameTrgmSimilarity` | Float |
| `slugTrgmSimilarity` | Float |
| `categoryTrgmSimilarity` | Float |
| `displayNameTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `slug`, `category`, `nameTrgmSimilarity`, `slugTrgmSimilarity`, `categoryTrgmSimilarity`, `displayNameTrgmSimilarity`, `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `displayName`, `description`, `parameterSchema`, `tags`

### `membership-type`

CRUD operations for MembershipType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipType records |
| `get` | Get a membershipType by id |
| `create` | Create a new membershipType |
| `update` | Update an existing membershipType |
| `delete` | Delete a membershipType |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `name` | String |
| `description` | String |
| `prefix` | String |
| `descriptionTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `name`, `description`, `prefix`, `descriptionTrgmSimilarity`, `prefixTrgmSimilarity`, `searchScore`

### `app-membership-default`

CRUD operations for AppMembershipDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appMembershipDefault records |
| `get` | Get a appMembershipDefault by id |
| `create` | Create a new appMembershipDefault |
| `update` | Update an existing appMembershipDefault |
| `delete` | Delete a appMembershipDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `isApproved` | Boolean |
| `isVerified` | Boolean |

**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `isVerified`

### `rls-module`

CRUD operations for RlsModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all rlsModule records |
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
| `authenticateTrgmSimilarity` | Float |
| `authenticateStrictTrgmSimilarity` | Float |
| `currentRoleTrgmSimilarity` | Float |
| `currentRoleIdTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `authenticateTrgmSimilarity`, `authenticateStrictTrgmSimilarity`, `currentRoleTrgmSimilarity`, `currentRoleIdTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `sessionCredentialsTableId`, `sessionsTableId`, `usersTableId`, `authenticate`, `authenticateStrict`, `currentRole`, `currentRoleId`

### `commit`

CRUD operations for Commit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all commit records |
| `get` | Get a commit by id |
| `create` | Create a new commit |
| `update` | Update an existing commit |
| `delete` | Delete a commit |

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
| `messageTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `storeId`, `messageTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `message`, `parentIds`, `authorId`, `committerId`, `treeId`, `date`

### `org-membership-default`

CRUD operations for OrgMembershipDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMembershipDefault records |
| `get` | Get a orgMembershipDefault by id |
| `create` | Create a new orgMembershipDefault |
| `update` | Update an existing orgMembershipDefault |
| `delete` | Delete a orgMembershipDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `isApproved` | Boolean |
| `entityId` | UUID |
| `deleteMemberCascadeGroups` | Boolean |
| `createGroupsCascadeMembers` | Boolean |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `deleteMemberCascadeGroups`, `createGroupsCascadeMembers`

### `audit-log`

CRUD operations for AuditLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all auditLog records |
| `get` | Get a auditLog by id |
| `create` | Create a new auditLog |
| `update` | Update an existing auditLog |
| `delete` | Delete a auditLog |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `event` | String |
| `actorId` | UUID |
| `origin` | Origin |
| `userAgent` | String |
| `ipAddress` | InternetAddress |
| `success` | Boolean |
| `createdAt` | Datetime |
| `userAgentTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `event`, `success`, `userAgentTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `actorId`, `origin`, `userAgent`, `ipAddress`

### `app-level`

CRUD operations for AppLevel records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLevel records |
| `get` | Get a appLevel by id |
| `create` | Create a new appLevel |
| `update` | Update an existing appLevel |
| `delete` | Delete a appLevel |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `description` | String |
| `image` | Image |
| `ownerId` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `descriptionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `name`, `descriptionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `description`, `image`, `ownerId`

### `sql-migration`

CRUD operations for SqlMigration records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all sqlMigration records |
| `get` | Get a sqlMigration by id |
| `create` | Create a new sqlMigration |
| `update` | Update an existing sqlMigration |
| `delete` | Delete a sqlMigration |

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
| `nameTrgmSimilarity` | Float |
| `deployTrgmSimilarity` | Float |
| `contentTrgmSimilarity` | Float |
| `revertTrgmSimilarity` | Float |
| `verifyTrgmSimilarity` | Float |
| `actionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `nameTrgmSimilarity`, `deployTrgmSimilarity`, `contentTrgmSimilarity`, `revertTrgmSimilarity`, `verifyTrgmSimilarity`, `actionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `name`, `databaseId`, `deploy`, `deps`, `payload`, `content`, `revert`, `verify`, `action`, `actionId`, `actorId`

### `email`

CRUD operations for Email records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all email records |
| `get` | Get a email by id |
| `create` | Create a new email |
| `update` | Update an existing email |
| `delete` | Delete a email |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `email` | Email |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `email`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `ast-migration`

CRUD operations for AstMigration records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all astMigration records |
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
| `actionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `actionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `databaseId`, `name`, `requires`, `payload`, `deploys`, `deploy`, `revert`, `verify`, `action`, `actionId`, `actorId`

### `app-membership`

CRUD operations for AppMembership records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appMembership records |
| `get` | Get a appMembership by id |
| `create` | Create a new appMembership |
| `update` | Update an existing appMembership |
| `delete` | Delete a appMembership |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `isApproved` | Boolean |
| `isBanned` | Boolean |
| `isDisabled` | Boolean |
| `isVerified` | Boolean |
| `isActive` | Boolean |
| `isOwner` | Boolean |
| `isAdmin` | Boolean |
| `permissions` | BitString |
| `granted` | BitString |
| `actorId` | UUID |
| `profileId` | UUID |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `isBanned`, `isDisabled`, `isVerified`, `isActive`, `isOwner`, `isAdmin`, `permissions`, `granted`, `profileId`

### `user`

CRUD operations for User records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all user records |
| `get` | Get a user by id |
| `create` | Create a new user |
| `update` | Update an existing user |
| `delete` | Delete a user |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `username` | String |
| `displayName` | String |
| `profilePicture` | Image |
| `searchTsv` | FullText |
| `type` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `searchTsvRank` | Float |
| `displayNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `searchTsvRank`, `displayNameTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `username`, `displayName`, `profilePicture`, `searchTsv`, `type`

### `hierarchy-module`

CRUD operations for HierarchyModule records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all hierarchyModule records |
| `get` | Get a hierarchyModule by id |
| `create` | Create a new hierarchyModule |
| `update` | Update an existing hierarchyModule |
| `delete` | Delete a hierarchyModule |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `databaseId` | UUID |
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
| `prefix` | String |
| `privateSchemaName` | String |
| `sprtTableName` | String |
| `rebuildHierarchyFunction` | String |
| `getSubordinatesFunction` | String |
| `getManagersFunction` | String |
| `isManagerOfFunction` | String |
| `createdAt` | Datetime |
| `chartEdgesTableNameTrgmSimilarity` | Float |
| `hierarchySprtTableNameTrgmSimilarity` | Float |
| `chartEdgeGrantsTableNameTrgmSimilarity` | Float |
| `prefixTrgmSimilarity` | Float |
| `privateSchemaNameTrgmSimilarity` | Float |
| `sprtTableNameTrgmSimilarity` | Float |
| `rebuildHierarchyFunctionTrgmSimilarity` | Float |
| `getSubordinatesFunctionTrgmSimilarity` | Float |
| `getManagersFunctionTrgmSimilarity` | Float |
| `isManagerOfFunctionTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `databaseId`, `entityTableId`, `usersTableId`, `chartEdgesTableNameTrgmSimilarity`, `hierarchySprtTableNameTrgmSimilarity`, `chartEdgeGrantsTableNameTrgmSimilarity`, `prefixTrgmSimilarity`, `privateSchemaNameTrgmSimilarity`, `sprtTableNameTrgmSimilarity`, `rebuildHierarchyFunctionTrgmSimilarity`, `getSubordinatesFunctionTrgmSimilarity`, `getManagersFunctionTrgmSimilarity`, `isManagerOfFunctionTrgmSimilarity`, `searchScore`
**Optional create fields (backend defaults):** `schemaId`, `privateSchemaId`, `chartEdgesTableId`, `chartEdgesTableName`, `hierarchySprtTableId`, `hierarchySprtTableName`, `chartEdgeGrantsTableId`, `chartEdgeGrantsTableName`, `prefix`, `privateSchemaName`, `sprtTableName`, `rebuildHierarchyFunction`, `getSubordinatesFunction`, `getManagersFunction`, `isManagerOfFunction`

## Custom Operations

### `current-user-id`

currentUserId

- **Type:** query
- **Arguments:** none

### `current-ip-address`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `current-user-agent`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `app-permissions-get-padded-mask`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--mask` | BitString |

### `org-permissions-get-padded-mask`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--mask` | BitString |

### `steps-achieved`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--vlevel` | String |
  | `--vroleId` | UUID |

### `rev-parse`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--dbId` | UUID |
  | `--storeId` | UUID |
  | `--refname` | String |

### `org-is-manager-of`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--pEntityId` | UUID |
  | `--pManagerId` | UUID |
  | `--pUserId` | UUID |
  | `--pMaxDepth` | Int |

### `app-permissions-get-mask`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--ids` | UUID |

### `org-permissions-get-mask`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--ids` | UUID |

### `app-permissions-get-mask-by-names`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--names` | String |

### `org-permissions-get-mask-by-names`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--names` | String |

### `app-permissions-get-by-mask`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--mask` | BitString |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `org-permissions-get-by-mask`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--mask` | BitString |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `get-all-objects-from-root`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--id` | UUID |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `get-path-objects-from-root`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--id` | UUID |
  | `--path` | String |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `get-object-at-path`

getObjectAtPath

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--dbId` | UUID |
  | `--storeId` | UUID |
  | `--path` | String |
  | `--refname` | String |

### `steps-required`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--vlevel` | String |
  | `--vroleId` | UUID |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `current-user`

currentUser

- **Type:** query
- **Arguments:** none

### `sign-out`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `send-account-deletion-email`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `check-password`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.password` | String |

### `submit-invite-code`

submitInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.token` | String |

### `submit-org-invite-code`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.token` | String |

### `freeze-objects`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.id` | UUID |

### `init-empty-repo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |

### `confirm-delete-account`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.userId` | UUID |
  | `--input.token` | String |

### `set-password`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.currentPassword` | String |
  | `--input.newPassword` | String |

### `verify-email`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.emailId` | UUID |
  | `--input.token` | String |

### `reset-password`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.roleId` | UUID |
  | `--input.resetToken` | String |
  | `--input.newPassword` | String |

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

### `remove-node-at-path`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |

### `set-data-at-path`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |

### `set-props-and-commit`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |
  | `--input.refname` | String |
  | `--input.path` | String |
  | `--input.data` | JSON |

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
  | `--input.pModules` | String |
  | `--input.pOptions` | JSON |

### `sign-in-one-time-token`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.token` | String |
  | `--input.credentialKind` | String |

### `create-user-database`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include levels/achievements (default: false)
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

### `extend-token-expires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.amount` | IntervalInput |

### `sign-in`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |

### `sign-up`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |

### `set-field-order`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.fieldIds` | UUID |

### `one-time-token`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.origin` | Origin |
  | `--input.rememberMe` | Boolean |

### `insert-node-at-path`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

### `update-node-at-path`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

### `set-and-commit`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |
  | `--input.refname` | String |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

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

### `forgot-password`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `send-verification-email`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `verify-password`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.password` | String (required) |

### `verify-totp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.totpValue` | String (required) |

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
