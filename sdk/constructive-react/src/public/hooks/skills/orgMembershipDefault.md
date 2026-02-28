# hooks-orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgMembershipDefault data operations

## Usage

```typescript
useOrgMembershipDefaultsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } } })
useOrgMembershipDefaultQuery({ id: '<value>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } } })
useCreateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipDefaultMutation({})
```

## Examples

### List all orgMembershipDefaults

```typescript
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});
```

### Create a orgMembershipDefault

```typescript
const { mutate } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', entityId: '<value>', deleteMemberCascadeGroups: '<value>', createGroupsCascadeMembers: '<value>' });
```
