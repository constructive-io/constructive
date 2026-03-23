# orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
useOrgAdminGrantsQuery({ selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useOrgAdminGrantQuery({ id: '<UUID>', selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgAdminGrantMutation({})
```

## Examples

### List all orgAdminGrants

```typescript
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgAdminGrant

```typescript
const { mutate } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```
