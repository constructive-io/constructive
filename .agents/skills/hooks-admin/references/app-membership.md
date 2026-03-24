# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
useAppMembershipsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } } })
useAppMembershipQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } } })
useCreateAppMembershipMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipMutation({})
```

## Examples

### List all appMemberships

```typescript
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});
```

### Create a appMembership

```typescript
const { mutate } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' });
```
