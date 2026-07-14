# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
useAppMembershipsQuery({ selection: { fields: { actorId: true, createdAt: true, createdBy: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } } })
useAppMembershipQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, createdBy: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } } })
useCreateAppMembershipMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipMutation({})
```

## Examples

### List all appMemberships

```typescript
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { actorId: true, createdAt: true, createdBy: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } },
});
```

### Create a appMembership

```typescript
const { mutate } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', createdBy: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isOwner: '<Boolean>', isVerified: '<Boolean>', permissions: '<BitString>', profileId: '<UUID>', updatedBy: '<UUID>' });
```
