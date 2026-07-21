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
| `app-admin-grant` | appAdminGrant CRUD operations |
| `app-claimed-invite` | appClaimedInvite CRUD operations |
| `app-grant` | appGrant CRUD operations |
| `app-invite` | appInvite CRUD operations |
| `app-membership` | appMembership CRUD operations |
| `app-membership-default` | appMembershipDefault CRUD operations |
| `app-owner-grant` | appOwnerGrant CRUD operations |
| `app-permission` | appPermission CRUD operations |
| `app-permission-default` | appPermissionDefault CRUD operations |
| `app-permission-default-grant` | appPermissionDefaultGrant CRUD operations |
| `app-permission-default-permission` | appPermissionDefaultPermission CRUD operations |
| `membership-type` | membershipType CRUD operations |
| `org-admin-grant` | orgAdminGrant CRUD operations |
| `org-chart-edge` | orgChartEdge CRUD operations |
| `org-chart-edge-grant` | orgChartEdgeGrant CRUD operations |
| `org-claimed-invite` | orgClaimedInvite CRUD operations |
| `org-get-managers-record` | orgGetManagersRecord CRUD operations |
| `org-get-subordinates-record` | orgGetSubordinatesRecord CRUD operations |
| `org-grant` | orgGrant CRUD operations |
| `org-invite` | orgInvite CRUD operations |
| `org-member` | orgMember CRUD operations |
| `org-member-profile` | orgMemberProfile CRUD operations |
| `org-membership` | orgMembership CRUD operations |
| `org-membership-default` | orgMembershipDefault CRUD operations |
| `org-membership-setting` | orgMembershipSetting CRUD operations |
| `org-owner-grant` | orgOwnerGrant CRUD operations |
| `org-permission` | orgPermission CRUD operations |
| `org-permission-default` | orgPermissionDefault CRUD operations |
| `org-permission-default-grant` | orgPermissionDefaultGrant CRUD operations |
| `org-permission-default-permission` | orgPermissionDefaultPermission CRUD operations |
| `app-permissions-get-by-mask` | Reads and enables pagination through a set of `AppPermission`. |
| `app-permissions-get-mask` | appPermissionsGetMask |
| `app-permissions-get-mask-by-names` | appPermissionsGetMaskByNames |
| `app-permissions-get-padded-mask` | appPermissionsGetPaddedMask |
| `org-is-manager-of` | orgIsManagerOf |
| `org-permissions-get-by-mask` | Reads and enables pagination through a set of `OrgPermission`. |
| `org-permissions-get-mask` | orgPermissionsGetMask |
| `org-permissions-get-mask-by-names` | orgPermissionsGetMaskByNames |
| `org-permissions-get-padded-mask` | orgPermissionsGetPaddedMask |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `submit-app-invite-code` | submitAppInviteCode |
| `submit-org-invite-code` | submitOrgInviteCode |

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`

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
| `createdAt` | Datetime |
| `data` | JSON |
| `id` | UUID |
| `receiverId` | UUID |
| `senderId` | UUID |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `data`, `receiverId`, `senderId`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `permissions` | BitString |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`, `permissions`

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
| `channel` | String |
| `createdAt` | Datetime |
| `data` | JSON |
| `email` | Email |
| `expiresAt` | Datetime |
| `id` | UUID |
| `inviteCount` | Int |
| `inviteLimit` | Int |
| `inviteToken` | String |
| `inviteValid` | Boolean |
| `multiple` | Boolean |
| `phone` | String |
| `profileId` | UUID |
| `senderId` | UUID |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `channel`, `data`, `email`, `expiresAt`, `inviteCount`, `inviteLimit`, `inviteToken`, `inviteValid`, `multiple`, `phone`, `profileId`, `senderId`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `granted` | BitString |
| `id` | UUID |
| `isActive` | Boolean |
| `isAdmin` | Boolean |
| `isApproved` | Boolean |
| `isBanned` | Boolean |
| `isDisabled` | Boolean |
| `isOwner` | Boolean |
| `isVerified` | Boolean |
| `permissions` | BitString |
| `profileId` | UUID |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `createdBy`, `granted`, `isActive`, `isAdmin`, `isApproved`, `isBanned`, `isDisabled`, `isOwner`, `isVerified`, `permissions`, `profileId`, `updatedBy`

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
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `id` | UUID |
| `isApproved` | Boolean |
| `isVerified` | Boolean |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Optional create fields (backend defaults):** `createdBy`, `isApproved`, `isVerified`, `updatedBy`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`

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
| `bitnum` | Int |
| `bitstr` | BitString |
| `description` | String |
| `id` | UUID |
| `name` | String |

**Optional create fields (backend defaults):** `bitnum`, `bitstr`, `description`, `name`

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

### `app-permission-default-grant`

CRUD operations for AppPermissionDefaultGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermissionDefaultGrant records |
| `find-first` | Find first matching appPermissionDefaultGrant record |
| `get` | Get a appPermissionDefaultGrant by id |
| `create` | Create a new appPermissionDefaultGrant |
| `update` | Update an existing appPermissionDefaultGrant |
| `delete` | Delete a appPermissionDefaultGrant |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `permissionId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `permissionId`
**Optional create fields (backend defaults):** `grantorId`, `isGrant`

