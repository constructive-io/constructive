# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
usePrincipalsQuery({ selection: { fields: { apiKeyMaxDuration: true, bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
usePrincipalQuery({ principalId: '<UUID>', selection: { fields: { apiKeyMaxDuration: true, bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } } })
useUpdatePrincipalMutation({ selection: { fields: { principalId: true } } })
useDeletePrincipalMutation({})
```

## Examples

### List all principals

```typescript
const { data, isLoading } = usePrincipalsQuery({
  selection: { fields: { apiKeyMaxDuration: true, bypassStepUp: true, createdAt: true, createdBySessionId: true, depth: true, expiresAt: true, id: true, isReadOnly: true, name: true, ownerId: true, parentPrincipalId: true, updatedAt: true, useAdminOwner: true, userId: true } },
});
```
