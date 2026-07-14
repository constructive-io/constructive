# appOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of ownership transfers and grants between members

## Usage

```typescript
useAppOwnerGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useAppOwnerGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateAppOwnerGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppOwnerGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppOwnerGrantMutation({})
```

## Examples

### List all appOwnerGrants

```typescript
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a appOwnerGrant

```typescript
const { mutate } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
