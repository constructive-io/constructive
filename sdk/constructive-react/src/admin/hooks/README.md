# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useOrgGetManagersQuery` | Query | List all orgGetManagers |
| `useCreateOrgGetManagersRecordMutation` | Mutation | Create a orgGetManagersRecord |
| `useOrgGetSubordinatesQuery` | Query | List all orgGetSubordinates |
| `useCreateOrgGetSubordinatesRecordMutation` | Mutation | Create a orgGetSubordinatesRecord |
| `useAppPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useAppPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useAppPermissionDefaultGrantsQuery` | Query | Audit log of permission additions and removals from the defaults bitmask |
| `useAppPermissionDefaultGrantQuery` | Query | Audit log of permission additions and removals from the defaults bitmask |
| `useCreateAppPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useUpdateAppPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useDeleteAppPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useOrgPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionDefaultPermissionsQuery` | Query | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useOrgPermissionDefaultPermissionQuery` | Query | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useCreateOrgPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useUpdateOrgPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useDeleteOrgPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useOrgPermissionDefaultGrantsQuery` | Query | Audit log of permission additions and removals from the defaults bitmask |
| `useOrgPermissionDefaultGrantQuery` | Query | Audit log of permission additions and removals from the defaults bitmask |
| `useCreateOrgPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useUpdateOrgPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useDeleteOrgPermissionDefaultGrantMutation` | Mutation | Audit log of permission additions and removals from the defaults bitmask |
| `useOrgMembersQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useOrgMemberQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useCreateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useUpdateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useDeleteOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useAppPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useAppPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useOrgPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useOrgPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useAppPermissionDefaultPermissionsQuery` | Query | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useAppPermissionDefaultPermissionQuery` | Query | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useCreateAppPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useUpdateAppPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useDeleteAppPermissionDefaultPermissionMutation` | Mutation | Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask |
| `useAppAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useAppAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useAppOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useAppOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useOrgAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useOrgAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useOrgOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useOrgOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useOrgChartEdgeGrantsQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useOrgChartEdgeGrantQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useCreateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useUpdateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useDeleteOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useAppClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useAppClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useMembershipTypesQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useMembershipTypeQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCreateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useUpdateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useDeleteMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useAppGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useAppGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useAppMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useAppMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useOrgClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useOrgGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useOrgGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useOrgChartEdgesQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useOrgChartEdgeQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useCreateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useUpdateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useDeleteOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useOrgMembershipSettingsQuery` | Query | Per-entity settings for the memberships module |
| `useOrgMembershipSettingQuery` | Query | Per-entity settings for the memberships module |
| `useCreateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useUpdateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useDeleteOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useAppMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useAppMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMemberProfilesQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useOrgMemberProfileQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useCreateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useUpdateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useDeleteOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useAppInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useAppInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useAppPermissionsGetPaddedMaskQuery` | Query | appPermissionsGetPaddedMask |
| `useOrgPermissionsGetPaddedMaskQuery` | Query | orgPermissionsGetPaddedMask |
| `useOrgIsManagerOfQuery` | Query | orgIsManagerOf |
| `useAppPermissionsGetMaskQuery` | Query | appPermissionsGetMask |
| `useOrgPermissionsGetMaskQuery` | Query | orgPermissionsGetMask |
| `useAppPermissionsGetMaskByNamesQuery` | Query | appPermissionsGetMaskByNames |
| `useOrgPermissionsGetMaskByNamesQuery` | Query | orgPermissionsGetMaskByNames |
| `useAppPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `AppPermission`. |
| `useOrgPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `OrgPermission`. |
| `useSubmitAppInviteCodeMutation` | Mutation | submitAppInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### OrgGetManagersRecord

```typescript
// List all orgGetManagers
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetManagersRecord
const { mutate: create } = useCreateOrgGetManagersRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<UUID>', depth: '<Int>' });
```

### OrgGetSubordinatesRecord

```typescript
// List all orgGetSubordinates
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetSubordinatesRecord
const { mutate: create } = useCreateOrgGetSubordinatesRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<UUID>', depth: '<Int>' });
```

### AppPermission

