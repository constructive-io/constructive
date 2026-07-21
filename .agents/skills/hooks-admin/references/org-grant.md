# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
useOrgGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } } })
useOrgGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } } })
useCreateOrgGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgGrantMutation({})
```

## Examples

### List all orgGrants

```typescript
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } },
});
```

### Create a orgGrant

```typescript
const { mutate } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissions: '<BitString>' });
```
