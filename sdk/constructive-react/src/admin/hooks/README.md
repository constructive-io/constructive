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
| `useAppPermissionsQuery` | Query | List all appPermissions |
| `useAppPermissionQuery` | Query | Get one appPermission |
| `useCreateAppPermissionMutation` | Mutation | Create a appPermission |
| `useUpdateAppPermissionMutation` | Mutation | Update a appPermission |
| `useDeleteAppPermissionMutation` | Mutation | Delete a appPermission |
| `useOrgPermissionsQuery` | Query | List all orgPermissions |
| `useOrgPermissionQuery` | Query | Get one orgPermission |
| `useCreateOrgPermissionMutation` | Mutation | Create a orgPermission |
| `useUpdateOrgPermissionMutation` | Mutation | Update a orgPermission |
| `useDeleteOrgPermissionMutation` | Mutation | Delete a orgPermission |
| `useAppLevelRequirementsQuery` | Query | List all appLevelRequirements |
| `useAppLevelRequirementQuery` | Query | Get one appLevelRequirement |
| `useCreateAppLevelRequirementMutation` | Mutation | Create a appLevelRequirement |
| `useUpdateAppLevelRequirementMutation` | Mutation | Update a appLevelRequirement |
| `useDeleteAppLevelRequirementMutation` | Mutation | Delete a appLevelRequirement |
| `useOrgMembersQuery` | Query | List all orgMembers |
| `useOrgMemberQuery` | Query | Get one orgMember |
| `useCreateOrgMemberMutation` | Mutation | Create a orgMember |
| `useUpdateOrgMemberMutation` | Mutation | Update a orgMember |
| `useDeleteOrgMemberMutation` | Mutation | Delete a orgMember |
| `useAppPermissionDefaultsQuery` | Query | List all appPermissionDefaults |
| `useAppPermissionDefaultQuery` | Query | Get one appPermissionDefault |
| `useCreateAppPermissionDefaultMutation` | Mutation | Create a appPermissionDefault |
| `useUpdateAppPermissionDefaultMutation` | Mutation | Update a appPermissionDefault |
| `useDeleteAppPermissionDefaultMutation` | Mutation | Delete a appPermissionDefault |
| `useOrgPermissionDefaultsQuery` | Query | List all orgPermissionDefaults |
| `useOrgPermissionDefaultQuery` | Query | Get one orgPermissionDefault |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Create a orgPermissionDefault |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Update a orgPermissionDefault |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Delete a orgPermissionDefault |
| `useAppAdminGrantsQuery` | Query | List all appAdminGrants |
| `useAppAdminGrantQuery` | Query | Get one appAdminGrant |
| `useCreateAppAdminGrantMutation` | Mutation | Create a appAdminGrant |
| `useUpdateAppAdminGrantMutation` | Mutation | Update a appAdminGrant |
| `useDeleteAppAdminGrantMutation` | Mutation | Delete a appAdminGrant |
| `useAppOwnerGrantsQuery` | Query | List all appOwnerGrants |
| `useAppOwnerGrantQuery` | Query | Get one appOwnerGrant |
| `useCreateAppOwnerGrantMutation` | Mutation | Create a appOwnerGrant |
| `useUpdateAppOwnerGrantMutation` | Mutation | Update a appOwnerGrant |
| `useDeleteAppOwnerGrantMutation` | Mutation | Delete a appOwnerGrant |
| `useAppLimitDefaultsQuery` | Query | List all appLimitDefaults |
| `useAppLimitDefaultQuery` | Query | Get one appLimitDefault |
| `useCreateAppLimitDefaultMutation` | Mutation | Create a appLimitDefault |
| `useUpdateAppLimitDefaultMutation` | Mutation | Update a appLimitDefault |
| `useDeleteAppLimitDefaultMutation` | Mutation | Delete a appLimitDefault |
| `useOrgLimitDefaultsQuery` | Query | List all orgLimitDefaults |
| `useOrgLimitDefaultQuery` | Query | Get one orgLimitDefault |
| `useCreateOrgLimitDefaultMutation` | Mutation | Create a orgLimitDefault |
| `useUpdateOrgLimitDefaultMutation` | Mutation | Update a orgLimitDefault |
| `useDeleteOrgLimitDefaultMutation` | Mutation | Delete a orgLimitDefault |
| `useOrgAdminGrantsQuery` | Query | List all orgAdminGrants |
| `useOrgAdminGrantQuery` | Query | Get one orgAdminGrant |
| `useCreateOrgAdminGrantMutation` | Mutation | Create a orgAdminGrant |
| `useUpdateOrgAdminGrantMutation` | Mutation | Update a orgAdminGrant |
| `useDeleteOrgAdminGrantMutation` | Mutation | Delete a orgAdminGrant |
| `useOrgOwnerGrantsQuery` | Query | List all orgOwnerGrants |
| `useOrgOwnerGrantQuery` | Query | Get one orgOwnerGrant |
| `useCreateOrgOwnerGrantMutation` | Mutation | Create a orgOwnerGrant |
| `useUpdateOrgOwnerGrantMutation` | Mutation | Update a orgOwnerGrant |
| `useDeleteOrgOwnerGrantMutation` | Mutation | Delete a orgOwnerGrant |
| `useMembershipTypesQuery` | Query | List all membershipTypes |
| `useMembershipTypeQuery` | Query | Get one membershipType |
| `useCreateMembershipTypeMutation` | Mutation | Create a membershipType |
| `useUpdateMembershipTypeMutation` | Mutation | Update a membershipType |
| `useDeleteMembershipTypeMutation` | Mutation | Delete a membershipType |
| `useAppLimitsQuery` | Query | List all appLimits |
| `useAppLimitQuery` | Query | Get one appLimit |
| `useCreateAppLimitMutation` | Mutation | Create a appLimit |
| `useUpdateAppLimitMutation` | Mutation | Update a appLimit |
| `useDeleteAppLimitMutation` | Mutation | Delete a appLimit |
| `useAppAchievementsQuery` | Query | List all appAchievements |
| `useAppAchievementQuery` | Query | Get one appAchievement |
| `useCreateAppAchievementMutation` | Mutation | Create a appAchievement |
| `useUpdateAppAchievementMutation` | Mutation | Update a appAchievement |
| `useDeleteAppAchievementMutation` | Mutation | Delete a appAchievement |
| `useAppStepsQuery` | Query | List all appSteps |
| `useAppStepQuery` | Query | Get one appStep |
| `useCreateAppStepMutation` | Mutation | Create a appStep |
| `useUpdateAppStepMutation` | Mutation | Update a appStep |
| `useDeleteAppStepMutation` | Mutation | Delete a appStep |
| `useClaimedInvitesQuery` | Query | List all claimedInvites |
| `useClaimedInviteQuery` | Query | Get one claimedInvite |
| `useCreateClaimedInviteMutation` | Mutation | Create a claimedInvite |
| `useUpdateClaimedInviteMutation` | Mutation | Update a claimedInvite |
| `useDeleteClaimedInviteMutation` | Mutation | Delete a claimedInvite |
| `useAppGrantsQuery` | Query | List all appGrants |
| `useAppGrantQuery` | Query | Get one appGrant |
| `useCreateAppGrantMutation` | Mutation | Create a appGrant |
| `useUpdateAppGrantMutation` | Mutation | Update a appGrant |
| `useDeleteAppGrantMutation` | Mutation | Delete a appGrant |
| `useAppMembershipDefaultsQuery` | Query | List all appMembershipDefaults |
| `useAppMembershipDefaultQuery` | Query | Get one appMembershipDefault |
| `useCreateAppMembershipDefaultMutation` | Mutation | Create a appMembershipDefault |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Update a appMembershipDefault |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Delete a appMembershipDefault |
| `useOrgLimitsQuery` | Query | List all orgLimits |
| `useOrgLimitQuery` | Query | Get one orgLimit |
| `useCreateOrgLimitMutation` | Mutation | Create a orgLimit |
| `useUpdateOrgLimitMutation` | Mutation | Update a orgLimit |
| `useDeleteOrgLimitMutation` | Mutation | Delete a orgLimit |
| `useOrgClaimedInvitesQuery` | Query | List all orgClaimedInvites |
| `useOrgClaimedInviteQuery` | Query | Get one orgClaimedInvite |
| `useCreateOrgClaimedInviteMutation` | Mutation | Create a orgClaimedInvite |
| `useUpdateOrgClaimedInviteMutation` | Mutation | Update a orgClaimedInvite |
| `useDeleteOrgClaimedInviteMutation` | Mutation | Delete a orgClaimedInvite |
| `useOrgGrantsQuery` | Query | List all orgGrants |
| `useOrgGrantQuery` | Query | Get one orgGrant |
| `useCreateOrgGrantMutation` | Mutation | Create a orgGrant |
| `useUpdateOrgGrantMutation` | Mutation | Update a orgGrant |
| `useDeleteOrgGrantMutation` | Mutation | Delete a orgGrant |
| `useOrgMembershipDefaultsQuery` | Query | List all orgMembershipDefaults |
| `useOrgMembershipDefaultQuery` | Query | Get one orgMembershipDefault |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Create a orgMembershipDefault |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Update a orgMembershipDefault |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Delete a orgMembershipDefault |
| `useAppLevelsQuery` | Query | List all appLevels |
| `useAppLevelQuery` | Query | Get one appLevel |
| `useCreateAppLevelMutation` | Mutation | Create a appLevel |
| `useUpdateAppLevelMutation` | Mutation | Update a appLevel |
| `useDeleteAppLevelMutation` | Mutation | Delete a appLevel |
| `useInvitesQuery` | Query | List all invites |
| `useInviteQuery` | Query | Get one invite |
| `useCreateInviteMutation` | Mutation | Create a invite |
| `useUpdateInviteMutation` | Mutation | Update a invite |
| `useDeleteInviteMutation` | Mutation | Delete a invite |
| `useAppMembershipsQuery` | Query | List all appMemberships |
| `useAppMembershipQuery` | Query | Get one appMembership |
| `useCreateAppMembershipMutation` | Mutation | Create a appMembership |
| `useUpdateAppMembershipMutation` | Mutation | Update a appMembership |
| `useDeleteAppMembershipMutation` | Mutation | Delete a appMembership |
| `useOrgMembershipsQuery` | Query | List all orgMemberships |
| `useOrgMembershipQuery` | Query | Get one orgMembership |
| `useCreateOrgMembershipMutation` | Mutation | Create a orgMembership |
| `useUpdateOrgMembershipMutation` | Mutation | Update a orgMembership |
| `useDeleteOrgMembershipMutation` | Mutation | Delete a orgMembership |
| `useOrgInvitesQuery` | Query | List all orgInvites |
| `useOrgInviteQuery` | Query | Get one orgInvite |
| `useCreateOrgInviteMutation` | Mutation | Create a orgInvite |
| `useUpdateOrgInviteMutation` | Mutation | Update a orgInvite |
| `useDeleteOrgInviteMutation` | Mutation | Delete a orgInvite |
| `useAppPermissionsGetPaddedMaskQuery` | Query | appPermissionsGetPaddedMask |
| `useOrgPermissionsGetPaddedMaskQuery` | Query | orgPermissionsGetPaddedMask |
| `useStepsAchievedQuery` | Query | stepsAchieved |
| `useAppPermissionsGetMaskQuery` | Query | appPermissionsGetMask |
| `useOrgPermissionsGetMaskQuery` | Query | orgPermissionsGetMask |
| `useAppPermissionsGetMaskByNamesQuery` | Query | appPermissionsGetMaskByNames |
| `useOrgPermissionsGetMaskByNamesQuery` | Query | orgPermissionsGetMaskByNames |
| `useAppPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `AppPermission`. |
| `useOrgPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `OrgPermission`. |
| `useStepsRequiredQuery` | Query | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `useSubmitInviteCodeMutation` | Mutation | submitInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |

