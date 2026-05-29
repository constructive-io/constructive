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
| `app-permission` | appPermission CRUD operations |
| `org-permission` | orgPermission CRUD operations |
| `app-limit-credit-redemption` | appLimitCreditRedemption CRUD operations |
| `app-limit-credit-code-item` | appLimitCreditCodeItem CRUD operations |
| `app-limit-credit` | appLimitCredit CRUD operations |
| `org-member` | orgMember CRUD operations |
| `app-permission-default` | appPermissionDefault CRUD operations |
| `app-admin-grant` | appAdminGrant CRUD operations |
| `app-owner-grant` | appOwnerGrant CRUD operations |
| `org-permission-default` | orgPermissionDefault CRUD operations |
| `app-membership-default` | appMembershipDefault CRUD operations |
| `org-admin-grant` | orgAdminGrant CRUD operations |
| `org-membership-default` | orgMembershipDefault CRUD operations |
| `org-owner-grant` | orgOwnerGrant CRUD operations |
| `app-limit-caps-default` | appLimitCapsDefault CRUD operations |
| `org-limit-caps-default` | orgLimitCapsDefault CRUD operations |
| `app-limit-cap` | appLimitCap CRUD operations |
| `org-limit-cap` | orgLimitCap CRUD operations |
| `org-chart-edge` | orgChartEdge CRUD operations |
| `app-limit-default` | appLimitDefault CRUD operations |
| `org-limit-default` | orgLimitDefault CRUD operations |
| `org-limit-credit` | orgLimitCredit CRUD operations |
| `app-limit-credit-code` | appLimitCreditCode CRUD operations |
| `app-limit-warning` | appLimitWarning CRUD operations |
| `org-chart-edge-grant` | orgChartEdgeGrant CRUD operations |
| `app-claimed-invite` | appClaimedInvite CRUD operations |
| `org-limit-warning` | orgLimitWarning CRUD operations |
| `membership-type` | membershipType CRUD operations |
| `app-grant` | appGrant CRUD operations |
| `org-claimed-invite` | orgClaimedInvite CRUD operations |
| `org-grant` | orgGrant CRUD operations |
| `org-membership-setting` | orgMembershipSetting CRUD operations |
| `app-limit-event` | appLimitEvent CRUD operations |
| `org-limit-event` | orgLimitEvent CRUD operations |
| `app-membership` | appMembership CRUD operations |
| `org-membership` | orgMembership CRUD operations |
| `org-member-profile` | orgMemberProfile CRUD operations |
| `app-invite` | appInvite CRUD operations |
| `app-limit` | appLimit CRUD operations |
| `org-limit-aggregate` | orgLimitAggregate CRUD operations |
| `org-limit` | orgLimit CRUD operations |
| `org-invite` | orgInvite CRUD operations |
| `app-permissions-get-padded-mask` | appPermissionsGetPaddedMask |
| `org-permissions-get-padded-mask` | orgPermissionsGetPaddedMask |
| `org-is-manager-of` | orgIsManagerOf |
| `app-permissions-get-mask` | appPermissionsGetMask |
| `org-permissions-get-mask` | orgPermissionsGetMask |
| `app-permissions-get-mask-by-names` | appPermissionsGetMaskByNames |
| `org-permissions-get-mask-by-names` | orgPermissionsGetMaskByNames |
| `app-permissions-get-by-mask` | Reads and enables pagination through a set of `AppPermission`. |
| `org-permissions-get-by-mask` | Reads and enables pagination through a set of `OrgPermission`. |
| `submit-app-invite-code` | submitAppInviteCode |
| `submit-org-invite-code` | submitOrgInviteCode |
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

### `org-get-managers-record`

CRUD operations for OrgGetManagersRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgGetManagersRecord records |
| `find-first` | Find first matching orgGetManagersRecord record |
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
| `find-first` | Find first matching orgGetSubordinatesRecord record |
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

### `app-permission`

CRUD operations for AppPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermission records |
| `find-first` | Find first matching appPermission record |
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

**Optional create fields (backend defaults):** `name`, `bitnum`, `bitstr`, `description`

### `org-permission`

CRUD operations for OrgPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermission records |
| `find-first` | Find first matching orgPermission record |
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

**Optional create fields (backend defaults):** `name`, `bitnum`, `bitstr`, `description`

