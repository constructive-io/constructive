# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with capability bitmasks, ownership, and admin status

## Usage

```typescript
useAppMembershipsQuery({ selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, createdByPrincipal: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, profileId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useAppMembershipQuery({ id: '<UUID>', selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, createdByPrincipal: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, profileId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateAppMembershipMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipMutation({})
```

## Examples

### List all appMemberships

```typescript
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, createdByPrincipal: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, profileId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a appMembership

```typescript
const { mutate } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', capabilities: '<BitString>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isOwner: '<Boolean>', isVerified: '<Boolean>', profileId: '<UUID>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
