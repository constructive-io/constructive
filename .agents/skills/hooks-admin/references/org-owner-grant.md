# orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of ownership transfers and grants between members

## Usage

```typescript
useOrgOwnerGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useOrgOwnerGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateOrgOwnerGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgOwnerGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgOwnerGrantMutation({})
```

## Examples

### List all orgOwnerGrants

```typescript
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a orgOwnerGrant

```typescript
const { mutate } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