### `app-limit-credit-redemption`

CRUD operations for AppLimitCreditRedemption records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCreditRedemption records |
| `find-first` | Find first matching appLimitCreditRedemption record |
| `get` | Get a appLimitCreditRedemption by id |
| `create` | Create a new appLimitCreditRedemption |
| `update` | Update an existing appLimitCreditRedemption |
| `delete` | Delete a appLimitCreditRedemption |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `creditCodeId` | UUID |
| `entityId` | UUID |

**Required create fields:** `creditCodeId`, `entityId`

### `app-limit-credit-code-item`

CRUD operations for AppLimitCreditCodeItem records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCreditCodeItem records |
| `find-first` | Find first matching appLimitCreditCodeItem record |
| `get` | Get a appLimitCreditCodeItem by id |
| `create` | Create a new appLimitCreditCodeItem |
| `update` | Update an existing appLimitCreditCodeItem |
| `delete` | Delete a appLimitCreditCodeItem |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `creditCodeId` | UUID |
| `defaultLimitId` | UUID |
| `amount` | BigInt |
| `creditType` | String |

**Required create fields:** `creditCodeId`, `defaultLimitId`, `amount`
**Optional create fields (backend defaults):** `creditType`

### `app-limit-credit`

CRUD operations for AppLimitCredit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCredit records |
| `find-first` | Find first matching appLimitCredit record |
| `get` | Get a appLimitCredit by id |
| `create` | Create a new appLimitCredit |
| `update` | Update an existing appLimitCredit |
| `delete` | Delete a appLimitCredit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `defaultLimitId` | UUID |
| `actorId` | UUID |
| `amount` | BigInt |
| `creditType` | String |
| `reason` | String |

**Required create fields:** `defaultLimitId`, `amount`
**Optional create fields (backend defaults):** `actorId`, `creditType`, `reason`

### `org-member`

CRUD operations for OrgMember records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMember records |
| `find-first` | Find first matching orgMember record |
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

### `app-permission-default`

CRUD operations for AppPermissionDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermissionDefault records |
| `find-first` | Find first matching appPermissionDefault record |
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

### `app-admin-grant`

CRUD operations for AppAdminGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appAdminGrant records |
| `find-first` | Find first matching appAdminGrant record |
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
| `find-first` | Find first matching appOwnerGrant record |
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

### `org-permission-default`

CRUD operations for OrgPermissionDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermissionDefault records |
| `find-first` | Find first matching orgPermissionDefault record |
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

### `app-membership-default`

CRUD operations for AppMembershipDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appMembershipDefault records |
| `find-first` | Find first matching appMembershipDefault record |
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

### `org-admin-grant`

CRUD operations for OrgAdminGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgAdminGrant records |
| `find-first` | Find first matching orgAdminGrant record |
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

### `org-membership-default`

CRUD operations for OrgMembershipDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMembershipDefault records |
| `find-first` | Find first matching orgMembershipDefault record |
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

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`

### `org-owner-grant`

CRUD operations for OrgOwnerGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgOwnerGrant records |
| `find-first` | Find first matching orgOwnerGrant record |
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

### `app-limit-caps-default`

CRUD operations for AppLimitCapsDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCapsDefault records |
| `find-first` | Find first matching appLimitCapsDefault record |
| `get` | Get a appLimitCapsDefault by id |
| `create` | Create a new appLimitCapsDefault |
| `update` | Update an existing appLimitCapsDefault |
| `delete` | Delete a appLimitCapsDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | BigInt |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

### `org-limit-caps-default`

CRUD operations for OrgLimitCapsDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitCapsDefault records |
| `find-first` | Find first matching orgLimitCapsDefault record |
| `get` | Get a orgLimitCapsDefault by id |
| `create` | Create a new orgLimitCapsDefault |
| `update` | Update an existing orgLimitCapsDefault |
| `delete` | Delete a orgLimitCapsDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | BigInt |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

### `app-limit-cap`

CRUD operations for AppLimitCap records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCap records |
| `find-first` | Find first matching appLimitCap record |
| `get` | Get a appLimitCap by id |
| `create` | Create a new appLimitCap |
| `update` | Update an existing appLimitCap |
| `delete` | Delete a appLimitCap |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `entityId` | UUID |
| `max` | BigInt |

**Required create fields:** `name`, `entityId`
**Optional create fields (backend defaults):** `max`

### `org-limit-cap`

CRUD operations for OrgLimitCap records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitCap records |
| `find-first` | Find first matching orgLimitCap record |
| `get` | Get a orgLimitCap by id |
| `create` | Create a new orgLimitCap |
| `update` | Update an existing orgLimitCap |
| `delete` | Delete a orgLimitCap |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `entityId` | UUID |
| `max` | BigInt |

**Required create fields:** `name`, `entityId`
**Optional create fields (backend defaults):** `max`

### `org-chart-edge`

CRUD operations for OrgChartEdge records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgChartEdge records |
| `find-first` | Find first matching orgChartEdge record |
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

**Required create fields:** `entityId`, `childId`
**Optional create fields (backend defaults):** `parentId`, `positionTitle`, `positionLevel`

### `app-limit-default`

CRUD operations for AppLimitDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitDefault records |
| `find-first` | Find first matching appLimitDefault record |
| `get` | Get a appLimitDefault by id |
| `create` | Create a new appLimitDefault |
| `update` | Update an existing appLimitDefault |
| `delete` | Delete a appLimitDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | BigInt |
| `softMax` | BigInt |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`, `softMax`

