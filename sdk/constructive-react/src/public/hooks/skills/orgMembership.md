# hooks-orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgMembership data operations

## Usage

```typescript
useOrgMembershipsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } } })
useOrgMembershipQuery({ id: '<value>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } } })
useCreateOrgMembershipMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipMutation({})
```

## Examples

### List all orgMemberships

```typescript
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } },
});
```

### Create a orgMembership

```typescript
const { mutate } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>' });
```
