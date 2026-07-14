# appAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
useAppAdminGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useAppAdminGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateAppAdminGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppAdminGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppAdminGrantMutation({})
```

## Examples

### List all appAdminGrants

```typescript
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a appAdminGrant

```typescript
const { mutate } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