## Table Hooks

### AppPermission

```typescript
// List all appPermissions
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
```

### AppLevelRequirement

```typescript
// List all appLevelRequirements
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>' });
```

### OrgMember

```typescript
// List all orgMembers
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Get one orgMember
const { data: item } = useOrgMemberQuery({
  id: '<value>',
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Create a orgMember
const { mutate: create } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
create({ isAdmin: '<value>', actorId: '<value>', entityId: '<value>' });
```

### AppPermissionDefault

```typescript
// List all appPermissionDefaults
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});

// Get one appPermissionDefault
const { data: item } = useAppPermissionDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true } },
});

// Create a appPermissionDefault
const { mutate: create } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>' });
```

### OrgPermissionDefault

```typescript
// List all orgPermissionDefaults
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Get one orgPermissionDefault
const { data: item } = useOrgPermissionDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Create a orgPermissionDefault
const { mutate: create } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', entityId: '<value>' });
```

### AppAdminGrant

```typescript
// List all appAdminGrants
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appAdminGrant
const { data: item } = useAppAdminGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appAdminGrant
const { mutate: create } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### AppOwnerGrant

```typescript
// List all appOwnerGrants
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appOwnerGrant
const { data: item } = useAppOwnerGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appOwnerGrant
const { mutate: create } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', max: '<value>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', max: '<value>' });
```

### OrgAdminGrant

```typescript
// List all orgAdminGrants
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgAdminGrant
const { data: item } = useOrgAdminGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgAdminGrant
const { mutate: create } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### OrgOwnerGrant

