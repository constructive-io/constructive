# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with capability bitmasks, ownership, and admin status

## Usage

```typescript
useOrgMembershipsQuery({ selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, entityId: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isExternal: true, isOwner: true, isReadOnly: true, profileId: true, updatedAt: true, updatedBy: true } } })
useOrgMembershipQuery({ id: '<UUID>', selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, entityId: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isExternal: true, isOwner: true, isReadOnly: true, profileId: true, updatedAt: true, updatedBy: true } } })
useCreateOrgMembershipMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipMutation({})
```

## Examples

### List all orgMemberships

```typescript
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { actorId: true, capabilities: true, createdAt: true, createdBy: true, entityId: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isExternal: true, isOwner: true, isReadOnly: true, profileId: true, updatedAt: true, updatedBy: true } },
});
```

### Create a orgMembership

```typescript
const { mutate } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', capabilities: '<BitString>', createdBy: '<UUID>', entityId: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isReadOnly: '<Boolean>', profileId: '<UUID>', updatedBy: '<UUID>' });
```
