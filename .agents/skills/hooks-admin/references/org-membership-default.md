# orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
useOrgMembershipDefaultsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, entityId: true, id: true, isApproved: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useOrgMembershipDefaultQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, entityId: true, id: true, isApproved: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipDefaultMutation({})
```

## Examples

### List all orgMembershipDefaults

```typescript
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, entityId: true, id: true, isApproved: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a orgMembershipDefault

```typescript
const { mutate } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', entityId: '<UUID>', isApproved: '<Boolean>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