```typescript
// List all appPermissions
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### AppPermissionDefaultGrant

```typescript
// List all appPermissionDefaultGrants
const { data, isLoading } = useAppPermissionDefaultGrantsQuery({
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appPermissionDefaultGrant
const { data: item } = useAppPermissionDefaultGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appPermissionDefaultGrant
const { mutate: create } = useCreateAppPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### OrgPermissionDefaultPermission

```typescript
// List all orgPermissionDefaultPermissions
const { data, isLoading } = useOrgPermissionDefaultPermissionsQuery({
  selection: { fields: { id: true, permissionId: true, entityId: true, createdAt: true, updatedAt: true } },
});

// Get one orgPermissionDefaultPermission
const { data: item } = useOrgPermissionDefaultPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissionId: true, entityId: true, createdAt: true, updatedAt: true } },
});

// Create a orgPermissionDefaultPermission
const { mutate: create } = useCreateOrgPermissionDefaultPermissionMutation({
  selection: { fields: { id: true } },
});
create({ permissionId: '<UUID>', entityId: '<UUID>' });
```

### OrgPermissionDefaultGrant

```typescript
// List all orgPermissionDefaultGrants
const { data, isLoading } = useOrgPermissionDefaultGrantsQuery({
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, entityId: true, createdAt: true, updatedAt: true } },
});

// Get one orgPermissionDefaultGrant
const { data: item } = useOrgPermissionDefaultGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, entityId: true, createdAt: true, updatedAt: true } },
});

// Create a orgPermissionDefaultGrant
const { mutate: create } = useCreateOrgPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>', entityId: '<UUID>' });
```

### OrgMember

```typescript
// List all orgMembers
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Get one orgMember
const { data: item } = useOrgMemberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Create a orgMember
const { mutate: create } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
create({ isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' });
```

### AppPermissionDefault

```typescript
// List all appPermissionDefaults
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});

// Get one appPermissionDefault
const { data: item } = useAppPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true } },
});

// Create a appPermissionDefault
const { mutate: create } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>' });
```

### OrgPermissionDefault

```typescript
// List all orgPermissionDefaults
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Get one orgPermissionDefault
const { data: item } = useOrgPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Create a orgPermissionDefault
const { mutate: create } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', entityId: '<UUID>' });
```

### AppPermissionDefaultPermission

```typescript
// List all appPermissionDefaultPermissions
const { data, isLoading } = useAppPermissionDefaultPermissionsQuery({
  selection: { fields: { id: true, permissionId: true, createdAt: true, updatedAt: true } },
});

// Get one appPermissionDefaultPermission
const { data: item } = useAppPermissionDefaultPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissionId: true, createdAt: true, updatedAt: true } },
});

// Create a appPermissionDefaultPermission
const { mutate: create } = useCreateAppPermissionDefaultPermissionMutation({
  selection: { fields: { id: true } },
});
create({ permissionId: '<UUID>' });
```

### AppAdminGrant

```typescript
// List all appAdminGrants
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appAdminGrant
const { data: item } = useAppAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appAdminGrant
const { mutate: create } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppOwnerGrant

```typescript
// List all appOwnerGrants
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appOwnerGrant
const { data: item } = useAppOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appOwnerGrant
const { mutate: create } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### OrgAdminGrant

```typescript
// List all orgAdminGrants
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgAdminGrant
const { data: item } = useOrgAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgAdminGrant
const { mutate: create } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgOwnerGrant

```typescript
// List all orgOwnerGrants
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgOwnerGrant
const { data: item } = useOrgOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgOwnerGrant
const { mutate: create } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgChartEdgeGrant

```typescript
// List all orgChartEdgeGrants
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Get one orgChartEdgeGrant
const { data: item } = useOrgChartEdgeGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Create a orgChartEdgeGrant
const { mutate: create } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### AppClaimedInvite

```typescript
// List all appClaimedInvites
const { data, isLoading } = useAppClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one appClaimedInvite
const { data: item } = useAppClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a appClaimedInvite
const { mutate: create } = useCreateAppClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, scope: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true, description: true, scope: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', scope: '<String>', parentMembershipType: '<Int>', hasUsersTableEntry: '<Boolean>' });
```

### AppGrant

```typescript
// List all appGrants
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appGrant
const { data: item } = useAppGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appGrant
const { mutate: create } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppMembershipDefault

```typescript
// List all appMembershipDefaults
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Get one appMembershipDefault
const { data: item } = useAppMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Create a appMembershipDefault
const { mutate: create } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' });
```

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' });
```

### OrgClaimedInvite

```typescript
// List all orgClaimedInvites
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgClaimedInvite
const { data: item } = useOrgClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgClaimedInvite
const { mutate: create } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' });
```

### OrgGrant

```typescript
// List all orgGrants
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgGrant
const { data: item } = useOrgGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgGrant
const { mutate: create } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgChartEdge

```typescript
// List all orgChartEdges
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Get one orgChartEdge
const { data: item } = useOrgChartEdgeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Create a orgChartEdge
const { mutate: create } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### OrgMembershipSetting

```typescript
// List all orgMembershipSettings
const { data, isLoading } = useOrgMembershipSettingsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Get one orgMembershipSetting
const { data: item } = useOrgMembershipSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Create a orgMembershipSetting
const { mutate: create } = useCreateOrgMembershipSettingMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', inviteProfileAssignmentMode: '<String>', populateMemberEmail: '<Boolean>', limitAllocationMode: '<String>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' });
```

### OrgMembership

```typescript
// List all orgMemberships
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' });
```

### OrgMemberProfile

```typescript
// List all orgMemberProfiles
const { data, isLoading } = useOrgMemberProfilesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Get one orgMemberProfile
const { data: item } = useOrgMemberProfileQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Create a orgMemberProfile
const { mutate: create } = useCreateOrgMemberProfileMutation({
  selection: { fields: { id: true } },
});
create({ membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' });
```

### AppInvite

```typescript
// List all appInvites
const { data, isLoading } = useAppInvitesQuery({
  selection: { fields: { id: true, channel: true, email: true, phone: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one appInvite
const { data: item } = useAppInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, channel: true, email: true, phone: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a appInvite
const { mutate: create } = useCreateAppInviteMutation({
  selection: { fields: { id: true } },
});
create({ channel: '<String>', email: '<Email>', phone: '<String>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', expiresAt: '<Datetime>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, channel: true, email: true, phone: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, channel: true, email: true, phone: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ channel: '<String>', email: '<Email>', phone: '<String>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', isReadOnly: '<Boolean>', expiresAt: '<Datetime>', entityId: '<UUID>' });
```

## Custom Operation Hooks

### `useAppPermissionsGetPaddedMaskQuery`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useOrgPermissionsGetPaddedMaskQuery`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useOrgIsManagerOfQuery`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pUserId` | UUID |
  | `pMaxDepth` | Int |

### `useAppPermissionsGetMaskQuery`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useOrgPermissionsGetMaskQuery`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useAppPermissionsGetMaskByNamesQuery`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useOrgPermissionsGetMaskByNamesQuery`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useAppPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useOrgPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useSubmitAppInviteCodeMutation`

submitAppInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitAppInviteCodeInput (required) |

### `useSubmitOrgInviteCodeMutation`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
