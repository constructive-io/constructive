# hooks-appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppMembershipDefault data operations

## Usage

```typescript
useAppMembershipDefaultsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } } })
useAppMembershipDefaultQuery({ id: '<value>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } } })
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
mutate({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isVerified: '<value>' });
```
