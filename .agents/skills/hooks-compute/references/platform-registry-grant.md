# platformRegistryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a registry usable by one scope

## Usage

```typescript
usePlatformRegistryGrantsQuery({ selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformRegistryGrantQuery({ id: '<UUID>', selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformRegistryGrantMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRegistryGrantMutation({ selection: { fields: { id: true } } })
useDeletePlatformRegistryGrantMutation({})
```

## Examples

### List all platformRegistryGrants

```typescript
const { data, isLoading } = usePlatformRegistryGrantsQuery({
  selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformRegistryGrant

```typescript
const { mutate } = useCreatePlatformRegistryGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
