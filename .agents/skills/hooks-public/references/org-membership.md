# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
useOrgMembershipsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } } })
useOrgMembershipQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } } })
useCreateOrgMembershipMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipMutation({})
```

## Examples

### List all orgMemberships

```typescript
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } },
});
```

### Create a orgMembership

```typescript
const { mutate } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', profileId: '<UUID>' });
```
