# orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
useOrgMembershipDefaultsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } } })
useOrgMembershipDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } } })
useCreateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipDefaultMutation({})
```

## Examples

### List all orgMembershipDefaults

```typescript
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});
```

### Create a orgMembershipDefault

```typescript
const { mutate } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' });
```
