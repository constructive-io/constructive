---
name: hooks-admin-app-membership
description: Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status
---

# hooks-admin-app-membership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
useAppMembershipsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } } })
useAppMembershipQuery({ id: '<value>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } } })
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
mutate({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', profileId: '<value>' });
```
