# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions.

## Usage

```typescript
usePrincipalScopeOverridesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, membershipType: true, allowedMask: true, useAdminOwner: true, isActive: true, isReadOnly: true } } })
usePrincipalScopeOverrideQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, membershipType: true, allowedMask: true, useAdminOwner: true, isActive: true, isReadOnly: true } } })
useCreatePrincipalScopeOverrideMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalScopeOverrideMutation({ selection: { fields: { id: true } } })
useDeletePrincipalScopeOverrideMutation({})
```

## Examples

### List all principalScopeOverrides

```typescript
const { data, isLoading } = usePrincipalScopeOverridesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, membershipType: true, allowedMask: true, useAdminOwner: true, isActive: true, isReadOnly: true } },
});
```

### Create a principalScopeOverride

```typescript
const { mutate } = useCreatePrincipalScopeOverrideMutation({
  selection: { fields: { id: true } },
});
mutate({ principalId: '<UUID>', membershipType: '<Int>', allowedMask: '<BitString>', useAdminOwner: '<Boolean>', isActive: '<Boolean>', isReadOnly: '<Boolean>' });
```