### `org-limit-default`

CRUD operations for OrgLimitDefault records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitDefault records |
| `find-first` | Find first matching orgLimitDefault record |
| `get` | Get a orgLimitDefault by id |
| `create` | Create a new orgLimitDefault |
| `update` | Update an existing orgLimitDefault |
| `delete` | Delete a orgLimitDefault |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `max` | BigInt |
| `softMax` | BigInt |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`, `softMax`

### `org-limit-credit`

CRUD operations for OrgLimitCredit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitCredit records |
| `find-first` | Find first matching orgLimitCredit record |
| `get` | Get a orgLimitCredit by id |
| `create` | Create a new orgLimitCredit |
| `update` | Update an existing orgLimitCredit |
| `delete` | Delete a orgLimitCredit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `defaultLimitId` | UUID |
| `actorId` | UUID |
| `entityId` | UUID |
| `amount` | BigInt |
| `creditType` | String |
| `reason` | String |

**Required create fields:** `defaultLimitId`, `amount`
**Optional create fields (backend defaults):** `actorId`, `entityId`, `creditType`, `reason`

### `app-limit-credit-code`

CRUD operations for AppLimitCreditCode records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitCreditCode records |
| `find-first` | Find first matching appLimitCreditCode record |
| `get` | Get a appLimitCreditCode by id |
| `create` | Create a new appLimitCreditCode |
| `update` | Update an existing appLimitCreditCode |
| `delete` | Delete a appLimitCreditCode |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `code` | String |
| `maxRedemptions` | Int |
| `currentRedemptions` | Int |
| `expiresAt` | Datetime |

**Required create fields:** `code`
**Optional create fields (backend defaults):** `maxRedemptions`, `currentRedemptions`, `expiresAt`

### `app-limit-warning`

CRUD operations for AppLimitWarning records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitWarning records |
| `find-first` | Find first matching appLimitWarning record |
| `get` | Get a appLimitWarning by id |
| `create` | Create a new appLimitWarning |
| `update` | Update an existing appLimitWarning |
| `delete` | Delete a appLimitWarning |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `warningType` | String |
| `thresholdValue` | BigInt |
| `taskIdentifier` | String |

**Required create fields:** `name`, `warningType`, `thresholdValue`, `taskIdentifier`

### `org-chart-edge-grant`

CRUD operations for OrgChartEdgeGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgChartEdgeGrant records |
| `find-first` | Find first matching orgChartEdgeGrant record |
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

**Required create fields:** `entityId`, `childId`
**Optional create fields (backend defaults):** `parentId`, `grantorId`, `isGrant`, `positionTitle`, `positionLevel`

### `app-claimed-invite`

CRUD operations for AppClaimedInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appClaimedInvite records |
| `find-first` | Find first matching appClaimedInvite record |
| `get` | Get a appClaimedInvite by id |
| `create` | Create a new appClaimedInvite |
| `update` | Update an existing appClaimedInvite |
| `delete` | Delete a appClaimedInvite |

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

### `org-limit-warning`

CRUD operations for OrgLimitWarning records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitWarning records |
| `find-first` | Find first matching orgLimitWarning record |
| `get` | Get a orgLimitWarning by id |
| `create` | Create a new orgLimitWarning |
| `update` | Update an existing orgLimitWarning |
| `delete` | Delete a orgLimitWarning |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `warningType` | String |
| `thresholdValue` | BigInt |
| `taskIdentifier` | String |
| `entityId` | UUID |

**Required create fields:** `name`, `warningType`, `thresholdValue`, `taskIdentifier`
**Optional create fields (backend defaults):** `entityId`

### `membership-type`

CRUD operations for MembershipType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all membershipType records |
| `find-first` | Find first matching membershipType record |
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
| `parentMembershipType` | Int |
| `hasUsersTableEntry` | Boolean |

**Required create fields:** `name`, `description`, `prefix`
**Optional create fields (backend defaults):** `parentMembershipType`, `hasUsersTableEntry`

### `app-grant`

CRUD operations for AppGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appGrant records |
| `find-first` | Find first matching appGrant record |
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

### `org-claimed-invite`

CRUD operations for OrgClaimedInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgClaimedInvite records |
| `find-first` | Find first matching orgClaimedInvite record |
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

### `org-grant`

CRUD operations for OrgGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgGrant records |
| `find-first` | Find first matching orgGrant record |
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

### `org-membership-setting`

CRUD operations for OrgMembershipSetting records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMembershipSetting records |
| `find-first` | Find first matching orgMembershipSetting record |
| `get` | Get a orgMembershipSetting by id |
| `create` | Create a new orgMembershipSetting |
| `update` | Update an existing orgMembershipSetting |
| `delete` | Delete a orgMembershipSetting |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `entityId` | UUID |
| `deleteMemberCascadeChildren` | Boolean |
| `createChildCascadeOwners` | Boolean |
| `createChildCascadeAdmins` | Boolean |
| `createChildCascadeMembers` | Boolean |
| `allowExternalMembers` | Boolean |
| `inviteProfileAssignmentMode` | String |
| `populateMemberEmail` | Boolean |
| `limitAllocationMode` | String |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `deleteMemberCascadeChildren`, `createChildCascadeOwners`, `createChildCascadeAdmins`, `createChildCascadeMembers`, `allowExternalMembers`, `inviteProfileAssignmentMode`, `populateMemberEmail`, `limitAllocationMode`

### `app-limit-event`

CRUD operations for AppLimitEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimitEvent records |
| `find-first` | Find first matching appLimitEvent record |
| `get` | Get a appLimitEvent by id |
| `create` | Create a new appLimitEvent |
| `update` | Update an existing appLimitEvent |
| `delete` | Delete a appLimitEvent |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `name` | String |
| `actorId` | UUID |
| `entityId` | UUID |
| `organizationId` | UUID |
| `entityType` | String |
| `eventType` | String |
| `delta` | BigInt |
| `numBefore` | BigInt |
| `numAfter` | BigInt |
| `maxAtEvent` | BigInt |
| `reason` | String |

**Optional create fields (backend defaults):** `name`, `actorId`, `entityId`, `organizationId`, `entityType`, `eventType`, `delta`, `numBefore`, `numAfter`, `maxAtEvent`, `reason`

### `org-limit-event`

CRUD operations for OrgLimitEvent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitEvent records |
| `find-first` | Find first matching orgLimitEvent record |
| `get` | Get a orgLimitEvent by id |
| `create` | Create a new orgLimitEvent |
| `update` | Update an existing orgLimitEvent |
| `delete` | Delete a orgLimitEvent |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `name` | String |
| `actorId` | UUID |
| `entityId` | UUID |
| `organizationId` | UUID |
| `entityType` | String |
| `eventType` | String |
| `delta` | BigInt |
| `numBefore` | BigInt |
| `numAfter` | BigInt |
| `maxAtEvent` | BigInt |
| `reason` | String |

**Optional create fields (backend defaults):** `name`, `actorId`, `entityId`, `organizationId`, `entityType`, `eventType`, `delta`, `numBefore`, `numAfter`, `maxAtEvent`, `reason`

### `app-membership`

CRUD operations for AppMembership records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appMembership records |
| `find-first` | Find first matching appMembership record |
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

### `org-membership`

CRUD operations for OrgMembership records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMembership records |
| `find-first` | Find first matching orgMembership record |
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
| `isExternal` | Boolean |
| `isOwner` | Boolean |
| `isAdmin` | Boolean |
| `permissions` | BitString |
| `granted` | BitString |
| `actorId` | UUID |
| `entityId` | UUID |
| `isReadOnly` | Boolean |
| `profileId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `isBanned`, `isDisabled`, `isActive`, `isExternal`, `isOwner`, `isAdmin`, `permissions`, `granted`, `isReadOnly`, `profileId`