### `app-permission-default-permission`

CRUD operations for AppPermissionDefaultPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appPermissionDefaultPermission records |
| `find-first` | Find first matching appPermissionDefaultPermission record |
| `get` | Get a appPermissionDefaultPermission by id |
| `create` | Create a new appPermissionDefaultPermission |
| `update` | Update an existing appPermissionDefaultPermission |
| `delete` | Delete a appPermissionDefaultPermission |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `id` | UUID |
| `permissionId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `permissionId`

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
| `description` | String |
| `hasUsersTableEntry` | Boolean |
| `id` | Int |
| `name` | String |
| `parentMembershipType` | Int |
| `scope` | String |

**Required create fields:** `description`, `name`, `scope`
**Optional create fields (backend defaults):** `hasUsersTableEntry`, `parentMembershipType`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `entityId` | UUID |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`

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
| `childId` | UUID |
| `createdAt` | Datetime |
| `entityId` | UUID |
| `id` | UUID |
| `parentId` | UUID |
| `positionLevel` | Int |
| `positionTitle` | String |
| `updatedAt` | Datetime |

**Required create fields:** `childId`, `entityId`
**Optional create fields (backend defaults):** `parentId`, `positionLevel`, `positionTitle`

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
| `childId` | UUID |
| `createdAt` | Datetime |
| `entityId` | UUID |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `parentId` | UUID |
| `positionLevel` | Int |
| `positionTitle` | String |

