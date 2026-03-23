# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
useOrgGrantsQuery({ selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useOrgGrantQuery({ id: '<UUID>', selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateOrgGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgGrantMutation({})
```

## Examples

### List all orgGrants

```typescript
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgGrant

```typescript
const { mutate } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```
