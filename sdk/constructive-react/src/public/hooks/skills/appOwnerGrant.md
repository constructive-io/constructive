# hooks-appOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppOwnerGrant data operations

## Usage

```typescript
useAppOwnerGrantsQuery({ selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useAppOwnerGrantQuery({ id: '<value>', selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateAppOwnerGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppOwnerGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppOwnerGrantMutation({})
```

## Examples

### List all appOwnerGrants

```typescript
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appOwnerGrant

```typescript
const { mutate } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```
