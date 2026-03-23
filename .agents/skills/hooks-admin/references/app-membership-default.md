# appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
useAppMembershipDefaultsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } } })
useAppMembershipDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } } })
useCreateAppMembershipDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipDefaultMutation({})
```

## Examples

### List all appMembershipDefaults

```typescript
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});
```

### Create a appMembershipDefault

```typescript
const { mutate } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' });
```
