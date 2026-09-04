# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
usePrincipalsQuery({ selection: { fields: { bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
usePrincipalQuery({ principalId: '<UUID>', selection: { fields: { bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
useCreatePrincipalMutation({ selection: { fields: { principalId: true } } })
useUpdatePrincipalMutation({ selection: { fields: { principalId: true } } })
useDeletePrincipalMutation({})
```

## Examples

### List all principals

```typescript
const { data, isLoading } = usePrincipalsQuery({
  selection: { fields: { bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } },
});
```

### Create a principal

```typescript
const { mutate } = useCreatePrincipalMutation({
  selection: { fields: { principalId: true } },
});
mutate({ bypassStepUp: '<Boolean>', createdBySessionId: '<UUID>', depth: '<Int>', expiresAt: '<Datetime>', id: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentPrincipalId: '<UUID>', useAdminOwner: '<Boolean>', userId: '<UUID>' });
```
