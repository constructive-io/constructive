# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
usePrincipalsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, userId: true, name: true, allowedMask: true, isReadOnly: true, bypassStepUp: true } } })
usePrincipalQuery({ principalId: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, userId: true, name: true, allowedMask: true, isReadOnly: true, bypassStepUp: true } } })
useCreatePrincipalMutation({ selection: { fields: { principalId: true } } })
useUpdatePrincipalMutation({ selection: { fields: { principalId: true } } })
useDeletePrincipalMutation({})
```

## Examples

### List all principals

```typescript
const { data, isLoading } = usePrincipalsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, userId: true, name: true, allowedMask: true, isReadOnly: true, bypassStepUp: true } },
});
```

### Create a principal

```typescript
const { mutate } = useCreatePrincipalMutation({
  selection: { fields: { principalId: true } },
});
mutate({ id: '<UUID>', ownerId: '<UUID>', userId: '<UUID>', name: '<String>', allowedMask: '<BitString>', isReadOnly: '<Boolean>', bypassStepUp: '<Boolean>' });
```