### `org-member-profile`

CRUD operations for OrgMemberProfile records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgMemberProfile records |
| `find-first` | Find first matching orgMemberProfile record |
| `get` | Get a orgMemberProfile by id |
| `create` | Create a new orgMemberProfile |
| `update` | Update an existing orgMemberProfile |
| `delete` | Delete a orgMemberProfile |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `membershipId` | UUID |
| `entityId` | UUID |
| `actorId` | UUID |
| `displayName` | String |
| `email` | String |
| `title` | String |
| `bio` | String |
| `profilePicture` | Image |

**Required create fields:** `membershipId`, `entityId`, `actorId`
**Optional create fields (backend defaults):** `displayName`, `email`, `title`, `bio`, `profilePicture`

### `app-invite`

CRUD operations for AppInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appInvite records |
| `find-first` | Find first matching appInvite record |
| `get` | Get a appInvite by id |
| `create` | Create a new appInvite |
| `update` | Update an existing appInvite |
| `delete` | Delete a appInvite |

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
| `profileId` | UUID |
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `email`, `senderId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `profileId`, `expiresAt`

### `app-limit`

CRUD operations for AppLimit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLimit records |
| `find-first` | Find first matching appLimit record |
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
| `num` | BigInt |
| `max` | BigInt |
| `softMax` | BigInt |
| `windowStart` | Datetime |
| `windowDuration` | Interval |
| `planMax` | BigInt |
| `purchasedCredits` | BigInt |
| `periodCredits` | BigInt |
| `organizationId` | UUID |
| `entityType` | String |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `name`, `num`, `max`, `softMax`, `windowStart`, `windowDuration`, `planMax`, `purchasedCredits`, `periodCredits`, `organizationId`, `entityType`

### `org-limit-aggregate`

CRUD operations for OrgLimitAggregate records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimitAggregate records |
| `find-first` | Find first matching orgLimitAggregate record |
| `get` | Get a orgLimitAggregate by id |
| `create` | Create a new orgLimitAggregate |
| `update` | Update an existing orgLimitAggregate |
| `delete` | Delete a orgLimitAggregate |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `entityId` | UUID |
| `num` | BigInt |
| `max` | BigInt |
| `softMax` | BigInt |
| `windowStart` | Datetime |
| `windowDuration` | Interval |
| `planMax` | BigInt |
| `purchasedCredits` | BigInt |
| `periodCredits` | BigInt |
| `reserved` | BigInt |
| `organizationId` | UUID |
| `entityType` | String |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `name`, `num`, `max`, `softMax`, `windowStart`, `windowDuration`, `planMax`, `purchasedCredits`, `periodCredits`, `reserved`, `organizationId`, `entityType`

### `org-limit`

CRUD operations for OrgLimit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgLimit records |
| `find-first` | Find first matching orgLimit record |
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
| `num` | BigInt |
| `max` | BigInt |
| `softMax` | BigInt |
| `windowStart` | Datetime |
| `windowDuration` | Interval |
| `planMax` | BigInt |
| `purchasedCredits` | BigInt |
| `periodCredits` | BigInt |
| `entityId` | UUID |
| `organizationId` | UUID |
| `entityType` | String |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `name`, `num`, `max`, `softMax`, `windowStart`, `windowDuration`, `planMax`, `purchasedCredits`, `periodCredits`, `organizationId`, `entityType`

### `org-invite`

CRUD operations for OrgInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgInvite records |
| `find-first` | Find first matching orgInvite record |
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
| `profileId` | UUID |
| `isReadOnly` | Boolean |
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `entityId` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `email`, `senderId`, `receiverId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `profileId`, `isReadOnly`, `expiresAt`

## Custom Operations

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

### `submit-app-invite-code`

submitAppInviteCode

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
