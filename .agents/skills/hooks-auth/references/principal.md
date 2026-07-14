# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
usePrincipalsQuery({ selection: { fields: { bypassStepUp: true, createdAt: true, id: true, isReadOnly: true, name: true, ownerId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
usePrincipalQuery({ principalId: '<UUID>', selection: { fields: { bypassStepUp: true, createdAt: true, id: true, isReadOnly: true, name: true, ownerId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
useCreatePrincipalMutation({ selection: { fields: { principalId: true } } })
useUpdatePrincipalMutation({ selection: { fields: { principalId: true } } })
useDeletePrincipalMutation({})
```

## Examples

### List all principals

```typescript
const { data, isLoading } = usePrincipalsQuery({
  selection: { fields: { bypassStepUp: true, createdAt: true, id: true, isReadOnly: true, name: true, ownerId: true, updatedAt: true, useAdminOwner: true, userId: true } },
});
```

### Create a principal

```typescript
const { mutate } = useCreatePrincipalMutation({
  selection: { fields: { principalId: true } },
});
mutate({ bypassStepUp: '<Boolean>', id: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', ownerId: '<UUID>', useAdminOwner: '<Boolean>', userId: '<UUID>' });
```