```typescript
// List all orgOwnerGrants
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgOwnerGrant
const { data: item } = useOrgOwnerGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgOwnerGrant
const { mutate: create } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', prefix: '<value>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>' });
```

### AppAchievement

```typescript
// List all appAchievements
const { data, isLoading } = useAppAchievementsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appAchievement
const { data: item } = useAppAchievementQuery({
  id: '<value>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appAchievement
const { mutate: create } = useCreateAppAchievementMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<value>', name: '<value>', count: '<value>' });
```

### AppStep

```typescript
// List all appSteps
const { data, isLoading } = useAppStepsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appStep
const { data: item } = useAppStepQuery({
  id: '<value>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appStep
const { mutate: create } = useCreateAppStepMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<value>', name: '<value>', count: '<value>' });
```

### ClaimedInvite

```typescript
// List all claimedInvites
const { data, isLoading } = useClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one claimedInvite
const { data: item } = useClaimedInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a claimedInvite
const { mutate: create } = useCreateClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<value>', senderId: '<value>', receiverId: '<value>' });
```

### AppGrant

```typescript
// List all appGrants
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appGrant
const { data: item } = useAppGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appGrant
const { mutate: create } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### AppMembershipDefault

```typescript
// List all appMembershipDefaults
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Get one appMembershipDefault
const { data: item } = useAppMembershipDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Create a appMembershipDefault
const { mutate: create } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isVerified: '<value>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>', entityId: '<value>' });
```

### OrgClaimedInvite

```typescript
// List all orgClaimedInvites
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgClaimedInvite
const { data: item } = useOrgClaimedInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgClaimedInvite
const { mutate: create } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<value>', senderId: '<value>', receiverId: '<value>', entityId: '<value>' });
```

### OrgGrant

```typescript
// List all orgGrants
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgGrant
const { data: item } = useOrgGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgGrant
const { mutate: create } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', entityId: '<value>', deleteMemberCascadeGroups: '<value>', createGroupsCascadeMembers: '<value>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>' });
```

### Invite

```typescript
// List all invites
const { data, isLoading } = useInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one invite
const { data: item } = useInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a invite
const { mutate: create } = useCreateInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>' });
```

### OrgMembership

```typescript
// List all orgMemberships
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>' });
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

### `useStepsAchievedQuery`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |

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

### `useStepsRequiredQuery`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useSubmitInviteCodeMutation`

submitInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitInviteCodeInput (required) |

### `useSubmitOrgInviteCodeMutation`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
