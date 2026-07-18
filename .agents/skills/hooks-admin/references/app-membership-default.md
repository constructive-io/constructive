# appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
useAppMembershipDefaultsQuery({ selection: { fields: { createdAt: true, createdBy: true, id: true, isApproved: true, isVerified: true, updatedAt: true, updatedBy: true } } })
useAppMembershipDefaultQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, id: true, isApproved: true, isVerified: true, updatedAt: true, updatedBy: true } } })
useCreateAppMembershipDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipDefaultMutation({})
```

## Examples

### List all appMembershipDefaults

```typescript
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { createdAt: true, createdBy: true, id: true, isApproved: true, isVerified: true, updatedAt: true, updatedBy: true } },
});
```

### Create a appMembershipDefault

```typescript
const { mutate } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>', updatedBy: '<UUID>' });
```
