# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions.

## Usage

```typescript
usePrincipalScopeOverridesQuery({ selection: { fields: { allowedMask: true, createdAt: true, id: true, isActive: true, isReadOnly: true, membershipType: true, principalId: true, updatedAt: true, useAdminOwner: true } } })
usePrincipalScopeOverrideQuery({ id: '<UUID>', selection: { fields: { allowedMask: true, createdAt: true, id: true, isActive: true, isReadOnly: true, membershipType: true, principalId: true, updatedAt: true, useAdminOwner: true } } })
useCreatePrincipalScopeOverrideMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalScopeOverrideMutation({ selection: { fields: { id: true } } })
useDeletePrincipalScopeOverrideMutation({})
```

## Examples

### List all principalScopeOverrides

```typescript
const { data, isLoading } = usePrincipalScopeOverridesQuery({
  selection: { fields: { allowedMask: true, createdAt: true, id: true, isActive: true, isReadOnly: true, membershipType: true, principalId: true, updatedAt: true, useAdminOwner: true } },
});
```

### Create a principalScopeOverride

```typescript
const { mutate } = useCreatePrincipalScopeOverrideMutation({
  selection: { fields: { id: true } },
});
mutate({ allowedMask: '<BitString>', isActive: '<Boolean>', isReadOnly: '<Boolean>', membershipType: '<Int>', principalId: '<UUID>', useAdminOwner: '<Boolean>' });
```