**Required create fields:** `childId`, `entityId`
**Optional create fields (backend defaults):** `grantorId`, `isGrant`, `parentId`, `positionLevel`, `positionTitle`

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
| `createdAt` | Datetime |
| `data` | JSON |
| `entityId` | UUID |
| `id` | UUID |
| `receiverId` | UUID |
| `senderId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `data`, `receiverId`, `senderId`

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
| `depth` | Int |
| `userId` | UUID |

**Required create fields:** `depth`, `userId`

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
| `depth` | Int |
| `userId` | UUID |

**Required create fields:** `depth`, `userId`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `entityId` | UUID |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `permissions` | BitString |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`, `permissions`

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
| `channel` | String |
| `createdAt` | Datetime |
| `data` | JSON |
| `email` | Email |
| `entityId` | UUID |
| `expiresAt` | Datetime |
| `id` | UUID |
| `inviteCount` | Int |
| `inviteLimit` | Int |
| `inviteToken` | String |
| `inviteValid` | Boolean |
| `isReadOnly` | Boolean |
| `multiple` | Boolean |
| `phone` | String |
| `profileId` | UUID |
| `receiverId` | UUID |
| `senderId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `channel`, `data`, `email`, `expiresAt`, `inviteCount`, `inviteLimit`, `inviteToken`, `inviteValid`, `isReadOnly`, `multiple`, `phone`, `profileId`, `receiverId`, `senderId`

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
| `actorId` | UUID |
| `entityId` | UUID |
| `id` | UUID |
| `isAdmin` | Boolean |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `isAdmin`

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
| `actorId` | UUID |
| `bio` | String |
| `createdAt` | Datetime |
| `displayName` | String |
| `email` | String |
| `entityId` | UUID |
| `id` | UUID |
| `membershipId` | UUID |
| `profilePicture` | Image |
| `title` | String |
| `updatedAt` | Datetime |

**Required create fields:** `actorId`, `entityId`, `membershipId`
**Optional create fields (backend defaults):** `bio`, `displayName`, `email`, `profilePicture`, `title`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `entityId` | UUID |
| `granted` | BitString |
| `id` | UUID |
| `isActive` | Boolean |
| `isAdmin` | Boolean |
| `isApproved` | Boolean |
| `isBanned` | Boolean |
| `isDisabled` | Boolean |
| `isExternal` | Boolean |
| `isOwner` | Boolean |
| `isReadOnly` | Boolean |
| `permissions` | BitString |
| `profileId` | UUID |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `createdBy`, `granted`, `isActive`, `isAdmin`, `isApproved`, `isBanned`, `isDisabled`, `isExternal`, `isOwner`, `isReadOnly`, `permissions`, `profileId`, `updatedBy`

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
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `entityId` | UUID |
| `id` | UUID |
| `isApproved` | Boolean |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `createdBy`, `isApproved`, `updatedBy`

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
| `allowExternalMembers` | Boolean |
| `createChildCascadeAdmins` | Boolean |
| `createChildCascadeMembers` | Boolean |
| `createChildCascadeOwners` | Boolean |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `deleteMemberCascadeChildren` | Boolean |
| `entityId` | UUID |
| `id` | UUID |
| `inviteProfileAssignmentMode` | String |
| `limitAllocationMode` | String |
| `populateMemberEmail` | Boolean |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `allowExternalMembers`, `createChildCascadeAdmins`, `createChildCascadeMembers`, `createChildCascadeOwners`, `createdBy`, `deleteMemberCascadeChildren`, `inviteProfileAssignmentMode`, `limitAllocationMode`, `populateMemberEmail`, `updatedBy`

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
| `actorId` | UUID |
| `createdAt` | Datetime |
| `entityId` | UUID |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `actorId`, `grantorId`, `isGrant`

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
| `bitnum` | Int |
| `bitstr` | BitString |
| `description` | String |
| `id` | UUID |
| `name` | String |

**Optional create fields (backend defaults):** `bitnum`, `bitstr`, `description`, `name`

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
| `entityId` | UUID |
| `id` | UUID |
| `permissions` | BitString |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `permissions`

### `org-permission-default-grant`

CRUD operations for OrgPermissionDefaultGrant records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermissionDefaultGrant records |
| `find-first` | Find first matching orgPermissionDefaultGrant record |
| `get` | Get a orgPermissionDefaultGrant by id |
| `create` | Create a new orgPermissionDefaultGrant |
| `update` | Update an existing orgPermissionDefaultGrant |
| `delete` | Delete a orgPermissionDefaultGrant |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `entityId` | UUID |
| `grantorId` | UUID |
| `id` | UUID |
| `isGrant` | Boolean |
| `permissionId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`, `permissionId`
**Optional create fields (backend defaults):** `grantorId`, `isGrant`

### `org-permission-default-permission`

CRUD operations for OrgPermissionDefaultPermission records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgPermissionDefaultPermission records |
| `find-first` | Find first matching orgPermissionDefaultPermission record |
| `get` | Get a orgPermissionDefaultPermission by id |
| `create` | Create a new orgPermissionDefaultPermission |
| `update` | Update an existing orgPermissionDefaultPermission |
| `delete` | Delete a orgPermissionDefaultPermission |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `entityId` | UUID |
| `id` | UUID |
| `permissionId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`, `permissionId`

## Custom Operations

### `app-permissions-get-by-mask`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--after` | Cursor |
  | `--first` | Int |
  | `--mask` | BitString |
  | `--offset` | Int |

### `app-permissions-get-mask`

appPermissionsGetMask

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

### `app-permissions-get-padded-mask`

appPermissionsGetPaddedMask

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
  | `--managerId` | UUID |
  | `--maxDepth` | Int |
  | `--targetEntityId` | UUID |
  | `--userId` | UUID |

### `org-permissions-get-by-mask`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--after` | Cursor |
  | `--first` | Int |
  | `--mask` | BitString |
  | `--offset` | Int |

### `org-permissions-get-mask`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--ids` | UUID |

### `org-permissions-get-mask-by-names`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--names` | String |

### `org-permissions-get-padded-mask`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--mask` | BitString |

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
