# registryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a registry usable by one scope

## Usage

```typescript
useRegistryGrantsQuery({ selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } } })
useRegistryGrantQuery({ id: '<UUID>', selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateRegistryGrantMutation({ selection: { fields: { id: true } } })
useUpdateRegistryGrantMutation({ selection: { fields: { id: true } } })
useDeleteRegistryGrantMutation({})
```

## Examples

### List all registryGrants

```typescript
const { data, isLoading } = useRegistryGrantsQuery({
  selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, registryId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a registryGrant

```typescript
const { mutate } = useCreateRegistryGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
