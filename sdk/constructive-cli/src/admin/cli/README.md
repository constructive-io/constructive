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
| `app-level-requirement` | appLevelRequirement CRUD operations |
| `org-member` | orgMember CRUD operations |
| `app-permission-default` | appPermissionDefault CRUD operations |
| `org-permission-default` | orgPermissionDefault CRUD operations |
| `app-admin-grant` | appAdminGrant CRUD operations |
| `app-owner-grant` | appOwnerGrant CRUD operations |
| `app-limit-default` | appLimitDefault CRUD operations |
| `org-limit-default` | orgLimitDefault CRUD operations |
| `org-admin-grant` | orgAdminGrant CRUD operations |
| `org-owner-grant` | orgOwnerGrant CRUD operations |
| `membership-type` | membershipType CRUD operations |
| `app-limit` | appLimit CRUD operations |
| `app-achievement` | appAchievement CRUD operations |
| `app-step` | appStep CRUD operations |
| `claimed-invite` | claimedInvite CRUD operations |
| `org-chart-edge-grant` | orgChartEdgeGrant CRUD operations |
| `org-limit` | orgLimit CRUD operations |
| `app-grant` | appGrant CRUD operations |
| `app-membership-default` | appMembershipDefault CRUD operations |
| `org-claimed-invite` | orgClaimedInvite CRUD operations |
| `org-grant` | orgGrant CRUD operations |
| `org-chart-edge` | orgChartEdge CRUD operations |
| `org-membership-default` | orgMembershipDefault CRUD operations |
| `app-level` | appLevel CRUD operations |
| `invite` | invite CRUD operations |
| `app-membership` | appMembership CRUD operations |
| `org-membership` | orgMembership CRUD operations |
| `org-invite` | orgInvite CRUD operations |
| `app-permissions-get-padded-mask` | appPermissionsGetPaddedMask |
| `org-permissions-get-padded-mask` | orgPermissionsGetPaddedMask |
| `org-is-manager-of` | orgIsManagerOf |
| `app-permissions-get-mask` | appPermissionsGetMask |
| `org-permissions-get-mask` | orgPermissionsGetMask |
| `steps-achieved` | stepsAchieved |
| `app-permissions-get-mask-by-names` | appPermissionsGetMaskByNames |
| `org-permissions-get-mask-by-names` | orgPermissionsGetMaskByNames |
| `app-permissions-get-by-mask` | Reads and enables pagination through a set of `AppPermission`. |
| `org-permissions-get-by-mask` | Reads and enables pagination through a set of `OrgPermission`. |
| `steps-required` | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `submit-invite-code` | submitInviteCode |
| `submit-org-invite-code` | submitOrgInviteCode |
| `request-upload-url` | Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl. |
| `confirm-upload` | Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'. |
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

### `app-level-requirement`

CRUD operations for AppLevelRequirement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLevelRequirement records |
| `find-first` | Find first matching appLevelRequirement record |
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

**Required create fields:** `name`, `level`
**Optional create fields (backend defaults):** `description`, `requiredCount`, `priority`

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
| `max` | Int |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

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
| `max` | Int |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `max`

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

**Required create fields:** `name`, `description`, `prefix`

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
| `num` | Int |
| `max` | Int |

**Required create fields:** `actorId`
**Optional create fields (backend defaults):** `name`, `num`, `max`

### `app-achievement`

CRUD operations for AppAchievement records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appAchievement records |
| `find-first` | Find first matching appAchievement record |
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

### `app-step`

CRUD operations for AppStep records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appStep records |
| `find-first` | Find first matching appStep record |
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

### `claimed-invite`

CRUD operations for ClaimedInvite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all claimedInvite records |
| `find-first` | Find first matching claimedInvite record |
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
| `num` | Int |
| `max` | Int |
| `entityId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `name`, `num`, `max`

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
| `deleteMemberCascadeGroups` | Boolean |
| `createGroupsCascadeMembers` | Boolean |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `deleteMemberCascadeGroups`, `createGroupsCascadeMembers`

### `app-level`

CRUD operations for AppLevel records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all appLevel records |
| `find-first` | Find first matching appLevel record |
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

**Required create fields:** `name`
**Optional create fields (backend defaults):** `description`, `image`, `ownerId`

### `invite`

CRUD operations for Invite records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all invite records |
| `find-first` | Find first matching invite record |
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

**Optional create fields (backend defaults):** `email`, `senderId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `expiresAt`

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
| `isOwner` | Boolean |
| `isAdmin` | Boolean |
| `permissions` | BitString |
| `granted` | BitString |
| `actorId` | UUID |
| `entityId` | UUID |
| `profileId` | UUID |

**Required create fields:** `actorId`, `entityId`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `isApproved`, `isBanned`, `isDisabled`, `isActive`, `isOwner`, `isAdmin`, `permissions`, `granted`, `profileId`

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
| `expiresAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `entityId` | UUID |

**Required create fields:** `entityId`
**Optional create fields (backend defaults):** `email`, `senderId`, `receiverId`, `inviteToken`, `inviteValid`, `inviteLimit`, `inviteCount`, `multiple`, `data`, `expiresAt`

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

### `steps-achieved`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--vlevel` | String |
  | `--vroleId` | UUID |

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

### `request-upload-url`

Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.bucketKey` | String (required) |
  | `--input.contentHash` | String (required) |
  | `--input.contentType` | String (required) |
  | `--input.size` | Int (required) |
  | `--input.filename` | String |

### `confirm-upload`

Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.fileId` | UUID (required) |

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
