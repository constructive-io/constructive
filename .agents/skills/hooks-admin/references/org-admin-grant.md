# orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
useOrgAdminGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useOrgAdminGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgAdminGrantMutation({})
```

## Examples

### List all orgAdminGrants

```typescript
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a orgAdminGrant

```typescript
const { mutate } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
