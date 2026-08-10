# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual capability grants and revocations for members via bitmask

## Usage

```typescript
useAppGrantsQuery({ selection: { fields: { actorId: true, capabilities: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useAppGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, capabilities: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateAppGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppGrantMutation({})
```

## Examples

### List all appGrants

```typescript
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { actorId: true, capabilities: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a appGrant

```typescript
const { mutate } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', capabilities: '<BitString>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
